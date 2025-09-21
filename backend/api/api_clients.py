import json
import os
import base64
import requests
import time
import logging
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from openai import AsyncOpenAI, OpenAI
from .prompt_builder import build_initial_prompt, build_final_image_prompt
from io import BytesIO

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_moderation(story) -> bool:
    response = client.moderations.create(
    model="omni-moderation-latest",
    input=story,
    )
    return response

def get_panel_descriptions(story, num_panels, style_description):

    initial_prompt = build_initial_prompt(num_panels, style_description)
    panel_data = None

    full_prompt = f"{initial_prompt}\n\n Here is the story:\n{story}"

    try:
        response = client.responses.create(
            model="gpt-5",
            input=full_prompt,
            reasoning={"effort": "medium"},
            text={"verbosity":"low"}
        )
        panel_data = json.loads(response.output_text)
        

    except Exception as e:
        # Instead of returning None, raise a descriptive error
        print(f"An error occurred during storyboard generation: {e}")
        raise ValueError(f"LLM API failed to return valid JSON. Details: {e}")

    return panel_data

async def generate_image_google(prompt_text, avatar):
    """
    Generates an image using Google's Gemini Flash model for image generation.
    """
    logging.warning("Newest deployment v3")
    logging.info("=== GOOGLE GEMINI GENERATION STARTED ===") # Use logging.info
    try:
        # The model for image generation is gemini-2.5-flash-image-preview
        model = genai.GenerativeModel("gemini-2.5-flash-image-preview")

        # The avatar image must be sent as an inline data part
        avatar_image_part = {
            "mime_type": "image/png",
            "data": base64.b64decode(avatar)
        }

        # The request contains both the text prompt and the avatar image
        response = model.generate_content(
            [prompt_text, avatar_image_part],
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )
        
        # Extract the image data from the response
        image_part = response.candidates[0].content.parts[0]
        if image_part.inline_data is None:
            raise Exception("API did not return image data.")

        image_bytes = image_part.inline_data.data
        
        logging.info(f"Google Gemini image generated successfully, size: {len(image_bytes)} bytes")
        return image_bytes

    except Exception as e:
        logging.error(
            "An error occurred with Google Gemini API:", 
            exc_info=True # This captures the full traceback automatically
        )
        raise


async def generate_image(prompt_text, avatar):

    #we have to build the input list for the api call

    content_list = [
        {"type": "input_text", "text": prompt_text},
        {
            "type": "input_image",
            "image_url": f"data:image/png;base64,{avatar}"
        }
    ]


    try:
        response = await async_client.responses.create(
            # Use the latest and most capable mini-model for this task.
            model="gpt-5-mini",
            input=[{"role": "user", "content": content_list}],
            tools=[
                {
                    "type": "image_generation",
                    "size": "1024x1024",     
                    "quality": "medium",       
                    "moderation": "low"       
                }
            ],
        )
        # Safely extract the image result from the response output list.
        image_generation_call = next((out for out in response.output if out.type == "image_generation_call"), None)

        if image_generation_call and image_generation_call.result:
            base64_string = image_generation_call.result
            image_bytes = base64.b64decode(base64_string)
            return image_bytes, None
        else:
            # Provide detailed error info if the image generation call fails.
            error_details = f"Failed to generate image. Response output: {response.output}"
            print(error_details)
            return None, error_details
            
    except Exception as e:
        error_details = f"An API error occurred during image generation: {e}"
        print(error_details)
        return None, error_details


async def generate_image_flux_ultra(prompt_text, avatar, seed=None): 

    # Install `requests` (e.g. `pip install requests`) and `Pillow` (e.g. `pip install Pillow`), then run:
    
    BFL_API_KEY = os.getenv("BFL_API_KEY")

    if not BFL_API_KEY:
        print("ERROR couldnt find api key")
        return None
    
    flux_url = "https://api.bfl.ai/v1/flux-pro-1.1-ultra"

    headers = {
        'accept': 'application/json',
        'x-key': BFL_API_KEY,
        'Content-Type': 'application/json',
    }

    payload = {
        'prompt': prompt_text,
        'image_prompt': avatar, # Use the explicit parameter for the avatar
        'image_prompt_strength': 0.7, # A good starting point, tune between 0.0 and 1.0
        'seed': seed, # Pass the seed for consistency
        'width': 1024, # Or your desired dimensions
        'height': 1024,
        'safety_tolerance': 6
    }

    print(f"Sending request to FLUX Ultra API...")

    try:
        # The polling logic is the same as before
        response = requests.post(flux_url, headers=headers, json=payload, timeout=15)
        print("have some type ofg return after the response call")
        response.raise_for_status()
        request_data = response.json()
        
        print(f"FLUX Ultra initial response: {request_data}")
        
        polling_url = request_data.get("polling_url")
        if not polling_url:
            print(f"Failed to start FLUX Ultra job. Response: {request_data}")
            return None

        print(f"FLUX Ultra job started. Polling at: {polling_url}")

        max_attempts = 120 # Increased timeout for potentially larger images
        for attempt in range(max_attempts):
            time.sleep(0.5)
            result_response = requests.get(polling_url, headers=headers)
            result_data = result_response.json()

            status = result_data.get('status')
            print(f"FLUX Ultra polling attempt {attempt + 1}: status = {status}")
            
            if status == 'Ready':
                signed_url = result_data.get('result', {}).get('sample')
                if not signed_url:
                    print("FLUX Ultra job ready, but no image URL found.")
                    return None
                
                print("FLUX Ultra image ready. Downloading...")
                image_response = requests.get(signed_url)
                image_response.raise_for_status()
                image_content = image_response.content
                print(f"FLUX Ultra image downloaded successfully, size: {len(image_content)} bytes")
                print("=== FLUX ULTRA GENERATION COMPLETED ===")
                return image_content

            elif status in ['Error', 'Failed']:
                print(f"FLUX Ultra generation failed: {result_data}")
                return None
        
        print("FLUX Ultra job timed out.")
        return None

    except requests.exceptions.HTTPError as e:
        print(f"!!! HTTP Error from FLUX API: {e}")
        print(f"!!! Status Code: {e.response.status_code}")
        print(f"!!! Response Body: {e.response.text}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"An API network error occurred with FLUX Ultra: {e}")
        return None


def transcribe_audio(audio_bytes):
    audio_file = BytesIO(audio_bytes)
    audio_file.name = "audio.m4a"  # OpenAI expects a filename

    transcription = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text"
    )
    return transcription

def generate_avatar_from_image(image_bytes: bytes, prompt_text: str) -> bytes:
    """
    Calls the OpenAI image editing API (DALL-E 2) to generate an avatar.
    This endpoint is suitable for applying a style to an entire image.

    Args:
        image_bytes: The user's photo as raw bytes.
        prompt_text: A DETAILED prompt describing the desired style.

    Returns:
        The generated image as raw bytes.
    """
    try:
        print(f"--- Generating avatar with gpt-image-1 model and prompt: {prompt_text[:70]}... ---")

        # The API expects the image data as a tuple: (filename, bytes)
        image_to_send = ("user_image.png", image_bytes)

        # This API call is adapted from your old, working code
        response = client.images.edit(
            model="gpt-image-1",
            image=[image_to_send], # Pass the image bytes directly
            prompt=prompt_text,
            n=1,
            size="1024x1024",
            background="opaque"

        )
        
        # The response from gpt-image-1 is already base64
        b64_string = response.data[0].b64_json
        if not b64_string:
            raise Exception("API call returned an empty image string.")

        generated_image_bytes = base64.b64decode(b64_string)

        print("--- Successfully received generated avatar from API ---")
        return generated_image_bytes

    except Exception as e:
        print(f"An OpenAI API error occurred during avatar generation: {e}")
        raise e

def complete_prompt(panel_data, style_description):

    image_prompt = build_final_image_prompt(panel_data, style_description)
    
    system_prompt = image_prompt[0]
    user_content = image_prompt[1]

    try:
        # This is the API call to the fast, cheap model using the new Responses API
        response = client.responses.create(
            model="gpt-5-mini",
            instructions=system_prompt,
            input=user_content,
            reasoning={"effort": "low"},  # Perfect for fast, rule-based tasks
            text={"verbosity": "low"}   # Ensures a clean, direct output without conversational filler
        )
        final_prompt = response.output_text.strip()
        return final_prompt
    except Exception as e:
        print(f"An error occurred during prompt assembly: {e}")
        # Fallback to a simple join if the API call fails, ensuring the pipeline doesn't crash
        narrative_parts = [
            panel_data.get("composition", ""),
            panel_data.get("action_and_emotion", ""),
            panel_data.get("setting_and_lighting", "")
        ]
        anchor_tags = panel_data.get("character_notes",)
        full_prompt_parts = [style_description] + narrative_parts + anchor_tags
        final_parts = [part for part in full_prompt_parts if part]
        return ", ".join(final_parts)






    

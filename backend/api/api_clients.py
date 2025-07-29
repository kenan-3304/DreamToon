import json
import os
import base64
import requests
from openai import OpenAI
from .prompt_builder import build_initial_prompt
from io import BytesIO

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_moderation(story) -> bool:
    response = client.moderations.create(
    model="omni-moderation-latest",
    input=story,
    )
    return response

def get_panel_descriptions(story, num_panels, style_name):

    initial_prompt = build_initial_prompt(num_panels, style_name)
    panel_data = None

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": initial_prompt},
                {"role": "user", "content": story}
            ],
            response_format={"type": "json_object"}
        )
        
        panel_data = json.loads(response.choices[0].message.content)
        

    except Exception as e:
        print(f"An error occurred during storyboard generation: {e}")
        return None

    return panel_data


def generate_image(prompt_text, avatar):

    #we have to build the input list for the api call

    content_list = [
        {"type": "input_text", "text": prompt_text},
        # Use the base64-encoded avatar image
        {
            "type": "input_image",
            "image_url": f"data:image/png;base64,{avatar}"
        }
    ]

    image_tool = {
        "type": "image_generation",
        "quality": "medium" # Keeping quality consistent
    }

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            input=[{"role": "user", "content": content_list}],
            tools=[image_tool],
        )

        image_generation_call = next((out for out in response.output if out.type == "image_generation_call"), None)

        if image_generation_call and image_generation_call.result:
            base64_string = image_generation_call.result
            
            image_bytes = base64.b64decode(base64_string)
            
            return image_bytes
        else:
            print(f"Failed to generate image, Response: {response.output}")
            return None
    except Exception as e:
        print(f"An API error occurred: {e}")
        return None

def transcribe_audio(audio_bytes):
    audio_file = BytesIO(audio_bytes)
    audio_file.name = "audio.m4a"  # OpenAI expects a filename

    transcription = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text"
    )
    return transcription.text


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
        # The BytesIO object gives the OpenAI library a file-like object to read from.
        image_file = BytesIO(image_bytes)
        image_file.name = 'image.png'

        # Use the dall-e-2 model for the images.edit endpoint.
        response = client.images.edit(
            model="dall-e-2",
            image=image_file,
            prompt=prompt_text,
            n=1,
            size="1024x1024",
            response_format="b64_json"  # Get the image back directly as base64
        )

        b64_string = response.data[0].b64_json
        generated_image_bytes = base64.b64decode(b64_string)

        return generated_image_bytes

    except Exception as e:
        print(f"An OpenAI API error occurred during avatar generation: {e}")
        # Re-raise the exception to be handled by the main endpoint
        raise e




    

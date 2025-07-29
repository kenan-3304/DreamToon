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
    Calls the OpenAI API to generate a new avatar based on a user's photo and a style prompt.
    
    Args:
        image_bytes: The user's photo as raw bytes.
        prompt_text: The detailed prompt for the style.
        
    Returns:
        The generated image as raw bytes, or None if an error occurs.
    """
    try:
        # Encode the input image to base64, as required by the API for image inputs.
        b64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # This message structure tells GPT-4o to look at the user's photo
        # and then follow the instructions in the text prompt to create a new image.
        response = client.chat.completions.create(
            model="gpt-4o",  # Using the powerful gpt-4o model is best for this
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt_text
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{b64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000 # Adjust as needed
        )

        # Extract the image URL from the response (assuming DALL-E 3 is used by gpt-4o)
        # The response structure may vary, so you might need to inspect it.
        # This is a common pattern where the model provides a URL to the generated image.
        image_url = response.choices[0].message.content

        # You may need to parse the response if it contains more than just the URL.
        # For example, if the model returns a block of text with a URL inside.
        # This example assumes the URL is the primary content.

        # Download the newly generated image from the URL
        image_response = requests.get(image_url)
        image_response.raise_for_status()  # Raise an exception for bad status codes
        
        return image_response.content # Return the raw bytes of the new image

    except Exception as e:
        print(f"An OpenAI API error occurred during avatar generation: {e}")
        raise e




    

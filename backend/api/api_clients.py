import json
import os
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
#           return the base64 image result
            return image_generation_call.result.read()
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


    

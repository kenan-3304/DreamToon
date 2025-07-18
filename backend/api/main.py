# main.py

import os
import base64
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .api_clients import get_moderation, get_panel_descriptions, generate_image
from .prompt_builder import build_image_prompt
from .helper import encode_image_to_base64

app = FastAPI()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

STYLE_LIBRARY = {
    "simpsons": "Simpsons animation — yellow tones, thick black outlines, cartoon exaggeration.",
    "American": "A character portrait in the modern action animation style of 'Avatar: The Last Airbender' and the 'DC Animated Universe'. The art should be cel-shaded with clean, bold outlines and dynamic, expressive features."
    }

class ComicRequest(BaseModel):
    story: str
    num_panels: int = 6
    style_name: str
    character_reference_path: str

#will come from the front end later
STORY_INPUT = "A laid-back guy with spiky hair is at an airport McDonald's in Italy, surrounded by bags of edibles. An officer approaches, looking angry. But then i recognize the officer and then the officer bursts out laughing, and everyone is relieved."
NUM_PANELS = 6
STYLE_NAME = "simpsons"
#ponts to the right style avatar
CHARACTER_REFERENCE_PATH = "./simpsons.png"
OUTPUT_DIR = "output"

#also handle auth later
@app.post("/generate-comic/")
def main():
    """
    Main function to orchestrate the story-to-comic generation process.
    """
    print("auth check")

    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Authorization header is required'}), 401

    try:
        token = auth_header.split(" ")[1]
        jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience='authenticated')
    except Exception as e:
        return jsonify({'error': f'Invalid token: {str(e)}'}), 401

    print("--- Starting Comic Generation Process ---")

    # 1) we have to check ovbious moderation issues
    print("Step 1: Checking story for content policy compliance...")
    is_safe, reason = is_content_safe_for_comic(STORY_INPUT)
    if not is_safe:
        print(f"Error: Story is not compliant. Reason: {reason}")
        return #some policy error so stop execution

    print("Story passed moderation.")

    # 2) now we have to generate the image prompt
    print("Step 2: Generating panel descriptions from the story...")
    panel_data = get_panel_descriptions(STORY_INPUT, NUM_PANELS, STYLE_NAME)

    # there are some possible erros that need to be accounted for
    if panel_data.get("status") == "error":
        print(f"Error from LLM: {panel_data.get('message')}")
        return

    panels = panel_data.get("panels")
    if not panels:
        print("Error: The LLM did not return any panels.")
        return

    character_sheet = panel_data.get("character_sheet")
    if not character_sheet:
        print("No character sheet loaded")
        character_sheet = "Follow reference image"
    

    print(f"Successfully generated descriptions for {len(panels)} panels.")

    # 3) Image Generation Loop
    print("Step 3: Generating comic panel images...")
    #previous_panel_b64 = None
    avatar_b64 = encode_image_to_base64(CHARACTER_REFERENCE_PATH)

    for i, panel in enumerate(panels):
        panel_num = i
        print(f"\nGenerating Panel {panel_num}...")

        # 3a) Assemble the final prompt string for the image generator
        final_prompt_string = build_image_prompt(panel, character_sheet)
        
        # 3b) Generate the image - removed previous panel from here
        image_bytes = generate_image(
            prompt_text=final_prompt_string,
            avatar=avatar_b64
        )

        if image_bytes:
            # 3c) Save the generated image
            output_path = os.path.join(OUTPUT_DIR, f"{STYLE_NAME}_panel_{panel_num}.png")
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(image_bytes))
            print(f"Successfully saved Panel {panel_num} to {output_path}")
            
            # 3d) Update the reference for the next panel
            #previous_panel_b64 = image_bytes
        else:
            print(f"Failed to generate image for Panel {panel_num}. Stopping.")
            break

    print("\n--- Comic Generation Process Complete ---")


def is_content_safe_for_comic(text: str) -> (bool, str):
    """
    Performs a nuanced moderation check.
    Allows for some 'violence' but blocks other categories strictly.
    """
    # these are the thresholds from 0-1 
    MODERATION_THRESHOLDS = {
        "hate": 0.1,
        "hate/threatening": 0.05,
        "harassment": 0.3,
        "harassment/threatening": 0.1,
        "self-harm": 0.05,
        "self-harm/intent": 0.05,
        "self-harm/instructions": 0.05,
        "sexual": 0.2,
        "sexual/minors": 0.01,
        "violence": 0.4,  # I am allowing for more violence because of creative redirection
        "violence/graphic": 0.15 # Stricter threshold for graphic violence
    }

    moderation_result = get_moderation(text)
    
    if not moderation_result:
        return False, "Moderation API call failed."

    # The API returns scores for each category. We check if any score exceeds our defined threshold.
    category_scores = moderation_result.results[0].category_scores

    for category, score in category_scores:
        if category in MODERATION_THRESHOLDS and score > MODERATION_THRESHOLDS[category]:
            return False, f"Content flagged for '{category}' with score {score:.4f} (threshold: {MODERATION_THRESHOLDS[category]})"

    return True, "Content is compliant."

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    main()
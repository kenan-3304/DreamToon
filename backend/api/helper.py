import base64
from .api_clients import get_moderation
from .db_client import supabase
from fastapi import HTTPException, Header


def encode_image_to_base64(image_path):
    """Encodes a local image file into a base64 string."""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image {image_path}: {e}")
        return None
    

def is_content_safe_for_comic(text: str) -> (bool, str):
    """
    Performs a nuanced moderation check.
    Allows for some 'violence' but blocks other categories strictly.
    """
    print("---reached mod check-----")
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



def authenticateUser(authorization: str = Header()):
    user = None
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    
    try:
        token = authorization.split(" ")[1]
        response = supabase.auth.get_user(token)
        user = response.user

        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
    
    return user

def style_name_to_description(style_name):
    """
    Returns a one to two-sentence description of a given art style.
    """
    description = {
        "Simpsons": "An art style mimicking The Simpsons, defined by its use of flat colors, a signature yellow skin tone, and oversized round eyes. It employs simple linework with bold outlines and is often set in a satirical, suburban environment.",
        "Ghibli": "An art style inspired by Studio Ghibli, characterized by soft, hand-painted watercolor textures and lush, natural settings with gentle sunlight. This style evokes a warm, nostalgic feeling through expressive characters with a sense of childlike wonder.",
        "Adventure Time": "A cartoon style inspired by Adventure Time, featuring simple rounded designs, 'noodle' limbs, and dot eyes. It uses vibrant flat colors, thick outlines, and whimsical, candy-colored backgrounds.",
        "DC Comics": "A modern DC Comics aesthetic with a gritty, graphic novel look. It features bold anatomy, dynamic poses, dramatic lighting, and detailed ink lines with cross-hatching for a high-contrast feel."
    }
    return description.get(style_name, "A distinct art style.")
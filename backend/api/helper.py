import base64
import cv2
import numpy as np
from .api_clients import get_moderation
from .db_client import supabase
from fastapi import HTTPException, Header
from typing import Dict

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

def current_model():
    return "google"

def handle_comic_generation_error(e: Exception, dream_id: str = None) -> Dict[str, str]:
    """Categorize errors and return user-friendly messages"""
    
    error_message = str(e)
    
    # Content moderation errors
    if "Content moderation failed" in error_message:
        return {
            "error_type": "moderation",
            "title": "Content Policy Violation",
            "message": "Your dream contains content that doesn't meet our community guidelines. Please revise your story and try again.",
            "details": error_message
        }
    
    # Avatar-related errors
    if "No avatar found" in error_message or "Failed to download avatar" in error_message:
        return {
            "error_type": "avatar",
            "title": "Avatar Issue",
            "message": "We couldn't find your avatar for this style. Please create a new avatar first.",
            "details": error_message
        }
    
    # Audio transcription errors
    if "transcription" in error_message.lower() or "whisper" in error_message.lower():
        return {
            "error_type": "audio",
            "title": "Audio Processing Issue",
            "message": "We couldn't understand your audio recording. Please try speaking more clearly or use text input instead.",
            "details": error_message
        }
    
    # Network/API errors
    if "timeout" in error_message.lower() or "connection" in error_message.lower():
        return {
            "error_type": "network",
            "title": "Connection Problem",
            "message": "We're having trouble connecting to our servers. Please check your internet connection and try again.",
            "details": error_message
        }
    
    # Image generation errors
    if "image generation" in error_message.lower() or "flux" in error_message.lower():
        return {
            "error_type": "generation",
            "title": "Image Generation Failed",
            "message": "We couldn't generate your comic images. This might be due to high server load. Please try again in a few minutes.",
            "details": error_message
        }
    
    # Redis/Queue errors
    if "redis" in error_message.lower() or "queue" in error_message.lower():
        return {
            "error_type": "server",
            "title": "Server Busy",
            "message": "Our servers are currently busy. Please wait a moment and try again.",
            "details": error_message
        }
    
    # Default error
    return {
        "error_type": "unknown",
        "title": "Something Went Wrong",
        "message": "An unexpected error occurred. Please try again.",
        "details": error_message
    }


def detect_face_in_image(image_bytes: bytes) -> bool:
    """
    Detects if there's at least one face in the uploaded image.
    
    Args:
        image_bytes: Raw image bytes from the uploaded file
        
    Returns:
        bool: True if at least one face is detected, False otherwise
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return False
            
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Load the pre-trained Haar cascade classifier for face detection
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        # Return True if at least one face is detected
        return len(faces) > 0
        
    except Exception as e:
        print(f"Face detection error: {e}")
        # If face detection fails, we'll allow the image through
        # This prevents blocking valid images due to technical issues
        return True
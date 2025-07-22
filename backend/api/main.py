# main.py

import os
import base64
import requests
import json
from redis import Redis
from rq import Queue
from fastapi import FastAPI, HTTPException, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from .api_clients import get_moderation, transcribe_audio
from .helper import encode_image_to_base64
from .db_client import supabase
from .worker import run_comic_generation_worker

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

redis_conn = Redis.from_url(os.getenv("REDIS_URL"))
q = Queue('comics_queue', connection=redis_conn)

STYLE_LIBRARY = {
    "simpsons": "Simpsons animation — yellow tones, thick black outlines, cartoon exaggeration.",
    "american": "A character portrait in the modern action animation style of 'Avatar: The Last Airbender' and the 'DC Animated Universe'. The art should be cel-shaded with clean, bold outlines and dynamic, expressive features.",
    "anime": "naruto style"
    }

class ComicRequest(BaseModel):
    story: Optional[str] = None
    audio_url: Optional[str] = None
    num_panels: int = 6
    style_name: str


@app.post("/generate-comic/")
async def generate_comic(
    comic_request: ComicRequest, # Change the signature to accept the raw request
    #background_tasks: BackgroundTasks,
    authorization: str = Header(None)
):
    #print("--- Attempting manual validation ---")

    # 1. Manually parse the JSON body
    # try:
    #     json_body = await request.json()
    #     print("Received Body:", json_body)
        
    #     # 2. Manually validate the data against your Pydantic model
    #     comic_request = ComicRequest(**json_body)

    # except Exception as e:
    #     # 3. If validation fails, return a detailed error
    #     print("Pydantic Validation Error:", e.json())
    #     raise HTTPException(status_code=422, detail=json.loads(e.json()))
    # except Exception as e:
    #     # Catch other errors like invalid JSON
    #     raise HTTPException(status_code=400, detail=f"Error processing request: {e}")

    print("starting authentication")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")

    try:
        token = authorization.split(" ")[1] 
        
        # Use the Supabase client to verify the token and get the user
        response = supabase.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")

    print("getting avatar")
    #---------get the avatar image--------------#
    profile_response = supabase.from_("profiles").select("avatar_url").eq("id", user.id).single().execute()
    if not profile_response.data or not profile_response.data.get("avatar_url"):
        raise HTTPException(status_code=404, detail="User profile or avatar not found.")
    
    avatar_path = profile_response.data["avatar_url"]

    # 3. Download the private avatar image from the 'avatars' bucket
    try:
        image_bytes = supabase.storage.from_("avatars").download(avatar_path)
    except Exception as e:
        # Handle cases where the file might not exist in storage
        raise HTTPException(status_code=404, detail=f"Failed to download avatar from storage: {e}")

    # 4. Encode the downloaded image bytes into a Base64 string
    avatar_b64 = base64.b64encode(image_bytes).decode('utf-8')

    print("--- Starting Comic Generation Process ---")

    #----------Create a DB instance-------------#
    insert_response = supabase.from_("comics").insert({
        "user_id": user.id,
        "transcript": comic_request.story,
        "style": comic_request.style_name
    }).execute()
    
    dream_id = insert_response.data[0]['id']


    #----------Send the text or process audio--------------#
    story_text = ""
    if comic_request.story:
        story_text = comic_request.story
    elif comic_request.audio_url:
        audio_response = requests.get(comic_request.audio_url)
        audio_response.raise_for_status()
        story_text = transcribe_audio(audio_response.content)
    else:
        # Update status to error if no input is provided
        supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
        raise HTTPException(status_code=400, detail="Either story text or audio URL must be provided.")

    supabase.from_("comics").update({"transcript": story_text}).eq("id", dream_id).execute()

    #---------Check Moderation----------#
    # we have to check ovbious moderation issues
    print("Step 1: Checking story for content policy compliance...")
    is_safe, reason = is_content_safe_for_comic(story_text)
    if not is_safe:
        print(f"Error: Story is not compliant. Reason: {reason}")
        supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
        # Return an error response
        raise HTTPException(status_code=400, detail=f"Content moderation failed: {reason}")

    #-------send full prompt for multi-thread approach---------#

    q.enqueue(
        'worker.run_comic_generation_worker',
        dream_id,
        user.id,
        story_text,
        comic_request.num_panels,
        comic_request.style_name,
        avatar_b64
    )

    return {"dream_id": dream_id}



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



@app.get("/comic-status/{dream_id}")
async def get_comic_status(dream_id: str):
    response = supabase.from_("comics").select("status, image_urls").eq("id", dream_id).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Comic not found")
    
    data = response.data
    status = data.get("status")
    signed_urls = []

    # If complete, generate temporary signed URLs from the stored paths
    if status == "complete" and data.get("image_urls"):
        stored_paths = data["image_urls"]
        expires_in = 300  # 5 minutes

        for path in stored_paths:
            signed_url_response = supabase.storage.from_('comics').create_signed_url(path, expires_in)
            signed_urls.append(signed_url_response['signedURL'])

    # Return the signed URLs to the frontend
    return {"status": status, "panel_urls": signed_urls}

#get the signed id for all comic thumbnails
@app.get("/comics/")
async def get_all_comics(authorization: str = Header(None)):
    print("--- GET /comics/ endpoint was hit ---")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")

    try:
        token = authorization.split(" ")[1]
        response = supabase.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")
    
    #---------delete old comics----------#

    try:
        supabase.from_("comics").delete().match({
            "user_id": user.id,
            "status": "error"
        }).execute()
        print(f"Cleaned up failed comics for user {user.id}")
    except Exception as e:
        # If cleanup fails, just log it and continue. It's not a critical error.
        print(f"Could not clean up failed comics: {e}")


    # Fetch comics from the database
    comics_response = supabase.from_("comics").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    comics_data = comics_response.data
    
    # This check prevents the server from crashing if no comics are found
    if comics_data:
        for comic in comics_data:
            image_paths = comic.get("image_urls")
            if image_paths and len(image_paths) > 0:
                thumbnail_path = image_paths[0]
                signed_url_response = supabase.storage.from_('comics').create_signed_url(thumbnail_path, expires_in=300)
                comic["image_urls"] = [signed_url_response['signedURL']]
            else:
                comic["image_urls"] = []

    # This ensures you always return a list, even if it's empty
    return comics_data or []
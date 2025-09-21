# main.py

import os
import base64
import requests
import json
import time
import asyncio
import cv2
import numpy as np
from redis import Redis
from rq import Queue
from fastapi import FastAPI, HTTPException, Header, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from .api_clients import transcribe_audio
from .helper import encode_image_to_base64, is_content_safe_for_comic, authenticateUser, style_name_to_description, handle_comic_generation_error, detect_face_in_image
from .db_client import supabase
from .worker import run_comic_generation_worker
from .schema import DeleteAvatarRequest, AvatarRequest

# Simple in-memory cache for comics
comics_cache: Dict[str, Dict[str, Any]] = {}



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
QUEUE_NAME = os.getenv("RQ_NAME", "comics_queue")
q = Queue(QUEUE_NAME, connection=redis_conn)


# Enhanced error handling with specific error types
class ComicGenerationError(Exception):
    def __init__(self, error_type: str, message: str, details: str = None):
        self.error_type = error_type
        self.message = message
        self.details = details
        super().__init__(message)




#Generate comic flow
@app.post("/generate-comic/")
async def generate_comic(
    style_name: str = Form(...),
    num_panels: int = Form(6),
    audio_file: Optional[UploadFile] = File(None),
    story: Optional[str] = Form(None),
    authorization: str = Header(None)
):
    """Generates a full comic strip.

        Args:
            style_name (string): The name of the style for the comic.
            num_panels (string): The maximum amount of panles allowed.
            audio_file (File): an audio file describing a story
            story (string): a text description of a story
            authorization (string): authorization header

        Returns:
            dict: the dream id so the front end can load immediately.
        """
    
    user = authenticateUser(authorization)
    dream_id = None

    try:
        print(f"getting avatar for style: {style_name}")

        avatar_response = supabase.from_("avatars") \
            .select("avatar_path") \
            .eq("user_id", user.id) \
            .eq("style", style_name) \
            .order("created_at", desc=True) \
            .limit(1) \
            .single() \
            .execute()

        if not avatar_response.data or not avatar_response.data.get("avatar_path"):
            # This could happen if a user somehow has a style unlocked but no avatar for it.
            raise ComicGenerationError(
                "avatar", 
                f"No avatar found for the style '{style_name}'. Please create one first."
            )

        avatar_path = avatar_response.data["avatar_path"]

        #download the avatar image
        try:
            image_bytes = supabase.storage.from_("avatars").download(avatar_path)
        except Exception as e:
            # file might not exist in storage
            raise ComicGenerationError(
                "avatar",
                f"Failed to download avatar from storage: {e}"
            )

        # Encode the downloaded image bytes into a Base64 string
        avatar_b64 = base64.b64encode(image_bytes).decode('utf-8')

        print("--- Starting Comic Generation Process ---")

        #----------Create a DB instance-------------#
        insert_response = supabase.from_("comics").insert({
            "user_id": user.id,
            "style": style_name
        }).execute()
        
        dream_id = insert_response.data[0]['id']


        #----------Send the text or process audio--------------#
        story_text = ""
        if story:
            story_text = story
        elif audio_file:
            try:
                audio_content = await audio_file.read()
                story_text = transcribe_audio(audio_content)
            except Exception as e:
                raise ComicGenerationError(
                    "audio",
                    f"Failed to transcribe audio: {e}"
                )
        else:
            # Update status to error if no input is provided
            if dream_id:
                supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
            raise ComicGenerationError(
                "input",
                "Either story text or audio file must be provided."
            )

        supabase.from_("comics").update({"transcript": story_text}).eq("id", dream_id).execute()

        #---------Check Moderation----------#
        # we have to check ovbious moderation issues
        print("Step 1: Checking story for content policy compliance...")
        is_safe, reason = is_content_safe_for_comic(story_text)
        if not is_safe:
            print(f"Error: Story is not compliant. Reason: {reason}")
            supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
            # Return an error response
            raise ComicGenerationError(
                "moderation",
                f"Content moderation failed: {reason}"
            )

        #-------send full prompt for multi-thread approach---------#

        style_description = style_name_to_description(style_name)

        # Add timeout to prevent worker hanging
        try:
            # Invalidate cache for this user
            cache_key = f"comics_{user.id}"
            if cache_key in comics_cache:
                del comics_cache[cache_key]
            
            print(f"[{dream_id}] Enqueuing comic generation job...")
            print(f"[{dream_id}] Job parameters:")
            print(f"[{dream_id}] - dream_id: {dream_id}")
            print(f"[{dream_id}] - user.id: {user.id}")
            print(f"[{dream_id}] - story_text length: {len(story_text)}")
            print(f"[{dream_id}] - num_panels: {num_panels}")
            print(f"[{dream_id}] - style_description: {style_description[:50]}...")
            print(f"[{dream_id}] - avatar_b64 length: {len(avatar_b64) if avatar_b64 else 'None'}")
            
            job = q.enqueue(
                'backend.api.worker.run_comic_generation_worker',
                dream_id,
                user.id,
                story_text,
                num_panels,
                style_description,
                avatar_b64,
                job_timeout=500  # around 8 minute timeout
            )
            
            print(f"[{dream_id}] Job enqueued successfully with ID: {job.id}")
            print(f"[{dream_id}] Job status: {job.get_status()}")
            
        except Exception as e:
            print(f"[{dream_id}] Failed to enqueue job: {e}")
            print(f"[{dream_id}] Error type: {type(e)}")
            import traceback
            print(f"[{dream_id}] Full traceback:")
            traceback.print_exc()
            supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
            raise ComicGenerationError(
                "server",
                f"Failed to start comic generation: {e}"
            )

        return {"dream_id": dream_id}

    except ComicGenerationError as e:
        # Update database with error status if we have a dream_id
        if dream_id:
            supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
        
        error_info = handle_comic_generation_error(e, dream_id)
        raise HTTPException(
            status_code=400, 
            detail={
                "error_type": error_info["error_type"],
                "title": error_info["title"],
                "message": error_info["message"],
                "details": error_info["details"]
            }
        )
    except Exception as e:
        # Update database with error status if we have a dream_id
        if dream_id:
            supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
        
        error_info = handle_comic_generation_error(e, dream_id)
        raise HTTPException(
            status_code=500, 
            detail={
                "error_type": error_info["error_type"],
                "title": error_info["title"],
                "message": error_info["message"],
                "details": error_info["details"]
            }
        )



#generate avatar flow
@app.post("/generate-avatar/")
async def generate_avatar(
    avatar_request: AvatarRequest,
    authorization: str = Header(...)
):
    """Generates a avatar in a certain style.

        Args:
            avatar_request (AvatarRequest): contains user photo, style prompt, and style name
            authorization (string): authorization header

        Returns:
            dict: the immediate status to allow for backend polling including the job id.
        """
    
    print("--- Authenticating user for avatar generation ---")
    user = authenticateUser(authorization)

    # Face detection check before processing
    try:
        # Decode the base64 image to check for faces
        image_bytes = base64.b64decode(avatar_request.user_photo_b64)
        
        print("--- Checking for face in uploaded image ---")
        if not detect_face_in_image(image_bytes):
            print("--- No face detected in image ---")
            raise HTTPException(
                status_code=400,
                detail={
                    "error_type": "face_detection",
                    "title": "No Face Detected",
                    "message": "Please upload a photo with a clear, visible face.",
                    "details": "The image must contain at least one detectable face to create an avatar."
                }
            )
        print("--- Face detected successfully ---")
        
    except HTTPException:
        # Re-raise HTTP exceptions (like our face detection error)
        raise
    except Exception as e:
        print(f"Face detection check failed: {e}")
        # If face detection fails due to technical issues, allow the image through
        # This prevents blocking valid images due to technical problems
        pass

    # Add the job to the queue and return immediately
    try:
        job = q.enqueue(
            'backend.api.worker.run_avatar_generation_worker', # The path to your new function
            user.id,
            avatar_request.prompt,
            avatar_request.user_photo_b64,
            avatar_request.name,
        )

        # Makes it easier for the front end to check if a avatar is done generating
        print("setting up avatar generations job")
        supabase.from_("avatar_generations").insert({
            "job_id": job.id,
            "user_id": user.id,
            "status": "processing"
        }).execute()

        # Respond to the client immediately
        return {"status": "processing", "job_id": job.id}

    except Exception as e:
        print(f"An unexpected error occurred during avatar enqueue: {str(e)}")
        
        # Categorize the error
        error_info = handle_comic_generation_error(e)  # Reuse the same error handler
        raise HTTPException(
            status_code=500, 
            detail={
                "error_type": error_info["error_type"],
                "title": error_info["title"],
                "message": error_info["message"],
                "details": error_info["details"]
            }
        )


@app.get("/avatar-status/{job_id}")
async def get_avatar_status(job_id: str, authorization: str = Header(...)):
    user = authenticateUser(authorization)
    response = supabase.from_("avatar_generations").select("status, error_type, error_message") \
        .eq("job_id", job_id).eq("user_id", user.id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Job not found.")
    
    data = response.data
    status = data.get("status")
    result = {"status": status}
    
    # Include error information if status is error
    if status == "error":
        result.update({
            "error_type": data.get("error_type", "unknown"),
            "error_message": data.get("error_message", "An unknown error occurred")
        })
    
    return result



@app.get("/comic-status/{dream_id}")
async def get_comic_status(dream_id: str):
    """Check to see if a certain comic is done generating.

        Args:
            dream_id (string): a unique id to help locate a certain table instance 

        Returns:
            dict: the immediate status and the signed urls if it is done.
        """
    response = supabase.from_("comics").select("status, image_urls, error_type, error_message").eq("id", dream_id).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Comic not found")
    
    data = response.data
    status = data.get("status")
    signed_urls = []
    error_info = {}

    # If complete, generate temporary signed URLs from the stored paths
    if status == "complete" and data.get("image_urls"):
        stored_paths = data["image_urls"]
        expires_in = 300  # 5 minutes

        for path in stored_paths:
            signed_url_response = supabase.storage.from_('comics').create_signed_url(path, expires_in)
            signed_urls.append(signed_url_response['signedURL'])

    # If error, include error information
    if status == "error":
        error_info = {
            "error_type": data.get("error_type", "unknown"),
            "error_message": data.get("error_message", "An unknown error occurred")
        }

    # Return the signed URLs to the frontend
    return {
        "status": status, 
        "panel_urls": signed_urls,
        **error_info  # Include error info if present
    }


#get the signed id for all comic thumbnails
@app.get("/comics/")
async def get_all_comics(authorization: str = Header(None)):
    """Get the signed url for each first comic pic for the timeline.

        Args:
            authorization (string): authorization header

        Returns:
            comic_data (list): a list of urls.
        """
    try:
        print("--- GET /comics/ endpoint was hit ---")
        user = authenticateUser(authorization)
        
        # Check cache first (cache for 30 seconds)
        cache_key = f"comics_{user.id}"
        current_time = time.time()
        
        if cache_key in comics_cache:
            cached_data = comics_cache[cache_key]
            if current_time - cached_data["timestamp"] < 30:  # 30 second cache
                print(f"--- Returning cached comics for user {user.id} ---")
                return cached_data["data"]
    
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

        # Cache the result
        result_data = comics_data or []
        comics_cache[cache_key] = {
            "data": result_data,
            "timestamp": current_time
        }
        
        # This ensures you always return a list, even if it's empty
        return result_data
    except Exception as e:
        print(f"Error in get_all_comics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch comics: {str(e)}")


#Deletion of an avatar flow
@app.delete("/delete-avatar/")
async def delete_avatar(request: DeleteAvatarRequest, authorization: str = Header(...)):
    """Delete a avatar.

        Args:
            request (DeleteAvatarRequest): contains the path to the avatar
            authorization (string): authorization header

        Returns:
            dict: the immediate status.
        """
    user = authenticateUser(authorization)
    if not request.avatar_path.startswith(user.id):
        raise HTTPException(status_code=403, detail="Forbidden")

    supabase.storage.from_("avatars").remove([request.avatar_path])
    supabase.from_("avatars").delete().eq("avatar_path", request.avatar_path).execute()

    return {"status": "success"}


@app.delete("/delete-comic")
async def delete_comic(dream_id: str, authorization: str = Header(None)):
    """Delete a comic

        Args:
            comic_path(string): the path to the comic storage bucket
            authorization(Header): auth header
        Returns:
            dict: status being complete or some exception
    """

    user = authenticateUser(authorization)

    if not dream_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    supabase.storage.from_("comics").remove([f"{user.id}/{dream_id}"])
    supabase.from_("comics").delete().eq("id", dream_id).execute()
    return {"status": "success"}
        


@app.get("/health/")
async def health_check():
    """Simple health check endpoint."""
    try:
        # Test Redis connection
        redis_conn.ping()
        return {"status": "healthy", "redis": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/debug-worker/")
async def debug_worker():
    """Endpoint to test if the RQ worker is running correctly."""
    print("--- Enqueuing DEBUG worker ---")
    q.enqueue('backend.api.worker.run_debug_worker')
    return {"status": "Debug job enqueued. Check your worker logs."}

@app.get("/test-comic-worker/")
async def test_comic_worker():
    """Test endpoint to verify comic worker is working."""
    print("--- Testing comic worker ---")
    try:
        job = q.enqueue(
            'backend.api.worker.run_comic_generation_worker',
            "test-dream-id",
            "test-user-id", 
            "A simple test story",
            2,
            "test style description",
            None,  # no avatar for test
            job_timeout=60
        )
        print(f"Test job enqueued with ID: {job.id}")
        return {"status": "Test job enqueued", "job_id": job.id}
    except Exception as e:
        print(f"Test job failed: {e}")
        return {"status": "Test job failed", "error": str(e)}
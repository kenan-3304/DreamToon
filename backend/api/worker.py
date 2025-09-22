# worker.py

import concurrent.futures
import time
import base64
import os
import random
import asyncio
import logging
from .db_client import supabase
from .api_clients import get_panel_descriptions, generate_image, generate_avatar_from_image, generate_image_flux_ultra, generate_image_google, complete_prompt
from .prompt_builder import build_image_prompt
from .helper import current_model

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Enhanced error handling for worker
class WorkerError(Exception):
    def __init__(self, error_type: str, message: str, details: str = None):
        self.error_type = error_type
        self.message = message
        self.details = details
        super().__init__(message)

def categorize_worker_error(e: Exception, context: str = "") -> str:
    """Categorize worker errors for better error handling"""
    error_message = str(e).lower()
    
    # LLM/Story generation errors
    if "gpt" in error_message or "openai" in error_message or "llm" in error_message:
        return "llm_error"
    
    # Image generation errors
    if "flux" in error_message or "image generation" in error_message or "dall-e" in error_message:
        return "image_generation_error"
    
    # Network/API errors
    if "timeout" in error_message or "connection" in error_message or "network" in error_message:
        return "network_error"
    
    # Storage errors
    if "storage" in error_message or "upload" in error_message or "supabase" in error_message:
        return "storage_error"
    
    # Database errors
    if "database" in error_message or "sql" in error_message:
        return "database_error"
    
    # Content/validation errors
    if "content" in error_message or "validation" in error_message or "moderation" in error_message:
        return "content_error"
    
    return "unknown_error"

# --- This is a helper function to generate a single panel ---
async def generate_single_panel(panel_info: tuple):
    """Generates a single panel and returns its public URL."""
    i, panel, user_id, dream_id, avatar, seed, style_description = panel_info
    logging.info(f"[{dream_id}] ===== PANEL {i+1} ASYNC THREAD STARTED =====")

    try:
        final_prompt = build_image_prompt(panel)
     
        image_bytes, error_details = await generate_image(final_prompt, avatar)

        
        print(f"[{dream_id}] Image generation returned: {type(image_bytes)}")

        if not image_bytes:
            logging.warning(
                f"[{dream_id}] API call for Panel {i+1} succeeded but returned an empty image. Raising WorkerError."
            )

            raise WorkerError(
                "image_generation_error",
                f"Failed to generate image for Panel {i+1}",
                details=error_details
            )
        logging.info(f"[{dream_id}] Image generated successfully for Panel {i+1}, size: {len(image_bytes)} bytes")
        
        # Upload to Supabase Storage
        panel_path = f"{user_id}/{dream_id}/{i+1}.png"
        print(f"[{dream_id}] Uploading Panel {i+1} to path: {panel_path}")
        
        try:
            supabase.storage.from_("comics").upload(panel_path, image_bytes, {"content-type": "image/png"})
            print(f"[{dream_id}] Panel {i+1} uploaded successfully")
        except Exception as upload_error:
            raise WorkerError(
                "storage_error",
                f"Failed to upload Panel {i+1}: {upload_error}"
            )
        
        logging.info(f"[{dream_id}] ===== PANEL {i+1} ASYNC THREAD COMPLETED =====")
        return panel_path
        
    except WorkerError:
        # Re-raise WorkerError as-is
        print("perhaps here is the issue")
        raise
    except Exception as e:
        logging.error(
            f"[{dream_id}] Root cause for Panel {i+1} failure:", 
            exc_info=True 
        )
                error_type = categorize_worker_error(e, f"Panel {i+1}")
        raise WorkerError(
            error_type, 
            f"Panel {i+1} generation failed.",
            details=str(e)
        )


# --- This is the main worker function ---
def run_comic_generation_worker(dream_id: str, user_id: str, story: str, num_panels: int, style_description: str, avatar_b64):
    
    try:
        print("--- EXECUTING ASYNCIO VERSION ---")

        try:
            panel_data = get_panel_descriptions(story, num_panels, style_description)
            print(f"[{dream_id}] get_panel_descriptions returned: {panel_data}")
        except Exception as e:
            raise WorkerError(
                "llm_error",
                f"Failed to generate story panels: {e}"
            )

        panels = panel_data.get("panels")
        if not panels:
            raise WorkerError(
                "llm_error",
                "The AI couldn't generate any story panels. Please try again with a different story."
            )

        print(f"[{dream_id}] Successfully got {len(panels)} panels")
        print(f"[{dream_id}] Panel data structure:")
        for i, panel in enumerate(panels):
            print(f"[{dream_id}] Panel {i+1}: type={type(panel)}, value={panel}")

        title = panel_data.get("title", "Untitled Dream")
        if not title:
            title = "Untitled Dream"
        
        #--------update supabase with new title------------#
        try:
            supabase.from_("comics").update({"title": title}).eq("id", dream_id).execute()
        except Exception as e:
            print(f"[{dream_id}] Warning: Failed to update title: {e}")

        #--------set up and start parallel flow-------#
        image_paths_or_errors = asyncio.run(run_async_panel_generation(panels, user_id, dream_id, avatar_b64, style_description))

        successful_paths = [path for path in image_paths_or_errors if not isinstance(path, WorkerError)]
        failed_panels = [err for err in image_paths_or_errors if isinstance(err, WorkerError)]

        if failed_panels:
            logging.warning(f"[{dream_id}] {len(failed_panels)} panels failed to generate. Error: {failed_panels[0].message}")

        # If ALL panels failed, we raise an error to stop the process
        if not successful_paths:
            raise failed_panels[0] if failed_panels else WorkerError("image_generation_error", "Failed to generate any panels.")

        #-----update supabase with comics and complete status---------#
        logging.info(f"[{dream_id}] Updating database with {len(successful_paths)} successful panels...")
        try:
            supabase.from_("comics").update({
                "status": "complete",
                "image_urls": successful_paths,
                "panel_count": len(successful_paths)
            }).eq("id", dream_id).execute()
        except Exception as e:
            raise WorkerError(
                "database_error",
                f"Failed to update comic status: {e}"
            )
        
        print(f"[{dream_id}] ===== WORKER FUNCTION COMPLETED SUCCESSFULLY =====")

    except (WorkerError, Exception) as e:
        error_type = e.error_type if isinstance(e, WorkerError) else categorize_worker_error(e)
        error_message = e.message if isinstance(e, WorkerError) else str(e)
        
        logging.error(f"[{dream_id}] WORKER FAILED WITH ERROR: {error_type} - {error_message}")
        
        # Update database with error status and error details
        try:
            supabase.from_("comics").update({
                "status": "error",
                "error_type": error_type,
                "error_message": error_message
            }).eq("id", dream_id).execute()
        except Exception as db_error:
            logging.error(f"[{dream_id}] CRITICAL: Failed to update error status in database: {db_error}")
        
        # Re-raise the error so the job is marked as failed in the RQ dashboard
        raise e

async def run_async_panel_generation(panels, user_id, dream_id, avatar_b64, style_description):
    #openai doesnt support seed anymore but keeping it becuase other models do
    comic_seed = random.randint(0, 2**32 - 1)
    
    tasks = [
        generate_single_panel((i, p, user_id, dream_id, avatar_b64, comic_seed, style_description))
        for i, p in enumerate(panels)
    ]
    
    logging.info(f"[{dream_id}] Starting {len(tasks)} async panel generation tasks...")
    
    results = await asyncio.gather(*tasks)
    
    logging.info(f"[{dream_id}] All async panel tasks finished.")
    return results


def run_avatar_generation_worker(user_id: str, prompt: str, image_b64: str, name: str):
    """
    A background worker that handles the entire avatar generation process.
    """
    from rq import get_current_job
    job = get_current_job()
    job_id = job.id if job else "unknown"
    
    print(f"--- Starting background avatar generation for user {user_id} (JOB ID {job_id}---")
    try:
        image_bytes = base64.b64decode(image_b64)

        # 1. Generate the image using OpenAI
        try:
            generated_image_bytes = generate_avatar_from_image(image_bytes, prompt)
            if not generated_image_bytes:
                raise WorkerError(
                    "image_generation_error",
                    "Image generation failed to return data."
                )
        except Exception as e:
            raise WorkerError(
                "image_generation_error",
                f"Failed to generate avatar image: {e}"
            )

        # 2. Upload the new avatar to Supabase Storage
        file_path = f"{user_id}/avatar_{int(time.time())}.png"
        print(f"--- Worker uploading avatar to: {file_path} ---")
        try:
            supabase.storage.from_("avatars").upload(
                path=file_path,
                file=generated_image_bytes,
                file_options={"content-type": "image/png"}
            )
        except Exception as e:
            raise WorkerError(
                "storage_error",
                f"Failed to upload avatar to storage: {e}"
            )

        # 3. Finalize the database records by calling the edge function
        print("--- Worker calling finalize-avatar edge function ---")
        try:
            supabase.functions.invoke(
                "finalize-avatar",
                invoke_options={
                    "body": {
                        "userId": user_id,
                        "styleName": name,
                        "avatarPath": file_path,
                    }
                }
            )
        except Exception as e:
            raise WorkerError(
                "database_error",
                f"Failed to finalize avatar in database: {e}"
            )
            
        supabase.from_("avatar_generations").update({"status": "complete"}).eq("job_id", job_id).execute()
        print(f"--- ✅ Background avatar generation complete for user {user_id} ---")

    except WorkerError as e:
        print(f"--- ❗️ Background avatar generation failed with categorized error ---")
        print(f"--- Error type: {e.error_type}")
        print(f"--- Error message: {e.message}")
        
        # Update database with error status
        try:
            supabase.from_("avatar_generations").update({
                "status": "error",
                "error_type": e.error_type,
                "error_message": e.message
            }).eq("job_id", job_id).execute()
        except Exception as db_error:
            print(f"--- Failed to update error status in database: {db_error}")
        
        # Re-raise the error
        raise e
        
    except Exception as e:
        print(f"--- ❗️ Background avatar generation failed with unknown error: {e} ---")
        
        # Categorize the unknown error
        error_type = categorize_worker_error(e, "Avatar generation")
        worker_error = WorkerError(error_type, f"Unexpected avatar generation error: {e}")
        
        # Update database with error status
        try:
            supabase.from_("avatar_generations").update({
                "status": "error",
                "error_type": error_type,
                "error_message": str(e)
            }).eq("job_id", job_id).execute()
        except Exception as db_error:
            print(f"--- Failed to update error status in database: {db_error}")
        
        raise worker_error

def run_debug_worker():
    """A simple test function to see if the worker is running at all."""
    logging.info("--- ✅ DEBUG WORKER (RELIABILITY TEST) HAS STARTED ---")
    return
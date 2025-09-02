# worker.py

import concurrent.futures
import time
import base64
import os
import random
import logging
from .db_client import supabase
from .api_clients import get_panel_descriptions, generate_image, generate_avatar_from_image, generate_image_flux_ultra, generate_image_google
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
def generate_single_panel(panel_info: tuple):
    """Generates a single panel and returns its public URL."""
    i, panel, user_id, dream_id, avatar, seed = panel_info
    logging.info(f"[{dream_id}] ===== PANEL {i+1} THREAD STARTED =====")

    try:
        # Check if panel is valid
            
        # Here you would build your final prompt and call the services
        print(f"[{dream_id}] Building image prompt for Panel {i+1}...")
        final_prompt = build_image_prompt(panel)
        print(f"[{dream_id}] Final prompt length: {len(final_prompt)}")
        
        print(f"[{dream_id}] generating image for Panel {i+1}...")

        model = current_model()

        if (model == "google"):
            print("using google===========")
            image_bytes = generate_image_google(final_prompt, avatar)
        elif (model == "flux"):
            print("using flux=============")
            image_bytes = generate_image_flux_ultra(final_prompt, avatar, seed)
        else:
            print("using openai=================")
            image_bytes = generate_image(final_prompt, avatar)

    
        
        print(f"[{dream_id}] generate_image_flux_ultra returned: {type(image_bytes)}")

        if not image_bytes:
            logging.warning(
                f"[{dream_id}] API call for Panel {i+1} succeeded but returned an empty image. Raising WorkerError."
            )

            raise WorkerError(
                "image_generation_error",
                f"Failed to generate image for Panel {i+1}"
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
        
        logging.info(f"[{dream_id}] ===== PANEL {i+1} THREAD COMPLETED =====")
        return panel_path
        
    except WorkerError:
        # Re-raise WorkerError as-is
        print("perhaps here is the issue")
        raise
    except Exception as e:
        logging.error(
            f"[{dream_id}] Root cause for Panel {i+1} failure:", 
            exc_info=True  # This automatically includes the full traceback of the original error (e)
        )
        
        # The rest of your error handling can stay the same
        error_type = categorize_worker_error(e, f"Panel {i+1}")
        raise WorkerError(
            error_type, 
            f"Panel {i+1} generation failed.",
            details=str(e)
        )


# --- This is the main worker function ---
def run_comic_generation_worker(dream_id: str, user_id: str, story: str, num_panels: int, style_description: str, avatar_b64):
    print(f"[{dream_id}] ===== WORKER FUNCTION STARTED =====")
    print(f"[{dream_id}] Parameters received:")
    print(f"[{dream_id}] - user_id: {user_id}")
    print(f"[{dream_id}] - num_panels: {num_panels}")
    print(f"[{dream_id}] - style_description: {style_description[:50]}...")
    print(f"[{dream_id}] - avatar_b64 length: {len(avatar_b64) if avatar_b64 else 'None'}")
    
    try:
        print(f"[{dream_id}] Worker started for user {user_id}.")

        print(f"[{dream_id}] Calling get_panel_descriptions...")
        try:
            panel_data = get_panel_descriptions(story, num_panels, style_description)
            print(f"[{dream_id}] get_panel_descriptions returned: {panel_data}")
        except Exception as e:
            raise WorkerError(
                "llm_error",
                f"Failed to generate story panels: {e}"
            )

        # ------handle errors-------#
        if panel_data.get("status") == "error":
            error_msg = panel_data.get('message', 'Unknown LLM error')
            raise WorkerError("llm_error", f"LLM error: {error_msg}")

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
        print(f"[{dream_id}] Updating title to: {title}")
        try:
            supabase.from_("comics").update({"title": title}).eq("id", dream_id).execute()
        except Exception as e:
            print(f"[{dream_id}] Warning: Failed to update title: {e}")

        #--------set up and start parallel flow-------#
        print(f"[{dream_id}] Setting up parallel tasks...")
        comic_seed = random.randint(0, 2**32 - 1)
        print(f"[{dream_id}] Generated seed: {comic_seed}")
        
        panel_tasks = [(i, p, user_id, dream_id, avatar_b64, comic_seed) for i, p in enumerate(panels)]
        print(f"[{dream_id}] Created {len(panel_tasks)} panel tasks")
        
        image_paths = []
        
        print(f"[{dream_id}] Starting ThreadPoolExecutor with max_workers=2...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            print(f"[{dream_id}] Executor created, submitting tasks...")
            results = executor.map(generate_single_panel, panel_tasks)
            print(f"[{dream_id}] Tasks submitted, collecting results...")
            image_paths = list(results)
            print(f"[{dream_id}] Collected {len(image_paths)} results")

        print(f"[{dream_id}] Filtering out None results...")
        image_paths = [path for path in image_paths if path is not None]
        print(f"[{dream_id}] Final image_paths count: {len(image_paths)}")

        # Check if we have enough panels
        if len(image_paths) < len(panels):
            print(f"[{dream_id}] Warning: Only generated {len(image_paths)} out of {len(panels)} panels")
            if len(image_paths) == 0:
                raise WorkerError(
                    "image_generation_error",
                    "Failed to generate any comic panels. Please try again."
                )

        #-----update supabase with comics and complete status---------#
        print(f"[{dream_id}] Updating database with completion status...")
        try:
            supabase.from_("comics").update({
                "status": "complete",
                "image_urls": image_paths,
                "panel_count": len(panels)
            }).eq("id", dream_id).execute()
        except Exception as e:
            raise WorkerError(
                "database_error",
                f"Failed to update comic status: {e}"
            )
        
        print(f"[{dream_id}] ===== WORKER FUNCTION COMPLETED SUCCESSFULLY =====")

    except WorkerError as e:
        logging.error(f"[{dream_id}] WORKER FAILED WITH CATEGORIZED ERROR: {e.error_type} - {e.message} - Details: {e.details}")
        
        # Update database with error status and error details
        try:
            supabase.from_("comics").update({
                "status": "error",
                "error_type": e.error_type,
                "error_message": e.message
            }).eq("id", dream_id).execute()
        except Exception as db_error:
            print(f"[{dream_id}] Failed to update error status in database: {db_error}")
        
        # Re-raise the error for the main API to handle
        raise e
        
    except Exception as e:
        logging.error(
            f"[{dream_id}] WORKER FAILED WITH UNKNOWN ERROR:",
            exc_info=True # This replaces the need for traceback.print_exc()
        )

        
        # Categorize the unknown error
        error_type = categorize_worker_error(e, "Main worker")
        worker_error = WorkerError(error_type, f"Unexpected error: {e}")
        
        # Update database with error status
        try:
            supabase.from_("comics").update({
                "status": "error",
                "error_type": error_type,
                "error_message": str(e)
            }).eq("id", dream_id).execute()
        except Exception as db_error:
            print(f"[{dream_id}] Failed to update error status in database: {db_error}")
        
        raise worker_error


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
    print("--- ✅ DEBUG WORKER HAS STARTED ---")
    print(f"--- Worker's Current Directory: {os.getcwd()} ---")
    print("--- ✅ DEBUG WORKER FINISHED ---")

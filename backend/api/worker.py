# worker.py

import concurrent.futures
import time
import base64
import os
import random
from .db_client import supabase
from .api_clients import get_panel_descriptions, generate_image, generate_avatar_from_image, generate_image_flux_ultra
from .prompt_builder import build_image_prompt

# --- This is a helper function to generate a single panel ---
def generate_single_panel(panel_info: tuple):
    """Generates a single panel and returns its public URL."""
    i, panel, user_id, dream_id, avatar, seed = panel_info
    print(f"[{dream_id}] ===== PANEL {i+1} THREAD STARTED =====")
    print(f"[{dream_id}] Panel {i+1} info:")
    print(f"[{dream_id}] - panel type: {type(panel)}")
    print(f"[{dream_id}] - panel value: {panel}")


    try:
        # Check if panel is valid
        if not panel:
            print(f"[{dream_id}] Invalid panel data for Panel {i+1}: {panel}")
            return None
            
        # Here you would build your final prompt and call the services
        print(f"[{dream_id}] Building image prompt for Panel {i+1}...")
        final_prompt = build_image_prompt(panel)
        print(f"[{dream_id}] Final prompt length: {len(final_prompt)}")
        
        print(f"[{dream_id}] Calling generate_image_flux_ultra for Panel {i+1}...")
        image_bytes = generate_image_flux_ultra(final_prompt, avatar, seed)
        print(f"[{dream_id}] generate_image_flux_ultra returned: {type(image_bytes)}")

        if not image_bytes:
            print(f"[{dream_id}] Failed to generate image for Panel {i+1}. Skipping.")
            return None

        print(f"[{dream_id}] Image generated successfully for Panel {i+1}, size: {len(image_bytes)} bytes")
        
        # Upload to Supabase Storage
        panel_path = f"{user_id}/{dream_id}/{i+1}.png"
        print(f"[{dream_id}] Uploading Panel {i+1} to path: {panel_path}")
        supabase.storage.from_("comics").upload(panel_path, image_bytes, {"content-type": "image/png"})
        print(f"[{dream_id}] Panel {i+1} uploaded successfully")
        
        print(f"[{dream_id}] ===== PANEL {i+1} THREAD COMPLETED =====")
        return panel_path
        
    except Exception as e:
        print(f"[{dream_id}] ===== PANEL {i+1} THREAD FAILED =====")
        print(f"[{dream_id}] Error in Panel {i+1}: {e}")
        print(f"[{dream_id}] Error type: {type(e)}")
        import traceback
        print(f"[{dream_id}] Full traceback for Panel {i+1}:")
        traceback.print_exc()
        return None


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
        panel_data = get_panel_descriptions(story, num_panels, style_description)
        print(f"[{dream_id}] get_panel_descriptions returned: {panel_data}")

        # ------handle errors-------#
        if panel_data.get("status") == "error":
            print(f"Error from LLM: {panel_data.get('message')}")
            supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
            return

        panels = panel_data.get("panels")
        if not panels:
            print("Error: The LLM did not return any panels.")
            supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()
            return

        print(f"[{dream_id}] Successfully got {len(panels)} panels")
        print(f"[{dream_id}] Panel data structure:")
        for i, panel in enumerate(panels):
            print(f"[{dream_id}] Panel {i+1}: type={type(panel)}, value={panel}")

        title = panel_data.get("title", "Untitled Dream")
        if not title:
            title = "Untitled Dream"
        
        #--------update supabase with new title------------#
        print(f"[{dream_id}] Updating title to: {title}")
        supabase.from_("comics").update({"title": title}).eq("id", dream_id).execute()

        #--------set up and start parallel flow-------#
        print(f"[{dream_id}] Setting up parallel tasks...")
        comic_seed = random.randint(0, 2**32 - 1)
        print(f"[{dream_id}] Generated seed: {comic_seed}")
        
        panel_tasks = [(i, p, user_id, dream_id, avatar_b64, comic_seed) for i, p in enumerate(panels)]
        print(f"[{dream_id}] Created {len(panel_tasks)} panel tasks")
        
        image_paths = []
        
        print(f"[{dream_id}] Starting ThreadPoolExecutor with max_workers=2...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            print(f"[{dream_id}] Executor created, submitting tasks...")
            results = executor.map(generate_single_panel, panel_tasks)
            print(f"[{dream_id}] Tasks submitted, collecting results...")
            image_paths = list(results)
            print(f"[{dream_id}] Collected {len(image_paths)} results")

        print(f"[{dream_id}] Filtering out None results...")
        image_paths = [path for path in image_paths if path is not None]
        print(f"[{dream_id}] Final image_paths count: {len(image_paths)}")

        #-----update supabase with comics and complete status---------#
        print(f"[{dream_id}] Updating database with completion status...")
        supabase.from_("comics").update({
            "status": "complete",
            "image_urls": image_paths,
            "panel_count": len(panels)
        }).eq("id", dream_id).execute()
        
        print(f"[{dream_id}] ===== WORKER FUNCTION COMPLETED SUCCESSFULLY =====")

    except Exception as e:
        print(f"[{dream_id}] ===== WORKER FUNCTION FAILED =====")
        print(f"[{dream_id}] An error occurred: {e}")
        print(f"[{dream_id}] Error type: {type(e)}")
        import traceback
        print(f"[{dream_id}] Full traceback:")
        traceback.print_exc()
        supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()


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
        generated_image_bytes = generate_avatar_from_image(image_bytes, prompt)
        if not generated_image_bytes:
            raise Exception("Image generation failed to return data.")

        # 2. Upload the new avatar to Supabase Storage
        file_path = f"{user_id}/avatar_{int(time.time())}.png"
        print(f"--- Worker uploading avatar to: {file_path} ---")
        supabase.storage.from_("avatars").upload(
            path=file_path,
            file=generated_image_bytes,
            file_options={"content-type": "image/png"}
        )

        # 3. Finalize the database records by calling the edge function
        print("--- Worker calling finalize-avatar edge function ---")
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
        supabase.from_("avatar_generations").update({"status": "complete"}).eq("job_id", job_id).execute()
        print(f"--- ✅ Background avatar generation complete for user {user_id} ---")

    except Exception as e:
        print(f"--- ❗️ Background avatar generation failed: {e} ---")
        # Here you could add logic to update a status in your database to 'error'


def run_debug_worker():
    """A simple test function to see if the worker is running at all."""
    print("--- ✅ DEBUG WORKER HAS STARTED ---")
    print(f"--- Worker's Current Directory: {os.getcwd()} ---")
    print("--- ✅ DEBUG WORKER FINISHED ---")

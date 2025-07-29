# worker.py

import concurrent.futures
import time
import base64
from .db_client import supabase
from .api_clients import get_panel_descriptions, generate_image, generate_avatar_from_image
from .prompt_builder import build_image_prompt

# --- This is a helper function to generate a single panel ---
def generate_single_panel(panel_info: tuple):
    """Generates a single panel and returns its public URL."""
    i, panel, user_id, dream_id, character_sheet, style, avatar = panel_info
    print(f"[{dream_id}] Thread started for Panel {i+1}...")



    # Here you would build your final prompt and call the services
    final_prompt = build_image_prompt(panel, character_sheet)
    image_bytes = generate_image(final_prompt, avatar)
    
    # Upload to Supabase Storage
    panel_path = f"{user_id}/{dream_id}/{i+1}.png"
    supabase.storage.from_("comics").upload(panel_path, image_bytes, {"content-type": "image/png"})
    
    print(f"[{dream_id}] Thread finished for Panel {i+1}.")
    
    return panel_path


# --- This is the main worker function ---
def run_comic_generation_worker(dream_id: str, user_id: str, story: str, num_panels: int, style_name: str, avatar_b64):
    try:
        print(f"[{dream_id}] Worker started for user {user_id}.")

        panel_data = get_panel_descriptions(story, num_panels, style_name)

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

        character_sheet = panel_data.get("character_sheet", "follow reference image")
        if not character_sheet:
            print("No character sheet loaded")
            character_sheet = "Follow reference image"

        title = panel_data.get("title", "Untitled Dream")
        if not title:
            title = "Untitled Dream"
        
        #--------update supabase with new title------------#
        supabase.from_("comics").update({"title": title}).eq("id", dream_id).execute()

        #--------set up and start parallel flow-------#
        panel_tasks = [(i, p, user_id, dream_id, character_sheet, style_name, avatar_b64) for i, p in enumerate(panels)]
        image_paths = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            results = executor.map(generate_single_panel, panel_tasks)
            image_paths = list(results)

        #-----update supabase with comics and complete status---------#
        supabase.from_("comics").update({
            "status": "complete",
            "image_urls": image_paths,
            "panel_count": len(panels)
        }).eq("id", dream_id).execute()
        
        print(f"[{dream_id}] Worker finished successfully.")

    except Exception as e:
        print(f"[{dream_id}] An error occurred: {e}")
        supabase.from_("comics").update({"status": "error"}).eq("id", dream_id).execute()


def run_avatar_generation_worker(user_id: str, prompt: str, image_b64: str):
    """
    A background worker that handles the entire avatar generation process.
    """
    print(f"--- Starting background avatar generation for user {user_id} ---")
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
                    "styleName": prompt,
                    "avatarPath": file_path,
                }
            }
        )
        print(f"--- ✅ Background avatar generation complete for user {user_id} ---")

    except Exception as e:
        print(f"--- ❗️ Background avatar generation failed: {e} ---")
        # Here you could add logic to update a status in your database to 'error'

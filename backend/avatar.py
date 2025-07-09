import base64
import os
from openai import OpenAI

client = OpenAI(api_key="add if need to test")

prompt = """
a vibrant, whimsical, and heartwarming portrait in the Studio Ghibli art style, 
with soft, painterly textures and a touch of fantasy.
"""

result = client.images.edit(
    model="gpt-image-1",
    image=[
        open("kenan.jpg", "rb"),
    ],
    prompt=prompt
)

image_base64 = result.data[0].b64_json
image_bytes = base64.b64decode(image_base64)

# Save the image to a file
with open("ghibli.png", "wb") as f:
    f.write(image_bytes)

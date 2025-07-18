from flask import Flask, request, jsonify
import requests
import os
from openai import OpenAI
from flask_cors import CORS
import jwt # <-- Import the jwt library
from dotenv import load_dotenv # <-- Import dotenv
import base64

#load_dotenv() # <-- Load .env variables

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

@app.route('/generate_avatar', methods=['POST'])
def generate_avatar():
    # --- Check for Authorization header ---
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Authorization header is required'}), 401

    try:
        token = auth_header.split(" ")[1]
        jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience='authenticated')
    except Exception as e:
        return jsonify({'error': f'Invalid token: {str(e)}'}), 401
    
    # Inside the generate_avatar function
    try:
        data = request.json
        image_url = data.get('image_url')
        prompt = data.get('prompt', 'a vibrant, whimsical, and heartwarming portrait in the Studio Ghibli art style...')
        
        if not image_url:
            return jsonify({'error': 'image_url is required'}), 400
        
        # Download the image content directly into memory
        response = requests.get(image_url)
        response.raise_for_status()
        image_bytes = response.content # <-- Get image data as bytes

        image_to_send = ("user_image.jpg", image_bytes)
        # Generate the avatar using the in-memory bytes
        result = client.images.edit(
            model="gpt-image-1",
            image=[image_to_send], # <-- Pass the bytes directly
            prompt=prompt,
            n=1,
            size="1024x1024"
        )
        
        image_base64 = result.data[0].b64_json

        return jsonify({
            'b64_json': image_base64,
            'status': 'success'
        })
        
    except Exception as e:
        print(f"Error generating avatar: {str(e)}")
        return jsonify({'error': str(e)}), 500

    
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True) 
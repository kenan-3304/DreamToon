from pydantic import BaseModel

class DeleteAvatarRequest(BaseModel):
    avatar_path: str

class AvatarRequest(BaseModel):
    user_photo_b64: str
    prompt: str
    name: str

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class Register(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PredictInput(BaseModel):
    # One gesture is represented by exactly 30 frames x 126 features.
    # Validation of the exact dimensions is performed in prediction.py.
    sequence: list[list[float]] = Field(default_factory=list)
    # Retained for compatibility with older frontend code.
    landmarks: list = Field(default_factory=list)


class ProgressInput(BaseModel):
    lesson_key: str = Field(min_length=1, max_length=100)
    score: Optional[float] = Field(default=None, ge=0, le=100)
    completed: bool = False


class SettingsInput(BaseModel):
    preferred_voice: Optional[str] = Field(default=None, max_length=150)
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    theme: str = Field(default="light", pattern="^(light|dark|system)$")

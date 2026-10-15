import os
import base64
from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Mindora — AI Mental Wellness Companion API")

# Allow React Frontend (localhost:5173) to talk to FastAPI (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
GEMMA_MODEL = os.getenv("GEMMA_MODEL", "gemma2:2b")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")

# 1. Safety Screening Keywords
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die",
    "self harm", "self-harm", "hurt myself", "no reason to live",
    "better off dead", "can't go on"
]

# 2. Gemma System Instructions
SYSTEM_PROMPT = """You are Mindora, a warm, empathetic, non-judgmental AI mental-wellness companion.
CRITICAL RULES:
1. You are NOT a psychiatrist, therapist, or doctor. Never diagnose conditions or prescribe treatments.
2. Keep responses concise (2 to 4 warm sentences) so they sound natural when spoken aloud.
3. Validate the user's emotions first, then ask ONLY ONE gentle follow-up question OR suggest ONE small, manageable action step.
4. Adapt naturally to the user's preferred language (English, Hindi, or Hinglish).
"""

class CheckInData(BaseModel):
    mood: Optional[str] = "Not specified"
    stressFrequency: Optional[str] = "Not specified"
    triggers: Optional[List[str]] = []
    sleep: Optional[str] = "Not specified"
    dailyImpact: Optional[str] = "Not specified"
    preferredSupport: Optional[str] = "Just listen"
    language: Optional[str] = "English"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    checkIn: CheckInData
    history: List[ChatMessage] = []
    voiceEnabled: bool = True

def is_crisis(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in CRISIS_KEYWORDS)

# 3. Helper Function: Send Gemma's text to ElevenLabs and get MP3 audio back
async def generate_elevenlabs_audio(text: str) -> Optional[str]:
    if not ELEVENLABS_API_KEY or "paste_your_key" in ELEVENLABS_API_KEY:
        return None  # Frontend will smoothly use browser voice if no API key is set

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_flash_v2_5",  # Fast, low-latency model that uses 50% fewer credits!
        "voice_settings": {
            "stability": 0.65,
            "similarity_boost": 0.75
        },
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code == 200:
                return base64.b64encode(res.content).decode("utf-8")
            else:
                print(f"ElevenLabs API status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"ElevenLabs error: {e}")
    return None

# 4. Endpoint 1: Emotional Check-In -> Non-Diagnostic Reflection + Opening Greeting
@app.post("/session/check-in")
async def session_checkin(data: CheckInData):
    triggers_str = ", ".join(data.triggers) if data.triggers else "everyday pressures"
    reflection = (
        f"You've shared that you're feeling {data.mood.lower()} with {data.stressFrequency.lower()} stress "
        f"connected to {triggers_str.lower()}, alongside {data.sleep.lower()} sleep. "
        f"Since you'd like me to '{data.preferredSupport.lower()}', let's take this one gentle step at a time."
    )
    prompt = (
        f"User Check-in: Mood={data.mood}, Stress={data.stressFrequency}, "
        f"Triggers={triggers_str}, Sleep={data.sleep}, Impact={data.dailyImpact}, "
        f"Support Goal={data.preferredSupport}, Language={data.language}. "
        f"Write a warm, 2-sentence opening message welcoming them and asking what feels heaviest right now."
    )
    opening_reply = (
        f"Thank you for checking in with yourself today. I can see that {triggers_str.lower()} and your sleep "
        f"have been weighing on you—what part of this feels most urgent to talk through right now?"
    )
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.post(
                OLLAMA_URL,
                json={
                    "model": GEMMA_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                },
            )
            if res.status_code == 200:
                opening_reply = res.json().get("message", {}).get("content", opening_reply)
    except Exception as e:
        print(f"Ollama check-in note (using fallback greeting): {e}")

    audio_b64 = await generate_elevenlabs_audio(opening_reply)
    return {
        "reflection": reflection,
        "opening_message": opening_reply,
        "audio_base64": audio_b64,
    }

# 5. Endpoint 2: Chat Message -> Safety Check -> Gemma Brain -> ElevenLabs Voice
@app.post("/session/chat")
async def session_chat(req: ChatRequest):
    if is_crisis(req.message):
        crisis_reply = (
            "I hear how much pain and heaviness you are carrying right now, and I want you to be safe. "
            "Because I am an AI wellness companion and not a crisis professional, please reach out to "
            "a live human helpline right now—such as Tele-MANAS (14416 in India) or 988. "
            "You do not have to carry this alone."
        )
        return {
            "reply": crisis_reply,
            "is_crisis": True,
            "audio_base64": None,
        }

    context_header = (
        f"[User Context: Mood={req.checkIn.mood}, Triggers={', '.join(req.checkIn.triggers)}, "
        f"Sleep={req.checkIn.sleep}, Goal={req.checkIn.preferredSupport}, Language={req.checkIn.language}]"
    )
    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}\n{context_header}"}]
    for msg in req.history[-8:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})

    reply_text = (
        "Thank you for sharing that with me. It makes complete sense that you're feeling stretched thin right now. "
        "When you think about everything on your plate today, what is one tiny thing we could set aside so you can breathe?"
    )

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            res = await client.post(
                OLLAMA_URL,
                json={"model": GEMMA_MODEL, "messages": messages, "stream": False},
            )
            if res.status_code == 200:
                reply_text = res.json().get("message", {}).get("content", reply_text)
    except Exception as e:
        print(f"Ollama chat note: {e}")

    audio_b64 = await generate_elevenlabs_audio(reply_text) if req.voiceEnabled else None
    return {
        "reply": reply_text,
        "is_crisis": False,
        "audio_base64": audio_b64,
    }
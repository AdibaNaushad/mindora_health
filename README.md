
# 🌿 Mindora — AI Mental Wellness Companion

> **A comforting, voice-first AI reflection space powered by Google Gemma (via Ollama) and ElevenLabs.**

![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=flat-square&logo=react)
![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI_(Python)-009688?style=flat-square&logo=fastapi)
![Gemma](https://img.shields.io/badge/AI_Brain-Google_Gemma_(Ollama)-4285F4?style=flat-square&logo=google)
![ElevenLabs](https://img.shields.io/badge/Voice_TTS-ElevenLabs_API-000000?style=flat-square)

---

## ✨ Overview

**Mindora** is a supportive AI mental-wellness companion designed to help people unpack everyday stress—such as academic pressure, career uncertainty, relationship friction, or low confidence—through a gentle, structured journey and comforting spoken voice conversation.

Instead of acting like a cold chatbot or making clinical diagnoses, Mindora guides users through a complete 4-step emotional grounding flow:
1. **Welcome & Session Preferences** (Language & Voice/Text mode)
2. **Non-Diagnostic Emotional Check-In** (6 skippable reflection cards)
3. **Empathetic Voice Conversation** (Powered by **Gemma** for reasoning + **ElevenLabs** for realistic human speech)
4. **Session Closure & Grounding** (Interactive 4-4-4 box breathing, 1 manageable next step, and a closing journal prompt)

---

## 🛡️ Ethical Boundaries & Safety Guardrails

Mindora is intentionally built as a **mental-wellness companion**, **NOT** a psychiatrist, therapist, or medical device.
* **No Fake Clinical Scores:** Instead of arbitrary numerical stress gauges, Mindora provides qualitative, non-diagnostic reflections based on what the user shares.
* **Crisis Safety Pathway:** Every user message is screened before normal AI processing. If indicators of severe distress or self-harm are detected, normal AI advice pauses immediately and a dedicated **24/7 Human Crisis Helpline Banner** (including **Tele-MANAS 14416** in India, **Vandrevala Foundation**, and **988**) is surfaced.
* **Session Privacy & 1-Click Wipe:** Conversations live only in the active session and can be cleared instantly with a single click.

---

## 🏗️ System Architecture

```text
+-------------------------------------------------------------------------+
|                   React + Tailwind CSS Frontend (SPA)                   |
|   • 6-Card Check-In   • Animated Voice Orb   • 4-4-4 Breathing Pacer    |
+------------------------------------+------------------------------------+
                                     |
                           REST JSON / Base64 Audio
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      Python FastAPI Backend Server                      |
|   • Input Validation   • Crisis Keyword Screening   • Context Builder   |
+-------------------+---------------------------------+-------------------+
                    |                                 |
      1. Prompt + Check-In Context          2. Approved Response Text
                    |                                 |
                    v                                 v
     +-----------------------------+   +-----------------------------+
     |   Google Gemma (via Ollama) |   |     ElevenLabs TTS API      |
     |       "The AI Brain"        |   |       "The AI Voice"        |
     |  • Empathetic reflection    |   |  • Ultra-low-latency audio  |
     |  • 1 question at a time     |   |    (eleven_flash_v2_5)      |
     |  • Practical next steps     |   |  • Graceful Web Speech      |
     +-----------------------------+   |    fallback if offline      |
                                       +-----------------------------+

```

### How the Technologies Work Together

| Component | Technology | Role in Mindora |
| --- | --- | --- |
| **Interface** | React 18, Vite, Tailwind CSS, Lucide Icons | Displays the pastel-green & warm cream workspace, check-in cards, audio orb, and breathing tool. |
| **Coordinator** | Python, FastAPI, Pydantic, HTTPX | Connects the UI to the AI services, enforces safety screening, and protects API keys on the server. |
| **The Brain** | Google Gemma (`gemma2:2b`) via Ollama | Interprets check-in context, validates feelings without judgment, and suggests realistic actions. |
| **The Voice** | ElevenLabs Text-to-Speech API + Web Speech API | Converts Gemma's written replies into natural, comforting spoken audio (plus mic Speech-to-Text input). |

---

## 🖥️ Key Features

* **🎨 Soothing Pastel-Green & Warm Cream UI:** Crafted with `#FAF8F5` Alabaster Cream and `#6B9080` Sage Green to avoid harsh, clinical hospital-white screens.
* **📋 6-Area Emotional Check-In:** Explores *Current Mood*, *Stress Frequency*, *Stress Triggers*, *Sleep Quality*, *Daily Impact*, and *Preferred Support Style* (*"Just listen"*, *"Help break down a problem"*, or *"Guide me through relaxation"*).
* **🎙️ Voice-First Interaction:** Supports microphone Speech-to-Text input and spoken audio replies with Play, Pause, and Replay controls.
* **🌐 Multilingual Support:** Supports **English**, **Hindi**, and **Hinglish** reflections.
* **🌬️ Interactive 4-4-4 Box Breathing Pacer:** Built-in visual breathing orb to help users physically ground themselves at any point during the session.
* **🔄 Resilient Demo Fallback:** Automatically detects whether the local FastAPI + Ollama server is running; if offline, smoothly falls back to browser speech synthesis so live demos never break.

---

## 📂 Project Structure

```text
mindora/
├── backend/
│   ├── main.py              # FastAPI server (/session/check-in & /session/chat)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── index.html           # Entry HTML with Plus Jakarta Sans & Lora fonts
│   ├── package.json         # Frontend dependencies & scripts
│   ├── tailwind.config.js   # Custom pastel-green & cream theme configuration
│   └── src/
│       ├── main.jsx         # React DOM entry
│       ├── index.css        # Tailwind imports & custom scrollbar styling
│       └── App.jsx          # Complete 4-step Mindora application
├── .gitignore               # Protects .env secrets and ignores node_modules
└── README.md                # Project documentation

```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

* **Node.js** (v18+ recommended)
* **Python** (v3.9+ recommended)
* **Ollama** installed locally ([Download Ollama](https://ollama.com/))
* **ElevenLabs API Key** (Optional — free tier available at [elevenlabs.io](https://elevenlabs.io/))

---

### 1. Clone the Repository

```bash
git clone [https://github.com/YOUR_USERNAME/mindora-ai-wellness-companion.git](https://github.com/YOUR_USERNAME/mindora-ai-wellness-companion.git)
cd mindora-ai-wellness-companion

```

### 2. Pull the Local Gemma Model via Ollama

Make sure Ollama is running on your machine and pull `gemma2:2b`:

```bash
ollama pull gemma2:2b

```

### 3. Set Up & Run the Python FastAPI Backend

Open a terminal and run:

```bash
cd backend
pip install -r requirements.txt

```

Create a `.env` file inside the `backend/` folder (copy from `.env.example`):

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
OLLAMA_URL=http://localhost:11434/api/chat
GEMMA_MODEL=gemma2:2b

```

Start the FastAPI server on port `8000`:

```bash
uvicorn main:app --reload --port 8000

```

*You can view the interactive Swagger API docs at `http://localhost:8000/docs`.*

### 4. Set Up & Run the React Frontend

Open a **second terminal** and run:

```bash
cd frontend
npm install
npm run dev

```

Open **`http://localhost:5173`** in your browser. The header badge will show **`FastAPI + Gemma Connected`**!

---

## 🔌 API Endpoints Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/session/check-in` | Accepts the user's 6 check-in answers, builds a non-diagnostic reflection, generates a personalized opening message via Gemma, and returns ElevenLabs audio (`base64`). |
| `POST` | `/session/chat` | Screens the user's message for urgent safety concerns, injects check-in context + conversation history into Gemma, and synthesizes the spoken reply via ElevenLabs. |

---

## ⚠️ Important Disclaimer

*Mindora is an educational and mental-wellness reflection project. It is not a medical service, clinical tool, or substitute for professional mental-health care. If you or someone you know is in crisis or experiencing thoughts of self-harm, please contact your local emergency services or a 24/7 crisis helpline immediately (such as **Tele-MANAS at 14416** in India or **988** in the US/Canada).*

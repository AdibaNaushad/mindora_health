import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Volume2, VolumeX, Mic, MicOff, Send, Trash2,
  ShieldAlert, HeartHandshake, CheckCircle2, ArrowRight,
  Wind, BookOpen, RefreshCw, Play, Pause, Globe, Server,
  MessageSquareHeart, Moon, Compass
} from 'lucide-react';

const CHECKIN_QUESTIONS = [
  {
    id: 'mood',
    area: 'Current Mood',
    question: 'How are you feeling today?',
    explores: 'Emotional state',
    options: ['Calm & Okay', 'A Bit Drained', 'Anxious / Restless', 'Overwhelmed', 'Low / Lonely', 'Frustrated']
  },
  {
    id: 'stressFrequency',
    area: 'Stress Frequency',
    question: 'How often have you felt stressed this week?',
    explores: 'How regularly stress occurs',
    options: ['Rarely', 'A few moments', 'Most days', 'Almost constantly']
  },
  {
    id: 'triggers',
    area: 'Stress Triggers',
    question: 'What is troubling you most right now?',
    explores: 'Work, studies, relationships, family, or other concerns',
    multi: true,
    options: ['Studies & Exams', 'Career / Work', 'Relationships', 'Family Conflict', 'Loneliness', 'Self-Confidence', 'Finances']
  },
  {
    id: 'sleep',
    area: 'Sleep Quality',
    question: 'How has your sleep been lately?',
    explores: 'A key factor affecting emotional well-being',
    options: ['Restful & steady', 'Staying up too late', 'Restless / waking up', 'Barely sleeping']
  },
  {
    id: 'dailyImpact',
    area: 'Daily Impact',
    question: 'Has this affected your daily routine or relationships?',
    explores: 'How much gentle support you may need today',
    options: ['Not much yet', 'Harder to focus', 'Pulling away from people', 'Feeling stuck in daily tasks']
  },
  {
    id: 'preferredSupport',
    area: 'Preferred Support',
    question: 'What kind of support feels most helpful right now?',
    explores: 'What you want from this session',
    options: ['Someone to listen without judgment', 'Help breaking down a problem', 'Guide me through relaxation']
  }
];

const CRISIS_TERMS = [
  'suicide', 'kill myself', 'end my life', 'want to die',
  'self harm', 'self-harm', 'hurt myself', 'no reason to live'
];

export default function App() {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState('English');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'demo'

  // Step 2: Check-in state
  const [checkInIndex, setCheckInIndex] = useState(0);
  const [checkIn, setCheckIn] = useState({
    mood: 'Overwhelmed',
    stressFrequency: 'Most days',
    triggers: ['Studies & Exams'],
    sleep: 'Staying up too late',
    dailyImpact: 'Harder to focus',
    preferredSupport: 'Help breaking down a problem'
  });
  const [reflectionText, setReflectionText] = useState('');

  // Step 3: Conversation & Voice state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);

  // Step 4 & Right Panel: Breathing & Closure
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Ready');
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [journalEntry, setJournalEntry] = useState('');
  const [checkedSteps, setCheckedSteps] = useState({});

  const audioRef = useRef(new Audio());
  const chatEndRef = useRef(null);

  // Check if local FastAPI backend is running
  useEffect(() => {
    fetch(`${backendUrl}/docs`, { method: 'HEAD' })
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('demo'));
  }, [backendUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 4-4-4 Box Breathing Timer
  useEffect(() => {
    if (!breathingActive) {
      setBreathPhase('Tap Start to Breathe');
      setBreathSeconds(4);
      return;
    }
    const phases = ['Inhale gently...', 'Hold softly...', 'Exhale slowly...'];
    let phaseIdx = 0;
    let sec = 4;
    setBreathPhase(phases[0]);
    setBreathSeconds(4);

    const interval = setInterval(() => {
      sec -= 1;
      if (sec <= 0) {
        phaseIdx = (phaseIdx + 1) % phases.length;
        sec = 4;
        setBreathPhase(phases[phaseIdx]);
      }
      setBreathSeconds(sec);
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingActive]);

  // Speak via ElevenLabs base64 audio OR fallback to Web Speech TTS
  const speakResponse = (text, audioBase64 = null) => {
    if (!voiceEnabled) return;
    window.speechSynthesis?.cancel();

    if (audioBase64) {
      audioRef.current.src = `data:audio/mpeg;base64,${audioBase64}`;
      setIsSpeaking(true);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.play().catch(() => setIsSpeaking(false));
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.94;
      utterance.pitch = 1.02;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    audioRef.current.pause();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // Microphone Speech-to-Text
  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is supported in Chrome and Edge browsers.');
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'Hindi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Complete Check-In & Start Conversation
  const finishCheckIn = async () => {
    const triggersList = checkIn.triggers.length ? checkIn.triggers.join(' & ') : 'everyday responsibilities';
    const localReflection = `You've mentioned ${checkIn.stressFrequency.toLowerCase()} stress related to ${triggersList.toLowerCase()} and ${checkIn.sleep.toLowerCase()} sleep. Let's explore which part feels most urgent to you today.`;
    setReflectionText(localReflection);
    setStep(3);
    setIsLoading(true);

    try {
      const res = await fetch(`${backendUrl}/session/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...checkIn, language })
      });
      if (res.ok) {
        const data = await res.json();
        setReflectionText(data.reflection);
        const initialMsg = { role: 'assistant', content: data.opening_message };
        setMessages([initialMsg]);
        speakResponse(data.opening_message, data.audio_base64);
        setIsLoading(false);
        return;
      }
    } catch {
      // Fallback if FastAPI isn't started yet
    }

    const fallbackGreeting = `Thank you for checking in with yourself. You've noted feeling ${checkIn.mood.toLowerCase()} with pressure around ${triggersList.toLowerCase()} and ${checkIn.sleep.toLowerCase()} sleep. Since your goal is "${checkIn.preferredSupport.toLowerCase()}", what is weighing on your mind the most right now?`;
    setMessages([{ role: 'assistant', content: fallbackGreeting }]);
    speakResponse(fallbackGreeting);
    setIsLoading(false);
  };

  // Send User Message to Gemma / FastAPI
  const handleSend = async (customText = null) => {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg = { role: 'user', content: textToSend };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');

    // Safety crisis check
    if (CRISIS_TERMS.some((term) => textToSend.toLowerCase().includes(term))) {
      setCrisisDetected(true);
      const safetyMsg = {
        role: 'assistant',
        content:
          'I hear how much pain and heaviness you are carrying right now, and your safety matters deeply. Because I am an AI wellness companion and not a medical or crisis service, please reach out to one of the 24/7 human helplines shown above right away. You do not have to go through this alone.'
      };
      setMessages([...updatedHistory, safetyMsg]);
      speakResponse(safetyMsg.content);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${backendUrl}/session/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          checkIn: { ...checkIn, language },
          history: messages,
          voiceEnabled
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_crisis) setCrisisDetected(true);
        setMessages([...updatedHistory, { role: 'assistant', content: data.reply }]);
        speakResponse(data.reply, data.audio_base64);
        setIsLoading(false);
        return;
      }
    } catch {
      // Fallback local empathetic response when backend is offline
    }

    setTimeout(() => {
      const fallbackReply = `It makes complete sense that "${textToSend.slice(0, 45)}..." feels heavy right now—especially when your sleep has been ${checkIn.sleep.toLowerCase()}. If we break this down into just the next 2 hours today, what is one small boundary or tiny step that would bring you 10% more relief?`;
      setMessages([...updatedHistory, { role: 'assistant', content: fallbackReply }]);
      speakResponse(fallbackReply);
      setIsLoading(false);
    }, 650);
  };

  const resetSession = () => {
    stopSpeaking();
    setMessages([]);
    setCrisisDetected(false);
    setCheckInIndex(0);
    setJournalEntry('');
    setStep(1);
  };

  const currentQ = CHECKIN_QUESTIONS[checkInIndex];

  const handleSelectOption = (option) => {
    if (currentQ.multi) {
      const exists = checkIn.triggers.includes(option);
      const updated = exists
        ? checkIn.triggers.filter((t) => t !== option)
        : [...checkIn.triggers, option];
      setCheckIn({ ...checkIn, triggers: updated });
    } else {
      setCheckIn({ ...checkIn, [currentQ.id]: option });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#2C3E35]">
      {/* Top Header */}
      <header className="border-b border-[#E6E0D3] bg-[#FAF8F5]/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#6B9080] text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-semibold text-xl tracking-tight text-[#2C3E35]">Mindora</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E3EFE6] text-[#4A6B5D] font-medium">
                AI Wellness Companion
              </span>
            </div>
            <p className="text-xs text-[#5C6F65]">Gemma + ElevenLabs Voice Reflection • Non-Clinical</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
              backendStatus === 'online'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-[#F3EFE6] border-[#E6E0D3] text-[#5C6F65]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            {backendStatus === 'online' ? 'FastAPI + Gemma Connected' : 'Local Demo Mode (FastAPI Optional)'}
          </span>

          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 border transition ${
              voiceEnabled
                ? 'bg-[#E3EFE6] border-[#A3C9A8] text-[#2C3E35]'
                : 'bg-[#F3EFE6] border-[#E6E0D3] text-[#5C6F65]'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-[#6B9080]" /> : <VolumeX className="w-4 h-4" />}
            {voiceEnabled ? 'Voice On' : 'Text Only'}
          </button>

          <button
            onClick={resetSession}
            className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-[#5C6F65] hover:text-red-700 border border-[#E6E0D3] flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Session
          </button>
        </div>
      </header>

      {/* Urgent Crisis Banner */}
      {crisisDetected && (
        <div className="bg-amber-50 border-b border-amber-300 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-amber-950 text-sm">
                You don't have to carry this alone — Immediate Human Support is Available
              </h2>
              <p className="text-xs text-amber-900 mt-0.5">
                Mindora is a wellness companion, not a crisis service. Please connect with a trained counselor right now:
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-950">
              🇮🇳 Tele-MANAS: <strong>14416</strong> or <strong>1800-891-4416</strong> (24/7)
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-950">
              🇮🇳 Vandrevala Helpline: <strong>+91 9999 666 555</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-950">
              🌍 US/Global Crisis Line: <strong>988</strong>
            </span>
          </div>
        </div>
      )}

      {/* Main 3-Column Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-6">
        {/* LEFT SIDEBAR: Journey Steps & Privacy */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-[#F3EFE6] border border-[#E6E0D3] rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6F65]">Session Journey</p>
            {[
              { id: 1, title: '1. Welcome & Preferences', desc: 'Language & voice setup' },
              { id: 2, title: '2. Emotional Check-In', desc: '6 gentle reflection cards' },
              { id: 3, title: '3. Share & Voice Companion', desc: 'Gemma + ElevenLabs chat' },
              { id: 4, title: '4. Summary & Relaxation', desc: 'Next steps & breathing' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setStep(item.id)}
                className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between ${
                  step === item.id
                    ? 'bg-white border-[#6B9080] shadow-sm'
                    : 'bg-[#FAF8F5]/60 border-transparent hover:border-[#E6E0D3]'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-[#2C3E35]">{item.title}</p>
                  <p className="text-xs text-[#5C6F65]">{item.desc}</p>
                </div>
                {step > item.id && <CheckCircle2 className="w-4 h-4 text-[#6B9080] shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#E6E0D3] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[#4A6B5D] font-semibold text-xs">
              <HeartHandshake className="w-4 h-4" />
              Companion Boundary
            </div>
            <p className="text-xs text-[#5C6F65] leading-relaxed">
              Mindora is a supportive space for everyday reflection—not a psychiatrist, medical device, or clinical diagnosis tool.
            </p>
            <button
              onClick={() => setCrisisDetected((prev) => !prev)}
              className="w-full mt-1 text-xs py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-medium transition"
            >
              {crisisDetected ? 'Hide Crisis Helplines' : 'Need Urgent Helpline Numbers?'}
            </button>
          </div>
        </aside>

        {/* CENTER STAGE */}
        <section className="lg:col-span-6 flex flex-col">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="bg-white border border-[#E6E0D3] rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3EFE6] text-[#4A6B5D] text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Step 1 of 4 • Safe Space
              </div>
              <div className="space-y-2">
                <h2 className="font-serif text-2xl lg:text-3xl font-semibold text-[#2C3E35]">
                  Take a slow breath. What’s on your mind today?
                </h2>
                <p className="text-sm text-[#5C6F65] leading-relaxed">
                  Share everyday stressors, untangle overwhelming thoughts, and hear calm, practical reflections spoken aloud.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E0D3] space-y-2">
                  <label className="text-xs font-semibold text-[#5C6F65] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#6B9080]" /> Preferred Language
                  </label>
                  <div className="flex gap-2">
                    {['English', 'Hindi', 'Hinglish'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                          language === lang
                            ? 'bg-[#6B9080] text-white border-[#6B9080]'
                            : 'bg-white text-[#2C3E35] border-[#E6E0D3]'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E0D3] space-y-2">
                  <label className="text-xs font-semibold text-[#5C6F65] flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#6B9080]" /> Conversation Style
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVoiceEnabled(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        voiceEnabled
                          ? 'bg-[#6B9080] text-white border-[#6B9080]'
                          : 'bg-white text-[#2C3E35] border-[#E6E0D3]'
                      }`}
                    >
                      Voice + Text
                    </button>
                    <button
                      onClick={() => setVoiceEnabled(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${
                        !voiceEnabled
                          ? 'bg-[#6B9080] text-white border-[#6B9080]'
                          : 'bg-white text-[#2C3E35] border-[#E6E0D3]'
                      }`}
                    >
                      Quiet Text
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F3EFE6]/70 border border-[#E6E0D3] text-xs text-[#5C6F65] space-y-1">
                <p className="font-semibold text-[#2C3E35]">🔒 Privacy & Transparency Promise</p>
                <p>
                  Your check-in and conversation stay inside your active session. You can clear everything with one click at any time.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#6B9080] hover:bg-[#4A6B5D] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition"
              >
                Begin Emotional Check-In <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: EMOTIONAL & STRESS CHECK-IN */}
          {step === 2 && (
            <div className="bg-white border border-[#E6E0D3] rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#E3EFE6] text-[#4A6B5D]">
                  Question {checkInIndex + 1} of {CHECKIN_QUESTIONS.length} • {currentQ.area}
                </span>
                <button
                  onClick={finishCheckIn}
                  className="text-xs text-[#5C6F65] hover:text-[#2C3E35] underline"
                >
                  Skip to conversation
                </button>
              </div>

              <div className="space-y-1">
                <h2 className="font-serif text-2xl font-semibold text-[#2C3E35]">{currentQ.question}</h2>
                <p className="text-xs text-[#5C6F65]">Helps explore: {currentQ.explores}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQ.options.map((option) => {
                  const isSelected = currentQ.multi
                    ? checkIn.triggers.includes(option)
                    : checkIn[currentQ.id] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => handleSelectOption(option)}
                      className={`p-3.5 rounded-2xl text-left text-sm font-medium border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#E3EFE6] border-[#6B9080] text-[#2C3E35] shadow-sm'
                          : 'bg-[#FAF8F5] border-[#E6E0D3] text-[#2C3E35] hover:bg-[#F3EFE6]'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#6B9080]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E6E0D3]">
                <button
                  disabled={checkInIndex === 0}
                  onClick={() => setCheckInIndex((i) => Math.max(0, i - 1))}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-[#E6E0D3] disabled:opacity-40"
                >
                  Previous
                </button>

                {checkInIndex < CHECKIN_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setCheckInIndex((i) => i + 1)}
                    className="px-5 py-2.5 rounded-xl bg-[#6B9080] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    Next Question <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={finishCheckIn}
                    className="px-6 py-2.5 rounded-xl bg-[#6B9080] hover:bg-[#4A6B5D] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    Complete Check-In & Talk <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: CONVERSATION & VOICE COMPANION */}
          {step === 3 && (
            <div className="bg-white border border-[#E6E0D3] rounded-3xl p-4 lg:p-6 shadow-sm flex flex-col h-[640px]">
              {/* Voice Companion Orb Bar */}
              <div className="bg-[#F3EFE6] border border-[#E6E0D3] rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full bg-[#6B9080] text-white flex items-center justify-center transition-all ${
                      isSpeaking ? 'scale-110 ring-4 ring-[#A3C9A8]/60 animate-pulse' : ''
                    }`}
                  >
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#2C3E35]">
                      {isSpeaking ? 'Mindora is speaking...' : 'Mindora Voice Companion Ready'}
                    </p>
                    <p className="text-[11px] text-[#5C6F65]">
                      Gemma empathetic reasoning + Spoken voice synthesis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <button
                      onClick={stopSpeaking}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#E6E0D3] text-xs font-medium flex items-center gap-1"
                    >
                      <Pause className="w-3.5 h-3.5" /> Stop Voice
                    </button>
                  ) : (
                    messages.length > 0 && (
                      <button
                        onClick={() => speakResponse(messages[messages.length - 1].content)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#E6E0D3] text-xs font-medium flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Replay Last
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setStep(4)}
                    className="px-3 py-1.5 rounded-xl bg-[#6B9080] text-white text-xs font-medium"
                  >
                    Wrap Up Session →
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#6B9080] text-white rounded-br-sm'
                          : 'bg-[#FAF8F5] border border-[#E6E0D3] text-[#2C3E35] rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#FAF8F5] border border-[#E6E0D3] rounded-2xl px-4 py-3 text-xs text-[#5C6F65] flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6B9080]" />
                      Mindora is reflecting gently...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Starter Chips */}
              <div className="flex gap-1.5 overflow-x-auto py-2">
                {[
                  'I feel overwhelmed by deadlines and cannot focus.',
                  'I had an argument with someone close to me.',
                  'My mind keeps racing when I try to sleep.'
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-[#FAF8F5] hover:bg-[#E3EFE6] border border-[#E6E0D3] text-[#4A6B5D] transition"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <div className="pt-2 border-t border-[#E6E0D3] flex items-center gap-2">
                <button
                  onClick={toggleMic}
                  title="Speak with Microphone"
                  className={`p-3 rounded-2xl border transition ${
                    isListening
                      ? 'bg-red-500 text-white border-red-500 animate-pulse'
                      : 'bg-[#FAF8F5] border-[#E6E0D3] text-[#4A6B5D] hover:bg-[#E3EFE6]'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Share what's on your mind, or tap the mic to speak..."
                  className="flex-1 bg-[#FAF8F5] border border-[#E6E0D3] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#6B9080]"
                />
                <button
                  onClick={() => handleSend()}
                  className="p-3 rounded-2xl bg-[#6B9080] hover:bg-[#4A6B5D] text-white transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SESSION SUMMARY & RELAXATION */}
          {step === 4 && (
            <div className="bg-white border border-[#E6E0D3] rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3EFE6] text-[#4A6B5D] text-xs font-medium">
                <Compass className="w-3.5 h-3.5" /> Step 4 of 4 • Grounding & Closure
              </div>
              <h2 className="font-serif text-2xl font-semibold text-[#2C3E35]">
                Your Gentle Session Reflection
              </h2>
              <p className="text-sm text-[#4A6B5D] bg-[#FAF8F5] border border-[#E6E0D3] rounded-2xl p-4 leading-relaxed font-serif italic">
                "{reflectionText || `Today you paused to acknowledge feeling ${checkIn.mood.toLowerCase()} around ${checkIn.triggers.join(', ')}. Giving yourself permission to slow down is already a meaningful first step.`}"
              </p>

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5C6F65]">
                  Manageable Next Steps (Pick Just One)
                </h3>
                {[
                  `Set a gentle 20-minute timer for one small task related to ${checkIn.triggers[0] || 'your priority'}, then stop.`,
                  'Drink a glass of water and step away from screens for 5 quiet minutes.',
                  'Write down the single heaviest thought on paper before bed so your mind doesn’t have to hold it.'
                ].map((action, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E6E0D3] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedSteps[idx]}
                      onChange={() => setCheckedSteps({ ...checkedSteps, [idx]: !checkedSteps[idx] })}
                      className="mt-1 accent-[#6B9080]"
                    />
                    <span className="text-sm text-[#2C3E35]">{action}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5C6F65] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#6B9080]" /> Optional Closing Journal Prompt
                </label>
                <p className="text-xs text-[#5C6F65]">
                  "What is one kind thing I can tell myself tonight without needing to fix everything at once?"
                </p>
                <textarea
                  rows={3}
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                  placeholder="Write a few honest words for yourself..."
                  className="w-full rounded-2xl bg-[#FAF8F5] border border-[#E6E0D3] p-3.5 text-sm focus:outline-none focus:border-[#6B9080]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E0D3] text-xs font-semibold"
                >
                  ← Back to Conversation
                </button>
                <button
                  onClick={resetSession}
                  className="px-5 py-2.5 rounded-xl bg-[#6B9080] text-white text-xs font-semibold"
                >
                  Finish & Clear Session
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: NON-DIAGNOSTIC REFLECTION & BREATHING PACER */}
        <aside className="lg:col-span-3 space-y-4">
          {/* Qualitative Check-In Summary */}
          <div className="bg-white border border-[#E6E0D3] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4A6B5D]">
              <MessageSquareHeart className="w-4 h-4 text-[#6B9080]" />
              Current Check-In Snapshot
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D3]">
                Mood: <strong>{checkIn.mood}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D3]">
                Stress: <strong>{checkIn.stressFrequency}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D3]">
                Sleep: <strong>{checkIn.sleep}</strong>
              </span>
            </div>
            <p className="text-[11px] text-[#5C6F65] leading-relaxed">
              <strong>Support Goal:</strong> {checkIn.preferredSupport}
            </p>
          </div>

          {/* Interactive 4-4-4 Breathing Exercise */}
          <div className="bg-[#F3EFE6] border border-[#E6E0D3] rounded-2xl p-4 text-center space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-[#4A6B5D]">
              <span className="flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-[#6B9080]" /> 4-4-4 Calm Breathing
              </span>
              <Moon className="w-3.5 h-3.5 text-[#6B9080]" />
            </div>

            <div className="py-4 flex flex-col items-center justify-center">
              <div
                className={`w-28 h-28 rounded-full bg-[#E3EFE6] border-2 border-[#6B9080] flex flex-col items-center justify-center transition-all duration-1000 ${
                  breathingActive && breathPhase.includes('Inhale')
                    ? 'scale-110 bg-[#A3C9A8]/50'
                    : breathingActive && breathPhase.includes('Exhale')
                    ? 'scale-90'
                    : 'scale-100'
                }`}
              >
                <span className="text-xs font-semibold text-[#2C3E35] px-2">{breathPhase}</span>
                {breathingActive && (
                  <span className="text-lg font-serif font-bold text-[#4A6B5D] mt-0.5">
                    {breathSeconds}s
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setBreathingActive(!breathingActive)}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-[#E3EFE6] border border-[#E6E0D3] text-xs font-semibold text-[#2C3E35] transition"
            >
              {breathingActive ? 'Pause Breathing Exercise' : 'Start 1-Minute Breathing'}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
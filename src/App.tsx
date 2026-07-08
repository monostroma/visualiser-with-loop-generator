import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Play, Volume2, Cpu, Music, ChevronRight, Keyboard } from 'lucide-react';
import Sidebar from './components/Sidebar';
import VisualizerCanvas from './components/VisualizerCanvas';
import AudioController from './components/AudioController';
import BuiltInSynth from './components/BuiltInSynth';
import { VisualizerSettings, AudioSourceType, ColorTheme } from './types';
import { PRESET_THEMES } from './constants';

export default function App() {
  const [isEngineStarted, setIsEngineStarted] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSourceType>('synth');
  
  // Visualizer configurations
  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: 'particle-storm',
    themeId: 'vibrant-palette',
    fftSize: 256,
    smoothing: 0.75,
    bassSensitivity: 1.2,
    midSensitivity: 1.0,
    trebleSensitivity: 1.0,
    particleCount: 600,
    speedMultiplier: 1.0,
    glowIntensity: 1.6,
    lineWidth: 2,
    is3DIsometric: true,
    autoRotation: true,
  });

  const [activeTheme, setActiveTheme] = useState<ColorTheme>(PRESET_THEMES[0]);

  // Audio elements & nodes refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const speakerGainNodeRef = useRef<GainNode | null>(null);

  // Audio File playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');

  // Microphone state
  const [isMicActive, setIsMicActive] = useState(false);

  // Gemini AI Loading
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiThemeResult, setAiThemeResult] = useState<{ title: string; explanation: string } | null>(null);

  // Audio refs
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Start the Audio Engines on User Gesture
  const initiateEngine = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = settings.fftSize;
      analyser.smoothingTimeConstant = settings.smoothing;

      const speakerGain = ctx.createGain();
      speakerGain.gain.setValueAtTime(volume, ctx.currentTime);

      // Connect: Analyser -> Speaker Gain -> Speakers Destination
      analyser.connect(speakerGain);
      speakerGain.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserNodeRef.current = analyser;
      speakerGainNodeRef.current = speakerGain;

      setIsEngineStarted(true);
    } catch (err) {
      console.error("Audio Context initialization failed:", err);
    }
  };

  // Sync volume with speaker gain node
  useEffect(() => {
    if (speakerGainNodeRef.current && audioContextRef.current) {
      // If microphone is active, keep speaker gain at 0 to prevent loops, otherwise apply volume
      const currentGain = audioSource === 'mic' ? 0 : volume;
      speakerGainNodeRef.current.gain.setTargetAtTime(currentGain, audioContextRef.current.currentTime, 0.01);
    }
  }, [volume, audioSource, isMicActive]);

  // Handle Audio Source switching logic
  useEffect(() => {
    // 1. Stop mic if active and source switched
    if (audioSource !== 'mic') {
      stopMic();
    }

    // 2. Stop audio player if active and source switched
    if (audioSource !== 'file' && isPlaying) {
      audioElementRef.current?.pause();
      setIsPlaying(false);
    }

    // Connect file node if switching back to file source
    if (audioSource === 'file' && audioElementRef.current && audioContextRef.current && analyserNodeRef.current) {
      connectFileSource();
    }
  }, [audioSource]);

  // Hook up audio file source node (ensures only instantiated once)
  const connectFileSource = () => {
    const ctx = audioContextRef.current;
    const analyser = analyserNodeRef.current;
    const audioEl = audioElementRef.current;
    if (!ctx || !analyser || !audioEl) return;

    if (!mediaElementSourceRef.current) {
      mediaElementSourceRef.current = ctx.createMediaElementSource(audioEl);
      mediaElementSourceRef.current.connect(analyser);
    }
  };

  // Toggle play/pause for audio file
  const handlePlayPauseToggle = () => {
    if (audioSource !== 'file' || !uploadedFileUrl) return;
    const audio = audioElementRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audioContextRef.current?.resume().then(() => {
          audio.play();
          setIsPlaying(true);
        });
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUploadedFileName(file.name);
    setUploadedFileUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    if (audioElementRef.current) {
      audioElementRef.current.src = url;
      audioElementRef.current.load();
      // Ensure source is hooked up
      connectFileSource();
    }
  };

  // Microphone Capture logic
  const handleMicToggle = async () => {
    const ctx = audioContextRef.current;
    const analyser = analyserNodeRef.current;
    if (!ctx || !analyser) return;

    if (isMicActive) {
      stopMic();
    } else {
      try {
        await ctx.resume();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        micSourceNodeRef.current = source;
        micStreamRef.current = stream;
        setIsMicActive(true);
      } catch (err) {
        console.error("Microphone capture failed:", err);
        alert("Failed to access microphone. Please check frame permissions.");
        setAudioSource('synth');
      }
    }
  };

  const stopMic = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (micSourceNodeRef.current) {
      micSourceNodeRef.current.disconnect();
      micSourceNodeRef.current = null;
    }
    setIsMicActive(false);
  };

  // AI Theme Generator Call to server
  const handleAiThemeGeneration = async (prompt: string) => {
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to communicate with AI server');
      }

      const config = await response.json();

      // Dynamically apply visualizer setting configurations returned from Gemini
      setSettings(prev => ({
        ...prev,
        mode: config.mode,
        fftSize: config.fftSize,
        particleCount: config.particleCount,
        speedMultiplier: config.speedMultiplier,
        bassSensitivity: config.bassSensitivity,
        midSensitivity: config.midSensitivity,
        trebleSensitivity: config.trebleSensitivity,
        glowIntensity: config.glowIntensity,
        customColors: config.colors,
        customGlowColor: config.glowColor,
      }));

      setAiThemeResult({
        title: config.title,
        explanation: config.explanation,
      });

    } catch (err) {
      console.error("Gemini Theme Styling failed:", err);
      throw err;
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetToDefault = () => {
    setSettings({
      mode: 'particle-storm',
      themeId: 'vibrant-palette',
      fftSize: 256,
      smoothing: 0.75,
      bassSensitivity: 1.2,
      midSensitivity: 1.0,
      trebleSensitivity: 1.0,
      particleCount: 500,
      speedMultiplier: 1.0,
      glowIntensity: 1.5,
      lineWidth: 2,
      is3DIsometric: true,
      autoRotation: true,
    });
    setActiveTheme(PRESET_THEMES[0]);
    setAiThemeResult(null);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans" id="application-container-root">
      
      {/* Hidden audio element for uploading local files */}
      <audio
        ref={audioElementRef}
        onTimeUpdate={() => audioElementRef.current && setCurrentTime(audioElementRef.current.currentTime)}
        onDurationChange={() => audioElementRef.current && setDuration(audioElementRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
        id="hidden-audio-player-tag"
      />

      <AnimatePresence>
        {!isEngineStarted ? (
          /* Landing Screen Splash Portal */
          <motion.div
            key="welcome-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#04010a] text-center select-none"
            id="intro-landing-overlay"
          >
            {/* Ambient vector particle meshes */}
            <div className="absolute inset-0 bg-radial-gradient from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="max-w-2xl space-y-8 relative z-10">
              <div className="space-y-4">
                {/* Glowing Logo Icon */}
                <div className="flex justify-center">
                  <motion.div 
                    initial={{ scale: 0.8, rotate: -15 }}
                    animate={{ scale: [1, 1.05, 1], rotate: 0 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-fuchsia-500/30 border border-white/10"
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none bg-gradient-to-b from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                    PULSECORE
                  </h1>
                  <p className="text-xs md:text-sm font-black tracking-widest text-fuchsia-400 uppercase font-mono">
                    Real-Time Reactive Music Synesthesia
                  </p>
                </div>

                <p className="text-xs md:text-sm text-indigo-200/90 max-w-lg mx-auto leading-relaxed">
                  Experience sound transformed. A high-performance spatial-reactive rendering engine that binds wave physics to glowing visuals. Jam live, capture microphone acoustics, or style your canvas dynamically using Gemini AI.
                </p>
              </div>

              {/* Start Trigger Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={initiateEngine}
                  className="group relative px-8 py-3.5 rounded-full text-sm font-bold tracking-wide text-white bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500 hover:opacity-95 shadow-2xl shadow-fuchsia-500/25 active:scale-98 transition transform cursor-pointer overflow-hidden"
                  id="initiate-audio-engine-btn"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <span className="flex items-center gap-2">
                    Initiate Engine
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>

              {/* Specs footer info */}
              <div className="pt-10 border-t border-white/5 grid grid-cols-4 gap-4 max-w-md mx-auto text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                <div>
                  <span className="block text-slate-400 font-bold text-xs mb-1">HTML5</span>
                  Canvas
                </div>
                <div>
                  <span className="block text-slate-400 font-bold text-xs mb-1">WEB AUDIO</span>
                  DSP Nodes
                </div>
                <div>
                  <span className="block text-slate-400 font-bold text-xs mb-1">REACT 19</span>
                  Vite HMR
                </div>
                <div>
                  <span className="block text-slate-400 font-bold text-xs mb-1">GEMINI AI</span>
                  Stylist
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Main Application Screen */
          <motion.div
            key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex h-full w-full relative"
            id="main-app-viewport"
          >
            {/* Sidebar Cockpit controls */}
            <Sidebar
              settings={settings}
              setSettings={setSettings}
              activeTheme={activeTheme}
              setActiveTheme={setActiveTheme}
              audioSource={audioSource}
              setAudioSource={setAudioSource}
              onMicToggle={handleMicToggle}
              onFileUpload={handleFileUpload}
              isMicActive={isMicActive}
              uploadedFileName={uploadedFileName}
              isAiLoading={isAiLoading}
              onAiGenerate={handleAiThemeGeneration}
              aiThemeResult={aiThemeResult}
              resetToDefault={resetToDefault}
            />

            {/* Immersive Visualizer Area */}
            <div className="flex-1 h-full flex flex-col relative" id="canvas-and-player-section">
              
              {/* Actual Rendering Canvas Stage */}
              <div className="flex-1 w-full h-full relative z-0">
                <VisualizerCanvas
                  analyserNode={analyserNodeRef.current}
                  settings={settings}
                  activeTheme={activeTheme}
                  isAudioPlaying={
                    audioSource === 'file' 
                      ? isPlaying 
                      : (audioSource === 'mic' ? isMicActive : true)
                  }
                />

                {/* Ambient glow backdrop card */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Bottom Action overlay panels */}
              <div className="absolute bottom-5 left-5 right-5 z-20 space-y-4 max-w-4xl mx-auto pointer-events-auto" id="bottom-docking-tray">
                
                {/* 1. Track player controls (renders only when file source active) */}
                {audioSource === 'file' && uploadedFileUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AudioController
                      isPlaying={isPlaying}
                      onPlayPauseToggle={handlePlayPauseToggle}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={handleSeek}
                      volume={volume}
                      onVolumeChange={setVolume}
                      fileName={uploadedFileName}
                    />
                  </motion.div>
                )}

                {/* 2. Interactive Synthesizer / Drum Sequencer (renders only when synth active) */}
                {audioSource === 'synth' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BuiltInSynth
                      audioContext={audioContextRef.current}
                      analyserNode={analyserNodeRef.current}
                      onSynthTrigger={() => {
                        // Resets visual activity immediately to trigger pulse response
                      }}
                    />
                  </motion.div>
                )}

                {/* 3. Live Microphone active bar */}
                {audioSource === 'mic' && isMicActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="bg-indigo-950/80 backdrop-blur-xl rounded-2xl p-4 border border-indigo-800/50 flex items-center justify-between shadow-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                      <div>
                        <span className="text-[10px] text-indigo-400 block uppercase font-bold tracking-widest font-mono">ACOUSTIC INPUT ACTIVE</span>
                        <span className="text-white text-xs font-semibold font-mono">Capturing surrounding sounds in real-time</span>
                      </div>
                    </div>
                    <button
                      onClick={handleMicToggle}
                      className="px-4 py-1.5 bg-rose-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition transform active:scale-95 cursor-pointer"
                    >
                      Disconnect Microphone
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

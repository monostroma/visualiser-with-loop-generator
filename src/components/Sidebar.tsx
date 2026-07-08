import React, { useState } from 'react';
import { 
  Sparkles, Mic, FileAudio, Keyboard, Sliders, Palette, 
  Orbit, Grid3X3, Activity, Sun, Eye, ChevronLeft, ChevronRight, 
  Volume2, RefreshCcw, HelpCircle, AlertCircle
} from 'lucide-react';
import { VisualizerSettings, AudioSourceType, ColorTheme, VisualizerMode } from '../types';
import { PRESET_THEMES } from '../constants';

interface SidebarProps {
  settings: VisualizerSettings;
  setSettings: React.Dispatch<React.SetStateAction<VisualizerSettings>>;
  activeTheme: ColorTheme;
  setActiveTheme: (theme: ColorTheme) => void;
  audioSource: AudioSourceType;
  setAudioSource: (source: AudioSourceType) => void;
  onMicToggle: () => Promise<void>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isMicActive: boolean;
  uploadedFileName: string;
  isAiLoading: boolean;
  onAiGenerate: (prompt: string) => Promise<void>;
  aiThemeResult: { title: string; explanation: string } | null;
  resetToDefault: () => void;
}

export default function Sidebar({
  settings,
  setSettings,
  activeTheme,
  setActiveTheme,
  audioSource,
  setAudioSource,
  onMicToggle,
  onFileUpload,
  isMicActive,
  uploadedFileName,
  isAiLoading,
  onAiGenerate,
  aiThemeResult,
  resetToDefault,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'source' | 'render' | 'sliders' | 'ai'>('render');
  const [aiError, setAiError] = useState<string | null>(null);

  const visualizerModes: { id: VisualizerMode; name: string; desc: string; icon: React.ReactNode }[] = [
    { 
      id: 'circular-ring', 
      name: 'Cosmic Orbit', 
      desc: 'Circular radial frequencies & orbiting dust',
      icon: <Orbit className="w-5 h-5 text-indigo-400" /> 
    },
    { 
      id: '3d-terrain', 
      name: 'Neon Grid', 
      desc: 'Isometric rolling frequency waves',
      icon: <Grid3X3 className="w-5 h-5 text-blue-400" /> 
    },
    { 
      id: 'particle-storm', 
      name: 'Stardust Fluid', 
      desc: 'Dynamic particle physics reacting to ranges',
      icon: <Activity className="w-5 h-5 text-pink-400" /> 
    },
    { 
      id: 'synthwave-horizon', 
      name: 'Synthwave Skyline', 
      desc: 'Classic equalizers with a pulsing retro sunset',
      icon: <Sun className="w-5 h-5 text-yellow-400" /> 
    },
    { 
      id: 'kaleidoscope', 
      name: 'Geometric Mandala', 
      desc: 'Intricate 8-axis mirrored psychedelic folds',
      icon: <Eye className="w-5 h-5 text-emerald-400" /> 
    }
  ];

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiError(null);
    try {
      await onAiGenerate(aiPrompt);
    } catch (err: any) {
      setAiError(err.message || 'Something went wrong. Please check your network.');
    }
  };

  const selectPresetMode = (modeId: VisualizerMode) => {
    setSettings(prev => ({ ...prev, mode: modeId }));
  };

  const handleRangeChange = (key: keyof VisualizerSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative h-full flex" id="sidebar-container-wrapper">
      {/* Sidebar main body */}
      <div 
        className={`h-full bg-indigo-950/90 backdrop-blur-xl border-r border-indigo-800/50 flex flex-col transition-all duration-300 shadow-2xl relative select-none ${
          isOpen ? 'w-80 md:w-96' : 'w-0 overflow-hidden border-r-0'
        }`}
        id="control-sidebar-panel"
      >
        {/* Title Header */}
        <div className="p-5 border-b border-indigo-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-black tracking-tight text-white leading-none">
                PULSE<span className="text-fuchsia-400">CORE</span>
              </h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono mt-1">Real-Time Canvas</p>
            </div>
          </div>
          
          <button 
            onClick={resetToDefault}
            className="p-1.5 hover:bg-white/5 text-indigo-300 hover:text-white rounded-lg transition cursor-pointer"
            title="Reset Settings"
            id="reset-settings-btn"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-indigo-800/50 px-2 bg-indigo-950/40">
          {[
            { id: 'source', name: 'Source', icon: <Volume2 className="w-3.5 h-3.5" /> },
            { id: 'render', name: 'Engines', icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'sliders', name: 'Sliders', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'ai', name: 'Gemini AI', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition duration-200 cursor-pointer ${
                activeTab === tab.id 
                  ? 'text-fuchsia-400 border-fuchsia-500 bg-white/[0.01]' 
                  : 'text-indigo-300 border-transparent hover:text-white hover:bg-indigo-900/10'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab contents (Scrollable scroll panel) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6" id="sidebar-tab-scroller">
          
          {/* Tab: SOURCE SELECTION */}
          {activeTab === 'source' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Select Sound Source</label>
                <p className="text-[11px] text-indigo-400/90 leading-relaxed">Pick how you want to feed audio waves into the canvas.</p>
              </div>

              <div className="grid grid-cols-1 gap-3" id="sound-source-buttons-group">
                {/* Built-in Synth */}
                <button
                  onClick={() => setAudioSource('synth')}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition duration-200 cursor-pointer ${
                    audioSource === 'synth'
                      ? 'bg-fuchsia-500/10 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/10'
                      : 'bg-indigo-900/20 border-indigo-800/50 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-700'
                  }`}
                >
                  <div className="p-2 bg-fuchsia-500/10 rounded-lg text-fuchsia-400 mt-0.5">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Built-in Jam Machine</span>
                    <span className="text-[10px] text-indigo-300 mt-1 block leading-relaxed">Play synthesized piano notes and program custom drum machine loops instantly.</span>
                  </div>
                </button>

                {/* Microphone Input */}
                <button
                  onClick={async () => {
                    setAudioSource('mic');
                    await onMicToggle();
                  }}
                  className={`flex items-start gap-3.5 p-3.5 rounded-2xl border text-left transition duration-200 cursor-pointer ${
                    audioSource === 'mic' && isMicActive
                      ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-lg shadow-cyan-400/10'
                      : 'bg-indigo-900/20 border-indigo-800/50 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-700'
                  }`}
                >
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 mt-0.5">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Live Microphone</span>
                    <span className="text-[10px] text-indigo-300 mt-1 block leading-relaxed">Capture voice, live instruments, or surrounding ambient music directly.</span>
                    {audioSource === 'mic' && isMicActive && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold font-mono rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Listening Live
                      </span>
                    )}
                  </div>
                </button>

                {/* File Upload */}
                <div
                  className={`flex flex-col gap-3.5 p-3.5 rounded-2xl border text-left transition duration-200 ${
                    audioSource === 'file'
                      ? 'bg-fuchsia-500/10 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/10'
                      : 'bg-indigo-900/20 border-indigo-800/50 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-700'
                  }`}
                >
                  <button
                    onClick={() => setAudioSource('file')}
                    className="flex items-start gap-3.5 w-full text-left cursor-pointer"
                  >
                    <div className="p-2 bg-fuchsia-500/10 rounded-lg text-fuchsia-400 mt-0.5">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Local Audio File</span>
                      <span className="text-[10px] text-indigo-300 mt-1 block leading-relaxed">Upload standard local music tracks (.mp3, .wav, .m4a) for crisp digital visual reactivity.</span>
                    </div>
                  </button>

                  {audioSource === 'file' && (
                    <div className="border-t border-indigo-800/50 pt-3 mt-1 space-y-2.5">
                      <label className="flex flex-col items-center justify-center p-4 border border-dashed border-indigo-800 hover:border-fuchsia-500/50 rounded-xl bg-indigo-950/60 cursor-pointer transition">
                        <FileAudio className="w-6 h-6 text-indigo-400 mb-1.5" />
                        <span className="text-[10px] font-bold text-indigo-300">Click to Select Audio File</span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={onFileUpload}
                          className="hidden"
                        />
                      </label>
                      {uploadedFileName && (
                        <div className="p-2.5 bg-indigo-950 rounded-xl border border-indigo-800/50 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-indigo-200 truncate max-w-[160px]">{uploadedFileName}</span>
                          <span className="text-fuchsia-400 text-[9px] font-bold">READY</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: RENDER ENGINES */}
          {activeTab === 'render' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Engines selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Select Visual Engine</label>
                <div className="grid grid-cols-1 gap-2.5" id="visualizer-engines-list">
                  {visualizerModes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => selectPresetMode(mode.id)}
                      className={`flex items-start gap-3.5 p-3 rounded-2xl border text-left transition duration-200 cursor-pointer ${
                        settings.mode === mode.id
                          ? 'bg-gradient-to-r from-fuchsia-500/10 to-indigo-500/10 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/10'
                          : 'bg-indigo-900/20 border-indigo-800/50 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-700'
                      }`}
                    >
                      <div className="p-2 bg-indigo-950/50 rounded-lg mt-0.5">
                        {mode.icon}
                      </div>
                      <div>
                        <span className="font-bold text-xs block">{mode.name}</span>
                        <span className="text-[10px] text-indigo-300 mt-1 block leading-relaxed">{mode.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme selections */}
              <div className="space-y-3 border-t border-indigo-800/50 pt-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Scene Presets</label>
                  {settings.customColors && (
                    <span className="px-2 py-0.5 bg-fuchsia-500/10 text-fuchsia-400 text-[9px] font-bold rounded border border-fuchsia-500/15">AI Active</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5" id="color-themes-grid">
                  {PRESET_THEMES.map((theme) => {
                    const isSelected = activeTheme.id === theme.id && !settings.customColors;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setActiveTheme(theme);
                          // Clear custom colors
                          setSettings(prev => {
                            const updated = { ...prev, themeId: theme.id };
                            delete updated.customColors;
                            delete updated.customGlowColor;
                            return updated;
                          });
                        }}
                        className={`p-3 rounded-2xl border text-left transition duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-fuchsia-500/10 border-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/15' 
                            : 'bg-indigo-900/20 border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/40'
                        }`}
                      >
                        <span className="text-[10px] font-bold block mb-2 truncate">{theme.name}</span>
                        <div className="flex gap-1.5">
                          {theme.colors.map((c, idx) => (
                            <div 
                              key={idx} 
                              className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-sm"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab: RANGE SLIDERS */}
          {activeTab === 'sliders' && (
            <div className="space-y-6 animate-fadeIn">
              {/* FFT & Smoothing */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest block">Engine Parameters</label>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Frequency Resolution (FFT)</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.fftSize}</span>
                  </div>
                  <select
                    value={settings.fftSize}
                    onChange={(e) => handleRangeChange('fftSize', parseInt(e.target.value))}
                    className="w-full bg-indigo-950 border border-indigo-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-fuchsia-500 outline-none"
                    id="fft-size-select"
                  >
                    <option value="128">128 (Ultra Reactive Beats)</option>
                    <option value="256">256 (Balanced High-Tempo)</option>
                    <option value="512">512 (Standard Resolution)</option>
                    <option value="1024">1024 (Flowing Cinematic Curves)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Inertia Smoothing</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.smoothing.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.95"
                    step="0.05"
                    value={settings.smoothing}
                    onChange={(e) => handleRangeChange('smoothing', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                  <div className="flex justify-between text-[9px] text-indigo-400 font-semibold uppercase tracking-wider">
                    <span>Instant</span>
                    <span>Smooth Trail</span>
                  </div>
                </div>
              </div>

              {/* Reactive sensitivities */}
              <div className="space-y-4 border-t border-indigo-800/50 pt-5">
                <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest block">Range Sensitivities</label>

                {/* Bass */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Bass Sensitivity</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.bassSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={settings.bassSensitivity}
                    onChange={(e) => handleRangeChange('bassSensitivity', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                </div>

                {/* Mids */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Mids Sensitivity</span>
                    <span className="font-mono text-cyan-400 font-bold">{settings.midSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={settings.midSensitivity}
                    onChange={(e) => handleRangeChange('midSensitivity', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Treble */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Treble Sensitivity</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.trebleSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={settings.trebleSensitivity}
                    onChange={(e) => handleRangeChange('trebleSensitivity', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
                  />
                </div>
              </div>

              {/* Rendering Details */}
              <div className="space-y-4 border-t border-indigo-800/50 pt-5">
                <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest block">Rendering Geometry</label>

                {/* Speed */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Global Speed Multiplier</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.speedMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2.5"
                    step="0.1"
                    value={settings.speedMultiplier}
                    onChange={(e) => handleRangeChange('speedMultiplier', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                </div>

                {/* Particle Count */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Particle Density</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.particleCount}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1200"
                    step="50"
                    value={settings.particleCount}
                    onChange={(e) => handleRangeChange('particleCount', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                </div>

                {/* Glow Intensity */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Neon Glow Intensity</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.glowIntensity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={settings.glowIntensity}
                    onChange={(e) => handleRangeChange('glowIntensity', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                </div>

                {/* Line width */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-indigo-200">
                    <span>Vector Stroke Weight</span>
                    <span className="font-mono text-fuchsia-400 font-bold">{settings.lineWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={settings.lineWidth}
                    onChange={(e) => handleRangeChange('lineWidth', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: GEMINI AI THEME STYLIST */}
          {activeTab === 'ai' && (
            <div className="space-y-5 animate-fadeIn" id="gemini-ai-assistant-tab">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                  Gemini AI Stylist
                </label>
                <p className="text-[11px] text-indigo-400/90 leading-relaxed">
                  Type any musical mood, genre, or atmosphere, and Gemini will custom craft matching colors, speeds, particles, sensitivities, and modes.
                </p>
              </div>

              <form onSubmit={handleAiSubmit} className="space-y-3">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., A chilling cosmic sci-fi spaceship, pulsing with deep violet warning lights and heavy bass..."
                  className="w-full h-24 bg-indigo-950 border border-indigo-800 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-fuchsia-500 outline-none resize-none placeholder:text-indigo-400/50"
                  id="ai-stylist-prompt-textarea"
                />
                
                <button
                  type="submit"
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition duration-200 ${
                    isAiLoading || !aiPrompt.trim()
                      ? 'bg-indigo-950 text-indigo-500 cursor-not-allowed border border-indigo-800/50'
                      : 'bg-gradient-to-r from-fuchsia-500 via-pink-500 to-indigo-600 hover:opacity-90 text-white shadow-fuchsia-500/10'
                  }`}
                  id="ai-generate-theme-btn"
                >
                  {isAiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gemini Designing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 fill-white" />
                      Generate AI Style
                    </>
                  )}
                </button>
              </form>

              {aiError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-xs leading-normal">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Display generated results details */}
              {aiThemeResult && (
                <div className="p-4 bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10 border border-fuchsia-500/20 rounded-xl space-y-3 shadow-lg animate-fadeIn" id="ai-styling-success-output">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-ping" />
                    <span className="text-[10px] font-bold text-fuchsia-400 tracking-wider uppercase">Active Style Design</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm tracking-tight">{aiThemeResult.title}</h4>
                    <p className="text-[11px] text-indigo-300 leading-relaxed italic mt-1.5">
                      "{aiThemeResult.explanation}"
                    </p>
                  </div>
                  
                  {/* Color representation preview */}
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <span className="text-[10px] text-indigo-400 font-bold font-mono uppercase">Palette:</span>
                    <div className="flex gap-1.5 ml-auto">
                      {settings.customColors && settings.customColors.map((c, idx) => (
                        <div 
                           key={idx} 
                           className="w-4 h-4 rounded-full border border-white/10"
                           style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-indigo-900/10 p-3 rounded-xl border border-indigo-800/50 space-y-1 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-300 mt-0.5 shrink-0" />
                <span className="text-[10px] text-indigo-400 leading-relaxed">
                  Tip: Use rich visual words like "cyberpunk", "vaporwave", "oceanic chill", or musical genre descriptions like "heavy heavy dubstep" to get custom configurations.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Footer info branding */}
        <div className="p-5 border-t border-indigo-800/50 bg-indigo-950/50 flex items-center justify-between text-[10px] text-indigo-400 font-mono">
          <span>PULSECORE SYSTEM V2.0</span>
          <span className="text-fuchsia-400 font-bold uppercase tracking-widest">Active</span>
        </div>
      </div>

      {/* Floating sliding toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute top-5 z-40 p-2.5 bg-indigo-950/90 backdrop-blur-xl border border-indigo-800/50 hover:bg-indigo-900 hover:text-white text-indigo-300 rounded-full cursor-pointer transition shadow-xl ${
          isOpen ? 'left-full ml-3' : 'left-3'
        }`}
        id="sidebar-slide-toggle-btn"
        title={isOpen ? "Collapse Menu" : "Expand Menu"}
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
    </div>
  );
}

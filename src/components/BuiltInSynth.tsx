import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Music, Volume2, Cpu, Grid } from 'lucide-react';
import { SYNTH_KEYS, BUILTIN_TRACKS } from '../constants';
import { BuiltInTrack, BeatStep } from '../types';

interface BuiltInSynthProps {
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  onSynthTrigger: () => void; // Notify parent of sound triggering
}

export default function BuiltInSynth({ audioContext, analyserNode, onSynthTrigger }: BuiltInSynthProps) {
  const [bpm, setBpm] = useState(110);
  const [isLooping, setIsLooping] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('synthwave');
  
  // Custom interactive state for sequencing
  const [synthSeq, setSynthSeq] = useState<string[]>(BUILTIN_TRACKS[0].synthSequence);
  const [beatSteps, setBeatSteps] = useState<BeatStep[]>(BUILTIN_TRACKS[0].beatSteps);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const stepIndexRef = useRef<number>(0);

  // Resume context if suspended
  const ensureAudioContext = async () => {
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  };

  // Synchronize state when selected track changes
  useEffect(() => {
    const track = BUILTIN_TRACKS.find(t => t.id === selectedTrackId);
    if (track) {
      setBpm(track.bpm);
      setSynthSeq([...track.synthSequence]);
      setBeatSteps(JSON.parse(JSON.stringify(track.beatSteps)));
    }
  }, [selectedTrackId]);

  // Handle hotkey triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const keyUpper = e.key.toUpperCase();
      const synthKey = SYNTH_KEYS.find(sk => sk.key === keyUpper);
      if (synthKey) {
        setActiveKey(synthKey.note);
        triggerSynthVoice(synthKey.frequency);
        onSynthTrigger();
      }
    };

    const handleKeyUp = () => {
      setActiveKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioContext, analyserNode]);

  // Synthesize Melodic Synth Voice
  const triggerSynthVoice = async (frequency: number, duration: number = 0.25) => {
    if (!audioContext || !analyserNode) return;
    await ensureAudioContext();

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Use a fat sawtooth / square mixed vibration
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Filter node to add warmth
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(frequency * 2.5, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.8, audioContext.currentTime + duration);

    // Amplitude ADSR Envelope
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    // Route: Osc -> Filter -> Gain -> Analyser
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(analyserNode);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration);
  };

  // Synthesize Kick Drum
  const triggerKickDrum = async (time: number) => {
    if (!audioContext || !analyserNode) return;
    
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    
    // Fast frequency sweep (bass transient drop)
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    // Tight snap envelope
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(analyserNode);

    osc.start(time);
    osc.stop(time + 0.16);
  };

  // Synthesize Snare Drum using White Noise Buffer
  const triggerSnareDrum = async (time: number) => {
    if (!audioContext || !analyserNode) return;

    // 1. Noise Generator (for white noise snare rattle)
    const bufferSize = audioContext.sampleRate * 0.2; // 200ms
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, time);

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(analyserNode);

    // 2. Fundamental Body Osc (for punch)
    const bodyOsc = audioContext.createOscillator();
    const bodyGain = audioContext.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(180, time);
    bodyOsc.frequency.linearRampToValueAtTime(100, time + 0.08);

    bodyGain.gain.setValueAtTime(0.3, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(analyserNode);

    noiseSource.start(time);
    noiseSource.stop(time + 0.2);
    bodyOsc.start(time);
    bodyOsc.stop(time + 0.1);
  };

  // Synthesize Hi-Hat using Highpass Noise Buffer
  const triggerHiHat = async (time: number) => {
    if (!audioContext || !analyserNode) return;

    const bufferSize = audioContext.sampleRate * 0.04; // Very short (40ms)
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = audioContext.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(analyserNode);

    source.start(time);
    source.stop(time + 0.04);
  };

  // Clock Scheduler for Sequencer Loops
  const scheduleNextStep = () => {
    if (!audioContext) return;
    const stepDuration = 60.0 / bpm / 2; // Eighth notes
    
    while (nextNoteTimeRef.current < audioContext.currentTime + 0.1) {
      const time = nextNoteTimeRef.current;
      const step = stepIndexRef.current;

      // Play Drum parts
      const currentBeat = beatSteps[step];
      if (currentBeat?.kick) triggerKickDrum(time);
      if (currentBeat?.snare) triggerSnareDrum(time);
      if (currentBeat?.hat) triggerHiHat(time);

      // Play Synth parts
      const noteName = synthSeq[step];
      if (noteName && noteName !== '-') {
        const synthKey = SYNTH_KEYS.find(k => k.note === noteName);
        if (synthKey) {
          triggerSynthVoice(synthKey.frequency, stepDuration * 0.85);
        }
      }

      // Sync step indicator to UI
      const scheduledStep = step;
      setTimeout(() => {
        setCurrentStep(scheduledStep);
        onSynthTrigger();
      }, (time - audioContext.currentTime) * 1000);

      // Advance
      nextNoteTimeRef.current += stepDuration;
      stepIndexRef.current = (stepIndexRef.current + 1) % 8;
    }

    // Schedule next callback
    timerRef.current = requestAnimationFrame(scheduleNextStep);
  };

  const startLoop = async () => {
    if (!audioContext) return;
    await ensureAudioContext();
    setIsLooping(true);
    stepIndexRef.current = 0;
    nextNoteTimeRef.current = audioContext.currentTime + 0.05;
    scheduleNextStep();
  };

  const stopLoop = () => {
    setIsLooping(false);
    setCurrentStep(-1);
    if (timerRef.current !== null) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);

  const toggleStepDrum = (index: number, instrument: 'kick' | 'snare' | 'hat') => {
    const updated = [...beatSteps];
    updated[index] = {
      ...updated[index],
      [instrument]: !updated[index][instrument]
    };
    setBeatSteps(updated);
  };

  const setStepSynthNote = (index: number, note: string) => {
    const updated = [...synthSeq];
    updated[index] = updated[index] === note ? '-' : note;
    setSynthSeq(updated);
  };

  return (
    <div className="bg-indigo-950/80 backdrop-blur-xl rounded-2xl p-5 border border-indigo-800/50 space-y-6 shadow-2xl" id="synth-drum-machine-panel">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-fuchsia-500/10 rounded-lg text-fuchsia-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Built-in Jam Machine</h3>
            <p className="text-xs text-indigo-300">Tap keys or program loops to feed the visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTrackId}
            onChange={(e) => setSelectedTrackId(e.target.value)}
            className="bg-indigo-950 text-white border border-indigo-800 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-fuchsia-500 outline-none"
            id="synth-track-preset-select"
          >
            {BUILTIN_TRACKS.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={isLooping ? stopLoop : startLoop}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold shadow-lg transition duration-200 cursor-pointer ${
              isLooping 
                ? 'bg-red-500 hover:bg-red-650 text-white' 
                : 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white shadow-fuchsia-500/10'
            }`}
            id="synth-loop-toggle-btn"
          >
            {isLooping ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white" />
                Stop Loop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                Play Loop
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sequencer Grid */}
      <div className="space-y-3 bg-indigo-950/40 rounded-xl p-4 border border-indigo-800/50 overflow-x-auto">
        <div className="flex items-center gap-2 border-b border-indigo-800/50 pb-2 min-w-[340px]">
          <Grid className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-xs font-bold text-indigo-200">Live Beat Sequencer</span>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Tempo:</span>
            <input
              type="range"
              min="60"
              max="160"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-20 h-1 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
            />
            <span className="text-[10px] font-mono text-fuchsia-400 font-bold w-8">{bpm} BPM</span>
          </div>
        </div>

        <div className="space-y-2.5 min-w-[340px]">
          {/* Kick track */}
          <div className="flex items-center gap-2">
            <span className="w-12 text-right text-[10px] text-indigo-300 font-mono tracking-wider font-bold">KICK</span>
            <div className="flex-1 grid grid-cols-8 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => toggleStepDrum(i, 'kick')}
                  className={`h-7 rounded-md border transition cursor-pointer ${
                    currentStep === i ? 'ring-1 ring-fuchsia-400 border-fuchsia-400 scale-[1.03]' : ''
                  } ${
                    beatSteps[i]?.kick 
                      ? 'bg-gradient-to-br from-fuchsia-500 to-pink-500 border-fuchsia-400/30' 
                      : 'bg-indigo-950 border-indigo-800/50 hover:bg-indigo-900/40'
                  }`}
                  aria-label={`Step ${i + 1} Kick`}
                />
              ))}
            </div>
          </div>

          {/* Snare track */}
          <div className="flex items-center gap-2">
            <span className="w-12 text-right text-[10px] text-indigo-300 font-mono tracking-wider font-bold">SNARE</span>
            <div className="flex-1 grid grid-cols-8 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => toggleStepDrum(i, 'snare')}
                  className={`h-7 rounded-md border transition cursor-pointer ${
                    currentStep === i ? 'ring-1 ring-cyan-400 border-cyan-400 scale-[1.03]' : ''
                  } ${
                    beatSteps[i]?.snare 
                      ? 'bg-gradient-to-br from-cyan-400 to-blue-500 border-cyan-400/30' 
                      : 'bg-indigo-950 border-indigo-800/50 hover:bg-indigo-900/40'
                  }`}
                  aria-label={`Step ${i + 1} Snare`}
                />
              ))}
            </div>
          </div>

          {/* Hi-Hat track */}
          <div className="flex items-center gap-2">
            <span className="w-12 text-right text-[10px] text-indigo-300 font-mono tracking-wider font-bold">HI-HAT</span>
            <div className="flex-1 grid grid-cols-8 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => toggleStepDrum(i, 'hat')}
                  className={`h-7 rounded-md border transition cursor-pointer ${
                    currentStep === i ? 'ring-1 ring-fuchsia-400 border-fuchsia-400 scale-[1.03]' : ''
                  } ${
                    beatSteps[i]?.hat 
                      ? 'bg-gradient-to-br from-fuchsia-400 to-amber-500 border-fuchsia-400/30' 
                      : 'bg-indigo-950 border-indigo-800/50 hover:bg-indigo-900/40'
                  }`}
                  aria-label={`Step ${i + 1} Hi-Hat`}
                />
              ))}
            </div>
          </div>

          {/* Melodic Synth track */}
          <div className="flex items-center gap-2 border-t border-indigo-800/50 pt-2.5">
            <span className="w-12 text-right text-[10px] text-indigo-300 font-mono tracking-wider font-bold">SYNTH</span>
            <div className="flex-1 grid grid-cols-8 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => {
                const currentNote = synthSeq[i];
                const isActive = currentNote !== '-';
                return (
                  <div key={i} className="relative group">
                    <select
                      value={currentNote}
                      onChange={(e) => {
                        const updated = [...synthSeq];
                        updated[i] = e.target.value;
                        setSynthSeq(updated);
                      }}
                      className={`w-full h-7 rounded-md border text-[10px] text-center font-mono font-bold appearance-none cursor-pointer outline-none transition ${
                        currentStep === i ? 'ring-1 ring-fuchsia-400 border-fuchsia-400 scale-[1.03]' : ''
                      } ${
                        isActive 
                          ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-400/30 text-white' 
                          : 'bg-indigo-950 border-indigo-800/50 hover:bg-indigo-900/40 text-indigo-400/60'
                      }`}
                    >
                      <option value="-">-</option>
                      {SYNTH_KEYS.map(k => (
                        <option key={k.note} value={k.note}>{k.note}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Piano Keyboard */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-xs font-bold text-indigo-200">Live Synth Keyboard (Use Computer Keys)</span>
        </div>

        <div className="grid grid-cols-10 gap-1 select-none" id="synth-piano-keys-container">
          {SYNTH_KEYS.map((sk) => {
            const isPressed = activeKey === sk.note;
            return (
              <button
                key={sk.note}
                onMouseDown={() => {
                  triggerSynthVoice(sk.frequency);
                  onSynthTrigger();
                }}
                className={`flex flex-col items-center justify-between py-5 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                  isPressed 
                    ? 'bg-gradient-to-b from-fuchsia-500 to-indigo-500 border-fuchsia-400 text-white translate-y-0.5 shadow-none' 
                    : 'bg-indigo-900/20 border-indigo-800/50 text-indigo-200 hover:bg-indigo-900/40 hover:border-indigo-700 hover:text-white shadow-[0_3px_0_rgba(10,5,30,0.6)]'
                }`}
                aria-label={`Play note ${sk.note}`}
              >
                <span className="text-[9px] font-mono text-indigo-400 font-bold leading-none">{sk.key}</span>
                <span className="text-[10px] font-bold font-mono tracking-tight mt-3">{sk.note}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

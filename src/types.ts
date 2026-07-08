export type VisualizerMode = 'circular-ring' | '3d-terrain' | 'particle-storm' | 'synthwave-horizon' | 'kaleidoscope';

export interface ColorTheme {
  id: string;
  name: string;
  colors: string[]; // hex or rgb color codes
  bgGradient: string; // Tailwind background gradient classes or raw CSS gradient
  glowColor: string;
}

export interface VisualizerSettings {
  mode: VisualizerMode;
  themeId: string;
  customColors?: string[];
  customGlowColor?: string;
  fftSize: number;
  smoothing: number;
  bassSensitivity: number;
  midSensitivity: number;
  trebleSensitivity: number;
  particleCount: number;
  speedMultiplier: number;
  glowIntensity: number;
  lineWidth: number;
  is3DIsometric: boolean;
  autoRotation: boolean;
}

export type AudioSourceType = 'mic' | 'file' | 'synth';

export interface SynthSequenceStep {
  note: string; // e.g., 'C4', 'E4'
  active: boolean;
}

export interface BeatStep {
  kick: boolean;
  snare: boolean;
  hat: boolean;
}

export interface BuiltInTrack {
  id: string;
  name: string;
  bpm: number;
  synthSequence: string[]; // Array of notes for 8 steps, or empty string for rest
  beatSteps: BeatStep[]; // 8 steps of drum machine beats
}

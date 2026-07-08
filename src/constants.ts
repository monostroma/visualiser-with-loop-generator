import { ColorTheme, BuiltInTrack } from './types';

export const PRESET_THEMES: ColorTheme[] = [
  {
    id: 'vibrant-palette',
    name: 'Vibrant Palette',
    colors: ['#d946ef', '#22d3ee', '#6366f1'],
    bgGradient: 'from-[#0a051d] via-[#13072e] to-[#05020c]',
    glowColor: '#d946ef',
  },
  {
    id: 'neon-nebula',
    name: 'Neon Nebula',
    colors: ['#d946ef', '#a855f7', '#ec4899'],
    bgGradient: 'from-[#0b031b] via-[#1a063b] to-[#04010d]',
    glowColor: '#d946ef',
  },
  {
    id: 'glitch-flux',
    name: 'Glitch Flux',
    colors: ['#06b6d4', '#3b82f6', '#10b981'],
    bgGradient: 'from-[#020b12] via-[#051c2d] to-[#01060a]',
    glowColor: '#06b6d4',
  },
  {
    id: 'retro-grid',
    name: 'Retro Grid',
    colors: ['#f59e0b', '#f97316', '#ef4444'],
    bgGradient: 'from-[#140602] via-[#2f1005] to-[#070101]',
    glowColor: '#f97316',
  },
  {
    id: 'organic-bio',
    name: 'Organic Bio',
    colors: ['#10b981', '#22c55e', '#84cc16'],
    bgGradient: 'from-[#010c06] via-[#041f0f] to-[#010502]',
    glowColor: '#10b981',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    colors: ['#ff007f', '#00f0ff', '#ffe600'],
    bgGradient: 'from-[#0d0211] via-[#1b032d] to-[#05010c]',
    glowColor: '#00f0ff',
  },
];

export const SYNTH_KEYS = [
  { note: 'C4', key: 'A', frequency: 261.63 },
  { note: 'D4', key: 'S', frequency: 293.66 },
  { note: 'E4', key: 'D', frequency: 329.63 },
  { note: 'F4', key: 'F', frequency: 349.23 },
  { note: 'G4', key: 'G', frequency: 392.00 },
  { note: 'A4', key: 'H', frequency: 440.00 },
  { note: 'B4', key: 'J', frequency: 493.88 },
  { note: 'C5', key: 'K', frequency: 523.25 },
  { note: 'D5', key: 'L', frequency: 587.33 },
  { note: 'E5', key: ';', frequency: 659.25 },
];

export const BUILTIN_TRACKS: BuiltInTrack[] = [
  {
    id: 'synthwave',
    name: 'Neon Synthwave',
    bpm: 112,
    synthSequence: ['C4', 'E4', 'G4', 'E4', 'A4', 'G4', 'E4', 'D4'],
    beatSteps: [
      { kick: true, snare: false, hat: true },
      { kick: false, snare: false, hat: true },
      { kick: false, snare: true, hat: true },
      { kick: false, snare: false, hat: true },
      { kick: true, snare: false, hat: true },
      { kick: false, snare: false, hat: true },
      { kick: false, snare: true, hat: true },
      { kick: false, snare: false, hat: true },
    ]
  },
  {
    id: 'ambient',
    name: 'Cosmic Nebula Chill',
    bpm: 85,
    synthSequence: ['E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'F4', 'E4'],
    beatSteps: [
      { kick: true, snare: false, hat: true },
      { kick: false, snare: false, hat: false },
      { kick: false, snare: true, hat: true },
      { kick: false, snare: false, hat: false },
      { kick: true, snare: false, hat: true },
      { kick: false, snare: false, hat: false },
      { kick: false, snare: true, hat: true },
      { kick: false, snare: false, hat: true },
    ]
  },
  {
    id: 'pulse',
    name: 'Cyberpunk Electro Pulse',
    bpm: 128,
    synthSequence: ['A4', 'A4', 'C5', 'A4', 'G4', 'G4', 'C5', 'E5'],
    beatSteps: [
      { kick: true, snare: false, hat: true },
      { kick: false, snare: false, hat: true },
      { kick: true, snare: true, hat: true },
      { kick: false, snare: false, hat: true },
      { kick: true, snare: false, hat: true },
      { kick: false, snare: false, hat: true },
      { kick: true, snare: true, hat: true },
      { kick: false, snare: false, hat: true },
    ]
  }
];

import React, { useEffect, useRef } from 'react';
import { VisualizerSettings, ColorTheme } from '../types';

interface VisualizerCanvasProps {
  analyserNode: AnalyserNode | null;
  settings: VisualizerSettings;
  activeTheme: ColorTheme;
  isAudioPlaying: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  speed: number;
  alpha: number;
  decay: number;
}

export default function VisualizerCanvas({
  analyserNode,
  settings,
  activeTheme,
  isAudioPlaying,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Frequency and time domain data arrays
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);

  // Particles array for "Particle Storm" and "Cosmic Orbit"
  const particlesRef = useRef<Particle[]>([]);

  // Historical data for "3D Terrain" rolling grids
  const historyRef = useRef<Float32Array[]>([]);

  // Rotation angles / scroll animations
  const angleRef = useRef<number>(0);
  const scrollOffsetRef = useRef<number>(0);

  // Current visual values to smooth out sudden jumps (lerping)
  const smoothedBass = useRef<number>(0);
  const smoothedMids = useRef<number>(0);
  const smoothedTreble = useRef<number>(0);

  // Colors to use (either pre-configured or AI custom overrides)
  const activeColors = settings.customColors && settings.customColors.length > 0 
    ? settings.customColors 
    : activeTheme.colors;
  const activeGlow = settings.customGlowColor || activeTheme.glowColor;

  // Initialize particles
  const initParticles = (count: number, width: number, height: number) => {
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2.5 + 0.5,
        color: activeColors[Math.floor(Math.random() * activeColors.length)],
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.2,
        alpha: Math.random() * 0.7 + 0.3,
        decay: Math.random() * 0.005 + 0.002,
      });
    }
    particlesRef.current = list;
  };

  // Set up analyzer parameters when FFT changes
  useEffect(() => {
    if (analyserNode) {
      analyserNode.fftSize = settings.fftSize;
      analyserNode.smoothingTimeConstant = settings.smoothing;
      
      const bufferLength = analyserNode.frequencyBinCount;
      freqDataRef.current = new Uint8Array(bufferLength);
      timeDataRef.current = new Uint8Array(bufferLength);
    }
  }, [analyserNode, settings.fftSize, settings.smoothing]);

  // Handle ResizeObserver to resize canvas dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      // Prevent canvas crash on 0 dimensions
      const width = rect.width || 400;
      const height = rect.height || 400;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Re-initialize particles relative to new width/height
      initParticles(settings.particleCount, width, height);
    };

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });

    observer.observe(container);
    resizeCanvas(); // Initial call

    return () => {
      observer.disconnect();
    };
  }, [settings.particleCount, activeTheme, settings.customColors]);

  // Primary requestAnimationFrame rendering loop
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Check if sound arrays are ready
      let rawBass = 0;
      let rawMids = 0;
      let rawTreble = 0;

      if (analyserNode && freqDataRef.current && timeDataRef.current) {
        analyserNode.getByteFrequencyData(freqDataRef.current);
        analyserNode.getByteTimeDomainData(timeDataRef.current);

        const len = freqDataRef.current.length;
        
        // Compute averages across frequencies
        // Bass range (approx indices 0 to 10% - Sub-bass and Bass)
        let bassSum = 0;
        const bassEnd = Math.floor(len * 0.08) || 1;
        for (let i = 0; i < bassEnd; i++) {
          bassSum += freqDataRef.current[i];
        }
        rawBass = bassSum / bassEnd / 255;

        // Mids range (approx 8% to 45%)
        let midsSum = 0;
        const midsStart = bassEnd;
        const midsEnd = Math.floor(len * 0.45) || 2;
        for (let i = midsStart; i < midsEnd; i++) {
          midsSum += freqDataRef.current[i];
        }
        rawMids = midsSum / (midsEnd - midsStart) / 255;

        // Treble range (approx 45% to 90%)
        let trebleSum = 0;
        const trebleStart = midsEnd;
        const trebleEnd = Math.floor(len * 0.9) || 3;
        for (let i = trebleStart; i < trebleEnd; i++) {
          trebleSum += freqDataRef.current[i];
        }
        rawTreble = trebleSum / (trebleEnd - trebleStart) / 255;
      } else if (isAudioPlaying) {
        // Fallback pulsing if play state is true but audio source isn't active (e.g. initial connection)
        rawBass = 0.15 + Math.sin(Date.now() * 0.005) * 0.05;
        rawMids = 0.12 + Math.cos(Date.now() * 0.003) * 0.04;
        rawTreble = 0.10 + Math.sin(Date.now() * 0.008) * 0.03;
      }

      // Smooth out standard values using LERP (Linear Interpolation)
      smoothedBass.current += (rawBass * settings.bassSensitivity - smoothedBass.current) * 0.15;
      smoothedMids.current += (rawMids * settings.midSensitivity - smoothedMids.current) * 0.15;
      smoothedTreble.current += (rawTreble * settings.trebleSensitivity - smoothedTreble.current) * 0.15;

      const bassVal = smoothedBass.current;
      const midsVal = smoothedMids.current;
      const trebleVal = smoothedTreble.current;

      // Update offsets
      angleRef.current += 0.003 * settings.speedMultiplier * (1 + bassVal);
      scrollOffsetRef.current += 1.5 * settings.speedMultiplier * (1 + bassVal * 2.5);

      // --- VISUAL ENGINES ---
      
      switch (settings.mode) {
        case 'circular-ring':
          renderCircularRing(ctx, width, height, bassVal, midsVal, trebleVal);
          break;
        case '3d-terrain':
          render3DTerrain(ctx, width, height, bassVal, midsVal, trebleVal);
          break;
        case 'particle-storm':
          renderParticleStorm(ctx, width, height, bassVal, midsVal, trebleVal);
          break;
        case 'synthwave-horizon':
          renderSynthwaveHorizon(ctx, width, height, bassVal, midsVal, trebleVal);
          break;
        case 'kaleidoscope':
          renderKaleidoscope(ctx, width, height, bassVal, midsVal, trebleVal);
          break;
      }

      // Loop
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, settings, activeTheme, isAudioPlaying]);

  // --- Circular Ring visualizer mode ---
  const renderCircularRing = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bass: number,
    mids: number,
    treble: number
  ) => {
    // Semi-transparent trailing clear for motion blur
    ctx.fillStyle = 'rgba(7, 3, 14, 0.18)';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const baseRadius = Math.min(cx, cy) * 0.35 + bass * 35;

    // Draw stardust particles orbiting
    if (particlesRef.current.length === 0) {
      initParticles(settings.particleCount, width, height);
    }

    // Shadow glow
    ctx.save();
    ctx.shadowBlur = 15 * settings.glowIntensity;
    ctx.shadowColor = activeGlow;

    // Outer orbiting particles
    particlesRef.current.forEach((p) => {
      p.angle += p.speed * 0.015 * settings.speedMultiplier * (1 + mids * 0.5);
      
      // Pull particles in/out based on bass/mids
      const orbitRadius = baseRadius * 1.5 + Math.sin(p.angle * 3) * 50 + (bass * 30);
      p.x = cx + Math.cos(p.angle) * orbitRadius;
      p.y = cy + Math.sin(p.angle) * orbitRadius;
      
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + treble * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw central neon circle
    ctx.strokeStyle = activeColors[0];
    ctx.lineWidth = settings.lineWidth * (1 + bass * 0.5);
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw radial frequency spikes
    if (freqDataRef.current) {
      const bins = Math.min(freqDataRef.current.length, 120);
      const angleStep = (Math.PI * 2) / bins;

      for (let i = 0; i < bins; i++) {
        const val = freqDataRef.current[i];
        const amp = (val / 255) * (Math.min(width, height) * 0.25) * (1 + mids * 0.4);
        
        const currentAngle = i * angleStep + angleRef.current;
        const startX = cx + Math.cos(currentAngle) * baseRadius;
        const startY = cy + Math.sin(currentAngle) * baseRadius;
        const endX = cx + Math.cos(currentAngle) * (baseRadius + amp);
        const endY = cy + Math.sin(currentAngle) * (baseRadius + amp);

        // Gradient color for spikes
        const grad = ctx.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, activeColors[0]);
        grad.addColorStop(0.5, activeColors[1]);
        if (activeColors[2]) grad.addColorStop(1, activeColors[2]);

        ctx.strokeStyle = grad;
        ctx.lineWidth = settings.lineWidth * 0.8;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Inner waveform rings
        if (timeDataRef.current) {
          const innerAmp = (timeDataRef.current[i] - 128) * 0.25;
          const innerX = cx + Math.cos(currentAngle) * (baseRadius - 10 + innerAmp);
          const innerY = cy + Math.sin(currentAngle) * (baseRadius - 10 + innerAmp);
          ctx.fillStyle = activeColors[1];
          ctx.beginPath();
          ctx.arc(innerX, innerY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  // --- 3D Terrain visualizer mode ---
  const render3DTerrain = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bass: number,
    mids: number,
    treble: number
  ) => {
    // Clear fully to keep lines sharp, but with subtle ambient lighting
    ctx.fillStyle = '#06010a';
    ctx.fillRect(0, 0, width, height);

    // Save historical slices of frequency data
    if (freqDataRef.current) {
      const numPoints = Math.min(freqDataRef.current.length, 36);
      const slice = new Float32Array(numPoints);
      
      // Save downsampled data
      const step = Math.floor(freqDataRef.current.length / numPoints);
      for (let i = 0; i < numPoints; i++) {
        slice[i] = freqDataRef.current[i * step] / 255;
      }

      // Add to front of history
      historyRef.current.unshift(slice);
      
      // Cap history rows (maximum 24 rows deep)
      if (historyRef.current.length > 22) {
        historyRef.current.pop();
      }
    } else {
      // Dummy history if silent
      if (historyRef.current.length === 0) {
        for (let r = 0; r < 18; r++) {
          historyRef.current.push(new Float32Array(36).fill(0));
        }
      }
      // Scroll dummy noise slightly
      const slice = new Float32Array(36);
      for (let i = 0; i < 36; i++) {
        slice[i] = (Math.sin(Date.now() * 0.002 + i * 0.3) + 1) * 0.1;
      }
      historyRef.current.unshift(slice);
      historyRef.current.pop();
    }

    const rows = historyRef.current.length;
    if (rows === 0) return;

    ctx.save();
    ctx.shadowBlur = 4 * settings.glowIntensity;
    ctx.shadowColor = activeGlow;

    // Draw rows back-to-front (painters algorithm) for pseudo-3D overlap
    for (let r = rows - 1; r >= 0; r--) {
      const rowSlice = historyRef.current[r];
      const cols = rowSlice.length;

      // Calculate vertical depth perspective
      const normalizedDepth = r / rows; // 0 (front) to 1 (back)
      const scale = 0.2 + (1 - normalizedDepth) * 0.8; // Far details are smaller
      
      const horizonY = height * 0.25;
      const rowY = horizonY + (normalizedDepth) * (height * 0.65);
      
      const rowWidth = width * (0.35 + (1 - normalizedDepth) * 0.55);
      const startX = (width - rowWidth) / 2;
      const colStep = rowWidth / (cols - 1);

      // Create neon gradient for this specific line
      const lineGrad = ctx.createLinearGradient(startX, rowY, startX + rowWidth, rowY);
      lineGrad.addColorStop(0, activeColors[0]);
      lineGrad.addColorStop(0.5, activeColors[1]);
      if (activeColors[2]) lineGrad.addColorStop(1, activeColors[2]);

      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = settings.lineWidth * (1 - normalizedDepth * 0.5);

      // Draw horizontal waveform row
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        const val = rowSlice[c];
        
        // Height factor deforms on bass/mids
        const maxHeight = height * 0.3 * scale;
        const heightMultiplier = c < cols / 2 ? (1 + bass * 0.6) : (1 + mids * 0.6);
        const yOffset = val * maxHeight * heightMultiplier;

        // Symmetric/mirrored height outward or centered
        const px = startX + c * colStep;
        const py = rowY - yOffset;

        if (c === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Optional connecting longitudinal grid lines (makes it look 3D)
      if (r < rows - 1) {
        const nextRowSlice = historyRef.current[r + 1];
        const nextNormalizedDepth = (r + 1) / rows;
        const nextRowY = horizonY + (nextNormalizedDepth) * (height * 0.65);
        const nextRowWidth = width * (0.35 + (1 - nextNormalizedDepth) * 0.55);
        const nextStartX = (width - nextRowWidth) / 2;
        const nextColStep = nextRowWidth / (cols - 1);

        ctx.strokeStyle = `rgba(${hexToRgb(activeColors[1])}, ${0.12 * (1 - normalizedDepth)})`;
        ctx.lineWidth = 0.5;
        
        // Draw connecting rib cages
        for (let c = 0; c < cols; c += 2) {
          const val1 = rowSlice[c];
          const val2 = nextRowSlice[c];

          const maxHeightCurrent = height * 0.3 * scale;
          const maxHeightNext = height * 0.3 * (0.2 + (1 - nextNormalizedDepth) * 0.8);
          
          const multiplier = c < cols / 2 ? (1 + bass * 0.6) : (1 + mids * 0.6);

          const px1 = startX + c * colStep;
          const py1 = rowY - val1 * maxHeightCurrent * multiplier;

          const px2 = nextStartX + c * nextColStep;
          const py2 = nextRowY - val2 * maxHeightNext * multiplier;

          ctx.beginPath();
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  };

  // --- Particle Storm visualizer mode ---
  const renderParticleStorm = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bass: number,
    mids: number,
    treble: number
  ) => {
    // Subtle trail effect
    ctx.fillStyle = 'rgba(5, 2, 10, 0.22)';
    ctx.fillRect(0, 0, width, height);

    if (particlesRef.current.length === 0) {
      initParticles(settings.particleCount, width, height);
    }

    ctx.save();
    ctx.shadowBlur = 10 * settings.glowIntensity;
    ctx.shadowColor = activeGlow;

    const cx = width / 2;
    const cy = height / 2;

    // Fluid turbulence calculations based on frequencies
    const driftSpeedX = (mids - treble) * 1.5 * settings.speedMultiplier;
    const pulseScale = 1 + bass * 1.5;

    particlesRef.current.forEach((p) => {
      // 1. Vortex/gravitational pull towards center
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Spiral angular force
      const vortexForce = mids * 1.8 * settings.speedMultiplier;
      const spiralAngle = Math.atan2(dy, dx) + (0.02 * vortexForce * (100 / (dist + 20)));
      
      // Pull particles inwards, but explode outwards on heavy bass kicks
      let targetSpeed = p.speed * settings.speedMultiplier;
      if (bass > 0.8) {
        // High energy expansion
        targetSpeed *= (1.5 + bass * 2.0);
        p.x += (dx / dist) * targetSpeed;
        p.y += (dy / dist) * targetSpeed;
      } else {
        // Slow vortex flow
        const spiralSpeed = 1.0 + mids * 1.5;
        p.x = cx + Math.cos(spiralAngle) * (dist - 0.2 * spiralSpeed);
        p.y = cy + Math.sin(spiralAngle) * (dist - 0.2 * spiralSpeed);
      }

      // 2. Continuous drift wind
      p.x += p.vx * settings.speedMultiplier + driftSpeedX;
      p.y += p.vy * settings.speedMultiplier + (Math.sin(Date.now() * 0.001 + p.angle) * 0.2);

      // Jitter sparkling on treble
      if (treble > 0.4) {
        p.x += (Math.random() - 0.5) * treble * 6;
        p.y += (Math.random() - 0.5) * treble * 6;
      }

      // Re-spawn or wrap off-screen particles
      if (p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10 || dist < 8) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
        // Reset speeds
        p.vx = (Math.random() - 0.5) * 1.5;
        p.vy = (Math.random() - 0.5) * 1.5;
      }

      // Draw particle particle
      const renderSize = p.size * (1 + bass * 1.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, renderSize, 0, Math.PI * 2);
      ctx.fill();
    });

    // Optional glowing energy orb in center
    const orbRadius = 15 + bass * 45;
    const orbGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, orbRadius);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.2, activeColors[0]);
    orbGrad.addColorStop(0.6, `rgba(${hexToRgb(activeColors[1])}, 0.25)`);
    orbGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // --- Synthwave Horizon visualizer mode ---
  const renderSynthwaveHorizon = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bass: number,
    mids: number,
    treble: number
  ) => {
    // Solid retro black/indigo background
    ctx.fillStyle = '#05010a';
    ctx.fillRect(0, 0, width, height);

    const horizonY = height * 0.55;
    const cx = width / 2;

    // Draw twinkling starlight starfield
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 40; i++) {
      const sx = (Math.sin(i * 123.456) * 0.5 + 0.5) * width;
      const sy = (Math.cos(i * 789.012) * 0.5 + 0.5) * horizonY;
      const size = (Math.sin(Date.now() * 0.003 + i) * 0.5 + 0.5) * 1.5 * (1 + treble * 0.8);
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.shadowBlur = 20 * settings.glowIntensity;
    ctx.shadowColor = activeGlow;

    // Draw Retro Sun with horizontal scanline cuts
    const sunRadius = Math.min(width, height) * 0.2 + bass * 15;
    const sunX = cx;
    const sunY = horizonY - 20;

    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
    sunGrad.addColorStop(0, '#ffe600');
    sunGrad.addColorStop(0.5, '#ff007f');
    sunGrad.addColorStop(1, '#2d004d');

    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, Math.PI, 0); // half circle top
    ctx.fill();

    // Sliced lines on the sun
    ctx.fillStyle = '#05010a';
    for (let sy = sunY - sunRadius; sy < sunY; sy += 10) {
      const sliceHeight = 2.5 + ((sy - (sunY - sunRadius)) / sunRadius) * 5;
      ctx.fillRect(sunX - sunRadius - 10, sy, sunRadius * 2 + 20, sliceHeight);
    }

    // Draw moving isometric Perspective Grid (Retro Floor)
    ctx.restore();
    ctx.strokeStyle = activeColors[0];
    ctx.lineWidth = 1.5;

    const gridLines = 18;
    const maxOffset = width * 0.8;

    // Perspective lines spreading from horizon
    for (let i = -gridLines / 2; i <= gridLines / 2; i++) {
      const t = i / (gridLines / 2);
      const startX = cx + t * 40;
      const endX = cx + t * maxOffset;
      ctx.beginPath();
      ctx.moveTo(startX, horizonY);
      ctx.lineTo(endX, height);
      ctx.stroke();
    }

    // Horizontal grid lines scrolling forward
    const speed = scrollOffsetRef.current % 40;
    ctx.strokeStyle = `rgba(${hexToRgb(activeColors[1])}, 0.8)`;
    for (let y = horizonY; y < height; y += 30) {
      // Offset with dynamic scroll
      const scrolledY = y + speed;
      if (scrolledY > height) continue;

      // Make lines closer together near the horizon
      const depthFactor = (scrolledY - horizonY) / (height - horizonY);
      const actualY = horizonY + depthFactor * (height - horizonY);

      // Line width fades near horizon
      ctx.lineWidth = 0.5 + depthFactor * 1.5;
      ctx.strokeStyle = `rgba(${hexToRgb(activeColors[1])}, ${0.15 + depthFactor * 0.75})`;

      ctx.beginPath();
      ctx.moveTo(0, actualY);
      ctx.lineTo(width, actualY);
      ctx.stroke();
    }

    // Draw equalizer frequency bars on the sides
    if (freqDataRef.current) {
      const barCount = 15;
      const barWidth = 10;
      const spacing = 4;
      const maxBarHeight = height * 0.35;

      ctx.save();
      ctx.shadowBlur = 10 * settings.glowIntensity;
      ctx.shadowColor = activeGlow;

      for (let i = 0; i < barCount; i++) {
        const val = freqDataRef.current[i * 2]; // Take early bins
        const barHeight = (val / 255) * maxBarHeight * (1 + mids * 0.3);

        const bxLeft = 30 + i * (barWidth + spacing);
        const bxRight = width - 30 - barCount * (barWidth + spacing) + i * (barWidth + spacing);
        
        const by = horizonY + 30;

        // Draw Left EQ
        const gradL = ctx.createLinearGradient(bxLeft, by, bxLeft, by - barHeight);
        gradL.addColorStop(0, activeColors[0]);
        if (activeColors[1]) gradL.addColorStop(1, activeColors[1]);
        ctx.fillStyle = gradL;
        ctx.fillRect(bxLeft, by - barHeight, barWidth, barHeight);

        // Draw Right EQ (mirrored index)
        const mirroredVal = freqDataRef.current[(barCount - 1 - i) * 2];
        const barHeightR = (mirroredVal / 255) * maxBarHeight * (1 + mids * 0.3);
        const gradR = ctx.createLinearGradient(bxRight, by, bxRight, by - barHeightR);
        gradR.addColorStop(0, activeColors[0]);
        if (activeColors[1]) gradR.addColorStop(1, activeColors[1]);
        ctx.fillStyle = gradR;
        ctx.fillRect(bxRight, by - barHeightR, barWidth, barHeightR);
      }
      ctx.restore();
    }
  };

  // --- Symmetric Mandala (Kaleidoscope) ---
  const renderKaleidoscope = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bass: number,
    mids: number,
    treble: number
  ) => {
    // Beautiful psychedelic trail
    ctx.fillStyle = 'rgba(6, 3, 15, 0.16)';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(cx, cy) * 0.95;

    // Use 8 slices
    const slices = 8;
    const sliceAngle = (Math.PI * 2) / slices;

    ctx.save();
    ctx.translate(cx, cy);
    // Rotate canvas context slowly based on overall speed
    ctx.rotate(angleRef.current * 0.4);

    ctx.shadowBlur = 12 * settings.glowIntensity;
    ctx.shadowColor = activeGlow;

    // Draw single wedge and mirror it
    for (let s = 0; s < slices; s++) {
      ctx.save();
      ctx.rotate(s * sliceAngle);

      // Reflection mirror slice
      if (s % 2 === 1) {
        ctx.scale(1, -1);
      }

      // Draw frequency lines within the wedge
      if (freqDataRef.current && timeDataRef.current) {
        const bins = Math.min(freqDataRef.current.length / 4, 60);
        
        ctx.lineWidth = settings.lineWidth * (1 + treble * 0.5);
        ctx.beginPath();

        for (let i = 0; i < bins; i++) {
          const freqVal = freqDataRef.current[i];
          const timeVal = timeDataRef.current[i];

          // Map values to coordinates inside standard triangle wedge
          const r = (i / bins) * maxRadius * (0.3 + bass * 0.2);
          
          // Waveform deforms the angle
          const waveAmp = ((timeVal - 128) / 128) * sliceAngle * 0.3 * (1 + mids * 0.5);
          const localAngle = (i / bins) * sliceAngle * 0.5 + waveAmp;

          const px = Math.cos(localAngle) * r;
          const py = Math.sin(localAngle) * r;

          // Draw colorful glowing joints
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);

          // Add stardust blobs
          if (i % 6 === 0) {
            ctx.fillStyle = activeColors[i % activeColors.length];
            ctx.beginPath();
            ctx.arc(px, py, 2.5 + (freqVal / 255) * 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Stroke connecting waveforms
        const grad = ctx.createLinearGradient(0, 0, maxRadius, 0);
        grad.addColorStop(0, activeColors[0]);
        grad.addColorStop(0.5, activeColors[1]);
        if (activeColors[2]) grad.addColorStop(1, activeColors[2]);
        
        ctx.strokeStyle = grad;
        ctx.stroke();
      } else {
        // Simple procedural pattern if silent
        ctx.lineWidth = settings.lineWidth;
        ctx.strokeStyle = activeColors[0];
        ctx.beginPath();
        for (let r = 20; r < maxRadius; r += 20) {
          const a = (r / maxRadius) * sliceAngle * 0.5;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  // Helper: Hex color to RGB string
  const hexToRgb = (hex: string): string => {
    // Strip # if present
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative" id="visualizer-stage-wrapper">
      <canvas ref={canvasRef} className="block w-full h-full cursor-pointer" id="visualizer-main-canvas" />
    </div>
  );
}

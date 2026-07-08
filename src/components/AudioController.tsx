import React from 'react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';

interface AudioControllerProps {
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  fileName: string;
}

export default function AudioController({
  isPlaying,
  onPlayPauseToggle,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  fileName,
}: AudioControllerProps) {
  const [isMuted, setIsMuted] = React.useState(false);
  const prevVolumeRef = React.useRef(volume);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      onVolumeChange(prevVolumeRef.current || 0.8);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = volume;
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  return (
    <div className="bg-indigo-950/80 backdrop-blur-xl rounded-2xl p-4 border border-indigo-800/50 flex flex-wrap items-center gap-5 justify-between shadow-2xl" id="audio-file-controller-bar">
      {/* Track Name */}
      <div className="flex items-center gap-3 max-w-xs md:max-w-sm truncate">
        <div className={`p-2 bg-fuchsia-500/15 text-fuchsia-400 rounded-xl ${isPlaying ? 'animate-bounce' : ''}`}>
          <Music className="w-4 h-4" />
        </div>
        <div className="truncate">
          <span className="text-[10px] text-indigo-400 block uppercase font-bold tracking-widest font-mono">NOW PLAYING</span>
          <span className="text-white text-xs font-semibold truncate block font-mono">{fileName || "No Track Uploaded"}</span>
        </div>
      </div>

      {/* Play Controls & Scrubber */}
      <div className="flex-1 min-w-[280px] flex items-center gap-3.5">
        <button
          onClick={onPlayPauseToggle}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:opacity-95 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/15 transition transform active:scale-95 cursor-pointer"
          id="audio-player-toggle-play-btn"
        >
          {isPlaying ? <Pause className="w-4.5 h-4.5 fill-white" /> : <Play className="w-4.5 h-4.5 fill-white ml-0.5" />}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] font-mono text-indigo-300">{formatTime(currentTime)}</span>
          
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleTimelineChange}
            className="flex-1 h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
            style={{
              background: `linear-gradient(to right, #d946ef 0%, #d946ef ${duration ? (currentTime / duration) * 100 : 0}%, #1e1b4b ${duration ? (currentTime / duration) * 100 : 0}%, #1e1b4b 100%)`
            }}
          />
          
          <span className="text-[10px] font-mono text-indigo-300">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Bar */}
      <div className="flex items-center gap-2 min-w-[120px]" id="volume-control-container">
        <button
          onClick={handleMuteToggle}
          className="text-indigo-300 hover:text-white transition p-1 cursor-pointer"
        >
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-fuchsia-400" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onVolumeChange(val);
            if (val > 0) setIsMuted(false);
          }}
          className="w-20 h-1.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
        />
      </div>
    </div>
  );
}

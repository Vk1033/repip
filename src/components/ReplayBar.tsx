import React from 'react';
import { Play, Pause, SkipBack, SkipForward, FastForward, Scissors } from 'lucide-react';
import { useStore } from '../store/useStore';
import { WorkerClient } from '../workers/worker-client';

export interface ReplayBarProps {
  workerClient: WorkerClient | null;
  onJumpClick?: () => void;
}

export const SPEED_OPTIONS = [0.5, 1, 2, 5, 10] as const;

export const ReplayBar: React.FC<ReplayBarProps> = ({ workerClient, onJumpClick }) => {
  const replayState = useStore((s) => s.replayState);

  if (!workerClient) return null;

  const handlePlayPause = () => {
    if (replayState.isPlaying) {
      workerClient.send({ type: 'PAUSE' });
    } else {
      workerClient.send({ type: 'PLAY' });
    }
  };

  const handleStep = (delta: number) => {
    workerClient.send({ type: 'STEP', payload: { delta } });
  };

  const handleSpeedChange = (speed: number) => {
    workerClient.send({ type: 'SET_SPEED', payload: { speed } });
  };

  return (
    <div
      data-testid="replay-bar"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-tv-surface/95 border border-tv-border backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl"
    >
      {/* Jump Tool */}
      <button
        onClick={onJumpClick}
        title="Jump to Candle"
        aria-label="Jump to Candle"
        data-testid="jump-btn"
        className="p-2 text-tv-muted hover:text-tv-text hover:bg-tv-hover rounded-full transition-colors"
      >
        <Scissors className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-tv-border" />

      {/* Step Backward */}
      <button
        onClick={() => handleStep(-1)}
        title="Step Back"
        aria-label="Step Back"
        data-testid="step-back-btn"
        className="p-2 text-tv-text hover:bg-tv-hover rounded-full transition-colors"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        title={replayState.isPlaying ? 'Pause' : 'Play'}
        aria-label={replayState.isPlaying ? 'Pause' : 'Play'}
        data-testid="play-pause-btn"
        className="p-3 bg-tv-primary hover:bg-blue-600 text-white rounded-full transition-colors shadow-md"
      >
        {replayState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      {/* Step Forward */}
      <button
        onClick={() => handleStep(1)}
        title="Step Forward (1 bar)"
        aria-label="Step Forward (1 bar)"
        data-testid="step-forward-btn"
        className="p-2 text-tv-text hover:bg-tv-hover rounded-full transition-colors"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-tv-border" />

      {/* Playback Speed Picker */}
      <div className="flex items-center gap-1 text-xs" data-testid="speed-picker">
        <FastForward className="w-3.5 h-3.5 text-tv-muted" />
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => handleSpeedChange(s)}
            title={`${s}x Speed`}
            aria-label={`${s}x Speed`}
            data-testid={`speed-btn-${s}`}
            className={`px-2 py-1 rounded transition-colors ${
              replayState.speed === s ? 'bg-tv-border text-tv-text font-bold' : 'text-tv-muted hover:text-tv-text'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-tv-border" />

      {/* Bar Counter */}
      <span
        data-testid="bar-counter"
        className="text-xs text-tv-muted font-mono whitespace-nowrap"
      >
        {replayState.currentIndex + 1} / {replayState.totalCandles}
      </span>
    </div>
  );
};

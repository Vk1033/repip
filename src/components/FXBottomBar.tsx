import React, { useState, FC } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { WorkerClient } from '../workers/worker-client';

import { PortfolioState } from '../core/paper-trading';

export interface FXBottomBarProps {
  workerClient: WorkerClient | null;
  onJumpClick?: () => void;
  lastPrice?: number;
  portfolio?: PortfolioState;
}

export const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 30, 60] as const;
export const TIME_PRESETS = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'] as const;

export const FXBottomBar: FC<FXBottomBarProps> = ({
  workerClient,
  onJumpClick,
  lastPrice = 21293.25,
  portfolio: controlledPortfolio,
}) => {
  const replayState = useStore((s) => s.replayState);
  const storePortfolio = useStore((s) => s.portfolio);
  const portfolio = controlledPortfolio ?? storePortfolio;
  const timeframe = useStore((s) => s.timeframe);
  const rthMode = useStore((s) => s.rthMode);
  const setRthMode = useStore((s) => s.setRthMode);
  const scaleMode = useStore((s) => s.scaleMode);
  const setScaleMode = useStore((s) => s.setScaleMode);

  const [quantity, setQuantity] = useState<number>(1);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('1D');

  const formattedEquity = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(portfolio?.equity ?? 100000);

  // Time format: HH:mm:ss UTC-5
  const sessionTimeStr = (() => {
    if (replayState?.currentCandle?.time) {
      const d = new Date(replayState.currentCandle.time * 1000);
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      const secs = String(d.getUTCSeconds()).padStart(2, '0');
      return `${hours}:${mins}:${secs} UTC-5`;
    }
    return '09:29:59 UTC-5';
  })();

  const handleOrder = (side: 'BUY' | 'SELL') => {
    if (!workerClient) return;
    workerClient.send({
      type: 'PLACE_ORDER',
      payload: {
        order: {
          side,
          type: 'MARKET',
          size: quantity,
        },
      },
    });
  };

  const handlePlayPause = () => {
    if (!workerClient) return;
    if (replayState.isPlaying) {
      workerClient.send({ type: 'PAUSE' });
    } else {
      workerClient.send({ type: 'PLAY' });
    }
  };

  const handleStep = (delta: number) => {
    if (!workerClient) return;
    workerClient.send({ type: 'STEP', payload: { delta } });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!workerClient) return;
    const speed = parseFloat(e.target.value);
    workerClient.send({ type: 'SET_SPEED', payload: { speed } });
  };

  const applyPreset = (presetQty: number) => {
    setQuantity(presetQty);
    setShowPresets(false);
  };

  return (
    <footer
      data-testid="fx-bottom-bar"
      className="h-11 w-full bg-white dark:bg-[#1e222d] border-t border-[#cbd5e1] dark:border-[#2a2e39] text-[#1e293b] dark:text-[#d1d4dc] text-xs flex items-center justify-between px-3 select-none z-30"
    >
      <div data-testid="replay-bar" className="hidden" />
      {/* LEFT: Quick Execution Dock */}
      <div className="flex items-center gap-2">
        <button
          data-testid="bottom-buy-btn"
          onClick={() => handleOrder('BUY')}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5"
        >
          <span>Buy</span>
          {lastPrice > 0 && <span className="opacity-90 font-normal">{(lastPrice + 0.25).toFixed(2)}</span>}
        </button>

        <button
          data-testid="bottom-sell-btn"
          onClick={() => handleOrder('SELL')}
          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded shadow-sm transition-colors flex items-center gap-1.5"
        >
          <span>Sell</span>
          {lastPrice > 0 && <span className="opacity-90 font-normal">{lastPrice.toFixed(2)}</span>}
        </button>

        <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded px-2 py-0.5">
          <span className="text-gray-400">Qty:</span>
          <input
            data-testid="bottom-qty-input"
            type="number"
            min="0.01"
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0.01, parseFloat(e.target.value) || 1))}
            className="w-10 bg-transparent text-center font-medium focus:outline-none text-[#1e293b] dark:text-white"
          />
        </div>

        <div className="relative">
          <button
            data-testid="bottom-presets-btn"
            onClick={() => setShowPresets(!showPresets)}
            className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2e39] rounded flex items-center gap-1 border border-transparent hover:border-[#cbd5e1] dark:hover:border-[#2a2e39]"
          >
            <span>Presets</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showPresets && (
            <div className="absolute left-0 bottom-full mb-1 w-36 bg-white dark:bg-[#1e222d] border border-[#cbd5e1] dark:border-[#2a2e39] shadow-lg rounded py-1 z-50 text-xs">
              <button
                onClick={() => applyPreset(1)}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
              >
                1 Contract
              </button>
              <button
                onClick={() => applyPreset(5)}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
              >
                5 Contracts
              </button>
              <button
                onClick={() => applyPreset(10)}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
              >
                10 Contracts
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Replay Playback Bar */}
      <div className="flex items-center gap-2">
        <button
          data-testid="bottom-jump-btn"
          onClick={onJumpClick}
          title="Jump to bar / date"
          className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="bottom-step-back-btn"
          onClick={() => handleStep(-1)}
          title="Step Backward"
          className="p-1.5 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="bottom-play-pause-btn"
          onClick={handlePlayPause}
          title={replayState.isPlaying ? 'Pause' : 'Play'}
          className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-sm transition-colors"
        >
          {replayState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <button
          data-testid="bottom-step-forward-btn"
          onClick={() => handleStep(1)}
          title="Step Forward (1 bar)"
          className="p-1.5 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center bg-gray-100 dark:bg-[#131722] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 ml-1">
          <select
            data-testid="bottom-speed-select"
            value={replayState.speed}
            onChange={handleSpeedChange}
            className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer text-gray-800 dark:text-gray-200"
          >
            {SPEED_OPTIONS.map((spd) => (
              <option key={spd} value={spd}>
                {spd}x
              </option>
            ))}
          </select>
        </div>

        <span
          data-testid="bottom-resolution-pill"
          className="px-2 py-0.5 text-[11px] font-semibold bg-gray-200 dark:bg-[#2a2e39] text-gray-700 dark:text-gray-300 rounded"
        >
          {timeframe}
        </span>
      </div>

      {/* RIGHT: Timezone, ETH/RTH, Scales & Equity */}
      <div className="flex items-center gap-3">
        {/* Time range presets */}
        <div className="hidden lg:flex items-center gap-1 text-[11px]">
          {TIME_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setActivePreset(p)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                activePreset === p
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="h-3 w-px bg-gray-300 dark:bg-gray-700" />

        {/* Timezone display */}
        <span
          data-testid="bottom-time-display"
          className="text-[11px] text-gray-600 dark:text-gray-400 font-mono"
        >
          {sessionTimeStr}
        </span>

        {/* ETH / RTH button */}
        <button
          data-testid="bottom-rth-btn"
          onClick={() => setRthMode(rthMode === 'ETH' ? 'RTH' : 'ETH')}
          className="px-1.5 py-0.5 text-[11px] font-medium border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-[#2a2e39]"
        >
          {rthMode}
        </button>

        {/* Scale buttons */}
        <div className="flex items-center gap-0.5 text-[11px]">
          <button
            data-testid="bottom-scale-percent"
            onClick={() => setScaleMode(scaleMode === 'percent' ? 'normal' : 'percent')}
            className={`px-1 py-0.5 rounded ${scaleMode === 'percent' ? 'font-bold text-blue-600' : 'text-gray-500'}`}
          >
            %
          </button>
          <button
            data-testid="bottom-scale-log"
            onClick={() => setScaleMode(scaleMode === 'log' ? 'normal' : 'log')}
            className={`px-1 py-0.5 rounded ${scaleMode === 'log' ? 'font-bold text-blue-600' : 'text-gray-500'}`}
          >
            log
          </button>
          <button
            data-testid="bottom-scale-auto"
            onClick={() => setScaleMode('normal')}
            className={`px-1 py-0.5 rounded ${scaleMode === 'normal' ? 'font-bold text-blue-600' : 'text-gray-500'}`}
          >
            auto
          </button>
        </div>

        <div className="h-3 w-px bg-gray-300 dark:bg-gray-700" />

        {/* Account Equity pill */}
        <div
          data-testid="bottom-account-equity"
          className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-[#131722] border border-gray-300 dark:border-gray-700 rounded text-xs font-bold text-gray-900 dark:text-white"
        >
          <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{formattedEquity}</span>
        </div>
      </div>
    </footer>
  );
};

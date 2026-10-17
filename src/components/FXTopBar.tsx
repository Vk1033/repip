import { type FC, useState } from 'react';
import {
  FastForward,
  Plus,
  ChevronDown,
  BarChart2,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Camera,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Timeframe } from '../types/market';
import { WorkerClient } from '../workers/worker-client';

export interface FXTopBarProps {
  workerClient?: WorkerClient | null;
  symbol?: string;
}

export const FX_TIMEFRAMES: string[] = [
  '30s',
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '1D',
  '1W',
  '1M',
];

export const FXTopBar: FC<FXTopBarProps> = ({ workerClient, symbol: propSymbol }) => {
  const storeSymbol = useStore((s) => s.symbol);
  const symbol = propSymbol ?? storeSymbol;
  const timeframe = useStore((s) => s.timeframe);
  const setTimeframe = useStore((s) => s.setTimeframe);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const indicators = useStore((s) => s.indicators);
  const toggleIndicator = useStore((s) => s.toggleIndicator);

  const [showIndicatorsModal, setShowIndicatorsModal] = useState<boolean>(false);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState<boolean>(false);

  const handleTimeframeChange = (tf: string) => {
    // Map to supported Timeframe if available
    const standardTf: Timeframe = (['1m', '3m', '5m', '15m', '1h', '4h', '1D'].includes(tf)
      ? tf
      : '1m') as Timeframe;

    setTimeframe(standardTf);
    if (workerClient) {
      workerClient.send({ type: 'SET_TIMEFRAME', payload: { timeframe: standardTf } });
    }
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header
      data-testid="fx-top-bar"
      className="h-10 w-full bg-white dark:bg-[#1e222d] border-b border-[#cbd5e1] dark:border-[#2a2e39] text-[#1e293b] dark:text-[#d1d4dc] text-xs flex items-center justify-between px-2 select-none z-30"
    >
      <div data-testid="top-bar" className="hidden" />
      {/* LEFT: Replay status & Symbol & Timeframes */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {/* Fast forward replay icon */}
        <div className="p-1 text-blue-600 dark:text-blue-400">
          <FastForward className="w-4 h-4" />
        </div>

        {/* Symbol with Compare Button */}
        <div className="relative flex items-center bg-[#f1f5f9] dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded px-2 py-0.5 font-bold">
          <button
            data-testid="topbar-symbol-btn"
            onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
            className="hover:text-blue-600 transition-colors mr-1"
          >
            {symbol}
          </button>
          <button
            title="Compare or Add Symbol"
            className="text-gray-400 hover:text-black dark:hover:text-white"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />

        {/* Quick Timeframe Ribbon */}
        <div className="flex items-center gap-0.5">
          {FX_TIMEFRAMES.map((tf) => {
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                data-testid={`tf-${tf}`}
                onClick={() => handleTimeframeChange(tf)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2e39]'
                }`}
              >
                {tf}
              </button>
            );
          })}
          <button className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* RIGHT: Indicators, Order flow, Theme & Session tools */}
      <div className="flex items-center gap-2">
        {/* Indicators Trigger */}
        <div className="relative">
          <button
            data-testid="topbar-indicators-btn"
            onClick={() => setShowIndicatorsModal(!showIndicatorsModal)}
            className="flex items-center gap-1 px-2 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2e39] rounded border border-transparent hover:border-[#cbd5e1] dark:hover:border-[#2a2e39]"
          >
            <span className="font-serif italic font-bold">fx</span>
            <span>Indicators</span>
          </button>

          {showIndicatorsModal && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1e222d] border border-[#cbd5e1] dark:border-[#2a2e39] shadow-xl rounded py-1 z-50">
              <label className="flex items-center px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39] cursor-pointer">
                <input
                  type="checkbox"
                  checked={indicators.sma20}
                  onChange={() => toggleIndicator('sma20')}
                  className="mr-2"
                />
                <span>SMA (20)</span>
              </label>
              <label className="flex items-center px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39] cursor-pointer">
                <input
                  type="checkbox"
                  checked={indicators.ema50}
                  onChange={() => toggleIndicator('ema50')}
                  className="mr-2"
                />
                <span>EMA (50)</span>
              </label>
              <label className="flex items-center px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2e39] cursor-pointer">
                <input
                  type="checkbox"
                  checked={indicators.rsi14}
                  onChange={() => toggleIndicator('rsi14')}
                  className="mr-2"
                />
                <span>RSI (14)</span>
              </label>
            </div>
          )}
        </div>

        {/* Order Flow Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-[#131722] border border-gray-300 dark:border-gray-700 rounded text-[11px]">
          <BarChart2 className="w-3 h-3 text-blue-600" />
          <span>Order flow</span>
          <span className="bg-blue-600 text-white font-bold text-[9px] px-1 rounded">NEW</span>
        </div>

        {/* Analytics button */}
        <button className="hidden md:flex items-center gap-1 px-2 py-1 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2e39] rounded">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        {/* Session Code */}
        <span className="hidden lg:inline text-[11px] font-mono text-gray-500">
          code: TOKEN
        </span>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button title="Undo" className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button title="Redo" className="p-1 text-gray-400 hover:text-black dark:hover:text-white">
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          data-testid="topbar-theme-toggle"
          onClick={handleToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2e39] rounded transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Screenshot Camera */}
        <button title="Take screenshot" className="p-1 text-gray-500 hover:text-black dark:hover:text-white">
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Maximize */}
        <button title="Fullscreen" className="p-1 text-gray-500 hover:text-black dark:hover:text-white">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

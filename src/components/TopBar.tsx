import { useRef, useState, type FC, type ChangeEvent } from 'react';
import { useStore } from '../store/useStore';
import { Timeframe } from '../types/market';
import { Upload, Activity, Loader2 } from 'lucide-react';
import { parseCandlesCSV } from '../data/csv-parser';
import { fetchBinance1mKlines } from '../data/binance';
import { WorkerClient } from '../workers/worker-client';

export interface TopBarProps {
  workerClient: WorkerClient | null;
}

export const TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '1h', '4h', '1D'];
export const PRESET_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

function notifyUser(msg: string) {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(msg);
  } else if (typeof alert === 'function') {
    alert(msg);
  } else {
    console.error(msg);
  }
}

export const TopBar: FC<TopBarProps> = ({ workerClient }) => {
  const symbol = useStore((s) => s.symbol);
  const timeframe = useStore((s) => s.timeframe);
  const setTimeframe = useStore((s) => s.setTimeframe);
  const setSymbol = useStore((s) => s.setSymbol);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingSymbol, setLoadingSymbol] = useState<string | null>(null);

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    if (workerClient) {
      workerClient.send({ type: 'SET_TIMEFRAME', payload: { timeframe: tf } });
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workerClient) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCandlesCSV(text);
        if (parsed.length === 0) {
          notifyUser('No candles found in CSV');
          return;
        }
        const sym = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
        setSymbol(sym);
        workerClient.send({ type: 'LOAD_DATA', payload: { candles: parsed } });
      } catch (err: any) {
        notifyUser('Failed to parse CSV: ' + (err?.message || String(err)));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const loadPresetSymbol = async (sym: string) => {
    if (!workerClient) return;
    try {
      setLoadingSymbol(sym);
      const candles = await fetchBinance1mKlines(sym, 1000);
      setSymbol(sym);
      workerClient.send({ type: 'LOAD_DATA', payload: { candles } });
    } catch (err: any) {
      notifyUser('Error fetching symbol: ' + (err?.message || String(err)));
    } finally {
      setLoadingSymbol(null);
    }
  };

  return (
    <header
      data-testid="top-bar"
      className="h-11 border-b border-tv-border bg-tv-surface flex items-center justify-between px-3 text-xs select-none"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-bold text-sm text-tv-text mr-2">
          <Activity className="w-5 h-5 text-tv-primary" />
          <span>repip</span>
        </div>

        {/* Symbol Selector */}
        <div className="flex items-center bg-tv-bg rounded border border-tv-border" data-testid="symbol-selector">
          {PRESET_SYMBOLS.map((sym) => (
            <button
              key={sym}
              onClick={() => loadPresetSymbol(sym)}
              disabled={loadingSymbol !== null}
              data-testid={`symbol-btn-${sym}`}
              className={`px-2.5 py-1 font-semibold rounded flex items-center gap-1 transition-colors ${
                symbol === sym ? 'bg-tv-primary text-white' : 'text-tv-muted hover:text-tv-text'
              }`}
            >
              {loadingSymbol === sym && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{sym}</span>
            </button>
          ))}
          {!PRESET_SYMBOLS.includes(symbol) && (
            <span
              data-testid="custom-symbol-badge"
              className="px-2.5 py-1 font-semibold rounded bg-tv-primary text-white"
            >
              {symbol}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-tv-border mx-1" />

        {/* Timeframe Selectors */}
        <div className="flex items-center bg-tv-bg rounded border border-tv-border" data-testid="timeframe-selector">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              data-testid={`timeframe-btn-${tf}`}
              className={`px-2 py-1 font-semibold rounded transition-colors ${
                timeframe === tf ? 'bg-tv-border text-tv-text' : 'text-tv-muted hover:text-tv-text'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          data-testid="csv-file-input"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          data-testid="import-csv-btn"
          className="flex items-center gap-1.5 px-3 py-1 bg-tv-bg hover:bg-tv-border text-tv-text rounded border border-tv-border font-medium transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import CSV</span>
        </button>
      </div>
    </header>
  );
};

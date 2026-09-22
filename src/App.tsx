import { useEffect, useState } from 'react';
import { WorkerClient } from './workers/worker-client';
import { ChartContainer } from './components/ChartContainer';
import { DrawingOverlay } from './components/DrawingOverlay';
import { TopBar } from './components/TopBar';
import { LeftToolbar } from './components/LeftToolbar';
import { ReplayBar } from './components/ReplayBar';
import { TradingPanel } from './components/TradingPanel';
import { useStore } from './store/useStore';
import { fetchBinance1mKlines } from './data/binance';
import { Candle } from './types/market';
import { IChartApi, ISeriesApi } from '@tradingview/lightweight-charts';

export interface AppProps {
  workerClient?: WorkerClient;
  autoLoadData?: boolean;
}

export function App({ workerClient: initialClient, autoLoadData = true }: AppProps = {}) {
  const [workerClient, setWorkerClient] = useState<WorkerClient | null>(initialClient ?? null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [lastUpdate, setLastUpdate] = useState<{ candle: Candle; isNewBar: boolean } | null>(null);
  const [chartApi, setChartApi] = useState<IChartApi | null>(null);
  const [seriesApi, setSeriesApi] = useState<ISeriesApi<'Candlestick'> | null>(null);

  const setReplayState = useStore((s) => s.setReplayState);
  const setPortfolio = useStore((s) => s.setPortfolio);

  useEffect(() => {
    let client: WorkerClient | null = initialClient ?? null;
    let ownsClient = false;

    if (!client && typeof Worker !== 'undefined') {
      try {
        client = new WorkerClient();
        ownsClient = true;
        setWorkerClient(client);
      } catch (err) {
        console.warn('Could not initialize WorkerClient:', err);
      }
    } else if (client) {
      setWorkerClient(client);
    }

    if (!client) return;

    const unsubscribe = client.onMessage((msg) => {
      switch (msg.type) {
        case 'SERIES_DATA':
          setCandles(msg.payload.candles);
          break;
        case 'CANDLE_UPDATE':
          setLastUpdate(msg.payload);
          break;
        case 'REPLAY_STATE':
          setReplayState(msg.payload);
          break;
        case 'PORTFOLIO_UPDATE':
          setPortfolio(msg.payload);
          break;
      }
    });

    if (autoLoadData) {
      // Auto-load initial Binance data with fallback mock candles
      fetchBinance1mKlines('BTCUSDT', 1000)
        .then((initCandles) => {
          client?.send({ type: 'LOAD_DATA', payload: { candles: initCandles } });
        })
        .catch((err) => {
          console.warn('Binance fetch failed, generating fallback replay candles:', err);
          const now = Math.floor(Date.now() / 1000);
          const mockCandles: Candle[] = Array.from({ length: 500 }, (_, i) => {
            const t = now - (500 - i) * 60;
            const base = 50000 + Math.sin(i / 10) * 1000 + i * 5;
            return {
              time: t,
              open: base,
              high: base + 40,
              low: base - 35,
              close: base + 15,
              volume: 100 + Math.floor((i % 7) * 20),
            };
          });
          client?.send({ type: 'LOAD_DATA', payload: { candles: mockCandles } });
        });
    }

    return () => {
      unsubscribe();
      if (ownsClient && client) {
        client.terminate();
      }
    };
  }, [initialClient, autoLoadData, setReplayState, setPortfolio]);

  const handleJumpClick = () => {
    if (!workerClient) return;
    const input =
      typeof window !== 'undefined' && window.prompt
        ? window.prompt('Enter Unix timestamp (seconds) to jump to:')
        : null;
    if (input) {
      const ts = parseInt(input.trim(), 10);
      if (!isNaN(ts) && ts > 0) {
        workerClient.send({ type: 'JUMP_TO_TIMESTAMP', payload: { timestamp: ts } });
      }
    }
  };

  return (
    <div
      data-testid="app-root"
      className="h-screen w-screen flex flex-col bg-tv-bg text-tv-text select-none overflow-hidden"
    >
      <TopBar workerClient={workerClient} />

      <div className="flex-1 flex relative overflow-hidden">
        <LeftToolbar />

        <div className="flex-1 relative overflow-hidden">
          <ChartContainer
            candles={candles}
            lastUpdate={lastUpdate}
            onChartReady={(chart, series) => {
              setChartApi(chart);
              setSeriesApi(series);
            }}
          />
          <DrawingOverlay chart={chartApi} series={seriesApi} />
          <ReplayBar workerClient={workerClient} onJumpClick={handleJumpClick} />
        </div>

        <TradingPanel workerClient={workerClient} />
      </div>
    </div>
  );
}
export default App;

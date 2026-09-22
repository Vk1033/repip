import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopBar, TopBarProps, TIMEFRAMES, PRESET_SYMBOLS } from '../src/components/TopBar';
import { useStore, initialStoreState } from '../src/store/useStore';
import { WorkerClient } from '../src/workers/worker-client';
import * as binanceModule from '../src/data/binance';
import * as csvParserModule from '../src/data/csv-parser';
import { Candle } from '../src/types/market';

// Mock useSyncExternalStore to invoke getSnapshot so the component reflects live useStore state.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => {
  return getSnapshot();
});

function renderTopBar(props: TopBarProps) {
  let capturedTree: React.ReactElement<any> | null = null;
  function Harness() {
    capturedTree = (TopBar as any)(props);
    return capturedTree;
  }
  const html = renderToStaticMarkup(React.createElement(Harness));
  return { html, tree: capturedTree };
}

function findElement(
  node: any,
  predicate: (el: React.ReactElement<any>) => boolean
): React.ReactElement<any> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findElement(item, predicate);
      if (found) return found;
    }
    return null;
  }
  if (React.isValidElement(node)) {
    if (predicate(node)) return node;
    const children = (node.props as any)?.children;
    return findElement(children, predicate);
  }
  return null;
}

describe('TopBar Component', () => {
  let mockWorkerClient: {
    send: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => {
      return getSnapshot();
    });
    useStore.setState(initialStoreState);
    mockWorkerClient = {
      send: vi.fn(),
      onMessage: vi.fn(),
      terminate: vi.fn(),
    };
  });

  describe('Layout & Structure', () => {
    it('renders header container, logo, symbol selectors, timeframe selectors, and import CSV button', () => {
      const { html, tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      expect(tree).not.toBeNull();
      expect(html).toContain('data-testid="top-bar"');
      expect(html).toContain('repip');
      expect(html).toContain('data-testid="symbol-selector"');
      expect(html).toContain('data-testid="timeframe-selector"');
      expect(html).toContain('data-testid="import-csv-btn"');
    });

    it('renders all preset symbol buttons (BTCUSDT, ETHUSDT, SOLUSDT)', () => {
      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      PRESET_SYMBOLS.forEach((sym) => {
        const btn = findElement(tree, (el) => el.props?.['data-testid'] === `symbol-btn-${sym}`);
        expect(btn).not.toBeNull();
      });
    });

    it('highlights currently active preset symbol', () => {
      useStore.setState({ symbol: 'ETHUSDT' });
      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const ethBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'symbol-btn-ETHUSDT');
      const btcBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'symbol-btn-BTCUSDT');

      expect(ethBtn?.props?.className).toContain('bg-tv-primary text-white');
      expect(btcBtn?.props?.className).not.toContain('bg-tv-primary text-white');
    });

    it('renders custom symbol badge when current symbol is not in presets', () => {
      useStore.setState({ symbol: 'AAPL' });
      const { html, tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const badge = findElement(tree, (el) => el.props?.['data-testid'] === 'custom-symbol-badge');
      expect(badge).not.toBeNull();
      expect(html).toContain('AAPL');
    });

    it('renders all timeframe selector buttons and highlights active timeframe', () => {
      useStore.setState({ timeframe: '15m' });
      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      TIMEFRAMES.forEach((tf) => {
        const btn = findElement(tree, (el) => el.props?.['data-testid'] === `timeframe-btn-${tf}`);
        expect(btn).not.toBeNull();
      });

      const activeBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'timeframe-btn-15m');
      const inactiveBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'timeframe-btn-1m');

      expect(activeBtn?.props?.className).toContain('bg-tv-border text-tv-text');
      expect(inactiveBtn?.props?.className).not.toContain('bg-tv-border text-tv-text');
    });
  });

  describe('Timeframe Selection', () => {
    it('updates store and sends SET_TIMEFRAME message to workerClient on click', () => {
      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const btn5m = findElement(tree, (el) => el.props?.['data-testid'] === 'timeframe-btn-5m');
      expect(btn5m).not.toBeNull();

      btn5m?.props?.onClick?.();

      expect(useStore.getState().timeframe).toBe('5m');
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'SET_TIMEFRAME',
        payload: { timeframe: '5m' },
      });
    });

    it('safely updates store even if workerClient is null', () => {
      const { tree } = renderTopBar({ workerClient: null });

      const btn1h = findElement(tree, (el) => el.props?.['data-testid'] === 'timeframe-btn-1h');
      expect(btn1h).not.toBeNull();

      expect(() => btn1h?.props?.onClick?.()).not.toThrow();
      expect(useStore.getState().timeframe).toBe('1h');
    });
  });

  describe('Symbol Selection & Preset Fetching', () => {
    it('fetches Binance klines and sends LOAD_DATA to workerClient when preset symbol is clicked', async () => {
      const mockCandles: Candle[] = [
        { time: 100, open: 10, high: 15, low: 9, close: 14, volume: 100 },
      ];
      const fetchSpy = vi.spyOn(binanceModule, 'fetchBinance1mKlines').mockResolvedValue(mockCandles);

      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const solBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'symbol-btn-SOLUSDT');
      expect(solBtn).not.toBeNull();

      await solBtn?.props?.onClick?.();

      expect(useStore.getState().symbol).toBe('SOLUSDT');
      expect(fetchSpy).toHaveBeenCalledWith('SOLUSDT', 1000);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'LOAD_DATA',
        payload: { candles: mockCandles },
      });
    });

    it('handles Binance fetch error gracefully without updating symbol', async () => {
      const alertMock = vi.fn();
      (globalThis as any).alert = alertMock;
      vi.spyOn(binanceModule, 'fetchBinance1mKlines').mockRejectedValue(new Error('Network error'));

      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const ethBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'symbol-btn-ETHUSDT');
      await ethBtn?.props?.onClick?.();

      expect(useStore.getState().symbol).toBe('BTCUSDT');
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Network error'));
    });
  });

  describe('CSV Import Action', () => {
    it('triggers file input click when Import CSV button is clicked', () => {
      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const importBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'import-csv-btn');
      expect(importBtn).not.toBeNull();
      expect(() => importBtn?.props?.onClick?.()).not.toThrow();
    });

    it('parses valid CSV file, sets symbol, and sends LOAD_DATA to workerClient', async () => {
      const mockCandles: Candle[] = [
        { time: 1700000000, open: 100, high: 105, low: 99, close: 104, volume: 50 },
      ];
      vi.spyOn(csvParserModule, 'parseCandlesCSV').mockReturnValue(mockCandles);

      // Mock FileReader
      class MockFileReader {
        onload: ((e: any) => void) | null = null;
        readAsText(_file: any) {
          setTimeout(() => {
            this.onload?.({ target: { result: 'time,open,high,low,close,volume\n1700000000,100,105,99,104,50' } });
          }, 0);
        }
      }
      (globalThis as any).FileReader = MockFileReader;

      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const fileInput = findElement(tree, (el) => el.props?.['data-testid'] === 'csv-file-input');
      expect(fileInput).not.toBeNull();

      const fakeFile = { name: 'BTC_2024.csv' };
      fileInput?.props?.onChange?.({
        target: { files: [fakeFile], value: 'C:\\fake\\BTC_2024.csv' },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(useStore.getState().symbol).toBe('BTC_2024');
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'LOAD_DATA',
        payload: { candles: mockCandles },
      });
    });

    it('shows alert when parsed CSV contains no candles', async () => {
      const alertMock = vi.fn();
      (globalThis as any).alert = alertMock;
      vi.spyOn(csvParserModule, 'parseCandlesCSV').mockReturnValue([]);

      class MockFileReader {
        onload: ((e: any) => void) | null = null;
        readAsText(_file: any) {
          setTimeout(() => {
            this.onload?.({ target: { result: 'empty' } });
          }, 0);
        }
      }
      (globalThis as any).FileReader = MockFileReader;

      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const fileInput = findElement(tree, (el) => el.props?.['data-testid'] === 'csv-file-input');
      fileInput?.props?.onChange?.({ target: { files: [{ name: 'empty.csv' }] } });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(alertMock).toHaveBeenCalledWith('No candles found in CSV');
    });

    it('shows alert when CSV parsing throws an exception', async () => {
      const alertMock = vi.fn();
      (globalThis as any).alert = alertMock;
      vi.spyOn(csvParserModule, 'parseCandlesCSV').mockImplementation(() => {
        throw new Error('Missing columns');
      });

      class MockFileReader {
        onload: ((e: any) => void) | null = null;
        readAsText(_file: any) {
          setTimeout(() => {
            this.onload?.({ target: { result: 'invalid' } });
          }, 0);
        }
      }
      (globalThis as any).FileReader = MockFileReader;

      const { tree } = renderTopBar({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const fileInput = findElement(tree, (el) => el.props?.['data-testid'] === 'csv-file-input');
      fileInput?.props?.onChange?.({ target: { files: [{ name: 'bad.csv' }] } });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Missing columns'));
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FXTopBar } from '../src/components/FXTopBar';
import { App } from '../src/App';
import { useStore, createInitialStoreState } from '../src/store/useStore';
import { WorkerClient } from '../src/workers/worker-client';

describe('FX Replay Assembly & FXTopBar', () => {
  beforeEach(() => {
    useStore.setState(createInitialStoreState());
  });

  it('renders FXTopBar with symbol, full timeframe ribbon, indicators, and theme toggle', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;
    const html = renderToStaticMarkup(
      <FXTopBar workerClient={mockClient} symbol="NQ1!" />
    );

    expect(html).toContain('data-testid="fx-top-bar"');
    expect(html).toContain('data-testid="topbar-symbol-btn"');
    expect(html).toContain('NQ1!');
    expect(html).toContain('data-testid="tf-30s"');
    expect(html).toContain('data-testid="tf-1m"');
    expect(html).toContain('data-testid="tf-5m"');
    expect(html).toContain('data-testid="tf-15m"');
    expect(html).toContain('data-testid="tf-1h"');
    expect(html).toContain('data-testid="tf-4h"');
    expect(html).toContain('data-testid="tf-1D"');
    expect(html).toContain('data-testid="topbar-theme-toggle"');
  });

  it('assembles the full FX Replay workspace in App root', () => {
    const mockClient = {
      send: vi.fn(),
      onMessage: vi.fn(() => () => {}),
      terminate: vi.fn(),
    } as unknown as WorkerClient;

    const html = renderToStaticMarkup(
      <App workerClient={mockClient} autoLoadData={false} />
    );

    expect(html).toContain('data-testid="app-root"');
    expect(html).toContain('data-testid="fx-top-bar"');
    expect(html).toContain('data-testid="floating-toolbar"');
    expect(html).toContain('data-testid="timeline-news-markers"');
    expect(html).toContain('data-testid="fx-bottom-bar"');
    expect(html).toContain('data-testid="right-dock"');
  });
});

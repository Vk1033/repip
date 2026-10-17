import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FXBottomBar } from '../src/components/FXBottomBar';
import { useStore, createInitialStoreState } from '../src/store/useStore';
import { WorkerClient } from '../src/workers/worker-client';

describe('FXBottomBar Component', () => {
  beforeEach(() => {
    useStore.setState(createInitialStoreState());
  });

  it('renders quick buy and sell buttons, lot input, and presets', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;
    const html = renderToStaticMarkup(
      <FXBottomBar
        workerClient={mockClient}
        onJumpClick={vi.fn()}
        lastPrice={21293.25}
      />
    );

    expect(html).toContain('data-testid="bottom-buy-btn"');
    expect(html).toContain('data-testid="bottom-sell-btn"');
    expect(html).toContain('data-testid="bottom-qty-input"');
    expect(html).toContain('data-testid="bottom-presets-btn"');
    expect(html).toContain('Buy');
    expect(html).toContain('Sell');
  });

  it('renders replay controls, speed options, and resolution badge', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;
    const html = renderToStaticMarkup(
      <FXBottomBar
        workerClient={mockClient}
        onJumpClick={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="bottom-jump-btn"');
    expect(html).toContain('data-testid="bottom-step-back-btn"');
    expect(html).toContain('data-testid="bottom-play-pause-btn"');
    expect(html).toContain('data-testid="bottom-step-forward-btn"');
    expect(html).toContain('data-testid="bottom-speed-select"');
  });

  it('renders account equity, timezone, RTH mode, and scale controls', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;
    const testPortfolio = {
      balance: 101265,
      equity: 101265,
      realizedPnL: 1265,
      unrealizedPnL: 0,
      positions: [],
      pendingOrders: [],
      closedTrades: [],
    };

    const html = renderToStaticMarkup(
      <FXBottomBar
        workerClient={mockClient}
        portfolio={testPortfolio}
      />
    );

    expect(html).toContain('data-testid="bottom-account-equity"');
    expect(html).toContain('$101,265.00');
    expect(html).toContain('data-testid="bottom-time-display"');
    expect(html).toContain('data-testid="bottom-rth-btn"');
    expect(html).toContain('data-testid="bottom-scale-auto"');
  });
});

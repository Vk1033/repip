import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RightDock } from '../src/components/RightDock';
import { useStore, createInitialStoreState } from '../src/store/useStore';
import { WorkerClient } from '../src/workers/worker-client';
import { DrawingShape } from '../src/core/drawing-manager';

describe('RightDock Component', () => {
  beforeEach(() => {
    useStore.setState(createInitialStoreState());
  });

  it('renders the vertical right toolbar with 5 tool buttons', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;
    const html = renderToStaticMarkup(
      <RightDock
        workerClient={mockClient}
        shapes={[]}
        onShapesChange={vi.fn()}
      />
    );

    expect(html).toContain('data-testid="right-dock"');
    expect(html).toContain('data-testid="dock-tab-order"');
    expect(html).toContain('data-testid="dock-tab-objectTree"');
    expect(html).toContain('data-testid="dock-tab-watchlist"');
    expect(html).toContain('data-testid="dock-tab-journal"');
    expect(html).toContain('data-testid="dock-tab-news"');
  });

  it('renders the Order panel when activeRightPanel is order', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;

    const html = renderToStaticMarkup(
      <RightDock
        workerClient={mockClient}
        shapes={[]}
        onShapesChange={vi.fn()}
        activePanel="order"
      />
    );

    expect(html).toContain('data-testid="drawer-order"');
    expect(html).toContain('Order Entry');
  });

  it('renders the Object tree with drawing shapes', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;
    const mockShapes: DrawingShape[] = [
      { id: 'shape-1', type: 'rectangle', points: [], color: '#8b5cf6' },
      { id: 'shape-2', type: 'trendline', points: [], color: '#2962ff' },
    ];

    const html = renderToStaticMarkup(
      <RightDock
        workerClient={mockClient}
        shapes={mockShapes}
        onShapesChange={vi.fn()}
        activePanel="objectTree"
      />
    );

    expect(html).toContain('data-testid="drawer-objectTree"');
    expect(html).toContain('Rectangle');
    expect(html).toContain('Trendline');
  });

  it('renders the Watchlist with NQ1! and major instruments', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;

    const html = renderToStaticMarkup(
      <RightDock
        workerClient={mockClient}
        shapes={[]}
        onShapesChange={vi.fn()}
        activePanel="watchlist"
      />
    );

    expect(html).toContain('data-testid="drawer-watchlist"');
    expect(html).toContain('NQ1!');
    expect(html).toContain('ES1!');
    expect(html).toContain('EURUSD');
  });

  it('renders Journal and News drawers when active', () => {
    const mockClient = { send: vi.fn() } as unknown as WorkerClient;
    const journalHtml = renderToStaticMarkup(
      <RightDock
        workerClient={mockClient}
        shapes={[]}
        onShapesChange={vi.fn()}
        activePanel="journal"
      />
    );
    expect(journalHtml).toContain('data-testid="drawer-journal"');
    expect(journalHtml).toContain('Session Journal');

    const newsHtml = renderToStaticMarkup(
      <RightDock
        workerClient={mockClient}
        shapes={[]}
        onShapesChange={vi.fn()}
        activePanel="news"
      />
    );
    expect(newsHtml).toContain('data-testid="drawer-news"');
    expect(newsHtml).toContain('Economic Calendar');
  });
});

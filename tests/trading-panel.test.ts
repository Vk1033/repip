import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TradingPanel, TradingPanelProps } from '../src/components/TradingPanel';
import { useStore, initialStoreState } from '../src/store/useStore';
import { WorkerClient } from '../src/workers/worker-client';
import { Position, Order } from '../src/core/paper-trading';

// Mock useSyncExternalStore to invoke getSnapshot so the component reflects live useStore state.
vi.spyOn(React, 'useSyncExternalStore').mockImplementation((_subscribe, getSnapshot) => {
  return getSnapshot();
});

function renderTradingPanel(props: TradingPanelProps) {
  let capturedTree: React.ReactElement<any> | null = null;
  function Harness() {
    capturedTree = (TradingPanel as any)(props);
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

describe('TradingPanel Component', () => {
  let mockWorkerClient: {
    send: ReturnType<typeof vi.fn>;
    onMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    useStore.setState(initialStoreState);
    mockWorkerClient = {
      send: vi.fn(),
      onMessage: vi.fn(),
      terminate: vi.fn(),
    };
  });

  describe('Initial Rendering & Account Overview HUD', () => {
    it('renders the main trading panel container with expected styling', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      expect(tree).not.toBeNull();
      const panel = findElement(tree, (el) => el.props?.['data-testid'] === 'trading-panel');
      expect(panel).not.toBeNull();
      expect(panel?.props?.className).toContain('w-80 border-l border-tv-border bg-tv-surface');
      expect(html).toContain('Simulated Account');
    });

    it('displays initial balance and equity ($10,000.00)', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const equityEl = findElement(tree, (el) => el.props?.['data-testid'] === 'account-equity');
      const balanceEl = findElement(tree, (el) => el.props?.['data-testid'] === 'account-balance');

      expect(equityEl).not.toBeNull();
      expect(balanceEl).not.toBeNull();
      expect(html).toContain('$10,000.00');
    });

    it('displays unrealized PnL with positive green formatting when non-negative', () => {
      useStore.setState({
        portfolio: {
          ...initialStoreState.portfolio,
          unrealizedPnL: 250.75,
        },
      });

      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const pnlEl = findElement(tree, (el) => el.props?.['data-testid'] === 'account-unrealized-pnl');
      expect(pnlEl).not.toBeNull();
      expect(pnlEl?.props?.className).toContain('text-tv-bull');
      expect(html).toContain('+$250.75');
    });

    it('displays unrealized PnL with negative red formatting when below zero', () => {
      useStore.setState({
        portfolio: {
          ...initialStoreState.portfolio,
          unrealizedPnL: -145.5,
        },
      });

      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const pnlEl = findElement(tree, (el) => el.props?.['data-testid'] === 'account-unrealized-pnl');
      expect(pnlEl).not.toBeNull();
      expect(pnlEl?.props?.className).toContain('text-tv-bear');
      expect(html).toContain('-$145.50');
    });

    it('renders even when workerClient is null', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: null,
      });

      const panel = findElement(tree, (el) => el.props?.['data-testid'] === 'trading-panel');
      expect(panel).not.toBeNull();
      expect(html).toContain('Simulated Account');
    });
  });

  describe('Order Type Switching (Market vs Limit)', () => {
    it('defaults to MARKET order type with active button styling and no limit price input', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const marketBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'order-type-market');
      const limitBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'order-type-limit');
      const limitInput = findElement(tree, (el) => el.props?.['data-testid'] === 'limit-price-input');

      expect(marketBtn?.props?.className).toContain('bg-tv-border text-tv-text');
      expect(limitBtn?.props?.className).toContain('text-tv-muted');
      expect(limitInput).toBeNull();
      expect(html).not.toContain('data-testid="limit-price-input"');
    });

    it('renders Limit Price input when orderType is LIMIT with active styling', () => {
      useStore.setState({
        replayState: {
          ...initialStoreState.replayState,
          currentCandle: {
            time: 1700000000,
            open: 65000,
            high: 65500,
            low: 64800,
            close: 65250,
            volume: 120,
          },
        },
      });

      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        initialOrderType: 'LIMIT',
      });

      const marketBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'order-type-market');
      const limitBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'order-type-limit');
      const limitInput = findElement(tree, (el) => el.props?.['data-testid'] === 'limit-price-input');

      expect(limitBtn?.props?.className).toContain('bg-tv-border text-tv-text');
      expect(marketBtn?.props?.className).toContain('text-tv-muted');
      expect(limitInput).not.toBeNull();
      expect(limitInput?.props?.placeholder).toBe('65250');
      expect(html).toContain('data-testid="limit-price-input"');
    });

    it('notifies onOrderTypeChange callback when order type buttons are clicked', () => {
      const onOrderTypeChange = vi.fn();
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        onOrderTypeChange,
      });

      const limitBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'order-type-limit');
      limitBtn?.props?.onClick?.();
      expect(onOrderTypeChange).toHaveBeenCalledWith('LIMIT');

      const marketBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'order-type-market');
      marketBtn?.props?.onClick?.();
      expect(onOrderTypeChange).toHaveBeenCalledWith('MARKET');
    });
  });

  describe('Order Parameters and Input Handlers', () => {
    it('defaults size to 1 and fires onSizeChange on input modification', () => {
      const onSizeChange = vi.fn();
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        onSizeChange,
      });

      const sizeInput = findElement(tree, (el) => el.props?.['data-testid'] === 'size-input');
      expect(sizeInput).not.toBeNull();
      expect(sizeInput?.props?.value).toBe(1);

      sizeInput?.props?.onChange?.({ target: { value: '3.5' } });
      expect(onSizeChange).toHaveBeenCalledWith(3.5);
    });

    it('fires onLimitPriceChange when limit price is edited', () => {
      const onLimitPriceChange = vi.fn();
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        initialOrderType: 'LIMIT',
        onLimitPriceChange,
      });

      const limitInput = findElement(tree, (el) => el.props?.['data-testid'] === 'limit-price-input');
      expect(limitInput).not.toBeNull();

      limitInput?.props?.onChange?.({ target: { value: '64800.5' } });
      expect(onLimitPriceChange).toHaveBeenCalledWith('64800.5');
    });

    it('fires onStopLossChange and onTakeProfitChange on input changes', () => {
      const onStopLossChange = vi.fn();
      const onTakeProfitChange = vi.fn();
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        onStopLossChange,
        onTakeProfitChange,
      });

      const slInput = findElement(tree, (el) => el.props?.['data-testid'] === 'stop-loss-input');
      const tpInput = findElement(tree, (el) => el.props?.['data-testid'] === 'take-profit-input');

      expect(slInput).not.toBeNull();
      expect(tpInput).not.toBeNull();

      slInput?.props?.onChange?.({ target: { value: '63500' } });
      expect(onStopLossChange).toHaveBeenCalledWith('63500');

      tpInput?.props?.onChange?.({ target: { value: '68000' } });
      expect(onTakeProfitChange).toHaveBeenCalledWith('68000');
    });
  });

  describe('Order Placement Actions', () => {
    it('sends MARKET BUY order to workerClient with default size', () => {
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const buyBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'buy-btn');
      expect(buyBtn).not.toBeNull();
      buyBtn?.props?.onClick?.();

      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'PLACE_ORDER',
        payload: {
          order: {
            type: 'MARKET',
            side: 'BUY',
            size: 1,
            limitPrice: undefined,
            stopLoss: undefined,
            takeProfit: undefined,
          },
        },
      });
    });

    it('sends MARKET SELL order to workerClient with default size', () => {
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const sellBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'sell-btn');
      expect(sellBtn).not.toBeNull();
      sellBtn?.props?.onClick?.();

      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'PLACE_ORDER',
        payload: {
          order: {
            type: 'MARKET',
            side: 'SELL',
            size: 1,
            limitPrice: undefined,
            stopLoss: undefined,
            takeProfit: undefined,
          },
        },
      });
    });

    it('sends LIMIT BUY order with parsed limitPrice, stopLoss, and takeProfit', () => {
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        initialOrderType: 'LIMIT',
        initialSize: 2.5,
        initialLimitPrice: '64500.25',
        initialStopLoss: '63000',
        initialTakeProfit: '67500',
      });

      const buyBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'buy-btn');
      buyBtn?.props?.onClick?.();

      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'PLACE_ORDER',
        payload: {
          order: {
            type: 'LIMIT',
            side: 'BUY',
            size: 2.5,
            limitPrice: 64500.25,
            stopLoss: 63000,
            takeProfit: 67500,
          },
        },
      });
    });

    it('sends LIMIT SELL order with parsed limitPrice, stopLoss, and takeProfit', () => {
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        initialOrderType: 'LIMIT',
        initialSize: 0.75,
        initialLimitPrice: '66000',
        initialStopLoss: '67000',
        initialTakeProfit: '64000',
      });

      const sellBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'sell-btn');
      sellBtn?.props?.onClick?.();

      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'PLACE_ORDER',
        payload: {
          order: {
            type: 'LIMIT',
            side: 'SELL',
            size: 0.75,
            limitPrice: 66000,
            stopLoss: 67000,
            takeProfit: 64000,
          },
        },
      });
    });

    it('handles BUY/SELL gracefully without throwing when workerClient is null', () => {
      const { tree } = renderTradingPanel({
        workerClient: null,
      });

      const buyBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'buy-btn');
      const sellBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'sell-btn');

      expect(() => buyBtn?.props?.onClick?.()).not.toThrow();
      expect(() => sellBtn?.props?.onClick?.()).not.toThrow();
      expect(mockWorkerClient.send).not.toHaveBeenCalled();
    });
  });

  describe('Open Positions List and Close Action', () => {
    it('displays "No open positions" when positions list is empty', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const emptyEl = findElement(tree, (el) => el.props?.['data-testid'] === 'no-positions');
      expect(emptyEl).not.toBeNull();
      expect(html).toContain('No open positions');
      expect(html).toContain('Open Positions (0)');
    });

    it('renders open positions with side, units, entry price, and PnL', () => {
      const samplePositions: Position[] = [
        {
          id: 'pos_1',
          side: 'BUY',
          size: 1.5,
          entryPrice: 65000,
          unrealizedPnL: 375.5,
          realizedPnL: 0,
          openedAt: 1700000000,
        },
        {
          id: 'pos_2',
          side: 'SELL',
          size: 0.5,
          entryPrice: 64000,
          unrealizedPnL: -85.25,
          realizedPnL: 0,
          openedAt: 1700000060,
        },
      ];

      useStore.setState({
        portfolio: {
          ...initialStoreState.portfolio,
          positions: samplePositions,
        },
      });

      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      expect(html).toContain('Open Positions (2)');

      const pos1El = findElement(tree, (el) => el.props?.['data-testid'] === 'position-pos_1');
      const pos2El = findElement(tree, (el) => el.props?.['data-testid'] === 'position-pos_2');
      expect(pos1El).not.toBeNull();
      expect(pos2El).not.toBeNull();

      expect(html).toContain('1.5 units');
      expect(html).toContain('Entry: $65000.00');
      expect(html).toContain('+$375.50');

      expect(html).toContain('0.5 units');
      expect(html).toContain('Entry: $64000.00');
      expect(html).toContain('-$85.25');

      const pnl1El = findElement(tree, (el) => el.props?.['data-testid'] === 'position-pnl-pos_1');
      const pnl2El = findElement(tree, (el) => el.props?.['data-testid'] === 'position-pnl-pos_2');
      expect(pnl1El?.props?.className).toContain('text-tv-bull');
      expect(pnl2El?.props?.className).toContain('text-tv-bear');
    });

    it('sends CLOSE_POSITION message when Close button is clicked', () => {
      const samplePositions: Position[] = [
        {
          id: 'pos_xyz',
          side: 'BUY',
          size: 2,
          entryPrice: 50000,
          unrealizedPnL: 100,
          realizedPnL: 0,
          openedAt: 1700000000,
        },
      ];

      useStore.setState({
        portfolio: {
          ...initialStoreState.portfolio,
          positions: samplePositions,
        },
      });

      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const closeBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'close-pos-pos_xyz');
      expect(closeBtn).not.toBeNull();
      closeBtn?.props?.onClick?.();

      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'CLOSE_POSITION',
        payload: { positionId: 'pos_xyz' },
      });
    });

    it('handles Close button click safely when workerClient is null', () => {
      const samplePositions: Position[] = [
        {
          id: 'pos_xyz',
          side: 'BUY',
          size: 2,
          entryPrice: 50000,
          unrealizedPnL: 100,
          realizedPnL: 0,
          openedAt: 1700000000,
        },
      ];

      useStore.setState({
        portfolio: {
          ...initialStoreState.portfolio,
          positions: samplePositions,
        },
      });

      const { tree } = renderTradingPanel({
        workerClient: null,
      });

      const closeBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'close-pos-pos_xyz');
      expect(closeBtn).not.toBeNull();
      expect(() => closeBtn?.props?.onClick?.()).not.toThrow();
      expect(mockWorkerClient.send).not.toHaveBeenCalled();
    });
  });

  describe('Pending Orders Tab & Cancel Action', () => {
    it('switches to Orders tab and displays pending orders count', () => {
      const sampleOrders: Order[] = [
        {
          id: 'ord_1',
          side: 'BUY',
          type: 'LIMIT',
          size: 1.2,
          limitPrice: 63000,
          createdAt: 1700000000,
        },
      ];

      useStore.setState({
        portfolio: {
          ...initialStoreState.portfolio,
          pendingOrders: sampleOrders,
        },
      });

      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        initialTab: 'orders',
      });

      expect(html).toContain('Pending Orders (1)');
      expect(html).toContain('Price: $63000.00');
      expect(html).toContain('1.2 units');

      const orderEl = findElement(tree, (el) => el.props?.['data-testid'] === 'order-ord_1');
      expect(orderEl).not.toBeNull();
    });

    it('sends CANCEL_ORDER message when Cancel button on a pending order is clicked', () => {
      const sampleOrders: Order[] = [
        {
          id: 'ord_cancel_me',
          side: 'SELL',
          type: 'LIMIT',
          size: 0.8,
          limitPrice: 68000,
          createdAt: 1700000000,
        },
      ];

      useStore.setState({
        portfolio: {
          ...initialStoreState.portfolio,
          pendingOrders: sampleOrders,
        },
      });

      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        initialTab: 'orders',
      });

      const cancelBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'cancel-order-ord_cancel_me');
      expect(cancelBtn).not.toBeNull();
      cancelBtn?.props?.onClick?.();

      expect(mockWorkerClient.send).toHaveBeenCalledTimes(1);
      expect(mockWorkerClient.send).toHaveBeenCalledWith({
        type: 'CANCEL_ORDER',
        payload: { orderId: 'ord_cancel_me' },
      });
    });

    it('shows "No pending orders" when pendingOrders list is empty on Orders tab', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        initialTab: 'orders',
      });

      const noOrdersEl = findElement(tree, (el) => el.props?.['data-testid'] === 'no-orders');
      expect(noOrdersEl).not.toBeNull();
      expect(html).toContain('No pending orders');
    });

    it('triggers onTabChange callback when tab buttons are clicked', () => {
      const onTabChange = vi.fn();
      const { tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        onTabChange,
      });

      const ordersTab = findElement(tree, (el) => el.props?.['data-testid'] === 'tab-orders');
      ordersTab?.props?.onClick?.();
      expect(onTabChange).toHaveBeenCalledWith('orders');

      const posTab = findElement(tree, (el) => el.props?.['data-testid'] === 'tab-positions');
      posTab?.props?.onClick?.();
      expect(onTabChange).toHaveBeenCalledWith('positions');
    });
  });

  describe('Collapsible Panel Behavior', () => {
    it('renders expanded by default with collapse toggle button', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
      });

      const panel = findElement(tree, (el) => el.props?.['data-testid'] === 'trading-panel');
      const toggleBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'collapse-toggle-btn');

      expect(panel).not.toBeNull();
      expect(toggleBtn).not.toBeNull();
      expect(html).not.toContain('data-testid="trading-panel-collapsed"');
    });

    it('renders collapsed state when collapsed prop is true', () => {
      const { html, tree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        collapsed: true,
      });

      const collapsedPanel = findElement(tree, (el) => el.props?.['data-testid'] === 'trading-panel-collapsed');
      const expandBtn = findElement(tree, (el) => el.props?.['data-testid'] === 'expand-toggle-btn');

      expect(collapsedPanel).not.toBeNull();
      expect(expandBtn).not.toBeNull();
      expect(html).toContain('Trading Panel');
      expect(html).not.toContain('data-testid="trading-panel"');
    });

    it('invokes onToggleCollapse when collapse/expand button is clicked', () => {
      const onToggleCollapse = vi.fn();

      // Test collapse button in expanded view
      const { tree: expandedTree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        onToggleCollapse,
      });
      const collapseBtn = findElement(expandedTree, (el) => el.props?.['data-testid'] === 'collapse-toggle-btn');
      collapseBtn?.props?.onClick?.();
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);

      // Test expand button in collapsed view
      const { tree: collapsedTree } = renderTradingPanel({
        workerClient: mockWorkerClient as unknown as WorkerClient,
        collapsed: true,
        onToggleCollapse,
      });
      const expandBtn = findElement(collapsedTree, (el) => el.props?.['data-testid'] === 'expand-toggle-btn');
      expandBtn?.props?.onClick?.();
      expect(onToggleCollapse).toHaveBeenCalledTimes(2);
    });
  });
});

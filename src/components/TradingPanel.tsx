import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { WorkerClient } from '../workers/worker-client';
import { useStore } from '../store/useStore';
import { OrderType, OrderSide } from '../core/paper-trading';

export interface TradingPanelProps {
  workerClient: WorkerClient | null;
  collapsed?: boolean;
  initialCollapsed?: boolean;
  onToggleCollapse?: () => void;
  orderType?: OrderType;
  initialOrderType?: OrderType;
  onOrderTypeChange?: (orderType: OrderType) => void;
  size?: number;
  initialSize?: number;
  onSizeChange?: (size: number) => void;
  limitPrice?: string;
  initialLimitPrice?: string;
  onLimitPriceChange?: (limitPrice: string) => void;
  stopLoss?: string;
  initialStopLoss?: string;
  onStopLossChange?: (stopLoss: string) => void;
  takeProfit?: string;
  initialTakeProfit?: string;
  onTakeProfitChange?: (takeProfit: string) => void;
  activeTab?: 'positions' | 'orders';
  initialTab?: 'positions' | 'orders';
  onTabChange?: (tab: 'positions' | 'orders') => void;
  className?: string;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  workerClient,
  collapsed: controlledCollapsed,
  initialCollapsed = false,
  onToggleCollapse,
  orderType: controlledOrderType,
  initialOrderType = 'MARKET',
  onOrderTypeChange,
  size: controlledSize,
  initialSize = 1,
  onSizeChange,
  limitPrice: controlledLimitPrice,
  initialLimitPrice = '',
  onLimitPriceChange,
  stopLoss: controlledStopLoss,
  initialStopLoss = '',
  onStopLossChange,
  takeProfit: controlledTakeProfit,
  initialTakeProfit = '',
  onTakeProfitChange,
  activeTab: controlledActiveTab,
  initialTab = 'positions',
  onTabChange,
  className,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(initialCollapsed);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const [internalOrderType, setInternalOrderType] = useState<OrderType>(initialOrderType);
  const orderType = controlledOrderType !== undefined ? controlledOrderType : internalOrderType;

  const [internalSize, setInternalSize] = useState<number>(initialSize);
  const size = controlledSize !== undefined ? controlledSize : internalSize;

  const [internalLimitPrice, setInternalLimitPrice] = useState<string>(initialLimitPrice);
  const limitPrice = controlledLimitPrice !== undefined ? controlledLimitPrice : internalLimitPrice;

  const [internalStopLoss, setInternalStopLoss] = useState<string>(initialStopLoss);
  const stopLoss = controlledStopLoss !== undefined ? controlledStopLoss : internalStopLoss;

  const [internalTakeProfit, setInternalTakeProfit] = useState<string>(initialTakeProfit);
  const takeProfit = controlledTakeProfit !== undefined ? controlledTakeProfit : internalTakeProfit;

  const [internalActiveTab, setInternalActiveTab] = useState<'positions' | 'orders'>(initialTab);
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const portfolio = useStore((s) => s.portfolio);
  const replayState = useStore((s) => s.replayState);

  const handleToggleCollapse = () => {
    if (controlledCollapsed === undefined) {
      setInternalCollapsed((prev) => !prev);
    }
    onToggleCollapse?.();
  };

  const handleSetOrderType = (type: OrderType) => {
    if (controlledOrderType === undefined) {
      setInternalOrderType(type);
    }
    onOrderTypeChange?.(type);
  };

  const handleSetSize = (val: number) => {
    if (controlledSize === undefined) {
      setInternalSize(val);
    }
    onSizeChange?.(val);
  };

  const handleSetLimitPrice = (val: string) => {
    if (controlledLimitPrice === undefined) {
      setInternalLimitPrice(val);
    }
    onLimitPriceChange?.(val);
  };

  const handleSetStopLoss = (val: string) => {
    if (controlledStopLoss === undefined) {
      setInternalStopLoss(val);
    }
    onStopLossChange?.(val);
  };

  const handleSetTakeProfit = (val: string) => {
    if (controlledTakeProfit === undefined) {
      setInternalTakeProfit(val);
    }
    onTakeProfitChange?.(val);
  };

  const handleSetActiveTab = (tab: 'positions' | 'orders') => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tab);
    }
    onTabChange?.(tab);
  };

  const handleOrder = (side: OrderSide) => {
    if (!workerClient) return;
    if (size <= 0) return;

    let finalLimitPrice: number | undefined = undefined;
    if (orderType === 'LIMIT') {
      if (limitPrice) {
        const parsed = parseFloat(limitPrice);
        if (isNaN(parsed) || parsed <= 0) return;
        finalLimitPrice = parsed;
      } else if (replayState.currentCandle && replayState.currentCandle.close > 0) {
        finalLimitPrice = replayState.currentCandle.close;
      } else {
        return;
      }
    }

    const parsedSL = stopLoss ? parseFloat(stopLoss) : undefined;
    const finalSL = parsedSL !== undefined && !isNaN(parsedSL) && parsedSL > 0 ? parsedSL : undefined;

    const parsedTP = takeProfit ? parseFloat(takeProfit) : undefined;
    const finalTP = parsedTP !== undefined && !isNaN(parsedTP) && parsedTP > 0 ? parsedTP : undefined;

    workerClient.send({
      type: 'PLACE_ORDER',
      payload: {
        order: {
          type: orderType,
          side,
          size,
          limitPrice: finalLimitPrice,
          stopLoss: finalSL,
          takeProfit: finalTP,
        },
      },
    });
  };

  const handleClosePosition = (posId: string) => {
    if (!workerClient) return;
    workerClient.send({ type: 'CLOSE_POSITION', payload: { positionId: posId } });
  };

  const handleCancelOrder = (orderId: string) => {
    if (!workerClient) return;
    workerClient.send({ type: 'CANCEL_ORDER', payload: { orderId } });
  };

  if (isCollapsed) {
    return (
      <div
        data-testid="trading-panel-collapsed"
        className={`w-10 border-l border-tv-border bg-tv-surface flex flex-col items-center py-3 h-full select-none ${
          className ?? ''
        }`}
      >
        <button
          onClick={handleToggleCollapse}
          title="Expand Trading Panel"
          aria-label="Expand Trading Panel"
          data-testid="expand-toggle-btn"
          className="p-1.5 hover:bg-tv-hover rounded text-tv-muted hover:text-tv-text mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-semibold text-tv-muted tracking-wider uppercase">
          Trading Panel
        </div>
      </div>
    );
  }

  const formatPnL = (pnl: number) => {
    if (Math.abs(pnl) < 0.005) {
      return '+$0.00';
    }
    const isPositive = pnl >= 0;
    return `${isPositive ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`;
  };

  return (
    <div
      data-testid="trading-panel"
      className={`w-80 border-l border-tv-border bg-tv-surface flex flex-col h-full text-xs select-none ${
        className ?? ''
      }`}
    >
      {/* Account Overview */}
      <div className="p-3 border-b border-tv-border bg-tv-bg/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-tv-muted font-semibold">Simulated Account</span>
          <button
            onClick={handleToggleCollapse}
            title="Collapse Trading Panel"
            aria-label="Collapse Trading Panel"
            data-testid="collapse-toggle-btn"
            className="p-1 hover:bg-tv-hover rounded text-tv-muted hover:text-tv-text transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-between items-center text-sm font-bold">
          <span>Equity:</span>
          <span data-testid="account-equity">
            ${portfolio.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-tv-muted">Balance:</span>
          <span data-testid="account-balance">
            ${portfolio.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-tv-muted">Unrealized PnL:</span>
          <span
            data-testid="account-unrealized-pnl"
            className={portfolio.unrealizedPnL >= -0.005 ? 'text-tv-bull' : 'text-tv-bear'}
          >
            {formatPnL(portfolio.unrealizedPnL)}
          </span>
        </div>
      </div>

      {/* Order Entry */}
      <div className="p-3 border-b border-tv-border space-y-3">
        <div className="flex bg-tv-bg rounded p-0.5" data-testid="order-type-selector">
          <button
            onClick={() => handleSetOrderType('MARKET')}
            data-testid="order-type-market"
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              orderType === 'MARKET' ? 'bg-tv-border text-tv-text' : 'text-tv-muted hover:text-tv-text'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => handleSetOrderType('LIMIT')}
            data-testid="order-type-limit"
            className={`flex-1 py-1 rounded font-medium transition-colors ${
              orderType === 'LIMIT' ? 'bg-tv-border text-tv-text' : 'text-tv-muted hover:text-tv-text'
            }`}
          >
            Limit
          </button>
        </div>

        {orderType === 'LIMIT' && (
          <div>
            <label className="text-tv-muted block mb-1">Limit Price</label>
            <input
              type="number"
              data-testid="limit-price-input"
              placeholder={replayState.currentCandle ? replayState.currentCandle.close.toString() : 'Price'}
              value={limitPrice}
              onChange={(e) => handleSetLimitPrice(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text focus:outline-none focus:border-tv-primary"
            />
          </div>
        )}

        <div>
          <label className="text-tv-muted block mb-1">Quantity</label>
          <input
            type="number"
            min="0.01"
            step="0.1"
            data-testid="size-input"
            value={size}
            onChange={(e) => handleSetSize(parseFloat(e.target.value) || 0)}
            className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text focus:outline-none focus:border-tv-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-tv-muted block mb-1">Stop Loss</label>
            <input
              type="number"
              data-testid="stop-loss-input"
              placeholder="Optional"
              value={stopLoss}
              onChange={(e) => handleSetStopLoss(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text focus:outline-none focus:border-tv-primary"
            />
          </div>
          <div>
            <label className="text-tv-muted block mb-1">Take Profit</label>
            <input
              type="number"
              data-testid="take-profit-input"
              placeholder="Optional"
              value={takeProfit}
              onChange={(e) => handleSetTakeProfit(e.target.value)}
              className="w-full bg-tv-bg border border-tv-border rounded px-2 py-1 text-tv-text focus:outline-none focus:border-tv-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => handleOrder('BUY')}
            data-testid="buy-btn"
            className="py-2 bg-tv-bull hover:opacity-90 font-bold text-white rounded transition-opacity"
          >
            BUY / LONG
          </button>
          <button
            onClick={() => handleOrder('SELL')}
            data-testid="sell-btn"
            className="py-2 bg-tv-bear hover:opacity-90 font-bold text-white rounded transition-opacity"
          >
            SELL / SHORT
          </button>
        </div>
      </div>

      {/* Positions & Orders Tabs */}
      <div className="flex border-b border-tv-border bg-tv-bg/30">
        <button
          onClick={() => handleSetActiveTab('positions')}
          data-testid="tab-positions"
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'positions'
              ? 'border-tv-primary text-tv-text'
              : 'border-transparent text-tv-muted hover:text-tv-text'
          }`}
        >
          Positions ({portfolio.positions.length})
        </button>
        <button
          onClick={() => handleSetActiveTab('orders')}
          data-testid="tab-orders"
          className={`flex-1 py-2 font-semibold text-center border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-tv-primary text-tv-text'
              : 'border-transparent text-tv-muted hover:text-tv-text'
          }`}
        >
          Orders ({portfolio.pendingOrders.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3" data-testid="tab-content">
        {activeTab === 'positions' ? (
          <>
            <div className="font-semibold text-tv-muted mb-2">Open Positions ({portfolio.positions.length})</div>
            {portfolio.positions.length === 0 ? (
              <div className="text-tv-muted text-center py-4" data-testid="no-positions">
                No open positions
              </div>
            ) : (
              <div className="space-y-2" data-testid="positions-list">
                {portfolio.positions.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`position-${p.id}`}
                    className="p-2 bg-tv-bg rounded border border-tv-border flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-1 font-bold">
                        <span className={p.side === 'BUY' ? 'text-tv-bull' : 'text-tv-bear'}>{p.side}</span>
                        <span>{p.size} units</span>
                      </div>
                      <div className="text-tv-muted">Entry: ${p.entryPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div
                        data-testid={`position-pnl-${p.id}`}
                        className={p.unrealizedPnL >= -0.005 ? 'text-tv-bull font-bold' : 'text-tv-bear font-bold'}
                      >
                        {formatPnL(p.unrealizedPnL)}
                      </div>
                      <button
                        onClick={() => handleClosePosition(p.id)}
                        data-testid={`close-pos-${p.id}`}
                        className="text-xs text-tv-muted hover:text-white underline mt-1"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="font-semibold text-tv-muted mb-2">Pending Orders ({portfolio.pendingOrders.length})</div>
            {portfolio.pendingOrders.length === 0 ? (
              <div className="text-tv-muted text-center py-4" data-testid="no-orders">
                No pending orders
              </div>
            ) : (
              <div className="space-y-2" data-testid="orders-list">
                {portfolio.pendingOrders.map((o) => (
                  <div
                    key={o.id}
                    data-testid={`order-${o.id}`}
                    className="p-2 bg-tv-bg rounded border border-tv-border flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-1 font-bold">
                        <span className={o.side === 'BUY' ? 'text-tv-bull' : 'text-tv-bear'}>{o.side}</span>
                        <span>{o.type}</span>
                        <span className="text-tv-muted">({o.size} units)</span>
                      </div>
                      <div className="text-tv-muted">Price: ${o.limitPrice?.toFixed(2) ?? 'MKT'}</div>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => handleCancelOrder(o.id)}
                        data-testid={`cancel-order-${o.id}`}
                        className="text-xs text-tv-bear hover:underline mt-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState, FC } from 'react';
import {
  PlusCircle,
  Layers,
  Bookmark,
  BookOpen,
  Newspaper,
  X,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  Unlock,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { useStore, AppStore } from '../store/useStore';
import { WorkerClient } from '../workers/worker-client';
import { DrawingShape } from '../core/drawing-manager';
import { fetchBinance1mKlines } from '../data/binance';

export interface RightDockProps {
  workerClient: WorkerClient | null;
  shapes: DrawingShape[];
  onShapesChange: (shapes: DrawingShape[]) => void;
  activePanel?: AppStore['activeRightPanel'];
  onActivePanelChange?: (panel: AppStore['activeRightPanel']) => void;
}

export const WATCHLIST_ITEMS = [
  { symbol: 'NQ1!', name: 'E-mini Nasdaq 100', price: 21293.25, change: '+0.26%' },
  { symbol: 'ES1!', name: 'E-mini S&P 500', price: 5845.50, change: '+0.15%' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', price: 1.0845, change: '-0.12%' },
  { symbol: 'GBPUSD', name: 'British Pound / USD', price: 1.2980, change: '+0.04%' },
  { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', price: 67420.00, change: '+1.85%' },
];

export const SAMPLE_ECONOMIC_NEWS = [
  { time: '08:30', title: 'US Core CPI (MoM)', impact: 'High', actual: '0.3%', forecast: '0.2%', prior: '0.3%' },
  { time: '10:00', title: 'ISM Services PMI', impact: 'Medium', actual: '54.9', forecast: '51.7', prior: '51.5%' },
  { time: '14:00', title: 'FOMC Meeting Minutes', impact: 'High', actual: 'Rate Cut', forecast: '50bps', prior: '5.50%' },
  { time: '08:30', title: 'Non-Farm Employment Change', impact: 'High', actual: '254K', forecast: '147K', prior: '159K' },
  { time: '08:30', title: 'Unemployment Rate', impact: 'High', actual: '4.1%', forecast: '4.2%', prior: '4.2%' },
];

export const RightDock: FC<RightDockProps> = ({
  workerClient,
  shapes,
  onShapesChange,
  activePanel: controlledActivePanel,
  onActivePanelChange,
}) => {
  const storeActiveRightPanel = useStore((s) => s.activeRightPanel);
  const setStoreActiveRightPanel = useStore((s) => s.setActiveRightPanel);
  const activeRightPanel = controlledActivePanel !== undefined ? controlledActivePanel : storeActiveRightPanel;
  const portfolio = useStore((s) => s.portfolio);
  const setSymbol = useStore((s) => s.setSymbol);

  // Order panel local state
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [orderSize, setOrderSize] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [journalNotes, setJournalNotes] = useState<string>('Focused on ICT liquidity sweeps and fair value gaps.');

  const togglePanel = (panel: AppStore['activeRightPanel']) => {
    const next = activeRightPanel === panel ? null : panel;
    if (onActivePanelChange) {
      onActivePanelChange(next);
    } else {
      setStoreActiveRightPanel(next);
    }
  };

  const handlePlaceOrder = (side: 'BUY' | 'SELL') => {
    if (!workerClient) return;
    workerClient.send({
      type: 'PLACE_ORDER',
      payload: {
        side,
        type: orderType,
        size: orderSize,
        price: orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      },
    });
  };

  const handleClosePosition = (positionId: string) => {
    if (!workerClient) return;
    workerClient.send({
      type: 'CLOSE_POSITION',
      payload: { positionId },
    });
  };

  const handleSelectSymbol = async (sym: string) => {
    setSymbol(sym);
    if (!workerClient) return;
    if (sym === 'BTCUSDT') {
      try {
        const candles = await fetchBinance1mKlines(sym, 1000);
        workerClient.send({ type: 'LOAD_DATA', payload: { candles } });
      } catch (err) {
        console.warn('Could not fetch symbol:', err);
      }
    }
  };

  const handleDeleteShape = (id: string) => {
    onShapesChange(shapes.filter((s) => s.id !== id));
  };

  const toggleShapeVisibility = (id: string) => {
    onShapesChange(
      shapes.map((s) => {
        if (s.id !== id) return s;
        const currentHidden = s.params?.hidden ?? false;
        return {
          ...s,
          params: { ...s.params, hidden: !currentHidden },
        };
      })
    );
  };

  const toggleShapeLock = (id: string) => {
    onShapesChange(
      shapes.map((s) => {
        if (s.id !== id) return s;
        const currentLocked = s.params?.locked ?? false;
        return {
          ...s,
          params: { ...s.params, locked: !currentLocked },
        };
      })
    );
  };

  // Journal metrics
  const closed = portfolio.closedTrades ?? [];
  const wins = closed.filter((t) => t.pnl > 0).length;
  const winRate = closed.length > 0 ? ((wins / closed.length) * 100).toFixed(1) : '0.0';
  const totalPnL = closed.reduce((acc, t) => acc + t.pnl, 0);

  return (
    <aside
      data-testid="right-dock"
      className="flex h-full border-l border-[#cbd5e1] dark:border-[#2a2e39] bg-white dark:bg-[#1e222d] select-none z-20"
    >
      {/* Slide-out Drawer Panel */}
      {activeRightPanel && (
        <div
          data-testid={`drawer-${activeRightPanel}`}
          className="w-80 h-full border-r border-[#cbd5e1] dark:border-[#2a2e39] flex flex-col text-xs bg-[#f8fafc] dark:bg-[#1e222d] text-[#1e293b] dark:text-[#d1d4dc] overflow-y-auto shadow-lg"
        >
          {/* Drawer Header */}
          <div className="p-3 border-b border-[#cbd5e1] dark:border-[#2a2e39] flex items-center justify-between font-semibold">
            <span>
              {activeRightPanel === 'order' && 'Order Entry'}
              {activeRightPanel === 'objectTree' && 'Object Tree'}
              {activeRightPanel === 'watchlist' && 'Watchlist'}
              {activeRightPanel === 'journal' && 'Session Journal'}
              {activeRightPanel === 'news' && 'Economic Calendar'}
            </span>
            <button
              onClick={() => setActiveRightPanel(null)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-black dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 p-3 space-y-3">
            {/* 1. ORDER DRAWER */}
            {activeRightPanel === 'order' && (
              <div className="space-y-3">
                <div className="flex bg-gray-200 dark:bg-[#131722] rounded p-0.5">
                  <button
                    onClick={() => setOrderType('MARKET')}
                    className={`flex-1 py-1 rounded font-medium ${
                      orderType === 'MARKET' ? 'bg-white dark:bg-[#2a2e39] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Market
                  </button>
                  <button
                    onClick={() => setOrderType('LIMIT')}
                    className={`flex-1 py-1 rounded font-medium ${
                      orderType === 'LIMIT' ? 'bg-white dark:bg-[#2a2e39] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Limit
                  </button>
                </div>

                <div>
                  <label className="text-gray-500 block mb-1">Quantity (Lots)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={orderSize}
                    onChange={(e) => setOrderSize(parseFloat(e.target.value) || 1)}
                    className="w-full bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded px-2 py-1"
                  />
                </div>

                {orderType === 'LIMIT' && (
                  <div>
                    <label className="text-gray-500 block mb-1">Limit Price</label>
                    <input
                      type="number"
                      placeholder="e.g. 21250.00"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="w-full bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded px-2 py-1"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-500 block mb-1">Stop Loss</label>
                    <input
                      type="number"
                      placeholder="Optional"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">Take Profit</label>
                    <input
                      type="number"
                      placeholder="Optional"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="w-full bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded px-2 py-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handlePlaceOrder('BUY')}
                    className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm"
                  >
                    BUY / LONG
                  </button>
                  <button
                    onClick={() => handlePlaceOrder('SELL')}
                    className="py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded shadow-sm"
                  >
                    SELL / SHORT
                  </button>
                </div>

                {/* Open Positions */}
                <div className="pt-2 border-t border-[#cbd5e1] dark:border-[#2a2e39]">
                  <div className="font-semibold text-gray-500 mb-2">Open Positions ({portfolio.positions.length})</div>
                  {portfolio.positions.length === 0 ? (
                    <div className="text-gray-400 text-center py-2">No open positions</div>
                  ) : (
                    <div className="space-y-1.5">
                      {portfolio.positions.map((pos) => (
                        <div
                          key={pos.id}
                          className="p-2 bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold">
                              {pos.side} {pos.size} @ {pos.entryPrice.toFixed(2)}
                            </div>
                            <div className={pos.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-500'}>
                              {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleClosePosition(pos.id)}
                            className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 hover:bg-red-500 hover:text-white rounded"
                          >
                            Close
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. OBJECT TREE DRAWER */}
            {activeRightPanel === 'objectTree' && (
              <div className="space-y-2">
                <div className="text-gray-500 mb-2">Active Drawings ({shapes.length})</div>
                {shapes.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">No drawings on chart</div>
                ) : (
                  <div className="space-y-1">
                    {shapes.map((s, idx) => {
                      const isHidden = s.params?.hidden ?? false;
                      const isLocked = s.params?.locked ?? false;
                      const label = s.type === 'rectangle' ? 'Rectangle' : s.type === 'trendline' ? 'Trendline' : s.type;

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: s.color || '#2563eb' }}
                            />
                            <span>
                              {label} #{idx + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleShapeVisibility(s.id)}
                              className="p-1 text-gray-500 hover:text-black dark:hover:text-white"
                              title={isHidden ? 'Show' : 'Hide'}
                            >
                              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => toggleShapeLock(s.id)}
                              className="p-1 text-gray-500 hover:text-black dark:hover:text-white"
                              title={isLocked ? 'Unlock' : 'Lock'}
                            >
                              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteShape(s.id)}
                              className="p-1 text-gray-500 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. WATCHLIST DRAWER */}
            {activeRightPanel === 'watchlist' && (
              <div className="space-y-1">
                {WATCHLIST_ITEMS.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSelectSymbol(item.symbol)}
                    className="w-full text-left p-2.5 bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded hover:border-blue-500 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold">{item.symbol}</div>
                      <div className="text-[11px] text-gray-400">{item.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{item.price.toLocaleString()}</div>
                      <div
                        className={`text-[11px] ${
                          item.change.startsWith('+') ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {item.change}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 4. JOURNAL DRAWER */}
            {activeRightPanel === 'journal' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 p-2 bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded text-center">
                  <div>
                    <div className="text-gray-400 text-[10px]">Trades</div>
                    <div className="font-bold text-sm">{closed.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[10px]">Win Rate</div>
                    <div className="font-bold text-sm text-blue-600">{winRate}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[10px]">Net PnL</div>
                    <div
                      className={`font-bold text-sm ${
                        totalPnL >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      ${totalPnL.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 block mb-1">Session Reflections</label>
                  <textarea
                    rows={4}
                    value={journalNotes}
                    onChange={(e) => setJournalNotes(e.target.value)}
                    placeholder="Log your thoughts, trade execution, and psychology..."
                    className="w-full bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded p-2 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="border-t border-[#cbd5e1] dark:border-[#2a2e39] pt-2">
                  <div className="font-semibold text-gray-500 mb-2">Trade History</div>
                  {closed.length === 0 ? (
                    <div className="text-gray-400 text-center py-2">No closed trades yet</div>
                  ) : (
                    <div className="space-y-1">
                      {closed.map((t) => (
                        <div
                          key={t.id}
                          className="p-2 bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded flex justify-between"
                        >
                          <div>
                            <span className="font-semibold">{t.side}</span> {t.size} @ {t.entryPrice.toFixed(2)} → {t.exitPrice.toFixed(2)}
                          </div>
                          <div className={t.pnl >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                            {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. NEWS DRAWER */}
            {activeRightPanel === 'news' && (
              <div className="space-y-2">
                <div className="text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>High Impact Releases</span>
                </div>
                {SAMPLE_ECONOMIC_NEWS.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2 bg-white dark:bg-[#131722] border border-[#cbd5e1] dark:border-[#2a2e39] rounded space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{ev.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ev.impact === 'High'
                            ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                        }`}
                      >
                        {ev.impact}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-[11px]">
                      <span>Time: {ev.time} EST</span>
                      <span>Act: {ev.actual} | Frc: {ev.forecast}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vertical Icon Strip */}
      <div className="w-12 h-full flex flex-col items-center py-2 space-y-3 bg-white dark:bg-[#1e222d] border-l border-[#cbd5e1] dark:border-[#2a2e39]">
        <button
          data-testid="dock-tab-order"
          title="Order Entry"
          onClick={() => togglePanel('order')}
          className={`flex flex-col items-center justify-center p-1.5 rounded transition-colors ${
            activeRightPanel === 'order'
              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
              : 'text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span className="text-[9px] mt-0.5 font-medium">+ Order</span>
        </button>

        <button
          data-testid="dock-tab-objectTree"
          title="Object Tree"
          onClick={() => togglePanel('objectTree')}
          className={`flex flex-col items-center justify-center p-1.5 rounded transition-colors ${
            activeRightPanel === 'objectTree'
              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
              : 'text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px] mt-0.5 font-medium">Objects</span>
        </button>

        <button
          data-testid="dock-tab-watchlist"
          title="Watchlist"
          onClick={() => togglePanel('watchlist')}
          className={`flex flex-col items-center justify-center p-1.5 rounded transition-colors ${
            activeRightPanel === 'watchlist'
              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
              : 'text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span className="text-[9px] mt-0.5 font-medium">Watchlist</span>
        </button>

        <button
          data-testid="dock-tab-journal"
          title="Journal"
          onClick={() => togglePanel('journal')}
          className={`flex flex-col items-center justify-center p-1.5 rounded transition-colors ${
            activeRightPanel === 'journal'
              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
              : 'text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[9px] mt-0.5 font-medium">Journal</span>
        </button>

        <button
          data-testid="dock-tab-news"
          title="Economic Calendar"
          onClick={() => togglePanel('news')}
          className={`flex flex-col items-center justify-center p-1.5 rounded transition-colors ${
            activeRightPanel === 'news'
              ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
              : 'text-gray-500 hover:text-black dark:hover:text-white'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span className="text-[9px] mt-0.5 font-medium">News</span>
        </button>
      </div>
    </aside>
  );
};

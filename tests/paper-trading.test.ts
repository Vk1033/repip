import { describe, it, expect } from 'vitest';
import { PaperTradingEngine } from '../src/core/paper-trading';
import { Candle } from '../src/types/market';

describe('PaperTradingEngine', () => {
  it('fills market orders at candle close price and updates portfolio', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 102, volume: 50 };

    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
    });

    const execution = engine.processCandle(candle1);
    expect(execution.filledOrders).toHaveLength(1);
    expect(execution.positions).toHaveLength(1);
    expect(execution.positions[0].entryPrice).toBe(102);
    expect(engine.getPortfolio().balance).toBe(10000 - 102 * 10);
    expect(engine.getPortfolio().equity).toBe(10000);
  });

  it('triggers limit orders only when price breaches the limit level', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: 95,
      size: 5,
    });

    // Candle does not reach 95 (low is 98)
    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 102, volume: 50 };
    let result = engine.processCandle(candle1);
    expect(result.filledOrders).toHaveLength(0);
    expect(engine.getPortfolio().pendingOrders).toHaveLength(1);

    // Candle reaches 94
    const candle2: Candle = { time: 1060, open: 102, high: 103, low: 94, close: 97, volume: 50 };
    result = engine.processCandle(candle2);
    expect(result.filledOrders).toHaveLength(1);
    expect(result.positions[0].entryPrice).toBe(95);
    expect(engine.getPortfolio().pendingOrders).toHaveLength(0);
    expect(engine.getPortfolio().balance).toBe(10000 - 95 * 5);
  });

  it('triggers sell limit orders when candle high reaches or exceeds limit price', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'LIMIT',
      side: 'SELL',
      limitPrice: 110,
      size: 2,
    });

    // Candle does not reach 110 (high is 108)
    const candle1: Candle = { time: 1000, open: 100, high: 108, low: 99, close: 105, volume: 50 };
    let result = engine.processCandle(candle1);
    expect(result.filledOrders).toHaveLength(0);

    // Candle reaches 112 (exceeds 110)
    const candle2: Candle = { time: 1060, open: 105, high: 112, low: 104, close: 109, volume: 50 };
    result = engine.processCandle(candle2);
    expect(result.filledOrders).toHaveLength(1);
    expect(result.positions[0].side).toBe('SELL');
    expect(result.positions[0].entryPrice).toBe(110);
    expect(engine.getPortfolio().balance).toBe(10000 - 110 * 2);
  });

  it('allows cancelling pending orders', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    const order = engine.placeOrder({
      type: 'LIMIT',
      side: 'BUY',
      limitPrice: 90,
      size: 5,
    });

    expect(engine.getPortfolio().pendingOrders).toHaveLength(1);
    const cancelled = engine.cancelOrder(order.id);
    expect(cancelled).toBe(true);
    expect(engine.getPortfolio().pendingOrders).toHaveLength(0);

    // Cancelling nonexistent order returns false
    const cancelAgain = engine.cancelOrder('non-existent-id');
    expect(cancelAgain).toBe(false);
  });

  it('allows manually closing an open position via closePosition', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
    });

    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 100, volume: 50 };
    const exec = engine.processCandle(candle1);
    const positionId = exec.positions[0].id;

    // Close position manually at 120 at timestamp 1060
    const trade = engine.closePosition(positionId, 120, 1060);
    expect(trade).not.toBeNull();
    expect(trade?.entryPrice).toBe(100);
    expect(trade?.exitPrice).toBe(120);
    expect(trade?.pnl).toBe(200); // (120 - 100) * 10
    expect(trade?.closedAt).toBe(1060);

    const portfolio = engine.getPortfolio();
    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.closedTrades).toHaveLength(1);
    expect(portfolio.balance).toBe(10200);
    expect(portfolio.equity).toBe(10200);
    expect(portfolio.realizedPnL).toBe(200);
    expect(portfolio.unrealizedPnL).toBe(0);

    // Closing non-existent position returns null
    expect(engine.closePosition('non-existent', 120, 1060)).toBeNull();
  });

  it('triggers Stop-Loss for BUY position when candle low breaches stopLoss level', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
      stopLoss: 90,
      takeProfit: 120,
    });

    // Fill order at 100
    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 100, volume: 50 };
    engine.processCandle(candle1);

    // Candle drops to 88 (below SL 90)
    const candle2: Candle = { time: 1060, open: 99, high: 101, low: 88, close: 92, volume: 50 };
    const exec2 = engine.processCandle(candle2);

    expect(exec2.closedPositions).toHaveLength(1);
    expect(exec2.closedPositions[0].exitPrice).toBe(90);
    expect(exec2.closedPositions[0].pnl).toBe(-100); // (90 - 100) * 10
    expect(exec2.positions).toHaveLength(0);

    const portfolio = engine.getPortfolio();
    expect(portfolio.balance).toBe(9900); // 10000 - 100
    expect(portfolio.equity).toBe(9900);
    expect(portfolio.realizedPnL).toBe(-100);
  });

  it('triggers Take-Profit for BUY position when candle high breaches takeProfit level', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
      stopLoss: 90,
      takeProfit: 120,
    });

    // Fill order at 100
    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 100, volume: 50 };
    engine.processCandle(candle1);

    // Candle surges to 125 (above TP 120)
    const candle2: Candle = { time: 1060, open: 101, high: 125, low: 100, close: 122, volume: 50 };
    const exec2 = engine.processCandle(candle2);

    expect(exec2.closedPositions).toHaveLength(1);
    expect(exec2.closedPositions[0].exitPrice).toBe(120);
    expect(exec2.closedPositions[0].pnl).toBe(200); // (120 - 100) * 10
    expect(exec2.positions).toHaveLength(0);

    const portfolio = engine.getPortfolio();
    expect(portfolio.balance).toBe(10200);
    expect(portfolio.equity).toBe(10200);
    expect(portfolio.realizedPnL).toBe(200);
  });

  it('triggers Stop-Loss for SELL position when candle high breaches stopLoss level', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'SELL',
      size: 5,
      stopLoss: 110,
      takeProfit: 85,
    });

    // Fill sell order at 100
    const candle1: Candle = { time: 1000, open: 100, high: 102, low: 98, close: 100, volume: 50 };
    engine.processCandle(candle1);

    // Candle spikes to 115 (above SL 110 for short)
    const candle2: Candle = { time: 1060, open: 100, high: 115, low: 99, close: 112, volume: 50 };
    const exec2 = engine.processCandle(candle2);

    expect(exec2.closedPositions).toHaveLength(1);
    expect(exec2.closedPositions[0].exitPrice).toBe(110);
    expect(exec2.closedPositions[0].pnl).toBe(-50); // (110 - 100) * 5 * -1
    expect(exec2.positions).toHaveLength(0);

    const portfolio = engine.getPortfolio();
    expect(portfolio.balance).toBe(9950);
    expect(portfolio.equity).toBe(9950);
    expect(portfolio.realizedPnL).toBe(-50);
  });

  it('triggers Take-Profit for SELL position when candle low breaches takeProfit level', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'SELL',
      size: 5,
      stopLoss: 110,
      takeProfit: 85,
    });

    // Fill sell order at 100
    const candle1: Candle = { time: 1000, open: 100, high: 102, low: 98, close: 100, volume: 50 };
    engine.processCandle(candle1);

    // Candle drops to 80 (below TP 85 for short)
    const candle2: Candle = { time: 1060, open: 98, high: 99, low: 80, close: 82, volume: 50 };
    const exec2 = engine.processCandle(candle2);

    expect(exec2.closedPositions).toHaveLength(1);
    expect(exec2.closedPositions[0].exitPrice).toBe(85);
    expect(exec2.closedPositions[0].pnl).toBe(75); // (85 - 100) * 5 * -1 = +75
    expect(exec2.positions).toHaveLength(0);

    const portfolio = engine.getPortfolio();
    expect(portfolio.balance).toBe(10075);
    expect(portfolio.equity).toBe(10075);
    expect(portfolio.realizedPnL).toBe(75);
  });

  it('tracks unrealized PnL and total portfolio equity correctly across price changes', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
    });

    // Fill at 100
    const candle1: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 100, volume: 50 };
    engine.processCandle(candle1);

    // Candle rises to close 108
    const candle2: Candle = { time: 1060, open: 100, high: 109, low: 99, close: 108, volume: 50 };
    engine.processCandle(candle2);

    let portfolio = engine.getPortfolio();
    expect(portfolio.positions[0].unrealizedPnL).toBe(80); // (108 - 100) * 10
    expect(portfolio.unrealizedPnL).toBe(80);
    expect(portfolio.balance).toBe(9000);
    expect(portfolio.equity).toBe(9000 + 1000 + 80); // 10080

    // Candle drops to close 92
    const candle3: Candle = { time: 1120, open: 108, high: 108, low: 90, close: 92, volume: 50 };
    engine.processCandle(candle3);

    portfolio = engine.getPortfolio();
    expect(portfolio.positions[0].unrealizedPnL).toBe(-80); // (92 - 100) * 10
    expect(portfolio.unrealizedPnL).toBe(-80);
    expect(portfolio.equity).toBe(9000 + 1000 - 80); // 9920
  });

  it('supports reset method to restore initial state', () => {
    const engine = new PaperTradingEngine({ initialBalance: 5000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
    });
    engine.processCandle({ time: 1000, open: 100, high: 105, low: 98, close: 100, volume: 50 });

    expect(engine.getPortfolio().positions).toHaveLength(1);

    engine.reset(20000);
    const resetPortfolio = engine.getPortfolio();
    expect(resetPortfolio.balance).toBe(20000);
    expect(resetPortfolio.equity).toBe(20000);
    expect(resetPortfolio.positions).toHaveLength(0);
    expect(resetPortfolio.pendingOrders).toHaveLength(0);
    expect(resetPortfolio.closedTrades).toHaveLength(0);
    expect(resetPortfolio.realizedPnL).toBe(0);
    expect(resetPortfolio.unrealizedPnL).toBe(0);
  });

  it('does not trigger SL/TP on the same candle a position is opened (prevents causality leak)', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10,
      stopLoss: 90,
      takeProfit: 120,
    });

    // In candle1, intra-candle low is 85 (< SL 90) and high is 125 (> TP 120),
    // but the market fill happens at close (100). Intra-candle prices occurred prior to fill.
    const candle1: Candle = { time: 1000, open: 95, high: 125, low: 85, close: 100, volume: 50 };
    const exec1 = engine.processCandle(candle1);

    expect(exec1.filledOrders).toHaveLength(1);
    expect(exec1.closedPositions).toHaveLength(0);
    expect(exec1.positions).toHaveLength(1);
    expect(exec1.positions[0].entryPrice).toBe(100);

    // On subsequent candle2, low drops to 88 (< SL 90) and SL correctly triggers
    const candle2: Candle = { time: 1060, open: 100, high: 102, low: 88, close: 95, volume: 50 };
    const exec2 = engine.processCandle(candle2);

    expect(exec2.closedPositions).toHaveLength(1);
    expect(exec2.closedPositions[0].exitPrice).toBe(90);
    expect(exec2.closedPositions[0].pnl).toBe(-100);
    expect(exec2.positions).toHaveLength(0);
  });

  it('rejects orders when balance is insufficient to prevent negative balance', () => {
    const engine = new PaperTradingEngine({ initialBalance: 500 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 10, // requires 10 * 100 = 1000 > 500
    });

    const candle: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 100, volume: 50 };
    const exec = engine.processCandle(candle);

    expect(exec.filledOrders).toHaveLength(0);
    expect(exec.positions).toHaveLength(0);
    expect(engine.getPortfolio().balance).toBe(500);
    expect(engine.getPortfolio().pendingOrders).toHaveLength(0);
  });

  it('returns cloned positions array from processCandle to prevent state corruption', () => {
    const engine = new PaperTradingEngine({ initialBalance: 10000 });
    engine.placeOrder({
      type: 'MARKET',
      side: 'BUY',
      size: 5,
    });

    const candle: Candle = { time: 1000, open: 100, high: 105, low: 98, close: 100, volume: 50 };
    const exec = engine.processCandle(candle);

    expect(exec.positions).toHaveLength(1);
    // Mutating the returned array should not alter internal engine state
    exec.positions.pop();
    expect(engine.getPortfolio().positions).toHaveLength(1);
  });
});

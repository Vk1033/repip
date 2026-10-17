import { Candle } from '../types/market';

export type OrderType = 'MARKET' | 'LIMIT';
export type OrderSide = 'BUY' | 'SELL';

export interface OrderRequest {
  type: OrderType;
  side: OrderSide;
  size: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Order extends OrderRequest {
  id: string;
  createdAt: number;
}

export interface Position {
  id: string;
  side: OrderSide;
  size: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnL: number;
  realizedPnL: number;
  openedAt: number;
}

export interface Trade {
  id: string;
  side: OrderSide;
  size: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  openedAt: number;
  closedAt: number;
}

export interface PortfolioState {
  balance: number;
  equity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  positions: Position[];
  pendingOrders: Order[];
  closedTrades: Trade[];
}

export class PaperTradingEngine {
  private initialBalance: number;
  private balance: number;
  private pendingOrders: Order[] = [];
  private positions: Position[] = [];
  private closedTrades: Trade[] = [];

  constructor({ initialBalance = 10000 }: { initialBalance?: number } = {}) {
    this.initialBalance = initialBalance;
    this.balance = initialBalance;
  }

  placeOrder(orderReq: OrderRequest): Order {
    const order: Order = {
      ...orderReq,
      id: 'ord_' + Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
    };
    this.pendingOrders.push(order);
    return order;
  }

  cancelOrder(orderId: string): boolean {
    const idx = this.pendingOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      this.pendingOrders.splice(idx, 1);
      return true;
    }
    return false;
  }

  closePosition(positionId: string, exitPrice: number, time: number): Trade | null {
    const idx = this.positions.findIndex(p => p.id === positionId);
    if (idx === -1) return null;

    const pos = this.positions[idx];
    const multiplier = pos.side === 'BUY' ? 1 : -1;
    const pnl = (exitPrice - pos.entryPrice) * pos.size * multiplier;

    this.balance += pos.entryPrice * pos.size + pnl;
    this.positions.splice(idx, 1);

    const trade: Trade = {
      id: 'trd_' + Math.random().toString(36).substring(2, 9),
      side: pos.side,
      size: pos.size,
      entryPrice: pos.entryPrice,
      exitPrice,
      pnl,
      openedAt: pos.openedAt,
      closedAt: time,
    };
    this.closedTrades.push(trade);
    return trade;
  }

  processCandle(candle: Candle): {
    filledOrders: Order[];
    closedPositions: Trade[];
    positions: Position[];
  } {
    const filledOrders: Order[] = [];
    const closedPositions: Trade[] = [];
    const remainingOrders: Order[] = [];

    // Check pending orders
    for (const order of this.pendingOrders) {
      let filled = false;
      let fillPrice = candle.close;

      if (order.type === 'MARKET') {
        filled = true;
        fillPrice = candle.close;
      } else if (order.type === 'LIMIT' && order.limitPrice !== undefined) {
        if (order.side === 'BUY' && candle.low <= order.limitPrice) {
          filled = true;
          fillPrice = order.limitPrice;
        } else if (order.side === 'SELL' && candle.high >= order.limitPrice) {
          filled = true;
          fillPrice = order.limitPrice;
        }
      }

      if (filled) {
        const requiredBalance = fillPrice * order.size;
        if (this.balance >= requiredBalance) {
          this.balance -= requiredBalance;
          const position: Position = {
            id: 'pos_' + Math.random().toString(36).substring(2, 9),
            side: order.side,
            size: order.size,
            entryPrice: fillPrice,
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
            unrealizedPnL: 0,
            realizedPnL: 0,
            openedAt: candle.time,
          };
          this.positions.push(position);
          filledOrders.push(order);
        } else {
          // Insufficient balance to fund the order - discard/cancel order
        }
      } else {
        remainingOrders.push(order);
      }
    }
    this.pendingOrders = remainingOrders;

    // Check Stop-Loss / Take-Profit triggers on open positions
    for (let i = this.positions.length - 1; i >= 0; i--) {
      const pos = this.positions[i];

      // Positions opened on the current candle should not trigger SL/TP on the same candle
      // (candle.close is at the end of the candle interval; high/low occurred prior to fill)
      if (pos.openedAt >= candle.time) {
        const multiplier = pos.side === 'BUY' ? 1 : -1;
        pos.unrealizedPnL = (candle.close - pos.entryPrice) * pos.size * multiplier;
        continue;
      }

      let shouldClose = false;
      let exitPrice = candle.close;

      if (pos.side === 'BUY') {
        if (pos.stopLoss !== undefined && candle.low <= pos.stopLoss) {
          shouldClose = true;
          exitPrice = pos.stopLoss;
        } else if (pos.takeProfit !== undefined && candle.high >= pos.takeProfit) {
          shouldClose = true;
          exitPrice = pos.takeProfit;
        }
      } else {
        if (pos.stopLoss !== undefined && candle.high >= pos.stopLoss) {
          shouldClose = true;
          exitPrice = pos.stopLoss;
        } else if (pos.takeProfit !== undefined && candle.low <= pos.takeProfit) {
          shouldClose = true;
          exitPrice = pos.takeProfit;
        }
      }

      if (shouldClose) {
        const trade = this.closePosition(pos.id, exitPrice, candle.time);
        if (trade) closedPositions.push(trade);
      } else {
        // Update unrealized PnL
        const multiplier = pos.side === 'BUY' ? 1 : -1;
        pos.unrealizedPnL = (candle.close - pos.entryPrice) * pos.size * multiplier;
      }
    }

    return {
      filledOrders,
      closedPositions,
      positions: [...this.positions],
    };
  }

  getPortfolio(): PortfolioState {
    const unrealizedPnL = this.positions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
    const realizedPnL = this.closedTrades.reduce((acc, t) => acc + t.pnl, 0);
    const positionsCost = this.positions.reduce((acc, p) => acc + p.entryPrice * p.size, 0);
    const equity = this.balance + positionsCost + unrealizedPnL;

    return {
      balance: this.balance,
      equity,
      realizedPnL,
      unrealizedPnL,
      positions: [...this.positions],
      pendingOrders: [...this.pendingOrders],
      closedTrades: [...this.closedTrades],
    };
  }

  reset(initialBalance?: number): void {
    if (initialBalance !== undefined) {
      this.initialBalance = initialBalance;
      this.balance = initialBalance;
    } else {
      this.balance = this.initialBalance;
    }
    this.pendingOrders = [];
    this.positions = [];
    this.closedTrades = [];
  }
}

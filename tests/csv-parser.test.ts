import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCandlesCSV } from '../src/data/csv-parser';
import { fetchBinance1mKlines } from '../src/data/binance';
import { AppDB, db } from '../src/data/db';

describe('CSV Parser', () => {
  it('parses standard timestamp-based OHLCV CSVs accurately', () => {
    const csv = `timestamp,open,high,low,close,volume
1700000000,100.5,102.0,99.5,101.2,500
1700000060,101.2,103.5,100.8,102.7,450`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      time: 1700000000,
      open: 100.5,
      high: 102.0,
      low: 99.5,
      close: 101.2,
      volume: 500,
    });
  });

  it('handles ISO date strings and automatically sorts ascending', () => {
    const csv = `Date,Open,High,Low,Close,Volume
2024-01-01T00:01:00Z,105,106,104,105.5,100
2024-01-01T00:00:00Z,100,105,99,104.5,200`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].open).toBe(100);
    expect(result[0].time).toBe(Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000));
    expect(result[1].open).toBe(105);
    expect(result[1].time).toBe(Math.floor(new Date('2024-01-01T00:01:00Z').getTime() / 1000));
  });

  it('handles semicolon-delimited CSVs with comma decimals', () => {
    const csv = `Date;Open;High;Low;Close;Volume
1700000000;100,5;102,0;99,5;101,2;500
1700000060;101,2;103,5;100,8;102,7;450`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].open).toBe(100.5);
    expect(result[0].close).toBe(101.2);
    expect(result[1].high).toBe(103.5);
  });

  it('handles tab-delimited CSVs', () => {
    const csv = `Date\tOpen\tHigh\tLow\tClose\tVolume
1700000000\t100.5\t102.0\t99.5\t101.2\t500
1700000060\t101.2\t103.5\t100.8\t102.7\t450`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].open).toBe(100.5);
    expect(result[1].close).toBe(102.7);
  });

  it('handles shorthand column names (o, h, l, c, v, time)', () => {
    const csv = `time,o,h,l,c,v
1700000000,50,55,49,54,1000`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      time: 1700000000,
      open: 50,
      high: 55,
      low: 49,
      close: 54,
      volume: 1000,
    });
  });

  it('converts millisecond timestamps (> 1e11) to seconds', () => {
    const csv = `timestamp,open,high,low,close,volume
1700000000000,10,12,9,11,100
1700000060000,11,13,10,12,150`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].time).toBe(1700000000);
    expect(result[1].time).toBe(1700000060);
  });

  it('strictly applies Math.floor to ensure timestamps in seconds are integers', () => {
    const csv = `timestamp,open,high,low,close,volume
1700000000.789,10,12,9,11,100
1700000060.123,11,13,10,12,150`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].time).toBe(1700000000);
    expect(Number.isInteger(result[0].time)).toBe(true);
    expect(result[1].time).toBe(1700000060);
    expect(Number.isInteger(result[1].time)).toBe(true);
  });

  it('deduplicates candles with identical timestamps, keeping the first occurrence', () => {
    const csv = `timestamp,open,high,low,close,volume
1700000000,100,105,95,102,100
1700000000,101,106,96,103,200
1700000060,102,107,97,104,300`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].time).toBe(1700000000);
    expect(result[0].open).toBe(100); // first entry kept
    expect(result[1].time).toBe(1700000060);
  });

  it('defaults volume to 0 if volume column is missing or non-numeric', () => {
    const csvWithoutVol = `time,open,high,low,close
1700000000,100,105,95,102`;

    const result1 = parseCandlesCSV(csvWithoutVol);
    expect(result1).toHaveLength(1);
    expect(result1[0].volume).toBe(0);

    const csvWithEmptyVol = `time,open,high,low,close,volume
1700000000,100,105,95,102,`;

    const result2 = parseCandlesCSV(csvWithEmptyVol);
    expect(result2).toHaveLength(1);
    expect(result2[0].volume).toBe(0);
  });

  it('ignores empty lines and skips malformed rows with NaN values', () => {
    const csv = `time,open,high,low,close,volume
1700000000,100,105,95,102,100

1700000060,corrupted,105,95,102,100
1700000120,102,107,97,104,200
`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].time).toBe(1700000000);
    expect(result[1].time).toBe(1700000120);
  });

  it('throws error when required OHLC columns are missing', () => {
    const invalidCsv = `timestamp,foo,bar
1700000000,1,2`;

    expect(() => parseCandlesCSV(invalidCsv)).toThrow(
      'CSV missing required OHLC columns (time/date, open, high, low, close)'
    );
  });

  it('returns empty array for empty CSV or header-only CSV', () => {
    expect(parseCandlesCSV('')).toEqual([]);
    expect(parseCandlesCSV('timestamp,open,high,low,close,volume')).toEqual([]);
    expect(parseCandlesCSV('   \n\n  ')).toEqual([]);
  });

  it('strips quotes from headers and values', () => {
    const csv = `"timestamp","open","high","low","close","volume"
"1700000000","100.5","102.0","99.5","101.2","500"`;

    const result = parseCandlesCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      time: 1700000000,
      open: 100.5,
      high: 102.0,
      low: 99.5,
      close: 101.2,
      volume: 500,
    });
  });
});

describe('Binance Kline Fetcher', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches 1m klines with default symbol and limit', async () => {
    const mockKlines = [
      [1700000000000, '100.5', '102.0', '99.5', '101.2', '500', 1700000059999],
      [1700000060000, '101.2', '103.5', '100.8', '102.7', '450', 1700000119999],
    ];

    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => mockKlines,
      };
    });

    const candles = await fetchBinance1mKlines();

    expect(capturedUrl).toContain('symbol=BTCUSDT');
    expect(capturedUrl).toContain('interval=1m');
    expect(capturedUrl).toContain('limit=1000');
    expect(candles).toHaveLength(2);
    expect(candles[0]).toEqual({
      time: 1700000000,
      open: 100.5,
      high: 102.0,
      low: 99.5,
      close: 101.2,
      volume: 500,
    });
    expect(candles[1]).toEqual({
      time: 1700000060,
      open: 101.2,
      high: 103.5,
      low: 100.8,
      close: 102.7,
      volume: 450,
    });
  });

  it('handles limitOrStart <= 10000 as limit and endTimestamp as endTime', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => [],
      };
    });

    await fetchBinance1mKlines('ethusdt', 500, 1700001000);

    expect(capturedUrl).toContain('symbol=ETHUSDT');
    expect(capturedUrl).toContain('limit=500');
    expect(capturedUrl).toContain('endTime=1700001000000');
    expect(capturedUrl).not.toContain('startTime');
  });

  it('handles limitOrStart > 10000 as startTime and endTimestamp as endTime', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        json: async () => [],
      };
    });

    await fetchBinance1mKlines('SOLUSDT', 1700000000, 1700005000);

    expect(capturedUrl).toContain('symbol=SOLUSDT');
    expect(capturedUrl).toContain('startTime=1700000000000');
    expect(capturedUrl).toContain('endTime=1700005000000');
    expect(capturedUrl).not.toContain('limit=');
  });

  it('throws descriptive error when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    }));

    await expect(fetchBinance1mKlines('INVALID')).rejects.toThrow(
      'Binance API error: 400 Bad Request'
    );
  });

  it('throws error when Binance API returns non-array payload', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ msg: 'Invalid request' }),
    }));

    await expect(fetchBinance1mKlines('BTCUSDT')).rejects.toThrow(
      'Binance API returned invalid data format'
    );
  });
});

describe('Dexie AppDB', () => {
  it('instantiates AppDB with datasets table schema', () => {
    const instance = new AppDB();
    expect(instance.name).toBe('TradingViewCloneDB');
    expect(instance.tables.map(t => t.name)).toContain('datasets');
  });

  it('exports singleton db instance', () => {
    expect(db).toBeInstanceOf(AppDB);
    expect(db.name).toBe('TradingViewCloneDB');
  });
});

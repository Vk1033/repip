import { Candle } from '../types/market';

export function parseCandlesCSV(csvText: string): Candle[] {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount >= tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount >= semiCount) {
    delimiter = '\t';
  } else if (headerLine.includes(';') && !headerLine.includes(',')) {
    delimiter = ';';
  } else if (headerLine.includes('\t') && !headerLine.includes(',')) {
    delimiter = '\t';
  }

  const headers = headerLine
    .split(delimiter)
    .map(h => h.trim().replace(/^["']|["']$/g, ''));

  const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('date'));
  const openIdx = headers.findIndex(h => h === 'open' || h === 'o');
  const highIdx = headers.findIndex(h => h === 'high' || h === 'h');
  const lowIdx = headers.findIndex(h => h === 'low' || h === 'l');
  const closeIdx = headers.findIndex(h => h === 'close' || h === 'c');
  const volIdx = headers.findIndex(h => h.includes('vol') || h === 'v');

  if (timeIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    throw new Error('CSV missing required OHLC columns (time/date, open, high, low, close)');
  }

  const candles: Candle[] = [];

  const parseNum = (val: string | undefined): number => {
    if (!val) return NaN;
    const clean = delimiter === ';' ? val.replace(',', '.') : val;
    return parseFloat(clean);
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const timeRaw = cols[timeIdx];
    if (timeRaw === undefined || timeRaw === null || timeRaw.trim() === '') continue;

    let timeSec = 0;
    const num = Number(timeRaw);

    if (!isNaN(num) && timeRaw.trim() !== '') {
      timeSec = num > 1e11 ? Math.floor(num / 1000) : Math.floor(num);
    } else {
      timeSec = Math.floor(new Date(timeRaw).getTime() / 1000);
    }

    if (isNaN(timeSec)) continue;
    timeSec = Math.floor(timeSec);

    const open = parseNum(cols[openIdx]);
    const high = parseNum(cols[highIdx]);
    const low = parseNum(cols[lowIdx]);
    const close = parseNum(cols[closeIdx]);
    const volume = volIdx !== -1 ? parseNum(cols[volIdx]) || 0 : 0;

    if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
      candles.push({ time: timeSec, open, high, low, close, volume });
    }
  }

  // Sort ascending by time
  candles.sort((a, b) => a.time - b.time);

  // Deduplicate identical timestamps
  const uniqueCandles: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0 || candles[i].time !== candles[i - 1].time) {
      uniqueCandles.push(candles[i]);
    }
  }

  return uniqueCandles;
}

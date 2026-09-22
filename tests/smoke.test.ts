import { describe, it, expect } from 'vitest';
import * as tv from '@tradingview/lightweight-charts';
import * as lwc from 'lightweight-charts';
import Dexie from 'dexie';
import { create } from 'zustand';

describe('Scaffolding smoke test', () => {
  it('imports core dependencies correctly', () => {
    expect(tv).toBeDefined();
    expect(lwc).toBeDefined();
    expect(Dexie).toBeDefined();
    expect(create).toBeDefined();
  });
});

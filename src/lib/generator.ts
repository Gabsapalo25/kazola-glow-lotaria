/**
 * generator.ts — Gerador de combinações Loto 5/90
 * ================================================
 * AVISO: ferramenta educativa. Nenhuma estratégia altera
 * as probabilidades reais do sorteio.
 */

import { TOTAL_NUMBERS, PICK_SIZE } from '../data/history';

export type GenerationStrategy =
  | 'equilibrado'
  | 'frequencia'
  | 'montecarlo'
  | 'aleatorio';

export interface Filter {
  exclude    : number[];
  parityBias : 'nenhum' | 'equilibrado' | 'par' | 'impar';
  sumRange?  : [number, number];
}

function weightedSample(weights: number[], k: number, exclude: number[]): number[] {
  const pool: { n: number; w: number }[] = [];
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    if (exclude.includes(i)) continue;
    pool.push({ n: i, w: Math.max(weights[i] ?? 1, 0.01) });
  }
  if (pool.length < k) return [];
  const result: number[] = [];
  const remaining = [...pool];
  for (let j = 0; j < k; j++) {
    const total = remaining.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      r -= remaining[i].w;
      if (r <= 0) { idx = i; break; }
    }
    result.push(remaining[idx].n);
    remaining.splice(idx, 1);
  }
  return result.sort((a, b) => a - b);
}

function checkParity(nums: number[], bias: Filter['parityBias']): boolean {
  if (bias === 'nenhum') return true;
  const evens = nums.filter(n => n % 2 === 0).length;
  const odds  = PICK_SIZE - evens;
  if (bias === 'par')         return evens > odds;
  if (bias === 'impar')       return odds  > evens;
  if (bias === 'equilibrado') return Math.abs(evens - odds) <= 1;
  return true;
}

function checkSum(nums: number[], range?: [number, number]): boolean {
  if (!range) return true;
  const s = nums.reduce((a, b) => a + b, 0);
  return s >= range[0] && s <= range[1];
}

// 5 faixas de 18 números para o método equilibrado
const BALANCED_BANDS: [number, number][] = [
  [1, 18], [19, 36], [37, 54], [55, 72], [73, 90],
];

export function generateLine(
  weights    : number[],
  strategy   : GenerationStrategy,
  filter     : Filter,
  maxAttempts = 200,
): { numbers: number[] } | null {

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let nums: number[] = [];

    if (strategy === 'aleatorio') {
      const pool = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1)
        .filter(n => !filter.exclude.includes(n));
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      nums = pool.slice(0, PICK_SIZE).sort((a, b) => a - b);

    } else if (strategy === 'equilibrado') {
      for (const [lo, hi] of BALANCED_BANDS) {
        const band = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
          .filter(n => !filter.exclude.includes(n));
        if (band.length === 0) continue;
        nums.push(band[Math.floor(Math.random() * band.length)]);
      }
      nums.sort((a, b) => a - b);

    } else if (strategy === 'frequencia') {
      nums = weightedSample(weights, PICK_SIZE, filter.exclude);

    } else if (strategy === 'montecarlo') {
      const noisy = [...weights];
      for (let i = 1; i <= TOTAL_NUMBERS; i++) {
        const u = 1 - Math.random(), v = Math.random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        noisy[i] = Math.max((weights[i] ?? 1) + z * 0.5, 0.01);
      }
      nums = weightedSample(noisy, PICK_SIZE, filter.exclude);
    }

    if (
      nums.length === PICK_SIZE &&
      checkParity(nums, filter.parityBias) &&
      checkSum(nums, filter.sumRange)
    ) return { numbers: nums };
  }
  return null;
}

/** Probabilidades teóricas Loto 5/90 — C(90,5) = 43.949.268 */
export function probabilityHint() {
  const C = (n: number, k: number): number => {
    if (k === 0 || k === n) return 1;
    let r = 1;
    for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
    return Math.round(r);
  };
  const total = C(90, 5);
  return {
    total,
    five  : total,
    four  : Math.round(total / (C(5, 4) * (90 - 5))),
    three : Math.round(total / (C(5, 3) * C(85, 2))),
    two   : Math.round(total / (C(5, 2) * C(85, 3))),
  };
}
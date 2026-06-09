/**
 * history.ts — Dados e constantes da Lotaria Nacional de Angola
 * ================================================================
 */

// ⚠️ CONSTANTES PRINCIPAIS (necessárias para o generator.ts)
export const TOTAL_NUMBERS = 90;
export const PICK_SIZE = 5;

// Constantes adicionais
export const MIN_STAKE_KZ = 50;
export const MAX_STAKE_KZ = 1000;
export const TAX_FREE_KZ = 280000;
export const TAX_RATE = 0.15;
export const MAX_PRIZE_KZ = MAX_STAKE_KZ * 5000;

export const GAME_NAME = 'Loto 5/90';
export const OPERATOR = 'Mota & Tavares Jogos, S.A.';
export const CONCESSIONAIRE = 'Lotaria Nacional de Angola';
export const REGULATOR = 'Instituto de Supervisão de Jogos (ISJ)';
export const LEGAL_REF = 'Lei n.º 17/24, de 28 de Outubro';
export const DECREE_REF = 'Decreto Executivo n.º 695/25';
export const WEBSITE = 'https://www.lotarianacional.co.ao';

export interface Draw {
  id: string;
  date: string;
  time?: string;
  session?: 'fezada' | 'kazola' | 'aqueceu' | 'eskebra';
  numbers: number[];
}

export const DRAWS: Draw[] = [];

export function computeFrequency(draws: Draw[]) {
  const freq = new Array(TOTAL_NUMBERS + 1).fill(0);
  for (const d of draws) for (const n of d.numbers) freq[n]++;
  return { freq, total: draws.length };
}

export function hotColdRanking(draws: Draw[], window: number, topN = 8) {
  const { freq } = computeFrequency(draws.slice(-window));
  const pairs = Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({ n: i + 1, c: freq[i + 1] }));
  pairs.sort((a, b) => b.c - a.c);
  return { hot: pairs.slice(0, topN).map(p => p.n), cold: pairs.slice(-topN).reverse().map(p => p.n) };
}

export function gapAnalysis(draws: Draw[]) {
  const last = new Array(TOTAL_NUMBERS + 1).fill(-1);
  for (let i = 0; i < draws.length; i++)
    for (const n of draws[i].numbers) last[n] = i;
  const now = draws.length;
  return Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({ n: i + 1, gap: last[i + 1] === -1 ? now : now - 1 - last[i + 1] }));
}

export function sumStats(draws: Draw[]) {
  if (!draws.length) return { min: 0, max: 0, avg: 0 };
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0));
  return { min: Math.min(...sums), max: Math.max(...sums), avg: sums.reduce((a, b) => a + b, 0) / sums.length };
}

export function parityStats(draws: Draw[]) {
  let evens = 0, odds = 0;
  for (const d of draws) for (const n of d.numbers) n % 2 === 0 ? evens++ : odds++;
  return { evens, odds };
}

export function decadeStats(draws: Draw[]) {
  const decades = new Array(9).fill(0);
  for (const d of draws) for (const n of d.numbers) decades[Math.floor((n - 1) / 10)]++;
  return decades.map((count, i) => ({ label: `${i * 10 + 1}–${i * 10 + 10}`, count }));
}
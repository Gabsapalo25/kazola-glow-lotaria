/**
 * history.ts — Dados e constantes da Lotaria Nacional de Angola
 * ================================================================
 * FONTE ÚNICA DE VERDADE para multiplicadores, constantes e utilitários.
 * Todos os outros ficheiros devem importar daqui.
 */

// ── Constantes principais ────────────────────────────────────────────────────
export const TOTAL_NUMBERS = 90;
export const PICK_SIZE     = 5;

export const MIN_STAKE_KZ = 50;
export const MAX_STAKE_KZ = 1000;
export const TAX_FREE_KZ  = 280_000;
export const TAX_RATE     = 0.15;

// Prémio máximo: Chance 5, aposta máxima × multiplicador máximo (×100.000)
export const MAX_PRIZE_KZ = MAX_STAKE_KZ * 100_000; // = 100.000.000 Kz

export const GAME_NAME       = 'Loto 5/90';
export const OPERATOR        = 'Mota & Tavares Jogos, S.A.';
export const CONCESSIONAIRE  = 'Lotaria Nacional de Angola';
export const REGULATOR       = 'Instituto de Supervisão de Jogos (ISJ)';
export const LEGAL_REF       = 'Lei n.º 17/24, de 28 de Outubro';
export const DECREE_REF      = 'Decreto Executivo n.º 695/25';
export const WEBSITE         = 'https://www.lotarianacional.co.ao';

// ── Multiplicadores oficiais por modalidade ──────────────────────────────────
//
//  Chance 2 — escolhe 2 números, sorteiam-se 5
//    1 acerto → ×4
//    2 acertos → ×80
//
//  Chance 3 — escolhe 3 números, sorteiam-se 5
//    1 acerto → ×1
//    2 acertos → ×30
//    3 acertos → ×3.000
//
//  Chance 4 — escolhe 4 números, sorteiam-se 5
//    1 acerto → ×1
//    2 acertos → ×20
//    3 acertos → ×300
//    4 acertos → ×15.000
//
//  Chance 5 — escolhe 5 números, sorteiam-se 5
//    1 acerto → ×1
//    2 acertos → ×10
//    3 acertos → ×120
//    4 acertos → ×5.000
//    5 acertos → ×100.000
//
export const MULTIPLIERS: Record<string, Record<number, number>> = {
  chance2: {
    1: 4,
    2: 80,
  },
  chance3: {
    1: 1,
    2: 30,
    3: 3_000,
  },
  chance4: {
    1: 1,
    2: 20,
    3: 300,
    4: 15_000,
  },
  chance5: {
    1: 1,
    2: 10,
    3: 120,
    4: 5_000,
    5: 100_000,
  },
};

// Número de números a escolher por modalidade
export const NUMBERS_PER_CHANCE: Record<string, number> = {
  chance2: 2,
  chance3: 3,
  chance4: 4,
  chance5: 5,
};

// Label legível por modalidade
export const CHANCE_LABELS: Record<string, string> = {
  chance2: 'Chance 2',
  chance3: 'Chance 3',
  chance4: 'Chance 4',
  chance5: 'Chance 5',
};

// Prémio máximo possível por modalidade (aposta máxima × multiplicador máximo)
export const MAX_PRIZE_PER_CHANCE: Record<string, number> = {
  chance2: MAX_STAKE_KZ * 80,        //     80.000 Kz
  chance3: MAX_STAKE_KZ * 3_000,     //  3.000.000 Kz
  chance4: MAX_STAKE_KZ * 15_000,    // 15.000.000 Kz
  chance5: MAX_STAKE_KZ * 100_000,   //100.000.000 Kz
};

// Helper: calcula prémio bruto para uma dada modalidade, nº acertos e valor apostado
export function calcularPremio(
  modalidade: string,
  acertos: number,
  valorApostado: number,
): number {
  const mults = MULTIPLIERS[modalidade];
  if (!mults || acertos <= 0) return 0;
  const mult = mults[acertos] ?? 0;
  return valorApostado * mult;
}

// Helper: calcula prémio líquido após imposto
export function calcularPremioLiquido(premioBruto: number): number {
  if (premioBruto <= TAX_FREE_KZ) return premioBruto;
  return TAX_FREE_KZ + (premioBruto - TAX_FREE_KZ) * (1 - TAX_RATE);
}

// ── Tipo de sorteio ──────────────────────────────────────────────────────────
export interface Draw {
  id: string;
  date: string;
  time?: string;
  session?: 'fezada' | 'kazola' | 'aqueceu' | 'eskebra';
  numbers: number[];
}

// Array de sorteios (preenchido dinamicamente via API)
export const DRAWS: Draw[] = [];

// ── Utilitários estatísticos ─────────────────────────────────────────────────

export function computeFrequency(draws: Draw[]) {
  const freq = new Array(TOTAL_NUMBERS + 1).fill(0);
  for (const d of draws) for (const n of d.numbers) freq[n]++;
  return { freq, total: draws.length };
}

export function hotColdRanking(draws: Draw[], window: number, topN = 8) {
  const { freq } = computeFrequency(draws.slice(-window));
  const pairs = Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({ n: i + 1, c: freq[i + 1] }));
  pairs.sort((a, b) => b.c - a.c);
  return {
    hot:  pairs.slice(0, topN).map(p => p.n),
    cold: pairs.slice(-topN).reverse().map(p => p.n),
  };
}

export function gapAnalysis(draws: Draw[]) {
  const last = new Array(TOTAL_NUMBERS + 1).fill(-1);
  for (let i = 0; i < draws.length; i++)
    for (const n of draws[i].numbers) last[n] = i;
  const now = draws.length;
  return Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({
    n:   i + 1,
    gap: last[i + 1] === -1 ? now : now - 1 - last[i + 1],
  }));
}

export function sumStats(draws: Draw[]) {
  if (!draws.length) return { min: 0, max: 0, avg: 0 };
  const sums = draws.map(d => d.numbers.reduce((a, b) => a + b, 0));
  return {
    min: Math.min(...sums),
    max: Math.max(...sums),
    avg: sums.reduce((a, b) => a + b, 0) / sums.length,
  };
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
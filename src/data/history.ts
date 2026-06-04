/**
 * LOTO 5/90 – Lotaria Nacional de Angola
 * =========================================
 * Operador        : Mota & Tavares Jogos, S.A.
 * Concessionária  : Lotaria Nacional de Angola
 * Regulador       : Instituto de Supervisão de Jogos (ISJ)
 * Lei             : Lei n.º 17/24, de 28 de Outubro (Lei da Actividade de Jogos)
 * Regulamento     : Decreto Executivo n.º 695/25
 * Formato         : sorteia 5 bolas de 90 (numeradas 01–90)
 * Concursos       : até 28/semana, até 4 sorteios/dia (Seg–Dom)
 * Preço bilhete   : mínimo 50 Kz, máximo 1.000 Kz
 * Opções de aposta: 2, 3, 4 ou 5 números
 * Prémio máximo   : ×5000 o valor apostado (opção 5)
 * Isenção fiscal  : prémios ≤ 4 salários mínimos (~280.000 Kz)
 * Imposto         : 15 % sobre excedente
 */

// ── Constantes nominais (fonte oficial) ─────────────────────────────────────
export const GAME_NAME      = 'Loto 5/90';
export const OPERATOR       = 'Mota & Tavares Jogos, S.A.';
export const CONCESSIONAIRE = 'Lotaria Nacional de Angola';
export const REGULATOR      = 'Instituto de Supervisão de Jogos (ISJ)';
export const LEGAL_REF      = 'Lei n.º 17/24, de 28 de Outubro';
export const DECREE_REF     = 'Decreto Executivo n.º 695/25';
export const WEBSITE        = 'https://www.lotarianacional.co.ao';
export const FACEBOOK       = 'https://www.facebook.com/lotarianacional';

export const TOTAL_NUMBERS  = 90;
export const PICK_SIZE      = 5;
export const MIN_STAKE_KZ   = 50;
export const MAX_STAKE_KZ   = 1_000;
export const TAX_FREE_KZ    = 280_000; // ≈ 4 salários mínimos
export const TAX_RATE       = 0.15;
export const MAX_PRIZE_KZ   = MAX_STAKE_KZ * 5000; // opção 5 × 5000

/** 
 * Multiplicadores de cota fixa (Decreto 695/25, Art.º 16)
 * Valores oficiais da Lotaria Nacional de Angola
 */
export const MULTIPLIERS: Record<2|3|4|5, number> = {
  2: 1,
  3: 10,
  4: 120,
  5: 5000,
};

/** Multiplicador Jackpot opcional (5 acertos) */
export const JACKPOT_MULTIPLIER = 100000;

/** Indica se os dados abaixo são simulados ou reais - AGORA SEMPRE FALSE */
export const DATA_IS_SIMULATED = false;

export interface Draw {
  id      : string;       // ex: "2026-120-K"
  date    : string;       // ISO "YYYY-MM-DD"
  time?   : string;       // ex: "10:00" | "18:00"
  session?: 'fezada' | 'kazola' | 'aqueceu' | 'eskebra';  // ALTERADO: adicionados 'aqueceu' e 'eskebra'
  numbers : number[];     // 5 números ordenados 1–90
}

// Array vazio - os dados vêm da API real
export const DRAWS: Draw[] = [];

// ── Funções Estatísticas ─────────────────────────────────────────────────────

export function computeFrequency(draws: Draw[]) {
  const freq = new Array(TOTAL_NUMBERS + 1).fill(0) as number[];
  for (const d of draws) for (const n of d.numbers) freq[n]++;
  return { freq, total: draws.length };
}

export function hotColdRanking(draws: Draw[], window: number, topN = 8) {
  const { freq } = computeFrequency(draws.slice(0, window));
  const pairs = Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({ n: i + 1, c: freq[i + 1] }));
  pairs.sort((a, b) => b.c - a.c);
  return {
    hot:  pairs.slice(0, topN).map(p => p.n),
    cold: pairs.slice(-topN).reverse().map(p => p.n),
  };
}

export function gapAnalysis(draws: Draw[]) {
  const last = new Array(TOTAL_NUMBERS + 1).fill(Infinity) as number[];
  for (let i = 0; i < draws.length; i++)
    for (const n of draws[i].numbers)
      if (last[n] === Infinity) last[n] = i;
  return Array.from({ length: TOTAL_NUMBERS }, (_, i) => ({
    n:   i + 1,
    gap: last[i + 1] === Infinity ? draws.length : last[i + 1],
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
  let pairs = 0, odds = 0;
  for (const d of draws) for (const n of d.numbers) n % 2 === 0 ? pairs++ : odds++;
  return { pairs, odds };
}

export function decadeStats(draws: Draw[]) {
  const decades = new Array(9).fill(0) as number[];
  for (const d of draws) for (const n of d.numbers) decades[Math.floor((n - 1) / 10)]++;
  return decades.map((count, i) => ({ label: `${i * 10 + 1}–${i * 10 + 10}`, count }));
}

export function calcPrize(betKz: number, option: 2|3|4|5, hit: boolean): number {
  if (!hit) return 0;
  const gross = betKz * MULTIPLIERS[option];
  if (gross <= TAX_FREE_KZ) return gross;
  return TAX_FREE_KZ + (gross - TAX_FREE_KZ) * (1 - TAX_RATE);
}
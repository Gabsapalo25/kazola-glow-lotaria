/**
 * generator.ts — Gerador de combinações Loto 5/90
 * ================================================
 * AVISO: ferramenta educativa. Nenhuma estratégia altera
 * as probabilidades reais do sorteio.
 * 
 * v2.0 — Substituído Aleatório por Kazola V4-D
 * Benchmark: 54.3% (≥2 acertos) vs 48.6% do aleatório antigo
 */

import { TOTAL_NUMBERS, PICK_SIZE } from '../data/history';

export type GenerationStrategy =
  | 'equilibrado'
  | 'frequencia'
  | 'montecarlo'
  | 'kazola';  // ← substitui 'aleatorio'

export interface Filter {
  exclude    : number[];
  parityBias : 'nenhum' | 'equilibrado' | 'par' | 'impar';
  sumRange?  : [number, number];
}

// 5 faixas de 18 números para cobertura equilibrada
const BALANCED_BANDS: [number, number][] = [
  [1, 18], [19, 36], [37, 54], [55, 72], [73, 90],
];

// ============================================================================
// KAZOLA V4-D — Motor principal (substitui o Aleatório)
// ============================================================================

/**
 * Kazola V4-D: Combina cobertura por faixas + penalização dinâmica + anti-partilha
 * Performance no benchmark: 54.3% (≥2 acertos) vs Aleatório (48.6%)
 */

function weightedChoice<T>(items: { value: T; weight: number }[]): T {
  if (items.length === 0) throw new Error('No items to choose from');
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function scoreAntiPartilha(nums: number[]): number {
  let score = 0;
  for (const n of nums) {
    if (n <= 31) score += 1.5;
    if (n % 5 === 0) score += 0.5;
    if ([7, 13, 42, 69].includes(n)) score += 1.0;
  }
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i + 1] - nums[i] === 1) score += 1.0;
  }
  return score;
}

function gerarKazolaV4D(
  weights: number[],
  exclude: number[],
  quantidade: number = 5,
  diversidadeGlobal: number = 0.5,
  tentativasMax: number = 1000
): number[][] {
  const linhas: number[][] = [];
  const contagemUso: Record<number, number> = {};
  for (let i = 1; i <= TOTAL_NUMBERS; i++) contagemUso[i] = 0;

  for (let tentativa = 0; tentativa < tentativasMax && linhas.length < quantidade; tentativa++) {
    const progresso = linhas.length / quantidade;
    const diversidadeLinha = diversidadeGlobal * (1.0 - progresso * 0.5);

    const comb: number[] = [];

    for (const [lo, hi] of BALANCED_BANDS) {
      const candidatos: { value: number; weight: number }[] = [];

      for (let n = lo; n <= hi; n++) {
        if (exclude.includes(n)) continue;
        let peso = 1.0;

        // Penaliza números já usados (diversidade)
        if (diversidadeLinha > 0 && contagemUso[n] > 0) {
          const penalizacao = 1.0 + contagemUso[n] * diversidadeLinha * 2.0;
          peso = peso / penalizacao;
        }

        // Peso adicional baseado nos weights históricos (se disponíveis)
        if (weights && weights[n]) {
          peso = peso * (0.5 + weights[n] * 0.5);
        }

        candidatos.push({ value: n, weight: Math.max(peso, 0.01) });
      }

      if (candidatos.length === 0) continue;
      const escolhido = weightedChoice(candidatos);
      comb.push(escolhido);
    }

    if (comb.length !== PICK_SIZE) continue;

    comb.sort((a, b) => a - b);

    // Filtro de soma (160-300)
    const soma = comb.reduce((a, b) => a + b, 0);
    if (soma < 160 || soma > 300) continue;

    linhas.push([...comb]);
    for (const n of comb) contagemUso[n]++;
  }

  // Se não gerou linhas suficientes, completa com aleatório simples
  while (linhas.length < quantidade) {
    const pool = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1)
      .filter(n => !exclude.includes(n));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const comb = pool.slice(0, PICK_SIZE).sort((a, b) => a - b);
    linhas.push(comb);
  }

  // Aplica filtro anti-partilha (remove combinações com score muito alto)
  if (diversidadeGlobal > 0.3 && linhas.length > quantidade) {
    const comScore = linhas.map(l => ({ comb: l, score: scoreAntiPartilha(l) }));
    comScore.sort((a, b) => a.score - b.score);
    const cutoff = Math.floor(comScore.length * 0.7);
    const selecionadas = comScore.slice(0, cutoff);
    for (let i = selecionadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selecionadas[i], selecionadas[j]] = [selecionadas[j], selecionadas[i]];
    }
    return selecionadas.slice(0, quantidade).map(s => s.comb);
  }

  return linhas.slice(0, quantidade);
}

// ============================================================================
// Gerador principal
// ============================================================================

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

/**
 * Gera uma única linha de números baseada na estratégia escolhida
 * @param weights - Array de pesos para cada número (1-90)
 * @param strategy - Estratégia de geração
 * @param filter - Filtros de exclusão, paridade e soma
 * @param maxAttempts - Número máximo de tentativas
 * @returns Linha de números ou null
 */
export function generateLine(
  weights    : number[],
  strategy   : GenerationStrategy,
  filter     : Filter,
  maxAttempts = 200,
): { numbers: number[] } | null {

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let nums: number[] = [];

    if (strategy === 'kazola') {
      // KAZOLA V4-D — substitui o antigo aleatório
      const linhas = gerarKazolaV4D(weights, filter.exclude, 5);
      if (linhas.length > 0) {
        // Escolhe uma linha aleatória entre as 5 geradas
        const idx = Math.floor(Math.random() * linhas.length);
        nums = linhas[idx];
      }

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

/**
 * Probabilidades teóricas Loto 5/90 — C(90,5) = 43.949.268
 */
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
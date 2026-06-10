/**
 * generator.ts — Gerador de combinações Loto 5/90
 * ================================================
 * AVISO: ferramenta educativa. Nenhuma estratégia altera
 * as probabilidades reais do sorteio.
 *
 * v3.0 — Suporte a modalidades Chance 2/3/4/5
 * Cada modalidade gera o número correcto de números (2, 3, 4 ou 5)
 * usando o histórico real como base de pesos.
 */

import { TOTAL_NUMBERS, PICK_SIZE, NUMBERS_PER_CHANCE } from '../data/history';

export type GenerationStrategy =
  | 'equilibrado'
  | 'frequencia'
  | 'montecarlo'
  | 'kazola';

export type Modalidade = 'chance2' | 'chance3' | 'chance4' | 'chance5';

export interface Filter {
  exclude    : number[];
  parityBias : 'nenhum' | 'equilibrado' | 'par' | 'impar';
  sumRange?  : [number, number];
  modalidade?: Modalidade; // ← NOVO: define quantos números gerar
}

// ============================================================================
// FAIXAS POR MODALIDADE
// Distribuímos os 90 números em N faixas conforme a modalidade,
// para garantir cobertura equilibrada do espectro 1-90.
// ============================================================================

function getBands(n: number): [number, number][] {
  // Divide 1-90 em n faixas o mais iguais possível
  const size = Math.floor(90 / n);
  const bands: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const lo = i * size + 1;
    const hi = i === n - 1 ? 90 : (i + 1) * size;
    bands.push([lo, hi]);
  }
  return bands;
}

// Faixas pré-calculadas por modalidade
const BANDS_BY_MODALIDADE: Record<Modalidade, [number, number][]> = {
  chance2: getBands(2), // [1-45], [46-90]
  chance3: getBands(3), // [1-30], [31-60], [61-90]
  chance4: getBands(4), // [1-22], [23-45], [46-67], [68-90]
  chance5: getBands(5), // [1-18], [19-36], [37-54], [55-72], [73-90]
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

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

function checkParity(nums: number[], bias: Filter['parityBias'], pickSize: number): boolean {
  if (bias === 'nenhum') return true;
  const evens = nums.filter(n => n % 2 === 0).length;
  const odds  = pickSize - evens;
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

// Intervalo de soma esperado por modalidade (baseado em distribuição uniforme)
// Média teórica = (1+90)/2 * k = 45.5 * k
// Usamos ±35% de margem
function getSumRange(k: number): [number, number] {
  const mean = 45.5 * k;
  const margin = mean * 0.35;
  return [Math.round(mean - margin), Math.round(mean + margin)];
}

// ============================================================================
// KAZOLA V4-D — Motor principal, adaptado por modalidade
// ============================================================================

function gerarKazolaV4D(
  weights       : number[],
  exclude       : number[],
  modalidade    : Modalidade,
  quantidade    : number = 5,
  diversidade   : number = 0.5,
  tentativasMax : number = 1000,
): number[][] {
  const pickSize = NUMBERS_PER_CHANCE[modalidade];
  const bands    = BANDS_BY_MODALIDADE[modalidade];
  const sumRange = getSumRange(pickSize);

  const linhas: number[][] = [];
  const contagemUso: Record<number, number> = {};
  for (let i = 1; i <= TOTAL_NUMBERS; i++) contagemUso[i] = 0;

  for (let tentativa = 0; tentativa < tentativasMax && linhas.length < quantidade; tentativa++) {
    const progresso      = linhas.length / quantidade;
    const diversidadeLinha = diversidade * (1.0 - progresso * 0.5);
    const comb: number[] = [];

    for (const [lo, hi] of bands) {
      const candidatos: { value: number; weight: number }[] = [];

      for (let n = lo; n <= hi; n++) {
        if (exclude.includes(n)) continue;
        let peso = 1.0;

        // Penaliza números já usados para diversidade entre linhas
        if (diversidadeLinha > 0 && contagemUso[n] > 0) {
          peso /= 1.0 + contagemUso[n] * diversidadeLinha * 2.0;
        }

        // Peso baseado no histórico real (frequência de aparição)
        if (weights?.[n]) {
          peso *= 0.5 + weights[n] * 0.5;
        }

        candidatos.push({ value: n, weight: Math.max(peso, 0.01) });
      }

      if (candidatos.length === 0) continue;
      comb.push(weightedChoice(candidatos));
    }

    if (comb.length !== pickSize) continue;

    comb.sort((a, b) => a - b);

    // Filtro de soma razoável (evita combinações extremas)
    const soma = comb.reduce((a, b) => a + b, 0);
    if (soma < sumRange[0] || soma > sumRange[1]) continue;

    linhas.push([...comb]);
    for (const n of comb) contagemUso[n]++;
  }

  // Fallback: completa com amostragem simples se não atingiu quantidade
  while (linhas.length < quantidade) {
    const pool = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1)
      .filter(n => !exclude.includes(n));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    linhas.push(pool.slice(0, pickSize).sort((a, b) => a - b));
  }

  // Anti-partilha: remove combinações com números "populares" demais
  if (diversidade > 0.3 && linhas.length > quantidade) {
    const comScore = linhas.map(l => ({ comb: l, score: scoreAntiPartilha(l) }));
    comScore.sort((a, b) => a.score - b.score);
    const cutoff = Math.floor(comScore.length * 0.7);
    const sel = comScore.slice(0, cutoff);
    for (let i = sel.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sel[i], sel[j]] = [sel[j], sel[i]];
    }
    return sel.slice(0, quantidade).map(s => s.comb);
  }

  return linhas.slice(0, quantidade);
}

// ============================================================================
// GERADOR PRINCIPAL — exportado para uso em toda a app
// ============================================================================

/**
 * Gera uma única linha de números baseada na estratégia e modalidade escolhidas.
 *
 * @param weights    Array de pesos históricos para cada número (1-90)
 * @param strategy   Estratégia de geração
 * @param filter     Filtros (exclude, parityBias, sumRange, modalidade)
 * @param maxAttempts Número máximo de tentativas internas
 * @returns { numbers: number[] } ou null se não conseguir gerar
 */
export function generateLine(
  weights     : number[],
  strategy    : GenerationStrategy,
  filter      : Filter,
  maxAttempts = 200,
): { numbers: number[] } | null {

  const modalidade = filter.modalidade ?? 'chance5';
  const pickSize   = NUMBERS_PER_CHANCE[modalidade];
  const bands      = BANDS_BY_MODALIDADE[modalidade];
  const sumRange   = filter.sumRange ?? getSumRange(pickSize);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let nums: number[] = [];

    // ── KAZOLA V4-D ─────────────────────────────────────────────────────────
    if (strategy === 'kazola') {
      const linhas = gerarKazolaV4D(weights, filter.exclude, modalidade, 5);
      if (linhas.length > 0) {
        nums = linhas[Math.floor(Math.random() * linhas.length)];
      }

    // ── EQUILIBRADO ─────────────────────────────────────────────────────────
    } else if (strategy === 'equilibrado') {
      // Um número por cada faixa, seleccionado com peso histórico
      for (const [lo, hi] of bands) {
        const candidatos: { value: number; weight: number }[] = [];
        for (let n = lo; n <= hi; n++) {
          if (filter.exclude.includes(n)) continue;
          candidatos.push({ value: n, weight: Math.max(weights[n] ?? 1, 0.01) });
        }
        if (candidatos.length === 0) continue;
        nums.push(weightedChoice(candidatos));
      }
      nums.sort((a, b) => a - b);

    // ── FREQUÊNCIA ──────────────────────────────────────────────────────────
    } else if (strategy === 'frequencia') {
      // Amostragem ponderada pelos pesos históricos, sem reposição
      nums = weightedSample(weights, pickSize, filter.exclude);

    // ── MONTE CARLO ─────────────────────────────────────────────────────────
    } else if (strategy === 'montecarlo') {
      // Pesos históricos + ruído gaussiano (Box-Muller)
      const noisy = [...weights];
      for (let i = 1; i <= TOTAL_NUMBERS; i++) {
        const u = 1 - Math.random(), v = Math.random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        noisy[i] = Math.max((weights[i] ?? 1) + z * 0.5, 0.01);
      }
      nums = weightedSample(noisy, pickSize, filter.exclude);
    }

    // ── Validações ──────────────────────────────────────────────────────────
    if (
      nums.length === pickSize &&
      checkParity(nums, filter.parityBias, pickSize) &&
      checkSum(nums, sumRange)
    ) {
      return { numbers: nums };
    }
  }

  return null;
}

// ============================================================================
// PROBABILIDADES TEÓRICAS
// ============================================================================

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

/**
 * Probabilidades teóricas por modalidade
 * Probabilidade de acertar todos os números escolhidos
 */
export function probabilityByModalidade(modalidade: Modalidade) {
  const C = (n: number, k: number): number => {
    if (k === 0 || k === n) return 1;
    let r = 1;
    for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
    return Math.round(r);
  };

  const k = NUMBERS_PER_CHANCE[modalidade];
  // P(acertar k números entre os 5 sorteados de 90) = C(5,k) * C(85, k-k) / C(90,k)
  // Simplificado: probabilidade de acerto total
  const total = C(90, k);
  const favoraveis = C(5, k);
  return {
    total,
    probAcertoTotal: favoraveis / total,
    odds: Math.round(total / favoraveis),
  };
}
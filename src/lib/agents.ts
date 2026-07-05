// src/lib/agents.ts
// ============================================================
// KAZOLAGLOW — SISTEMA DE 10 AGENTES INTELIGENTES
// Versão 1.5 | Junho 2026 — Totalmente Integrado com a UI
// ============================================================
import { NUMBERS_PER_CHANCE, Modalidade } from '../data/history';

export interface AgentVote {
  agentId: number;
  agentName: string;
  score: number;
  approved: boolean;
  reason: string;
}

export interface AgentResult {
  votes: AgentVote[];
  totalScore: number;
  approved: boolean;
  confidence: 'baixa' | 'media' | 'alta';
  summary: string;
  layerBreakdown: {
    layer1: number;
    layer2: number;
    layer3: number;
    layer4: number;
  };
}

export interface UserHistory {
  totalSessions: number;
  sessionsByModalidade: Record<Modalidade, number>;
  hitsByModalidade: Record<Modalidade, number>;
}

export interface RunAgentsParams {
  nums: number[];
  modalidade: Modalidade;
  stakePerLine?: number;
  bankroll?: number; // Mantido por compatibilidade
  userHistory?: UserHistory | null;
  orcamento?: number; // 🔥 O valor real vindo dos sliders da UI
}

// ============================================================
// CONSTANTES
// ============================================================
const BANDS: Record<Modalidade, [number, number][]> = {
  chance2: [[1, 45], [46, 90]],
  chance3: [[1, 30], [31, 60], [61, 90]],
  chance4: [[1, 22], [23, 45], [46, 67], [68, 90]],
  chance5: [[1, 18], [19, 36], [37, 54], [55, 72], [73, 90]],
};

const SUM_RANGES: Record<Modalidade, [number, number]> = {
  chance2: [59, 123],
  chance3: [88, 184],
  chance4: [118, 246],
  chance5: [148, 306],
};

const APPROVAL_THRESHOLDS: Record<Modalidade, number> = {
  chance2: 55,
  chance3: 60,
  chance4: 65,
  chance5: 68,
};

const AGENT_WEIGHTS: Record<number, number> = {
  1: 0.12, 2: 0.17, 3: 0.13, 4: 0.15, 5: 0.12, 6: 0.12,
  7: 0.07, 8: 0.07, 9: 0.05,
};

// ============================================================
// AGENTES 1 A 9
// ============================================================
function agent1Selector(orcamento: number, userHistory: UserHistory | null, modalidadeAtual?: Modalidade): AgentVote {
  const agentId = 1;
  const agentName = 'Selector de Modalidade';
  if (!userHistory || userHistory.totalSessions < 5) {
    return { agentId, agentName, score: 7, approved: true, reason: 'Dados insuficientes. Recomendação neutra (modalidade moderada).' };
  }
  let score = 8;
  let reason = `Recomenda manutenção da modalidade atual (${modalidadeAtual || 'atual'}).`;
  if (orcamento < 500) {
    score = 6;
    reason = 'Orçamento baixo + histórico fraco → Chance 2 recomendada para recuperação.';
  } else if (orcamento >= 1000 && (userHistory.hitsByModalidade.chance5 || 0) > 2) {
    score = 9;
    reason = 'Orçamento alto + bom histórico em Chance 5 → Avançar.';
  }
  return { agentId, agentName, score, approved: score >= 6, reason };
}

function agent2Bands(nums: number[], modalidade: Modalidade): AgentVote {
  const agentId = 2;
  const agentName = 'Gerador de Faixas';
  const bands = BANDS[modalidade];
  const covered = new Set<number>();
  for (const num of nums) {
    for (let i = 0; i < bands.length; i++) {
      const [lo, hi] = bands[i];
      if (num >= lo && num <= hi) { covered.add(i); break; }
    }
  }
  const missing = bands.length - covered.size;
  const score = Math.max(0, 10 - missing * 1.8);
  return {
    agentId, agentName, score,
    approved: missing === 0,
    reason: missing === 0 ? '✅ Cobertura completa de faixas' : `Faltam ${missing} faixa(s). Cobertura insuficiente.`,
  };
}

function agent3AntiPatterns(nums: number[]): AgentVote {
  const agentId = 3;
  const agentName = 'Anti-Padrões Humanos';
  let penalty = 0;
  if (nums.filter(n => n <= 31).length >= 3) penalty += 3;
  let consec = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i + 1] - nums[i] === 1) consec++;
  }
  if (consec >= 2) penalty += 4;
  if (nums.filter(n => n % 5 === 0).length >= 3) penalty += 3;
  const lucky = [7, 13, 21, 42, 69, 77, 88];
  if (nums.filter(n => lucky.includes(n)).length >= 2) penalty += 2;
  const score = Math.max(0, 10 - penalty);
  return {
    agentId, agentName, score,
    approved: score >= 6,
    reason: score >= 8 ? '✅ Baixa densidade de padrões humanos' : score >= 6 ? '⚠️ Alguns padrões detectados' : '❌ Alta densidade de padrões humanos (risco de partilha)',
  };
}

function agent4Sum(nums: number[], modalidade: Modalidade): AgentVote {
  const agentId = 4;
  const agentName = 'Auditor de Soma';
  const [min, max] = SUM_RANGES[modalidade];
  const sum = nums.reduce((a, b) => a + b, 0);
  const center = (min + max) / 2;
  const distance = Math.abs(sum - center) / center;
  if (sum < min || sum > max) {
    return { agentId, agentName, score: 3, approved: false, reason: `Soma ${sum} fora do intervalo [${min}-${max}]` };
  }
  const score = distance > 0.25 ? 7 : 10;
  return { agentId, agentName, score, approved: true, reason: score === 10 ? '✅ Soma ideal' : `Soma ${sum} aceitável (próxima do limite)` };
}

// Correção sutil de tipagem interna para evitar crashes locais
function agent5Parity(nums: number[], modalidade: Modalidade): AgentVote {
  const agentId = 5;
  const agentName = 'Auditor de Paridade';
  const pickSize = NUMBERS_PER_CHANCE[modalidade] || nums.length;
  const evens = nums.filter(n => n % 2 === 0).length;
  const odds = pickSize - evens;
  const ideals: Record<Modalidade, { min: number; max: number }> = {
    chance2: { min: 1, max: 1 },
    chance3: { min: 1, max: 2 },
    chance4: { min: 2, max: 2 },
    chance5: { min: 2, max: 3 },
  };
  const ideal = ideals[modalidade] || { min: 1, max: 4 };
  const score = (evens >= ideal.min && evens <= ideal.max) ? 10 : 4;
  return {
    agentId, agentName, score,
    approved: score >= 6,
    reason: score === 10 ? '✅ Paridade equilibrada' : `Distribuição extrema: ${evens} pares, ${odds} ímpares`,
  };
}

function agent6Gap(nums: number[]): AgentVote {
  const agentId = 6;
  const agentName = 'Auditor de Gap';
  if (nums.length < 2) return { agentId, agentName, score: 7, approved: true, reason: 'Poucos números para análise' };
  const gaps: number[] = [];
  for (let i = 0; i < nums.length - 1; i++) gaps.push(nums[i + 1] - nums[i]);
  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);
  const uniform = maxGap - minGap <= 2;
  let score = 10;
  if (minGap <= 1) score -= 3.5;
  if (maxGap > 40) score -= 2.5;
  if (uniform && gaps.length > 3) score -= 2;
  score = Math.max(0, score);
  return {
    agentId, agentName, score,
    approved: score >= 6,
    reason: score >= 8 ? '✅ Espaçamento equilibrado' : '⚠️ Agrupamentos ou dispersão excessiva detectada',
  };
}

function agent7ExpectedValue(modalidade: Modalidade, nums: number[] = []): AgentVote {
  const agentId = 7;
  const agentName = 'Valor Esperado / Partilha';
  const popularNumbers = [7, 13, 21, 42, 69, 77, 88];
  const popularCount = nums.filter(n => popularNumbers.includes(n)).length;
  let score = modalidade === 'chance2' ? 8 : modalidade === 'chance3' ? 7 : modalidade === 'chance4' ? 6 : 5;
  if (popularCount >= 2) score -= 1;
  return {
    agentId, agentName,
    score: Math.max(5, score),
    approved: true,
    reason: `EV negativo esperado. ${popularCount > 1 ? 'Atenção a números populares (risco de partilha).' : 'Estrutura ok para partilha.'}`,
  };
}

// 🔥 CORRIGIDO: Agora calcula estritamente com base no Orçamento Ativo da UI
function agent8Kelly(modalidade: Modalidade, stakePerLine: number, bankroll: number): AgentVote {
  const agentId = 8;
  const agentName = 'Gestor de Banca (Kelly)';
  const stakePct = bankroll > 0 ? (stakePerLine / bankroll) : 0.02;
  let score = 10;
  let reason = `✅ Gestão conservadora da banca (${(stakePct * 100).toFixed(2)}%)`;
  
  if (stakePct > 0.10) { 
    score = 3; 
    reason = `❌ Exposição excessiva (${(stakePct * 100).toFixed(2)}% do orçamento)`; 
  } else if (stakePct > 0.05) { 
    score = 6; 
    reason = `⚠️ Exposição moderada-alta (${(stakePct * 100).toFixed(2)}% do orçamento)`; 
  } else if (stakePct > 0.02) { 
    score = 8; 
    reason = `⚠️ Gestão moderada (${(stakePct * 100).toFixed(2)}% do orçamento)`; 
  }
  return { agentId, agentName, score, approved: score >= 5, reason };
}

function agent9PersonalPerformance(modalidade: Modalidade, userHistory: UserHistory | null): AgentVote {
  const agentId = 9;
  const agentName = 'Performance Pessoal';
  if (!userHistory || !userHistory.sessionsByModalidade || !userHistory.sessionsByModalidade[modalidade] || userHistory.sessionsByModalidade[modalidade] < 30) {
    return { agentId, agentName, score: 5, approved: true, reason: 'Sessões insuficientes (<30) → Pontuação neutra' };
  }
  const sessions = userHistory.sessionsByModalidade[modalidade];
  const hits = userHistory.hitsByModalidade[modalidade] || 0;
  const rate = hits / sessions;
  let score = 5;
  let reason = `Taxa de acerto: ${Math.round(rate * 100)}% em ${sessions} sessões`;
  if (rate > 0.18) { score = 9; reason = '✅ Excelente performance ' + reason; }
  else if (rate > 0.10) { score = 7; reason = '✅ Boa performance ' + reason; }
  else if (rate > 0.05) { score = 5; reason = '⚠️ Performance média ' + reason; }
  else { score = 3; reason = '⚠️ Performance abaixo da média ' + reason; }
  return { agentId, agentName, score, approved: true, reason };
}

// ============================================================
// AGENTE 10 — Orquestrador
// ============================================================
function agent10Orchestrator(votes: AgentVote[], modalidade: Modalidade): AgentVote {
  const agentId = 10;
  const agentName = 'Orquestrador';
  let weightedSum = 0;
  let totalWeight = 0;
  votes.forEach(vote => {
    const weight = AGENT_WEIGHTS[vote.agentId] || 0.1;
    weightedSum += vote.score * weight * 10;
    totalWeight += weight;
  });
  const totalScore = Math.round(weightedSum / totalWeight);
  const threshold = APPROVAL_THRESHOLDS[modalidade] || 60;
  const approved = totalScore >= threshold;
  const rejected = votes.filter(v => !v.approved);
  const summary = approved
    ? (rejected.length === 0 ? '✅ Aprovado por todos os agentes!' : `⚠️ Aprovado apesar de ${rejected.length} ressalvas`)
    : `❌ Rejeitado por ${rejected.length} agente(s)`;
  return {
    agentId,
    agentName,
    score: totalScore,
    approved,
    reason: summary + ` (threshold: ${threshold}/100)`
  };
}

// ============================================================
// FUNÇÃO PRINCIPAL — TOTALMENTE SINCRONIZADA COM A UI
// ============================================================
export function runAgents(params: RunAgentsParams): AgentResult {
  const {
    nums, 
    modalidade, 
    stakePerLine = 100, 
    bankroll,
    orcamento,
    userHistory = null
  } = params;

  // 🔥 SOLUÇÃO DA CABLAGEM: Se 'orcamento' foi passado pela UI, ele assume o papel de bankroll ativo.
  // Caso contrário, tenta usar o bankroll clássico ou o fallback de segurança de 3500 Kz.
  const orcamentoEfetivo = orcamento !== undefined ? orcamento : (bankroll !== undefined ? bankroll : 3500);
  const stakeEfetiva = stakePerLine;

  const sortedNums = [...nums].sort((a, b) => a - b);

  const votes: AgentVote[] = [
    agent1Selector(orcamentoEfetivo, userHistory, modalidade),
    agent2Bands(sortedNums, modalidade),
    agent3AntiPatterns(sortedNums),
    agent4Sum(sortedNums, modalidade),
    agent5Parity(sortedNums, modalidade),
    agent6Gap(sortedNums),
    agent7ExpectedValue(modalidade, sortedNums),
    // 🔥 Agora passa os valores dinâmicos reais da UI sem falhas!
    agent8Kelly(modalidade, stakeEfetiva, orcamentoEfetivo),
    agent9PersonalPerformance(modalidade, userHistory),
  ];

  const layerScores = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const layerCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

  votes.forEach(v => {
    let layer = 1;
    if (v.agentId >= 4 && v.agentId <= 6) layer = 2;
    else if (v.agentId >= 7 && v.agentId <= 8) layer = 3;
    else if (v.agentId === 9) layer = 4;

    layerScores[layer] += v.score;
    layerCounts[layer]++;
  });

  const orchestrator = agent10Orchestrator(votes, modalidade);
  votes.push(orchestrator);

  const layerBreakdown = {
    layer1: layerCounts[1] ? Math.round((layerScores[1] / layerCounts[1]) * 10) / 10 : 0,
    layer2: layerCounts[2] ? Math.round((layerScores[2] / layerCounts[2]) * 10) / 10 : 0,
    layer3: layerCounts[3] ? Math.round((layerScores[3] / layerCounts[3]) * 10) / 10 : 0,
    layer4: layerCounts[4] ? Math.round((layerScores[4] / layerCounts[4]) * 10) / 10 : 0,
  };

  const confidence = orchestrator.score >= 80 ? 'alta' : orchestrator.score >= 65 ? 'media' : 'baixa';

  return {
    votes,
    totalScore: orchestrator.score,
    approved: orchestrator.approved,
    confidence,
    summary: orchestrator.reason,
    layerBreakdown,
  };
}

// ============================================================
// RELATÓRIO
// ============================================================
export function formatVoteReport(result: AgentResult): string {
  let report = '════════════════════════════════════════════════════════════\n';
  report += `📊 RELATÓRIO DE VOTAÇÃO — SCORE: ${result.totalScore}/100\n`;
  report += `📌 STATUS: ${result.approved ? '✅ APROVADO' : '❌ REJEITADO'}\n`;
  report += `🎯 CONFIANÇA: ${result.confidence.toUpperCase()}\n`;
  report += `📝 ${result.summary}\n`;
  report += '────────────────────────────────────────────────────────────\n\n';
  report += '📈 BREAKDOWN POR CAMADA:\n';
  report += `   Camada 1 (Adaptativa): ${result.layerBreakdown.layer1}/10\n`;
  report += `   Camada 2 (Estatística): ${result.layerBreakdown.layer2}/10\n`;
  report += `   Camada 3 (Financeira): ${result.layerBreakdown.layer3}/10\n`;
  report += `   Camada 4 (Pessoal): ${result.layerBreakdown.layer4}/10\n`;
  report += '────────────────────────────────────────────────────────────\n\n';
  report += '📋 VOTOS DETALHADOS:\n';
  result.votes.forEach(v => {
    const icon = v.approved ? '✅' : '❌';
    const scale = v.agentId === 10 ? '100' : '10';
    report += `${icon} Agente ${v.agentId} (${v.agentName}): ${v.score}/${scale}\n`;
    report += `   └─ ${v.reason}\n\n`;
  });
  report += '════════════════════════════════════════════════════════════\n';
  return report;
}
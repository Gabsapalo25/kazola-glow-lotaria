// ============================================================
// PARTE EXISTENTE (MANTIDA EXATAMENTE IGUAL)
// ============================================================
export interface Acerto {
  data: string;
  estrategia: string;
  acertos: number;
}

export function registrarAcerto(estrategia: string, acertos: number) {
  const historico: Acerto[] = JSON.parse(localStorage.getItem('kazola_acertos') || '[]');
  historico.unshift({ data: new Date().toISOString(), estrategia, acertos });
  localStorage.setItem('kazola_acertos', JSON.stringify(historico.slice(0, 500)));
}

export function taxaAcertos(estrategia: string): number {
  const historico: Acerto[] = JSON.parse(localStorage.getItem('kazola_acertos') || '[]');
  const filtrados = historico.filter(h => h.estrategia === estrategia);
  if (filtrados.length === 0) return 0;
  const com2Mais = filtrados.filter(h => h.acertos >= 2).length;
  return (com2Mais / filtrados.length) * 100;
}

// ============================================================
// NOVAS FUNÇÕES (ADICIONAR ABAIXO)
// ============================================================

export interface ValidationRecordDetalhada {
  id: string;
  date: string;
  strategy: string;
  hits: number;
  lines: number;
  drawnNumbers: number[];
  stakePerLine?: number;
  winAmount?: number;
}

export interface ApostaRegistada {
  id: string;
  data: string;
  hora: string;
  numeros: number[];
  sessao: string;
  valor: number;
  notas?: string;
  verificado?: boolean;
  acertos?: number;
  premio?: number;
  status?: 'pendente' | 'ganho' | 'perdido';
}

// Multiplicadores oficiais
const MULTIPLIERS: Record<number, number> = { 2: 10, 3: 120, 4: 5000, 5: 100000 };

// ============================================================
// PERFORMANCE DETALHADA (NOVO)
// ============================================================

export function savePerformanceDetalhada(
  strategy: string, 
  hits: number, 
  lines: number, 
  drawnNumbers: number[], 
  stakePerLine: number = 100
) {
  const history: ValidationRecordDetalhada[] = JSON.parse(localStorage.getItem('kazola_performance_detalhada') || '[]');
  
  const winAmount = hits >= 2 ? stakePerLine * (MULTIPLIERS[hits] || 0) : 0;
  
  history.unshift({ 
    id: Date.now().toString(), 
    date: new Date().toISOString(), 
    strategy, 
    hits, 
    lines, 
    drawnNumbers,
    stakePerLine,
    winAmount
  });
  
  localStorage.setItem('kazola_performance_detalhada', JSON.stringify(history.slice(0, 500)));
  
  // Também manter o sistema antigo para compatibilidade
  registrarAcerto(strategy, hits);
}

export function getPerformanceDetalhada() {
  const history: ValidationRecordDetalhada[] = JSON.parse(localStorage.getItem('kazola_performance_detalhada') || '[]');
  
  const byStrategy: Record<string, { total: number; wins: number; winRate: number; totalWin: number; linesPlayed: number }> = {};
  
  for (const record of history) {
    const strat = record.strategy;
    if (!byStrategy[strat]) {
      byStrategy[strat] = { total: 0, wins: 0, winRate: 0, totalWin: 0, linesPlayed: 0 };
    }
    byStrategy[strat].total++;
    byStrategy[strat].linesPlayed += record.lines;
    if (record.hits >= 2) {
      byStrategy[strat].wins++;
      byStrategy[strat].totalWin += record.winAmount || 0;
    }
    byStrategy[strat].winRate = (byStrategy[strat].wins / byStrategy[strat].total) * 100;
  }
  
  const kazola = byStrategy['kazola'] || { total: 0, wins: 0, winRate: 0, totalWin: 0, linesPlayed: 0 };
  
  return { kazola, byStrategy, totalRecords: history.length };
}

// ============================================================
// GESTÃO DE APOSTAS (NOVO)
// ============================================================

export function getAllApostas(): ApostaRegistada[] {
  const apostas = localStorage.getItem('kazola_apostas');
  return apostas ? JSON.parse(apostas) : [];
}

export function saveAposta(aposta: ApostaRegistada) {
  const apostas = getAllApostas();
  const exists = apostas.findIndex(a => a.id === aposta.id);
  if (exists >= 0) {
    apostas[exists] = aposta;
  } else {
    apostas.unshift(aposta);
  }
  localStorage.setItem('kazola_apostas', JSON.stringify(apostas));
  return apostas;
}

export function deleteAposta(id: string) {
  const apostas = getAllApostas();
  const filtradas = apostas.filter(a => a.id !== id);
  localStorage.setItem('kazola_apostas', JSON.stringify(filtradas));
  return filtradas;
}

// ============================================================
// CONFERÊNCIA AUTOMÁTICA (NOVO)
// ============================================================

export interface Draw {
  id: string;
  date: string;
  time?: string;
  numbers: number[];
  session?: string;
}

export function conferirApostaComSorteios(aposta: ApostaRegistada, draws: Draw[]): ApostaRegistada {
  const dataAposta = new Date(aposta.data).toLocaleDateString('pt-AO');
  
  const sorteioCorrespondente = draws.find(draw => {
    const dataDraw = new Date(draw.date).toLocaleDateString('pt-AO');
    const mesmaData = dataAposta === dataDraw;
    const mesmaSessao = !aposta.sessao || 
      draw.session?.toLowerCase() === aposta.sessao.toLowerCase() ||
      (aposta.sessao.toLowerCase() === 'fezada' && draw.session === 'fezada') ||
      (aposta.sessao.toLowerCase() === 'kazola' && draw.session === 'kazola');
    
    return mesmaData && mesmaSessao;
  });
  
  if (!sorteioCorrespondente) {
    return { ...aposta, status: 'pendente', verificado: false };
  }
  
  const acertos = aposta.numeros.filter(n => sorteioCorrespondente.numbers.includes(n)).length;
  const premio = acertos >= 2 ? aposta.valor * (MULTIPLIERS[acertos] || 0) : 0;
  
  return {
    ...aposta,
    acertos,
    premio,
    status: premio > 0 ? 'ganho' : 'perdido',
    verificado: true
  };
}

export function conferirTodasApostas(draws: Draw[]): ApostaRegistada[] {
  const apostas = getAllApostas();
  const atualizadas = apostas.map(aposta => {
    if (aposta.status === 'pendente' || !aposta.verificado) {
      return conferirApostaComSorteios(aposta, draws);
    }
    return aposta;
  });
  
  localStorage.setItem('kazola_apostas', JSON.stringify(atualizadas));
  return atualizadas;
}

// ============================================================
// ESTATÍSTICAS DO UTILIZADOR (NOVO)
// ============================================================

export function calcularEstatisticasUtilizador(draws: Draw[]) {
  const apostas = conferirTodasApostas(draws);
  
  let totalGasto = 0;
  let totalRecuperado = 0;
  let apostasGanhas = 0;
  let apostasPerdidas = 0;
  let apostasPendentes = 0;
  
  const distribuicaoAcertos: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  for (const aposta of apostas) {
    totalGasto += aposta.valor;
    
    if (aposta.status === 'ganho' && aposta.premio) {
      totalRecuperado += aposta.premio;
      apostasGanhas++;
    } else if (aposta.status === 'perdido') {
      apostasPerdidas++;
    } else {
      apostasPendentes++;
    }
    
    if (aposta.acertos !== undefined && aposta.acertos >= 0) {
      const key = aposta.acertos >= 3 ? 3 : aposta.acertos;
      distribuicaoAcertos[key]++;
    }
  }
  
  const saldoLiquido = totalRecuperado - totalGasto;
  const taxaRetorno = totalGasto > 0 ? (totalRecuperado / totalGasto) * 100 : 0;
  
  return {
    totalGasto,
    totalRecuperado,
    saldoLiquido,
    taxaRetorno,
    apostasGanhas,
    apostasPerdidas,
    apostasPendentes,
    totalApostas: apostas.length,
    distribuicaoAcertos
  };
}

// ============================================================
// FUNÇÃO DE PERFORMANCE SIMPLES (JÁ EXISTE, MAS EXPANDIDA)
// ============================================================

export function getPerformance() {
  const history: ValidationRecordDetalhada[] = JSON.parse(localStorage.getItem('kazola_performance_detalhada') || '[]');
  const kazolaRecords = history.filter(r => r.strategy === 'kazola');
  const total = kazolaRecords.length;
  const hits2Plus = kazolaRecords.filter(r => r.hits >= 2).length;
  const totalWin = kazolaRecords.reduce((sum, r) => sum + (r.winAmount || 0), 0);
  const linesPlayed = kazolaRecords.reduce((sum, r) => sum + r.lines, 0);
  
  return { 
    total, 
    hits2Plus, 
    winRate: total ? (hits2Plus / total * 100).toFixed(1) : 0,
    totalWin,
    linesPlayed
  };
}
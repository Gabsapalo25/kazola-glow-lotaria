// src/components/PlanoSemanal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Ball from './Ball';
import Card from './Card';
import { UserSession } from '../lib/session';
import { generateLine } from '../lib/generator';
import { Draw } from '../data/history';

interface PlanoCombinacao {
  id: number;
  numeros: number[];
  metodo: 'equilibrado' | 'frequencia' | 'montecarlo' | 'aleatorio';
  sessaoSugerida: string;
  diaSugerido: string;
  valorAposta: number;
}

interface PlanoSemana {
  semana: string;
  orcamento: number;
  valorPorAposta: number;
  totalApostas: number;
  combinacoes: PlanoCombinacao[];
  geradoEm: number;
}

interface PlanoSemanalProps {
  session: UserSession;
  weights: number[];
  hotCold: { hot: number[]; cold: number[] };
  gaps: { n: number; gap: number }[];
  draws: Draw[];
}

const fmtKz = (value: number) => 
  value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });

const getWeekNumber = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const getCurrentWeekKey = (): string => {
  const now = new Date();
  const weekNum = getWeekNumber(now);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
};

const getStorageKey = (email: string, semana: string) => `kazola_plano_${email}_${semana}`;

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const sessoes = ['🌅 Fezada', '☀️ Kazola', '🌙 Eskebra', '🔥 Aqueceu'];

const getDataParaDia = (diaIndex: number): string => {
  const now = new Date();
  const currentDay = now.getDay();
  const daysToAdd = (diaIndex + 1 - (currentDay === 0 ? 7 : currentDay));
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysToAdd);
  return targetDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
};

const getMetodoLabel = (metodo: string): string => {
  const labels: Record<string, string> = {
    equilibrado: '⚖️ Equilibrado',
    frequencia: '📊 Frequência',
    montecarlo: '🎲 Monte Carlo',
    aleatorio: '🎯 Aleatório'
  };
  return labels[metodo] || metodo;
};

const arraysEqual = (a: number[], b: number[]): boolean => {
  if (!a || !b) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.length === sortedB.length && sortedA.every((val, idx) => val === sortedB[idx]);
};

// Gerar combinação fallback (aleatória sem duplicados)
const gerarFallback = (exclude: number[] = []): number[] => {
  const nums: number[] = [];
  while (nums.length < 5) {
    const n = Math.floor(Math.random() * 90) + 1;
    if (!nums.includes(n) && !exclude.includes(n)) {
      nums.push(n);
    }
  }
  return nums.sort((a, b) => a - b);
};

const PlanoSemanal: React.FC<PlanoSemanalProps> = ({ session, weights, hotCold, gaps, draws }) => {
  const [orcamento, setOrcamento] = useState<number>(1000);
  const [valorPorAposta, setValorPorAposta] = useState<number>(50);
  const [planoActual, setPlanoActual] = useState<PlanoSemana | null>(null);
  const [mostrarConfig, setMostrarConfig] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const semanaActualKey = getCurrentWeekKey();

  // Carregar plano existente
  useEffect(() => {
    const key = getStorageKey(session.email, semanaActualKey);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setPlanoActual(JSON.parse(stored));
      } catch (e) {
        console.error('Erro ao carregar plano:', e);
      }
    }
  }, [session.email, semanaActualKey]);

  const totalApostasCalculado = Math.floor(orcamento / valorPorAposta);

  // Gerar combinação única sem repetição (COM FALLBACK)
  const gerarCombinacaoUnica = (
    tentativa: number,
    existingCombos: number[][],
    metodoEscolhido: 'equilibrado' | 'frequencia' | 'montecarlo' | 'aleatorio'
  ): number[] => {
    try {
      // Tentar gerar com o método escolhido
      let numeros: number[] = [];
      
      if (metodoEscolhido === 'aleatorio') {
        numeros = gerarFallback();
      } else {
        const result = generateLine(weights, metodoEscolhido, { hotCold, gaps, draws });
        numeros = result?.numbers || [];
        
        // Se falhou, usar fallback
        if (numeros.length === 0) {
          console.warn(`Falha no método ${metodoEscolhido}, usando fallback`);
          numeros = gerarFallback();
        }
      }
      
      if (numeros.length === 0) {
        numeros = gerarFallback();
      }
      
      const isDuplicate = existingCombos.some(combo => arraysEqual(combo, numeros));
      
      if (isDuplicate && tentativa < 15) {
        return gerarCombinacaoUnica(tentativa + 1, existingCombos, metodoEscolhido);
      }
      return numeros;
    } catch (error) {
      console.error('Erro ao gerar combinação:', error);
      return gerarFallback();
    }
  };

  // Gerar plano completo
  const gerarPlano = async () => {
    if (totalApostasCalculado === 0) {
      alert('Orçamento insuficiente para o valor da aposta seleccionado');
      return;
    }
    
    if (totalApostasCalculado > 30) {
      alert('Máximo de 30 apostas por plano para garantir qualidade.');
      return;
    }
    
    setLoading(true);
    
    // Pequeno delay para UI não travar
    await new Promise(resolve => setTimeout(resolve, 100));

    const apostasPorDia = Math.floor(totalApostasCalculado / 7);
    const resto = totalApostasCalculado % 7;
    const apostasPorDiaLista = diasDaSemana.map((_, idx) => apostasPorDia + (idx < resto ? 1 : 0));
    
    // Distribuição dos métodos
    const metodos: ('equilibrado' | 'frequencia' | 'montecarlo' | 'aleatorio')[] = [];
    for (let i = 0; i < totalApostasCalculado; i++) {
      const rand = Math.random() * 100;
      if (rand < 40) metodos.push('equilibrado');
      else if (rand < 70) metodos.push('montecarlo');
      else if (rand < 90) metodos.push('frequencia');
      else metodos.push('aleatorio');
    }
    
    let idCounter = 0;
    const todasCombinacoes: PlanoCombinacao[] = [];
    const usedCombos: number[][] = [];
    
    for (let diaIdx = 0; diaIdx < diasDaSemana.length; diaIdx++) {
      const numApostasDia = apostasPorDiaLista[diaIdx];
      const dia = diasDaSemana[diaIdx];
      
      for (let i = 0; i < numApostasDia; i++) {
        const metodoIndex = todasCombinacoes.length % metodos.length;
        const metodo = metodos[metodoIndex];
        const sessaoIndex = todasCombinacoes.length % sessoes.length;
        
        const numeros = gerarCombinacaoUnica(0, usedCombos, metodo);
        if (numeros.length === 5) {
          usedCombos.push(numeros);
          
          todasCombinacoes.push({
            id: idCounter++,
            numeros,
            metodo,
            sessaoSugerida: sessoes[sessaoIndex],
            diaSugerido: dia,
            valorAposta: valorPorAposta,
          });
        }
      }
    }
    
    setLoading(false);
    
    if (todasCombinacoes.length === 0) {
      alert('Erro ao gerar combinações. Tenta novamente.');
      return;
    }
    
    const novoPlano: PlanoSemana = {
      semana: semanaActualKey,
      orcamento,
      valorPorAposta,
      totalApostas: todasCombinacoes.length,
      combinacoes: todasCombinacoes,
      geradoEm: Date.now(),
    };
    
    const key = getStorageKey(session.email, semanaActualKey);
    localStorage.setItem(key, JSON.stringify(novoPlano));
    setPlanoActual(novoPlano);
    setMostrarConfig(false);
  };

  const gerarNovoPlano = () => {
    setMostrarConfig(true);
  };

  const copiarPlano = () => {
    if (!planoActual) return;
    
    let texto = `📅 PLANO SEMANAL - Semana ${planoActual.semana}\n`;
    texto += `💰 Orçamento: ${fmtKz(planoActual.orcamento)}\n`;
    texto += `🎯 Total de apostas: ${planoActual.totalApostas}\n`;
    texto += `💵 Valor por aposta: ${fmtKz(planoActual.valorPorAposta)}\n`;
    texto += `${'='.repeat(50)}\n\n`;
    
    for (const dia of diasDaSemana) {
      const apostasDia = planoActual.combinacoes.filter(c => c.diaSugerido === dia);
      if (apostasDia.length > 0) {
        texto += `📌 ${dia} (${getDataParaDia(diasDaSemana.indexOf(dia))})\n`;
        apostasDia.forEach((aposta, idx) => {
          texto += `  ${idx + 1}. [${aposta.numeros.join(', ')}] - ${getMetodoLabel(aposta.metodo)}\n`;
        });
        texto += '\n';
      }
    }
    
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const estatisticasPlano = useMemo(() => {
    if (!planoActual) return null;
    
    const contagemMetodos: Record<string, number> = {
      equilibrado: 0,
      frequencia: 0,
      montecarlo: 0,
      aleatorio: 0,
    };
    
    planoActual.combinacoes.forEach(c => {
      contagemMetodos[c.metodo] = (contagemMetodos[c.metodo] || 0) + 1;
    });
    
    return contagemMetodos;
  }, [planoActual]);

  // ==================== CONFIGURAÇÃO ====================
  if (!planoActual || mostrarConfig) {
    return (
      <Card title="📅 Gerar Plano Semanal" icon={<span>📅</span>}>
        <p className="text-neutral-600 mb-6 text-sm">
          Define o teu orçamento semanal e o valor por aposta. O sistema irá gerar um plano equilibrado para toda a semana.
        </p>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold mb-1">Orçamento semanal (Kz)</label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={orcamento}
              onChange={(e) => setOrcamento(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">Mínimo 100 Kz · Máximo 10.000 Kz</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-1">Valor por aposta (Kz)</label>
            <select
              value={valorPorAposta}
              onChange={(e) => setValorPorAposta(parseInt(e.target.value))}
              className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2 text-sm"
            >
              <option value={50}>50 Kz</option>
              <option value={100}>100 Kz</option>
              <option value={200}>200 Kz</option>
              <option value={500}>500 Kz</option>
              <option value={1000}>1000 Kz</option>
            </select>
          </div>
          
          <div className="bg-neutral-100 rounded-xl p-4 text-center">
            <div className="text-sm text-neutral-600">Total de apostas no plano</div>
            <div className="text-4xl font-display font-black text-red-600">{totalApostasCalculado}</div>
            {totalApostasCalculado === 0 && (
              <p className="text-xs text-red-500 mt-1">Orçamento insuficiente</p>
            )}
            {totalApostasCalculado > 30 && (
              <p className="text-xs text-amber-500 mt-1">Máximo recomendado: 30 apostas</p>
            )}
          </div>
        </div>
        
        <button
          onClick={gerarPlano}
          disabled={totalApostasCalculado === 0 || loading}
          className="w-full min-h-[52px] bg-red-600 hover:bg-red-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-display font-black text-lg rounded-2xl transition"
        >
          {loading ? '⏳ A GERAR...' : '🎲 GERAR PLANO'}
        </button>
        
        {planoActual && (
          <button
            onClick={() => setMostrarConfig(false)}
            className="w-full mt-3 min-h-[44px] bg-neutral-100 hover:bg-neutral-200 font-bold rounded-2xl transition"
          >
            Cancelar
          </button>
        )}
      </Card>
    );
  }

  // ==================== PLANO GERADO ====================
  return (
    <div className="space-y-6">
      <Card title="📅 Plano Semanal" icon={<span>📅</span>}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-neutral-500">Semana {planoActual.semana}</p>
            <p className="text-xs text-neutral-400">Gerado em {new Date(planoActual.geradoEm).toLocaleDateString('pt-PT')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copiarPlano}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-bold transition"
            >
              {copiado ? '✓ Copiado!' : '📋 Copiar'}
            </button>
            <button
              onClick={gerarNovoPlano}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition"
            >
              🔄 Novo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <div className="text-xs text-neutral-500">Total apostas</div>
            <div className="text-xl font-display font-black">{planoActual.totalApostas}</div>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <div className="text-xs text-neutral-500">Orçamento</div>
            <div className="text-xl font-display font-black text-green-600">{fmtKz(planoActual.orcamento)}</div>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3 text-center">
            <div className="text-xs text-neutral-500">Valor/aposta</div>
            <div className="text-xl font-display font-black">{fmtKz(planoActual.valorPorAposta)}</div>
          </div>
          <div className="bg-neutral-50 rounded-xl p-3">
            <div className="text-xs text-neutral-500 text-center mb-1">Métodos</div>
            <div className="text-xs space-y-0.5">
              {estatisticasPlano && Object.entries(estatisticasPlano)
                .filter(([, count]) => count > 0)
                .map(([metodo, count]) => (
                  <div key={metodo} className="text-neutral-600 flex justify-between">
                    <span>{getMetodoLabel(metodo)}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Card>

      {diasDaSemana.map((dia, diaIdx) => {
        const apostasDia = planoActual.combinacoes.filter(c => c.diaSugerido === dia);
        if (apostasDia.length === 0) return null;
        
        return (
          <Card key={dia} title={`📌 ${dia} · ${getDataParaDia(diaIdx)}`} icon={<span>📌</span>}>
            <div className="space-y-2">
              {apostasDia.map((aposta) => (
                <div key={aposta.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-neutral-50">
                  <div className="flex gap-0.5">
                    {aposta.numeros.map((num, numIdx) => (
                      <Ball key={numIdx} n={num} size="sm" />
                    ))}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {getMetodoLabel(aposta.metodo).split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default PlanoSemanal;
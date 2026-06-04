// src/components/RelatorioMensal.tsx
import React, { useState, useMemo } from 'react';
import Card from './Card';
import { UserSession } from '../lib/session';

interface RegistoAposta {
  id: string;
  data: string;
  hora: string;
  combinacao: number[];
  valorApostado: number;
  sessao: string;
  resultado: 'pendente' | 'verificado';
  acertos: number | null;
  premioRecebido: number;
  notas: string;
}

interface RelatorioMensalProps {
  session: UserSession;
}

const fmtKz = (value: number) => 
  value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });

const getStorageKey = (email: string) => `kazola_diario_${email}`;

const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const getWeekOfMonth = (date: Date): number => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeekDay = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + firstWeekDay) / 7);
};

const getWeekNumber = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const getDataParaDia = (diaIndex: number): string => {
  const now = new Date();
  const currentDay = now.getDay();
  const daysToAdd = (diaIndex + 1 - (currentDay === 0 ? 7 : currentDay));
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysToAdd);
  return targetDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
};

const RelatorioMensal: React.FC<RelatorioMensalProps> = ({ session }) => {
  const [anoActual, setAnoActual] = useState<number>(new Date().getFullYear());
  const [mesActual, setMesActual] = useState<number>(new Date().getMonth());

  const registos = useMemo(() => {
    const key = getStorageKey(session.email);
    const stored = localStorage.getItem(key);
    if (stored) {
      try { 
        return JSON.parse(stored) as RegistoAposta[]; 
      } catch { 
        return []; 
      }
    }
    return [];
  }, [session.email]);

  // Filtrar registos do mês (corrigido: data mês 1-12 vs getMonth 0-11)
  const registosDoMes = useMemo(() => {
    return registos.filter(r => {
      const [ano, mes] = r.data.split('-').map(Number);
      return ano === anoActual && (mes - 1) === mesActual;
    });
  }, [registos, anoActual, mesActual]);

  // Métricas principais
  const metricas = useMemo(() => {
    if (registosDoMes.length === 0) return null;

    const totalGasto = registosDoMes.reduce((sum, r) => sum + r.valorApostado, 0);
    const totalRecuperado = registosDoMes.reduce((sum, r) => sum + r.premioRecebido, 0);
    const saldoLiquido = totalRecuperado - totalGasto;
    const taxaRetorno = totalGasto > 0 ? (totalRecuperado / totalGasto) * 100 : 0;
    const custoMedioPorAposta = totalGasto / registosDoMes.length;

    const apostasComPremio = registosDoMes.filter(r => r.premioRecebido > 0);
    const premioMedioQuandoGanha = apostasComPremio.length > 0
      ? apostasComPremio.reduce((sum, r) => sum + r.premioRecebido, 0) / apostasComPremio.length
      : 0;

    const totalApostas = registosDoMes.length;
    const apostasComAcerto = registosDoMes.filter(r => r.acertos !== null && r.acertos >= 1).length;
    const apostasZeroAcertos = registosDoMes.filter(r => r.acertos !== null && r.acertos === 0).length;
    const taxaAcertoMinimo = totalApostas > 0 ? (apostasComAcerto / totalApostas) * 100 : 0;

    const melhoresResultados = registosDoMes
      .filter(r => r.acertos !== null)
      .map(r => r.acertos as number);
    const melhorResultado = melhoresResultados.length > 0 ? Math.max(...melhoresResultados) : 0;

    // Sessão mais usada
    const contagemSessoes: Record<string, number> = { Fezada: 0, Kazola: 0, Eskebra: 0, Aqueceu: 0 };
    registosDoMes.forEach(r => {
      if (contagemSessoes[r.sessao] !== undefined) {
        contagemSessoes[r.sessao]++;
      }
    });
    const sessaoMaisUsada = Object.entries(contagemSessoes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Dia da semana mais usado
    const contagemDias: Record<string, number> = { Domingo: 0, Segunda: 0, Terça: 0, Quarta: 0, Quinta: 0, Sexta: 0, Sábado: 0 };
    registosDoMes.forEach(r => {
      const data = new Date(r.data);
      const diaSemana = diasSemana[data.getDay()];
      contagemDias[diaSemana]++;
    });
    const diaMaisApostas = Object.entries(contagemDias).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalGasto,
      totalRecuperado,
      saldoLiquido,
      taxaRetorno,
      custoMedioPorAposta,
      premioMedioQuandoGanha,
      totalApostas,
      apostasComAcerto,
      apostasZeroAcertos,
      taxaAcertoMinimo,
      melhorResultado,
      sessaoMaisUsada,
      diaMaisApostas,
    };
  }, [registosDoMes]);

  // Comparação com mês anterior (corrigido)
  const comparacaoMesAnterior = useMemo(() => {
    const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
    const anoAnterior = mesActual === 0 ? anoActual - 1 : anoActual;

    const registosMesAnterior = registos.filter(r => {
      const [ano, mes] = r.data.split('-').map(Number);
      return ano === anoAnterior && (mes - 1) === mesAnterior;
    });

    if (registosMesAnterior.length === 0 || !metricas) return null;

    const totalGastoAnterior = registosMesAnterior.reduce((sum, r) => sum + r.valorApostado, 0);
    const totalRecuperadoAnterior = registosMesAnterior.reduce((sum, r) => sum + r.premioRecebido, 0);
    const apostasComAcertoAnterior = registosMesAnterior.filter(r => r.acertos !== null && r.acertos >= 1).length;
    const taxaAcertoAnterior = registosMesAnterior.length > 0 ? (apostasComAcertoAnterior / registosMesAnterior.length) * 100 : 0;

    const variacaoGasto = totalGastoAnterior > 0 ? ((metricas.totalGasto - totalGastoAnterior) / totalGastoAnterior) * 100 : 0;
    const variacaoRetorno = totalRecuperadoAnterior > 0 ? ((metricas.totalRecuperado - totalRecuperadoAnterior) / totalRecuperadoAnterior) * 100 : 0;
    const variacaoTaxaAcerto = taxaAcertoAnterior > 0 ? metricas.taxaAcertoMinimo - taxaAcertoAnterior : 0;

    return { variacaoGasto, variacaoRetorno, variacaoTaxaAcerto };
  }, [registos, anoActual, mesActual, metricas]);

  // Gasto por semana do mês
  const gastosPorSemana = useMemo(() => {
    if (registosDoMes.length === 0) return [];

    const semanas: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const maxGasto = Math.max(...registosDoMes.map(r => r.valorApostado), 1);

    registosDoMes.forEach(r => {
      const data = new Date(r.data);
      const semana = getWeekOfMonth(data);
      semanas[semana] = (semanas[semana] || 0) + r.valorApostado;
    });

    return Object.entries(semanas)
      .filter(([_, valor]) => valor > 0)
      .map(([semana, valor]) => ({
        semana: parseInt(semana),
        valor,
        percentagem: (valor / maxGasto) * 100,
      }))
      .sort((a, b) => a.semana - b.semana);
  }, [registosDoMes]);

  // Distribuição de acertos
  const distribuicaoAcertos = useMemo(() => {
    if (registosDoMes.length === 0) return [];

    const contagem = { 0: 0, 1: 0, 2: 0, '3+': 0 };
    registosDoMes.forEach(r => {
      if (r.acertos !== null) {
        if (r.acertos >= 3) contagem['3+']++;
        else if (r.acertos === 2) contagem[2]++;
        else if (r.acertos === 1) contagem[1]++;
        else contagem[0]++;
      }
    });

    const totalVerificados = Object.values(contagem).reduce((a, b) => a + b, 0);

    return [
      { acertos: '0 acertos', count: contagem[0], percentagem: totalVerificados > 0 ? (contagem[0] / totalVerificados) * 100 : 0 },
      { acertos: '1 acerto', count: contagem[1], percentagem: totalVerificados > 0 ? (contagem[1] / totalVerificados) * 100 : 0 },
      { acertos: '2 acertos', count: contagem[2], percentagem: totalVerificados > 0 ? (contagem[2] / totalVerificados) * 100 : 0 },
      { acertos: '3+ acertos', count: contagem['3+'], percentagem: totalVerificados > 0 ? (contagem['3+'] / totalVerificados) * 100 : 0 },
    ];
  }, [registosDoMes]);

  // Observações inteligentes
  const observacoes = useMemo(() => {
    if (!metricas) return [];

    const observacoesList: string[] = [];

    // Alertas de gasto excessivo
    if (comparacaoMesAnterior && Math.abs(comparacaoMesAnterior.variacaoGasto) > 20) {
      const sinal = comparacaoMesAnterior.variacaoGasto > 0 ? 'mais' : 'menos';
      observacoesList.push(`💰 Gastaste ${Math.abs(comparacaoMesAnterior.variacaoGasto).toFixed(0)}% ${sinal} que no mês passado. Considera ajustar o orçamento semanal.`);
    }

    // Observações sobre retorno
    if (metricas.taxaRetorno < 10) {
      observacoesList.push(`📉 O teu retorno este mês foi de ${metricas.taxaRetorno.toFixed(1)}%. A média histórica do Loto é ~8%. Estás dentro do esperado.`);
    } else if (metricas.taxaRetorno > 15) {
      observacoesList.push(`📈 Excelente mês! O teu retorno foi de ${metricas.taxaRetorno.toFixed(1)}%, acima da média histórica.`);
    }

    // Observações sobre acertos
    if (metricas.melhorResultado >= 3) {
      const apostasCom3Mais = registosDoMes.filter(r => r.acertos !== null && r.acertos >= 3).length;
      observacoesList.push(`🎯 Tiveste ${apostasCom3Mais} aposta${apostasCom3Mais !== 1 ? 's' : ''} com 3 ou mais acertos este mês.`);
    }

    if (metricas.taxaAcertoMinimo > 15) {
      observacoesList.push(`✅ A tua taxa de acerto mínimo foi de ${metricas.taxaAcertoMinimo.toFixed(1)}% - muito bom!`);
    } else if (metricas.taxaAcertoMinimo < 5 && metricas.totalApostas > 10) {
      observacoesList.push(`⚠️ A tua taxa de acerto mínimo foi de ${metricas.taxaAcertoMinimo.toFixed(1)}%. Revê a tua estratégia de selecção de números.`);
    }

    // Observação sobre sessão
    if (metricas.sessaoMaisUsada !== 'N/A') {
      observacoesList.push(`🌙 A tua sessão mais usada foi ${metricas.sessaoMaisUsada}.`);
    }

    // Observação sobre dia da semana
    if (metricas.diaMaisApostas !== 'N/A') {
      observacoesList.push(`📆 O dia da semana com mais apostas foi ${metricas.diaMaisApostas}.`);
    }

    return observacoesList.slice(0, 4);
  }, [metricas, comparacaoMesAnterior, registosDoMes]);

  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      if (mesActual === 0) {
        setMesActual(11);
        setAnoActual(anoActual - 1);
      } else {
        setMesActual(mesActual - 1);
      }
    } else {
      const now = new Date();
      const mesProposto = mesActual === 11 ? 0 : mesActual + 1;
      const anoProposto = mesActual === 11 ? anoActual + 1 : anoActual;
      
      if (anoProposto > now.getFullYear() || (anoProposto === now.getFullYear() && mesProposto > now.getMonth())) {
        return;
      }
      
      if (mesActual === 11) {
        setMesActual(0);
        setAnoActual(anoActual + 1);
      } else {
        setMesActual(mesActual + 1);
      }
    }
  };

  // Estado vazio (sem dados)
  if (registosDoMes.length === 0) {
    return (
      <Card title="📊 Relatório Mensal" icon={<span>📊</span>}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navegarMes('anterior')} 
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 font-bold text-sm transition">
            ← Anterior
          </button>
          <span className="font-display font-black text-lg">{meses[mesActual]} {anoActual}</span>
          <button onClick={() => navegarMes('proximo')} 
            disabled={anoActual === new Date().getFullYear() && mesActual === new Date().getMonth()}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 font-bold text-sm transition">
            Seguinte →
          </button>
        </div>
        <div className="text-center py-10">
          <div className="text-5xl mb-3">📊</div>
          <p className="font-bold text-lg">Sem dados para este mês</p>
          <p className="text-neutral-500 text-sm mt-1">
            Regista as tuas apostas no Diário para veres o relatório.
          </p>
        </div>
      </Card>
    );
  }

  if (!metricas) return null;

  // Estado com dados
  return (
    <div className="space-y-6">
      {/* Navegação do mês */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navegarMes('anterior')}
          className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 font-bold text-sm transition"
        >
          ← Anterior
        </button>
        <span className="font-display font-black text-xl">{meses[mesActual]} {anoActual}</span>
        <button
          onClick={() => navegarMes('proximo')}
          disabled={anoActual === new Date().getFullYear() && mesActual === new Date().getMonth()}
          className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 font-bold text-sm transition"
        >
          Seguinte →
        </button>
      </div>

      {/* Cards de resumo principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total gasto</div>
          <div className="text-2xl font-display font-black text-red-600">{fmtKz(metricas.totalGasto)}</div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total recuperado</div>
          <div className="text-2xl font-display font-black text-green-600">{fmtKz(metricas.totalRecuperado)}</div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Saldo líquido</div>
          <div className={`text-2xl font-display font-black ${metricas.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtKz(metricas.saldoLiquido)}
          </div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Taxa de retorno</div>
          <div className="text-2xl font-display font-black text-blue-600">{metricas.taxaRetorno.toFixed(1)}%</div>
        </div>
      </div>

      {/* Gráfico de barras - Gasto por semana */}
      <Card title="📊 Gasto por Semana" icon={<span>📊</span>}>
        <div className="flex items-end gap-4 h-40">
          {gastosPorSemana.map((semana) => (
            <div key={semana.semana} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-red-600 rounded-t-lg transition-all"
                style={{ height: `${Math.max(semana.percentagem, 5)}%` }}
              />
              <div className="text-xs text-neutral-500 mt-2">Semana {semana.semana}</div>
              <div className="text-xs font-bold">{fmtKz(semana.valor)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Distribuição de acertos */}
      <Card title="🎯 Distribuição de Acertos" icon={<span>🎯</span>}>
        <div className="space-y-3">
          {distribuicaoAcertos.map((item) => (
            <div key={item.acertos} className="flex items-center gap-4">
              <div className="w-20 text-sm font-bold text-neutral-700">{item.acertos}</div>
              <div className="flex-1 h-6 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full flex items-center justify-end px-2 transition-all"
                  style={{ width: `${Math.max(item.percentagem, item.count > 0 ? 8 : 0)}%` }}
                >
                  {item.percentagem > 15 && (
                    <span className="text-xs font-bold text-white">{item.percentagem.toFixed(0)}%</span>
                  )}
                </div>
              </div>
              <div className="w-20 text-right text-sm text-neutral-600">
                {item.count} ({item.percentagem.toFixed(0)}%)
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Métricas adicionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4">
          <div className="text-xs text-neutral-500 mb-1">Custo médio por aposta</div>
          <div className="text-lg font-display font-black text-neutral-900">{fmtKz(metricas.custoMedioPorAposta)}</div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4">
          <div className="text-xs text-neutral-500 mb-1">Prémio médio (quando ganha)</div>
          <div className="text-lg font-display font-black text-green-600">{fmtKz(metricas.premioMedioQuandoGanha)}</div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4">
          <div className="text-xs text-neutral-500 mb-1">Total de apostas</div>
          <div className="text-lg font-display font-black text-neutral-900">{metricas.totalApostas}</div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4">
          <div className="text-xs text-neutral-500 mb-1">Melhor resultado</div>
          <div className="text-lg font-display font-black text-amber-600">{metricas.melhorResultado} acertos</div>
        </div>
      </div>

      {/* Comparação com mês anterior */}
      {comparacaoMesAnterior && (
        <Card title="📈 Comparação com mês anterior" icon={<span>📈</span>}>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-neutral-500 mb-1">Variação do gasto</div>
              <div className={`font-display font-black text-lg ${comparacaoMesAnterior.variacaoGasto <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparacaoMesAnterior.variacaoGasto > 0 ? '+' : ''}{comparacaoMesAnterior.variacaoGasto.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-500 mb-1">Variação do retorno</div>
              <div className={`font-display font-black text-lg ${comparacaoMesAnterior.variacaoRetorno >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparacaoMesAnterior.variacaoRetorno > 0 ? '+' : ''}{comparacaoMesAnterior.variacaoRetorno.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-500 mb-1">Variação da taxa de acerto</div>
              <div className={`font-display font-black text-lg ${comparacaoMesAnterior.variacaoTaxaAcerto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparacaoMesAnterior.variacaoTaxaAcerto > 0 ? '+' : ''}{comparacaoMesAnterior.variacaoTaxaAcerto.toFixed(1)} p.p.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Observações inteligentes */}
      {observacoes.length > 0 && (
        <Card title="💡 Observações Inteligentes" icon={<span>💡</span>}>
          <div className="space-y-2">
            {observacoes.map((obs, idx) => (
              <p key={idx} className="text-sm text-neutral-700">{obs}</p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RelatorioMensal;
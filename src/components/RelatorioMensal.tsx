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

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const getWeekOfMonth = (date: Date): number => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeekDay = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + firstWeekDay) / 7);
};

// ── Estilos inline ──────────────────────────────────────────────────────────

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(17, 24, 39, 0.7)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '16px',
};

const metricCardStyle: React.CSSProperties = {
  background: 'rgba(17, 24, 39, 0.7)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '16px',
  textAlign: 'center',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '12px',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  color: '#E5E7EB',
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
};

// Cor da barra de acertos por categoria
const getBarColor = (acertos: string): string => {
  switch (acertos) {
    case '5 acertos': return 'linear-gradient(90deg, #FFD700, #FF8C00)';
    case '4 acertos': return 'linear-gradient(90deg, #A855F7, #7C3AED)';
    case '3 acertos': return 'linear-gradient(90deg, #3B82F6, #1D4ED8)';
    default:          return 'linear-gradient(90deg, #00F5A0, #FFD700)';
  }
};

// Ícone/badge lateral por categoria
const getAcertosIcon = (acertos: string): string => {
  switch (acertos) {
    case '5 acertos': return '🏆';
    case '4 acertos': return '🥇';
    case '3 acertos': return '🥈';
    case '2 acertos': return '🥉';
    case '1 acerto':  return '🎯';
    default:          return '—';
  }
};

// ── Componente ───────────────────────────────────────────────────────────────

const RelatorioMensal: React.FC<RelatorioMensalProps> = ({ session }) => {
  const [anoActual, setAnoActual]   = useState<number>(new Date().getFullYear());
  const [mesActual, setMesActual]   = useState<number>(new Date().getMonth());

  // ── Carregar registos ────────────────────────────────────────────────────
  const registos = useMemo<RegistoAposta[]>(() => {
    const key    = getStorageKey(session.email);
    const stored = localStorage.getItem(key);
    if (stored) {
      try { return JSON.parse(stored); } catch { return []; }
    }
    return [];
  }, [session.email]);

  // ── Filtrar mês seleccionado ─────────────────────────────────────────────
  const registosDoMes = useMemo(() =>
    registos.filter(r => {
      const [ano, mes] = r.data.split('-').map(Number);
      return ano === anoActual && (mes - 1) === mesActual;
    }),
  [registos, anoActual, mesActual]);

  // ── Métricas principais ──────────────────────────────────────────────────
  const metricas = useMemo(() => {
    if (registosDoMes.length === 0) return null;

    const totalGasto        = registosDoMes.reduce((s, r) => s + r.valorApostado,  0);
    const totalRecuperado   = registosDoMes.reduce((s, r) => s + r.premioRecebido, 0);
    const saldoLiquido      = totalRecuperado - totalGasto;
    const taxaRetorno       = totalGasto > 0 ? (totalRecuperado / totalGasto) * 100 : 0;
    const custoMedioPorAposta = totalGasto / registosDoMes.length;

    const apostasComPremio       = registosDoMes.filter(r => r.premioRecebido > 0);
    const premioMedioQuandoGanha = apostasComPremio.length > 0
      ? apostasComPremio.reduce((s, r) => s + r.premioRecebido, 0) / apostasComPremio.length
      : 0;

    const totalApostas      = registosDoMes.length;
    const apostasComAcerto  = registosDoMes.filter(r => r.acertos !== null && r.acertos >= 1).length;
    const taxaAcertoMinimo  = totalApostas > 0 ? (apostasComAcerto / totalApostas) * 100 : 0;

    const resultados        = registosDoMes.filter(r => r.acertos !== null).map(r => r.acertos as number);
    const melhorResultado   = resultados.length > 0 ? Math.max(...resultados) : 0;

    const contagemSessoes: Record<string, number> = { Fezada: 0, Kazola: 0, Eskebra: 0, Aqueceu: 0 };
    registosDoMes.forEach(r => { if (contagemSessoes[r.sessao] !== undefined) contagemSessoes[r.sessao]++; });
    const sessaoMaisUsada = Object.entries(contagemSessoes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const contagemDias: Record<string, number> = { Domingo: 0, Segunda: 0, Terça: 0, Quarta: 0, Quinta: 0, Sexta: 0, Sábado: 0 };
    registosDoMes.forEach(r => {
      const dia = diasSemana[new Date(r.data).getDay()];
      contagemDias[dia]++;
    });
    const diaMaisApostas = Object.entries(contagemDias).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalGasto, totalRecuperado, saldoLiquido, taxaRetorno, custoMedioPorAposta,
      premioMedioQuandoGanha, totalApostas, apostasComAcerto, taxaAcertoMinimo,
      melhorResultado, sessaoMaisUsada, diaMaisApostas,
    };
  }, [registosDoMes]);

  // ── Comparação com mês anterior ──────────────────────────────────────────
  const comparacaoMesAnterior = useMemo(() => {
    const mesAnt = mesActual === 0 ? 11 : mesActual - 1;
    const anoAnt = mesActual === 0 ? anoActual - 1 : anoActual;

    const regAnt = registos.filter(r => {
      const [ano, mes] = r.data.split('-').map(Number);
      return ano === anoAnt && (mes - 1) === mesAnt;
    });

    if (regAnt.length === 0 || !metricas) return null;

    const gastoAnt      = regAnt.reduce((s, r) => s + r.valorApostado,  0);
    const recuperadoAnt = regAnt.reduce((s, r) => s + r.premioRecebido, 0);
    const acertoAnt     = regAnt.filter(r => r.acertos !== null && r.acertos >= 1).length;
    const taxaAcertoAnt = regAnt.length > 0 ? (acertoAnt / regAnt.length) * 100 : 0;

    return {
      variacaoGasto:      gastoAnt      > 0 ? ((metricas.totalGasto       - gastoAnt)      / gastoAnt      * 100) : 0,
      variacaoRetorno:    recuperadoAnt > 0 ? ((metricas.totalRecuperado  - recuperadoAnt) / recuperadoAnt * 100) : 0,
      variacaoTaxaAcerto: taxaAcertoAnt > 0 ?   metricas.taxaAcertoMinimo - taxaAcertoAnt                        : 0,
    };
  }, [registos, anoActual, mesActual, metricas]);

  // ── Gasto por semana ─────────────────────────────────────────────────────
  const gastosPorSemana = useMemo(() => {
    if (registosDoMes.length === 0) return [];

    const semanas: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    registosDoMes.forEach(r => {
      const s = getWeekOfMonth(new Date(r.data));
      semanas[s] = (semanas[s] || 0) + r.valorApostado;
    });

    const maxVal = Math.max(...Object.values(semanas), 1);

    return Object.entries(semanas)
      .filter(([, v]) => v > 0)
      .map(([s, v]) => ({ semana: parseInt(s), valor: v, percentagem: (v / maxVal) * 100 }))
      .sort((a, b) => a.semana - b.semana);
  }, [registosDoMes]);

  // ── Distribuição de acertos (0 → 5 individuais) ──────────────────────────
  const distribuicaoAcertos = useMemo(() => {
    if (registosDoMes.length === 0) return [];

    const contagem: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    registosDoMes.forEach(r => {
      if (r.acertos !== null) {
        const key = Math.min(r.acertos, 5) as 0 | 1 | 2 | 3 | 4 | 5;
        contagem[key]++;
      }
    });

    const total = Object.values(contagem).reduce((a, b) => a + b, 0);
    const pct   = (n: number) => total > 0 ? (n / total) * 100 : 0;

    return [
      { acertos: '0 acertos', count: contagem[0], percentagem: pct(contagem[0]) },
      { acertos: '1 acerto',  count: contagem[1], percentagem: pct(contagem[1]) },
      { acertos: '2 acertos', count: contagem[2], percentagem: pct(contagem[2]) },
      { acertos: '3 acertos', count: contagem[3], percentagem: pct(contagem[3]) },
      { acertos: '4 acertos', count: contagem[4], percentagem: pct(contagem[4]) },
      { acertos: '5 acertos', count: contagem[5], percentagem: pct(contagem[5]) },
    ];
  }, [registosDoMes]);

  // ── Observações inteligentes ─────────────────────────────────────────────
  const observacoes = useMemo(() => {
    if (!metricas) return [];

    const list: string[] = [];

    if (comparacaoMesAnterior && Math.abs(comparacaoMesAnterior.variacaoGasto) > 20) {
      const sinal = comparacaoMesAnterior.variacaoGasto > 0 ? 'mais' : 'menos';
      list.push(`💰 Gastaste ${Math.abs(comparacaoMesAnterior.variacaoGasto).toFixed(0)}% ${sinal} que no mês passado. Considera ajustar o orçamento semanal.`);
    }

    if (metricas.taxaRetorno < 10) {
      list.push(`📉 O teu retorno este mês foi de ${metricas.taxaRetorno.toFixed(1)}%. A média histórica do Loto é ~8%. Estás dentro do esperado.`);
    } else if (metricas.taxaRetorno > 15) {
      list.push(`📈 Excelente mês! O teu retorno foi de ${metricas.taxaRetorno.toFixed(1)}%, acima da média histórica.`);
    }

    if (metricas.melhorResultado >= 3) {
      const n = registosDoMes.filter(r => r.acertos !== null && r.acertos >= 3).length;
      list.push(`🎯 Tiveste ${n} aposta${n !== 1 ? 's' : ''} com 3 ou mais acertos este mês.`);
    }

    if (metricas.taxaAcertoMinimo > 15) {
      list.push(`✅ A tua taxa de acerto mínimo foi de ${metricas.taxaAcertoMinimo.toFixed(1)}% — muito bom!`);
    } else if (metricas.taxaAcertoMinimo < 5 && metricas.totalApostas > 10) {
      list.push(`⚠️ A tua taxa de acerto mínimo foi de ${metricas.taxaAcertoMinimo.toFixed(1)}%. Revê a tua estratégia de selecção de números.`);
    }

    if (metricas.sessaoMaisUsada !== 'N/A')  list.push(`🌙 A tua sessão mais usada foi ${metricas.sessaoMaisUsada}.`);
    if (metricas.diaMaisApostas  !== 'N/A')  list.push(`📆 O dia da semana com mais apostas foi ${metricas.diaMaisApostas}.`);

    return list.slice(0, 4);
  }, [metricas, comparacaoMesAnterior, registosDoMes]);

  // ── Navegação entre meses ────────────────────────────────────────────────
  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    if (direcao === 'anterior') {
      if (mesActual === 0) { setMesActual(11); setAnoActual(a => a - 1); }
      else setMesActual(m => m - 1);
    } else {
      const now        = new Date();
      const mesProp    = mesActual === 11 ? 0  : mesActual + 1;
      const anoProp    = mesActual === 11 ? anoActual + 1 : anoActual;
      if (anoProp > now.getFullYear() || (anoProp === now.getFullYear() && mesProp > now.getMonth())) return;
      if (mesActual === 11) { setMesActual(0); setAnoActual(a => a + 1); }
      else setMesActual(m => m + 1);
    }
  };

  const isHoje = anoActual === new Date().getFullYear() && mesActual === new Date().getMonth();

  // ── Render: sem dados ────────────────────────────────────────────────────
  if (registosDoMes.length === 0) {
    return (
      <Card title="📊 Relatório Mensal" icon={<span>📊</span>}>
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navegarMes('anterior')} style={buttonStyle}>← Anterior</button>
          <span style={{ fontWeight: 900, fontSize: '20px', color: '#F3F4F6' }}>{meses[mesActual]} {anoActual}</span>
          <button onClick={() => navegarMes('proximo')} disabled={isHoje} style={isHoje ? buttonDisabledStyle : buttonStyle}>Seguinte →</button>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
          <p style={{ fontWeight: 700, fontSize: '18px', color: '#F3F4F6', marginBottom: '4px' }}>Sem dados para este mês</p>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>Regista as tuas apostas no Diário para veres o relatório.</p>
        </div>
      </Card>
    );
  }

  if (!metricas) return null;

  // ── Render: com dados ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <button onClick={() => navegarMes('anterior')} style={buttonStyle}>← Anterior</button>
        <span style={{ fontWeight: 900, fontSize: '24px', color: '#F3F4F6' }}>{meses[mesActual]} {anoActual}</span>
        <button onClick={() => navegarMes('proximo')} disabled={isHoje} style={isHoje ? buttonDisabledStyle : buttonStyle}>Seguinte →</button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total gasto',      value: fmtKz(metricas.totalGasto),      color: '#FF4B4B' },
          { label: 'Total recuperado', value: fmtKz(metricas.totalRecuperado), color: '#00F5A0' },
          { label: 'Saldo líquido',    value: fmtKz(metricas.saldoLiquido),    color: metricas.saldoLiquido >= 0 ? '#00F5A0' : '#FF4B4B' },
          { label: 'Taxa de retorno',  value: `${metricas.taxaRetorno.toFixed(1)}%`, color: '#FFD700' },
        ].map(({ label, value, color }) => (
          <div key={label} style={metricCardStyle}>
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Gasto por semana */}
      <Card title="📊 Gasto por Semana" icon={<span>📊</span>}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '160px' }}>
          {gastosPorSemana.map(s => (
            <div key={s.semana} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%',
                background: 'linear-gradient(180deg, #00F5A0, #00C896)',
                borderRadius: '8px 8px 0 0',
                height: `${Math.max(s.percentagem, 5)}%`,
                transition: 'height 0.3s ease',
              }} />
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px' }}>Semana {s.semana}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#F3F4F6' }}>{fmtKz(s.valor)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Distribuição de acertos — 0 a 5 individual */}
      <Card title="🎯 Distribuição de Acertos" icon={<span>🎯</span>}>
        <div className="space-y-3">
          {distribuicaoAcertos.map(item => (
            <div key={item.acertos} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Ícone */}
              <div style={{ width: '24px', textAlign: 'center', fontSize: '14px' }}>
                {getAcertosIcon(item.acertos)}
              </div>
              {/* Label */}
              <div style={{ width: '72px', fontSize: '13px', fontWeight: 700, color: '#9CA3AF', flexShrink: 0 }}>
                {item.acertos}
              </div>
              {/* Barra */}
              <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: getBarColor(item.acertos),
                  borderRadius: '999px',
                  width: `${Math.max(item.percentagem, item.count > 0 ? 8 : 0)}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '8px',
                  transition: 'width 0.4s ease',
                }}>
                  {item.percentagem > 15 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0B0F19' }}>
                      {item.percentagem.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              {/* Contagem */}
              <div style={{ width: '80px', textAlign: 'right', fontSize: '12px', color: '#6B7280', flexShrink: 0 }}>
                {item.count} ({item.percentagem.toFixed(0)}%)
              </div>
            </div>
          ))}
        </div>

        {/* Legenda de cores */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: '5 acertos — Jackpot', color: '#FFD700' },
            { label: '4 acertos',           color: '#A855F7' },
            { label: '3 acertos',           color: '#3B82F6' },
            { label: '0–2 acertos',         color: '#00F5A0' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9CA3AF' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </Card>

      {/* Métricas adicionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Custo médio por aposta',        value: fmtKz(metricas.custoMedioPorAposta),     color: '#F3F4F6' },
          { label: 'Prémio médio (quando ganha)',   value: fmtKz(metricas.premioMedioQuandoGanha),  color: '#00F5A0' },
          { label: 'Total de apostas',              value: String(metricas.totalApostas),            color: '#F3F4F6' },
          { label: 'Melhor resultado',              value: `${metricas.melhorResultado} acertos`,   color: '#FFD700' },
        ].map(({ label, value, color }) => (
          <div key={label} style={metricCardStyle}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Comparação com mês anterior */}
      {comparacaoMesAnterior && (
        <Card title="📈 Comparação com mês anterior" icon={<span>📈</span>}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Variação do gasto',       value: comparacaoMesAnterior.variacaoGasto,      suffix: '%',    inverse: true  },
              { label: 'Variação do retorno',     value: comparacaoMesAnterior.variacaoRetorno,    suffix: '%',    inverse: false },
              { label: 'Variação taxa de acerto', value: comparacaoMesAnterior.variacaoTaxaAcerto, suffix: ' p.p.', inverse: false },
            ].map(({ label, value, suffix, inverse }) => {
              const positive = inverse ? value <= 0 : value >= 0;
              return (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontWeight: 900, fontSize: '18px', color: positive ? '#00F5A0' : '#FF4B4B' }}>
                    {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Observações inteligentes */}
      {observacoes.length > 0 && (
        <Card title="💡 Observações Inteligentes" icon={<span>💡</span>}>
          <div className="space-y-2">
            {observacoes.map((obs, idx) => (
              <p key={idx} style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.5 }}>{obs}</p>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
};

export default RelatorioMensal;
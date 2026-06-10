import { useState } from 'react';
import {
  MIN_STAKE_KZ,
  MAX_STAKE_KZ,
  TAX_FREE_KZ,
  TAX_RATE,
  MULTIPLIERS,
  NUMBERS_PER_CHANCE,
  CHANCE_LABELS,
  MAX_PRIZE_PER_CHANCE,
  calcularPremio,
  calcularPremioLiquido,
} from '../data/history';

type Modalidade = 'chance2' | 'chance3' | 'chance4' | 'chance5';

function fmtKz(n: number) {
  return n.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 });
}

// Dots visuais para representar acertos (●○)
function getDots(acertos: number, total: number) {
  return '●'.repeat(acertos) + '○'.repeat(total - acertos);
}

// Cor accent por modalidade
const MODALIDADE_COLORS: Record<Modalidade, { primary: string; glow: string; border: string }> = {
  chance2: { primary: '#60A5FA', glow: 'rgba(96,165,250,0.3)',  border: 'rgba(96,165,250,0.3)'  },
  chance3: { primary: '#00F5A0', glow: 'rgba(0,245,160,0.3)',   border: 'rgba(0,245,160,0.3)'   },
  chance4: { primary: '#F59E0B', glow: 'rgba(245,158,11,0.3)',  border: 'rgba(245,158,11,0.3)'  },
  chance5: { primary: '#EF4444', glow: 'rgba(239,68,68,0.3)',   border: 'rgba(239,68,68,0.3)'   },
};

const MODALIDADE_DESCRICAO: Record<Modalidade, string> = {
  chance2: 'Escolhe 2 números. Se os 2 saírem entre os 5 sorteados, ganhas.',
  chance3: 'Escolhe 3 números. Ganhas conforme quantos dos 3 saírem.',
  chance4: 'Escolhe 4 números. Mais difícil, prémios muito mais altos.',
  chance5: 'Escolhe 5 números. Se todos saírem — JACKPOT!',
};

export default function PrizeCalculator() {
  const [bet, setBet]               = useState<number>(100);
  const [modalidade, setModalidade] = useState<Modalidade>('chance5');
  const [acertosSelec, setAcertos]  = useState<number>(5);

  const numeros    = NUMBERS_PER_CHANCE[modalidade];
  const mults      = MULTIPLIERS[modalidade];
  const acertosMax = numeros;
  const colors     = MODALIDADE_COLORS[modalidade];

  // Garante que o nº de acertos seleccionado não excede o máximo da modalidade
  const acertosActivo = Math.min(acertosSelec, acertosMax);

  const premioBruto  = calcularPremio(modalidade, acertosActivo, bet);
  const premioLiq    = calcularPremioLiquido(premioBruto);
  const imposto      = premioBruto - premioLiq;
  const multiplicador = mults[acertosActivo] ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Selector de modalidade ─────────────────────────────────────── */}
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Modalidade
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {(['chance2', 'chance3', 'chance4', 'chance5'] as Modalidade[]).map(m => {
            const isActive = modalidade === m;
            const c = MODALIDADE_COLORS[m];
            return (
              <button
                key={m}
                onClick={() => { setModalidade(m); setAcertos(NUMBERS_PER_CHANCE[m]); }}
                style={{
                  padding: '10px 4px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: isActive ? `2px solid ${c.primary}` : '2px solid rgba(255,255,255,0.1)',
                  background: isActive
                    ? `linear-gradient(135deg, ${c.primary}22, ${c.primary}08)`
                    : 'rgba(255,255,255,0.04)',
                  color: isActive ? c.primary : '#6B7280',
                  boxShadow: isActive ? `0 0 12px ${c.glow}` : 'none',
                }}
              >
                <div style={{ fontSize: '1rem', marginBottom: '2px' }}>
                  {m === 'chance2' ? '2️⃣' : m === 'chance3' ? '3️⃣' : m === 'chance4' ? '4️⃣' : '5️⃣'}
                </div>
                {CHANCE_LABELS[m]}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '8px', lineHeight: 1.5 }}>
          {MODALIDADE_DESCRICAO[modalidade]}
        </p>
      </div>

      {/* ── Valor da aposta ────────────────────────────────────────────── */}
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Valor apostado
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="range"
            min={MIN_STAKE_KZ}
            max={MAX_STAKE_KZ}
            step={50}
            value={bet}
            onChange={e => setBet(Number(e.target.value))}
            style={{ flex: 1, accentColor: colors.primary }}
          />
          <span style={{
            width: '110px',
            textAlign: 'center',
            fontWeight: 900,
            fontSize: '1rem',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '8px 12px',
            color: colors.primary,
            fontFamily: 'monospace',
            flexShrink: 0,
          }}>
            {fmtKz(bet)}
          </span>
        </div>
        <p style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>
          Mín: {fmtKz(MIN_STAKE_KZ)} · Máx: {fmtKz(MAX_STAKE_KZ)} · Prémio máximo: <strong style={{ color: colors.primary }}>{fmtKz(MAX_PRIZE_PER_CHANCE[modalidade])}</strong>
        </p>
      </div>

      {/* ── Tabela de acertos da modalidade seleccionada ───────────────── */}
      <div style={{ overflowX: 'auto', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: `${colors.primary}12` }}>
              {['Aposta', 'Acertos', 'Multiplicador', 'Prémio bruto', 'Prémio líquido'].map((h, i) => (
                <th key={h} style={{
                  padding: '10px 14px',
                  textAlign: i >= 2 ? 'right' : 'left',
                  fontWeight: 700,
                  color: colors.primary,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Linha 0 acertos — sem prémio */}
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: '#6B7280', fontSize: '0.8rem' }}>{fmtKz(bet)}</td>
              <td style={{ padding: '9px 14px' }}>
                <span style={{ fontFamily: 'monospace', color: '#4B5563', letterSpacing: '2px' }}>{getDots(0, numeros)}</span>
                <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#6B7280' }}>0 acertos</span>
              </td>
              <td style={{ padding: '9px 14px', textAlign: 'right', color: '#4B5563', fontFamily: 'monospace' }}>×0</td>
              <td style={{ padding: '9px 14px', textAlign: 'right', color: '#4B5563', fontFamily: 'monospace' }}>—</td>
              <td style={{ padding: '9px 14px', textAlign: 'right', color: '#4B5563', fontFamily: 'monospace' }}>—</td>
            </tr>

            {/* Linhas com prémio */}
            {Object.entries(mults).map(([acStr, mult]) => {
              const ac        = parseInt(acStr);
              const bruto     = bet * mult;
              const liquido   = calcularPremioLiquido(bruto);
              const isActive  = ac === acertosActivo;
              const isJackpot = ac === acertosMax;
              const isLast    = ac === acertosMax;

              return (
                <tr
                  key={ac}
                  onClick={() => setAcertos(ac)}
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: isActive
                      ? `linear-gradient(90deg, ${colors.primary}18, ${colors.primary}06)`
                      : isJackpot
                      ? `${colors.primary}06`
                      : 'transparent',
                    borderLeft: isActive
                      ? `3px solid ${colors.primary}`
                      : `3px solid transparent`,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isJackpot ? `${colors.primary}06` : 'transparent'; }}
                >
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: '#D1D5DB', fontSize: '0.8rem' }}>
                    {fmtKz(bet)}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ fontFamily: 'monospace', color: isJackpot ? colors.primary : '#D1D5DB', letterSpacing: '2px' }}>
                      {getDots(ac, numeros)}
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#6B7280' }}>
                      {ac} {ac === 1 ? 'acerto' : 'acertos'}{isJackpot ? ' 🏆' : ''}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: colors.primary }}>
                    ×{mult.toLocaleString('pt-AO')}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#D1D5DB', fontSize: '0.8rem' }}>
                    {fmtKz(bruto)}
                  </td>
                  <td style={{
                    padding: '9px 14px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontWeight: isActive || isJackpot ? 700 : 400,
                    fontSize: isJackpot ? '1rem' : '0.875rem',
                    color: isJackpot ? colors.primary : isActive ? '#00F5A0' : '#9CA3AF',
                  }}>
                    {fmtKz(liquido)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Resumo da linha seleccionada ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

        {/* Prémio Bruto */}
        <div style={{
          background: 'rgba(17,24,39,0.8)',
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '6px' }}>
            Prémio Bruto
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.125rem', color: colors.primary, textShadow: `0 0 12px ${colors.glow}` }}>
            {premioBruto > 0 ? fmtKz(premioBruto) : '—'}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: '4px' }}>
            ×{multiplicador > 0 ? multiplicador.toLocaleString('pt-AO') : '0'}
          </div>
        </div>

        {/* Imposto */}
        <div style={{
          background: 'rgba(17,24,39,0.8)',
          border: `1px solid ${imposto > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(0,245,160,0.25)'}`,
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '6px' }}>
            Imposto (15%)
          </div>
          <div style={{
            fontWeight: 900,
            fontSize: '1rem',
            color: imposto > 0 ? '#EF4444' : '#00F5A0',
            textShadow: imposto > 0 ? '0 0 12px rgba(239,68,68,0.3)' : '0 0 12px rgba(0,245,160,0.3)',
          }}>
            {imposto > 0 ? `− ${fmtKz(imposto)}` : 'Isento ✓'}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: '4px' }}>
            {imposto > 0 ? `Excedente > ${fmtKz(TAX_FREE_KZ)}` : `≤ ${fmtKz(TAX_FREE_KZ)}`}
          </div>
        </div>

        {/* Prémio Líquido */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,245,160,0.1), rgba(0,245,160,0.03))',
          border: '1px solid rgba(0,245,160,0.35)',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '6px' }}>
            Prémio Líquido
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.125rem', color: '#fff', textShadow: '0 0 12px rgba(255,255,255,0.2)' }}>
            {premioLiq > 0 ? fmtKz(premioLiq) : '—'}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: '4px' }}>Valor a receber</div>
        </div>
      </div>

      {/* ── Nota legal ────────────────────────────────────────────────── */}
      <p style={{ fontSize: '0.72rem', color: '#6B7280', textAlign: 'center', lineHeight: 1.6 }}>
        Simulador para <strong style={{ color: '#9CA3AF' }}>{CHANCE_LABELS[modalidade]}</strong> ({numeros} números apostados).<br />
        Base no {' '}<strong style={{ color: '#9CA3AF' }}>Decreto Executivo n.º 695/25</strong> · Isenção fiscal: ≤ {fmtKz(TAX_FREE_KZ)} · Taxa: 15% sobre excedente.
      </p>
    </div>
  );
}
import { useState } from 'react';
import { MIN_STAKE_KZ, MAX_STAKE_KZ, TAX_FREE_KZ, TAX_RATE } from '../data/history';

function fmtKz(n: number) {
  return n.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 });
}

const MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 10,
  3: 120,
  4: 5000,
  5: 100000,
};

const getDots = (hits: number) => {
  const filled = '●';
  const empty = '○';
  return filled.repeat(hits) + empty.repeat(5 - hits);
};

export default function PrizeCalculator() {
  const [bet, setBet] = useState<number>(50);
  const [hits, setHits] = useState<1 | 2 | 3 | 4 | 5>(5);

  const multiplier = MULTIPLIERS[hits];
  const gross = bet * multiplier;
  const tax = gross > TAX_FREE_KZ ? (gross - TAX_FREE_KZ) * TAX_RATE : 0;
  const net = gross - tax;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Valor da aposta */}
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px', color: '#D1D5DB' }}>
          Valor apostado (Kz)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="range"
            min={MIN_STAKE_KZ}
            max={MAX_STAKE_KZ}
            step={50}
            value={bet}
            onChange={e => setBet(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#00F5A0' }}
          />
          <span style={{
            width: '100px',
            textAlign: 'center',
            fontWeight: 900,
            fontSize: '1.125rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '8px 12px',
            color: '#00F5A0',
            fontFamily: 'monospace',
          }}>
            {fmtKz(bet)}
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
          Mín: {fmtKz(MIN_STAKE_KZ)} · Máx: {fmtKz(MAX_STAKE_KZ)}
        </p>
      </div>

      {/* Chance 5 header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))',
        border: '1px solid rgba(220,38,38,0.3)',
        borderRadius: '16px',
        padding: '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>
          Escolha a sua chance
        </div>
        <div style={{ fontWeight: 900, fontSize: '1.75rem', color: '#EF4444', margin: '4px 0' }}>
          Chance 5
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Apostar em 5 números</div>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
              {['Valor da aposta', 'Acertos', 'Multiplicador', 'Prémio'].map((h, i) => (
                <th key={h} style={{
                  padding: '10px 16px',
                  textAlign: i === 3 ? 'right' : 'left',
                  fontWeight: 700,
                  color: '#9CA3AF',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(h => {
              const mult = MULTIPLIERS[h];
              const isSelected = hits === h;
              const isJackpot = h === 5;
              return (
                <tr
                  key={h}
                  onClick={() => setHits(h as 1 | 2 | 3 | 4 | 5)}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: isSelected
                      ? 'linear-gradient(90deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))'
                      : isJackpot
                      ? 'rgba(255,215,0,0.03)'
                      : 'transparent',
                    borderLeft: isSelected ? '3px solid #FFD700' : isJackpot ? '3px solid rgba(255,215,0,0.3)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isJackpot ? 'rgba(255,215,0,0.03)' : 'transparent'; }}
                >
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#D1D5DB' }}>
                    {fmtKz(bet)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: '1.1rem',
                      letterSpacing: '2px',
                      fontFamily: 'monospace',
                      color: isJackpot ? '#FFD700' : '#D1D5DB',
                    }}>{getDots(h)}</span>
                    <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#6B7280' }}>
                      {h} {h === 1 ? 'ponto' : 'pontos'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#EF4444' }}>
                    ×{mult.toLocaleString('pt-AO')}
                  </td>
                  <td style={{
                    padding: '10px 16px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: isJackpot ? '#FFD700' : isSelected ? '#00F5A0' : '#D1D5DB',
                    fontSize: isJackpot ? '1rem' : '0.875rem',
                  }}>
                    {fmtKz(bet * mult)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumo — 3 cards glass */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
      }}>
        {/* Prémio Bruto */}
        <div style={{
          background: 'rgba(17,24,39,0.8)',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '6px' }}>
            Prémio Bruto
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#FFD700', textShadow: '0 0 12px rgba(255,215,0,0.4)' }}>
            {fmtKz(gross)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>
            ×{multiplier.toLocaleString('pt-AO')}
          </div>
        </div>

        {/* Imposto */}
        <div style={{
          background: 'rgba(17,24,39,0.8)',
          border: `1px solid ${tax > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(0,245,160,0.25)'}`,
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '6px' }}>
            Imposto (15%)
          </div>
          <div style={{
            fontWeight: 900,
            fontSize: '1.1rem',
            color: tax > 0 ? '#EF4444' : '#00F5A0',
            textShadow: tax > 0 ? '0 0 12px rgba(239,68,68,0.3)' : '0 0 12px rgba(0,245,160,0.3)',
          }}>
            {tax > 0 ? `− ${fmtKz(tax)}` : 'Isento'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>
            {tax > 0 ? `Sobre excedente > ${fmtKz(TAX_FREE_KZ)}` : `≤ ${fmtKz(TAX_FREE_KZ)}`}
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
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', marginBottom: '6px' }}>
            Prémio Líquido
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#fff', textShadow: '0 0 12px rgba(255,255,255,0.2)' }}>
            {fmtKz(net)}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>Valor a receber</div>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: '#6B7280', textAlign: 'center', lineHeight: 1.6 }}>
        Simulador para <strong style={{ color: '#9CA3AF' }}>Chance 5</strong> (aposta em 5 números).<br />
        Base no Decreto Executivo n.º 695/25 · Isenção: ≤ {fmtKz(TAX_FREE_KZ)} · Taxa: 15% sobre excedente.
      </p>
    </div>
  );
}
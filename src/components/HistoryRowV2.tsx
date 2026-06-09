// ============================================================
// HistoryRowV2.tsx
// Peça 6 — Card de linha do histórico de apostas
// Substitui o design actual das linhas da tabela
// ============================================================

import React, { useState, useEffect } from 'react';
import ChromeBall from './ChromeBall';

export type HistoryStatus = 'pending' | 'verified' | 'prize';

interface HistoryRowV2Props {
  /** Identificador único da sessão */
  id: string;
  /** Data do sorteio formatada */
  date: string;
  /** Números gerados (5 bolas) */
  numbers: number[];
  /** Resultado oficial (quando consolidado) */
  officialResult?: number[] | null;
  /** Acertos confirmados */
  hits?: number | null;
  /** Status da sessão */
  status: HistoryStatus;
  /** Nome da sessão: Fezada, Aqueceu, Kazola, Eskebra */
  sessionLabel: string;
  /** Método usado para gerar */
  method: string;
  /** Se foi acabado de consolidar (activa flash) */
  isNew?: boolean;
  /** Callback para consolidar (opcional) */
  onConsolidate?: (id: string) => void;
  /** Classe CSS adicional */
  className?: string;
}

// Mapeia status para configuração do badge
const statusConfig: Record<HistoryStatus, { label: string; className: string; icon: string }> = {
  pending: {
    label: 'PENDENTE',
    className: 'badge-pending',
    icon: '⏳',
  },
  verified: {
    label: 'VERIFICADO',
    className: 'badge-verified',
    icon: '✅',
  },
  prize: {
    label: '🏆 PREMIADO',
    className: 'badge-prize',
    icon: '🏆',
  },
};

// Mapeia sessão para cor e ícone
const sessionConfig: Record<string, { color: string; icon: string }> = {
  Fezada: { color: '#FF6B6B', icon: '☀️' },
  Aqueceu: { color: '#FF9F4A', icon: '🔥' },
  Kazola: { color: '#00F5A0', icon: '🌙' },
  Eskebra: { color: '#A855F7', icon: '⚡' },
  default: { color: '#9CA3AF', icon: '🎲' },
};

const HistoryRowV2: React.FC<HistoryRowV2Props> = ({
  id,
  date,
  numbers,
  officialResult = null,
  hits = null,
  status,
  sessionLabel,
  method,
  isNew = false,
  onConsolidate,
  className = '',
}) => {
  const [flash, setFlash] = useState(isNew);
  const sessionConfigItem = sessionConfig[sessionLabel] || sessionConfig.default;

  // Gerencia o flash quando isNew muda
  useEffect(() => {
    if (isNew) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  // Calcula quais números do resultado oficial estão em comum com os gerados
  const commonNumbers = officialResult 
    ? numbers.filter(n => officialResult.includes(n))
    : [];

  const hitsDisplay = hits !== null ? hits : commonNumbers.length;

  // Formata método para exibição (capitaliza primeira letra)
  const formatMethod = (meth: string): string => {
    const methodMap: Record<string, string> = {
      equilibrado: 'Equilibrado',
      kazola: 'Kazola',
      frequencia: 'Frequência',
      montecarlo: 'Monte Carlo',
    };
    return methodMap[meth.toLowerCase()] || meth;
  };

  return (
    <div
      className={`glass-card hover-lift fade-in-up ${flash ? 'update-flash' : ''} ${className}`}
      style={{
        padding: '16px',
        marginBottom: '12px',
        transition: 'all 0.25s ease',
      }}
      data-history-id={id}
    >
      {/* Linha superior: Data + Badge de status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>📅</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#E5E7EB' }}>{date}</span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '20px',
              background: `${sessionConfigItem.color}20`,
              color: sessionConfigItem.color,
              border: `1px solid ${sessionConfigItem.color}40`,
            }}
          >
            {sessionConfigItem.icon} {sessionLabel}
          </span>
        </div>
        <div className={statusConfig[status].className} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>{statusConfig[status].icon}</span>
          <span>{statusConfig[status].label}</span>
        </div>
      </div>

      {/* Linha do meio: Números gerados */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🎲 Números jogados
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {numbers.map((n, idx) => (
            <ChromeBall
              key={`gen-${idx}`}
              n={n}
              size="sm"
              variant="normal"
              animated={false}
            />
          ))}
        </div>
      </div>

      {/* Resultado oficial (se existir) */}
      {officialResult && officialResult.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📋 Resultado oficial
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {officialResult.map((n, idx) => {
              const isHit = commonNumbers.includes(n);
              return (
                <ChromeBall
                  key={`off-${idx}`}
                  n={n}
                  size="sm"
                  variant={isHit ? 'hit' : 'normal'}
                  animated={false}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Linha inferior: Método + Acertos + Botão consolidar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
            📐 {formatMethod(method)}
          </span>
          {status !== 'pending' && (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: hitsDisplay >= 3 ? '#00F5A0' : hitsDisplay >= 2 ? '#FFD700' : '#FF4B4B',
              }}
            >
              🎯 {hitsDisplay} acerto{hitsDisplay !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Botão consolidar (apenas para pending) */}
        {status === 'pending' && onConsolidate && (
          <button
            onClick={() => onConsolidate(id)}
            style={{
              background: 'linear-gradient(135deg, #00F5A0, #00C896)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#0B0F19',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 245, 160, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            ✅ Consolidar
          </button>
        )}

        {/* Badge de prémio (se prize) */}
        {status === 'prize' && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FFD70020, #FFD70005)',
              padding: '4px 10px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              color: '#FFD700',
            }}
          >
            💰 Prémio pendente
          </span>
        )}
      </div>
    </div>
  );
};

export default HistoryRowV2;
// ============================================================
// MetricsStrip.tsx
// Peça 5 — Faixa horizontal com 4 cartões de métricas em tempo real
// Aparece abaixo do hero, acima do gerador
// ============================================================

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: string;
  color: 'blue' | 'green' | 'gold' | 'red';
  delay: number;
}

interface MetricsStripProps {
  /** Total de sessões validadas */
  totalSessions?: number;
  /** Percentagem de acertos ≥2 (0-100) */
  winRate?: number;
  /** Média de acertos (0-5) */
  avgHits?: number;
  /** Retorno simulado em Kz */
  totalReturn?: number;
  /** Classe CSS adicional */
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  icon,
  color,
  delay,
}) => {
  // Mapeia cor para classes e estilos
  const colorMap = {
    blue: {
      glowClass: 'text-glow-blue',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)',
    },
    green: {
      glowClass: 'text-glow-green',
      borderColor: 'rgba(0, 245, 160, 0.3)',
      boxShadow: '0 0 15px rgba(0, 245, 160, 0.2)',
    },
    gold: {
      glowClass: 'text-glow-gold',
      borderColor: 'rgba(255, 215, 0, 0.3)',
      boxShadow: '0 0 15px rgba(255, 215, 0, 0.2)',
    },
    red: {
      glowClass: 'text-glow-red',
      borderColor: 'rgba(255, 75, 75, 0.3)',
      boxShadow: '0 0 15px rgba(255, 75, 75, 0.2)',
    },
  };

  const colors = colorMap[color];

  return (
    <div
      className="metric-card glass-card hover-lift fade-in-up"
      style={{
        animationDelay: `${delay}ms`,
        borderColor: colors.borderColor,
        transition: 'all 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Ícone */}
        <div
          style={{
            fontSize: '28px',
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${colors.borderColor}40, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1 }}>
          <div className="metric-label" style={{ marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
            <span className={`metric-value ${colors.glowClass}`} style={{ fontSize: '28px', fontWeight: 800 }}>
              {value}
            </span>
            {unit && (
              <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover effect inline style */}
      <style>{`
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: ${colors.boxShadow};
        }
      `}</style>
    </div>
  );
};

const MetricsStrip: React.FC<MetricsStripProps> = ({
  totalSessions = 0,
  winRate = 0,
  avgHits = 0,
  totalReturn = 0,
  className = '',
}) => {
  // Formata número com separadores
  const formatNumber = (num: number): string => {
    return num.toLocaleString('pt-AO');
  };

  // Prepara os dados dos cartões
  const metrics = [
    {
      label: 'SESSÕES VALIDADAS',
      value: formatNumber(totalSessions),
      unit: '',
      icon: '📊',
      color: 'blue' as const,
      delay: 0,
    },
    {
      label: 'TAXA DE ACERTO ≥2',
      value: winRate,
      unit: '%',
      icon: '🎯',
      color: 'green' as const,
      delay: 100,
    },
    {
      label: 'MÉDIA DE ACERTOS',
      value: avgHits.toFixed(1),
      unit: '/5',
      icon: '⭐',
      color: 'gold' as const,
      delay: 200,
    },
    {
      label: 'RETORNO SIMULADO',
      value: formatNumber(totalReturn),
      unit: 'Kz',
      icon: '💰',
      color: 'red' as const,
      delay: 300,
    },
  ];

  return (
    <div
      className={`metrics-strip ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        width: '100%',
      }}
    >
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          label={metric.label}
          value={metric.value}
          unit={metric.unit}
          icon={metric.icon}
          color={metric.color}
          delay={metric.delay}
        />
      ))}

      {/* Responsive: mobile 2x2 */}
      <style>{`
        @media (max-width: 768px) {
          .metrics-strip {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MetricsStrip;
// ============================================================
// MethodCard.tsx
// Peça 3 — Card de método de geração com fio luminoso
// Substitui os botões do gerador actual
// ============================================================

import React from 'react';

export type MethodId = 'equilibrado' | 'kazola' | 'frequencia' | 'montecarlo';

interface MethodCardProps {
  /** Identificador único do método */
  id: MethodId;
  /** Nome a mostrar */
  name: string;
  /** Descrição curta */
  description: string;
  /** Emoji do método */
  icon: string;
  /** Cor hex do método para os glows */
  color: string;
  /** Se requer Premium */
  premium?: boolean;
  /** Se está seleccionado/activo */
  selected?: boolean;
  /** Se está bloqueado (Premium + sem acesso) */
  locked?: boolean;
  /** Callback ao clicar */
  onSelect?: (id: MethodId) => void;
  /** Classe CSS adicional */
  className?: string;
}

const MethodCard: React.FC<MethodCardProps> = ({
  id,
  name,
  description,
  icon,
  color,
  premium = false,
  selected = false,
  locked = false,
  onSelect,
  className = '',
}) => {
  const handleClick = () => {
    if (!locked && onSelect) {
      onSelect(id);
    }
  };

  // Classes base do card
  const cardClasses = [
    'method-card',
    selected ? 'glow-border-active' : '',
    locked ? 'premium-locked' : 'hover-lift',
    className,
  ].filter(Boolean).join(' ');

  // Estilo inline para a cor do método
  const glowStyle = selected ? {
    boxShadow: `0 0 15px ${color}, inset 0 0 5px ${color}40`,
  } : {};

  return (
    <div
      className={cardClasses}
      style={{
        ...glowStyle,
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.6 : 1,
        background: selected ? `linear-gradient(135deg, ${color}10, ${color}05)` : undefined,
      }}
      onClick={handleClick}
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-label={`Método ${name}${premium ? ' Premium' : ''}${selected ? ' activo' : ''}`}
      aria-disabled={locked}
    >
      {/* Ícone com fundo colorido */}
      <div
        className="method-icon"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          marginBottom: '12px',
          border: `1px solid ${color}40`,
        }}
      >
        {icon}
      </div>

      {/* Nome do método */}
      <div className="method-name" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
        {name}
        {premium && !locked && (
          <span className="badge-premium" style={{ marginLeft: '8px' }}>
            ⭐ PREMIUM
          </span>
        )}
      </div>

      {/* Descrição */}
      <div className="method-description" style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
        {description}
      </div>

      {/* Indicador de método activo (quando seleccionado) */}
      {selected && (
        <div
          className="active-indicator"
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#00F5A0',
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: '8px',
              height: '8px',
              background: '#00F5A0',
              borderRadius: '50%',
              animation: 'pulse-green 1.5s infinite',
            }}
          />
          MÉTODO ACTIVO
        </div>
      )}

      {/* Badge bloqueado (quando locked) */}
      {locked && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0,0,0,0.7)',
            padding: '4px 8px',
            borderRadius: '20px',
            fontSize: '0.65rem',
            fontWeight: 600,
            color: '#FFD700',
            border: '1px solid #FFD70040',
          }}
        >
          🔒 PREMIUM
        </div>
      )}
    </div>
  );
};

export default MethodCard;
// ============================================================
// Speedometer.tsx
// Peça 4 — Velocímetro semicircular com agulha animada e partículas
// Elemento mais viciante do app — mostra win rate visualmente
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SpeedometerProps {
  /** Valor actual de acertos (0 a 5) */
  hits: number;
  /** Valor máximo (default: 5) */
  max?: number;
  /** Chave que muda para disparar animação da agulha + partículas */
  animateKey?: number;
  /** Tamanho do SVG (largura e altura) */
  size?: number;
}

const Speedometer: React.FC<SpeedometerProps> = ({
  hits,
  max = 5,
  animateKey = 0,
  size = 280,
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; tx: string; ty: string }>>([]);
  const [previousAnimateKey, setPreviousAnimateKey] = useState(animateKey);
  const [needleAnimate, setNeedleAnimate] = useState(false);
  const particleCounterRef = useRef(0);

  // Dimensões do SVG
  const centerX = size / 2;
  const centerY = size / 2 + 15;
  const radius = size * 0.32;
  const startAngle = 180;
  const endAngle = 360;
  const angleRange = endAngle - startAngle;

  // Cores dos segmentos (do mais baixo ao mais alto)
  const segmentColors = [
    '#FF4B4B', // 0-1 acertos
    '#FF8A3D', // 1-2 acertos
    '#FFD700', // 2-3 acertos
    '#7CE36A', // 3-4 acertos
    '#00F5A0', // 4-5 acertos
  ];

  // Calcula o ângulo da agulha (0 hits = 180°, max hits = 360°)
  const needleAngle = startAngle + (hits / max) * angleRange;
  const needleRad = (needleAngle - 90) * (Math.PI / 180);

  // Coordenadas da ponta da agulha
  const needleLength = radius + 15;
  const needleX = centerX + needleLength * Math.cos(needleRad);
  const needleY = centerY + needleLength * Math.sin(needleRad);

  // Gera arco SVG para um segmento
  const getArcPath = (startDeg: number, endDeg: number, radiusVal: number, innerRadius = 0) => {
    const startRad = (startDeg - 90) * (Math.PI / 180);
    const endRad = (endDeg - 90) * (Math.PI / 180);
    
    const x1 = centerX + radiusVal * Math.cos(startRad);
    const y1 = centerY + radiusVal * Math.sin(startRad);
    const x2 = centerX + radiusVal * Math.cos(endRad);
    const y2 = centerY + radiusVal * Math.sin(endRad);
    
    const largeArcFlag = endDeg - startDeg <= 180 ? 0 : 1;
    
    if (innerRadius === 0) {
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radiusVal} ${radiusVal} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    } else {
      const x1i = centerX + innerRadius * Math.cos(startRad);
      const y1i = centerY + innerRadius * Math.sin(startRad);
      const x2i = centerX + innerRadius * Math.cos(endRad);
      const y2i = centerY + innerRadius * Math.sin(endRad);
      return `M ${x1} ${y1} A ${radiusVal} ${radiusVal} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1i} ${y1i} Z`;
    }
  };

  // Gera as partículas quando há acertos ≥ 3
  const generateParticles = useCallback(() => {
    const newParticles = [];
    const particleCount = 24;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 60;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 30;
      
      newParticles.push({
        id: particleCounterRef.current++,
        tx: `${tx}px`,
        ty: `${ty}px`,
      });
    }
    
    setParticles(newParticles);
    
    // Remove partículas após 1.3 segundos
    setTimeout(() => {
      setParticles([]);
    }, 1300);
  }, []);

  // Detecta mudança no animateKey para disparar animação
  useEffect(() => {
    if (animateKey !== previousAnimateKey) {
      setPreviousAnimateKey(animateKey);
      setNeedleAnimate(true);
      
      if (hits >= 3) {
        generateParticles();
      }
      
      // Remove classe de animação após 0.5s
      setTimeout(() => {
        setNeedleAnimate(false);
      }, 500);
    }
  }, [animateKey, previousAnimateKey, hits, generateParticles]);

  // Renderiza as marcas de escala
  const renderTickMarks = () => {
    const ticks = [];
    for (let i = 0; i <= 5; i++) {
      const angle = startAngle + (i / 5) * angleRange;
      const rad = (angle - 90) * (Math.PI / 180);
      const innerRadiusVal = radius - 12;
      const outerRadiusVal = radius + 4;
      
      const x1 = centerX + innerRadiusVal * Math.cos(rad);
      const y1 = centerY + innerRadiusVal * Math.sin(rad);
      const x2 = centerX + outerRadiusVal * Math.cos(rad);
      const y2 = centerY + outerRadiusVal * Math.sin(rad);
      
      ticks.push(
        <line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    }
    return ticks;
  };

  // Renderiza os números das marcas
  const renderTickLabels = () => {
    const labels = [];
    for (let i = 0; i <= 5; i++) {
      const angle = startAngle + (i / 5) * angleRange;
      const rad = (angle - 90) * (Math.PI / 180);
      const labelRadius = radius + 18;
      
      const x = centerX + labelRadius * Math.cos(rad);
      const y = centerY + labelRadius * Math.sin(rad) + 5;
      
      labels.push(
        <text
          key={`label-${i}`}
          x={x}
          y={y}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="12"
          fontWeight="bold"
        >
          {i}
        </text>
      );
    }
    return labels;
  };

  return (
    <div className="speedometer-container" style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Glow para os segmentos */}
          <filter id="segmentGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feMerge>
              <feMergeNode in="offsetblur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Glow para a agulha */}
          <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feMerge>
              <feMergeNode in="offsetblur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Fundo do semicírculo */}
        <path
          d={getArcPath(startAngle, endAngle, radius)}
          fill="rgba(30, 35, 50, 0.5)"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />

        {/* Segmentos coloridos */}
        {segmentColors.map((color, index) => {
          const segmentStart = startAngle + (index / segmentColors.length) * angleRange;
          const segmentEnd = startAngle + ((index + 1) / segmentColors.length) * angleRange;
          const isActive = (index + 1) <= Math.ceil(hits);
          
          return (
            <path
              key={`segment-${index}`}
              d={getArcPath(segmentStart, segmentEnd, radius, radius - 18)}
              fill={color}
              opacity={isActive ? 0.9 : 0.2}
              filter={isActive ? 'url(#segmentGlow)' : undefined}
              style={{ transition: 'opacity 0.4s ease' }}
            />
          );
        })}

        {/* Marcas de escala */}
        {renderTickMarks()}
        {renderTickLabels()}

        {/* Agulha */}
        <g filter="url(#needleGlow)">
          <line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke="#00F5A0"
            strokeWidth="3"
            strokeLinecap="round"
            className={needleAnimate ? 'speedo-needle animate' : 'speedo-needle'}
            style={{
              transformOrigin: `${centerX}px ${centerY}px`,
              transition: 'transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)',
            }}
          />
        </g>

        {/* Ponto central — círculo exterior */}
        <circle
          cx={centerX}
          cy={centerY}
          r="12"
          fill="#1A1F2E"
          stroke="#00F5A0"
          strokeWidth="2"
        />
        
        {/* Ponto central — círculo interior */}
        <circle
          cx={centerX}
          cy={centerY}
          r="6"
          fill="#00F5A0"
        />

        {/* Leitura central — número de acertos */}
        <text
          x={centerX}
          y={centerY - 25}
          textAnchor="middle"
          fill="#00F5A0"
          fontSize="36"
          fontWeight="800"
          fontFamily="monospace"
          style={{ textShadow: '0 0 10px rgba(0, 245, 160, 0.5)' }}
        >
          {hits}
        </text>
        
        {/* Leitura central — barra "/5" */}
        <text
          x={centerX + 28}
          y={centerY - 18}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.4)"
          fontSize="16"
          fontWeight="600"
        >
          /5
        </text>
        
        {/* Label abaixo */}
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.5)"
          fontSize="10"
          fontWeight="600"
          letterSpacing="2"
        >
          ACERTOS
        </text>
      </svg>

      {/* Partículas */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            position: 'absolute',
            left: `${centerX}px`,
            top: `${centerY - 20}px`,
            '--dx': particle.tx,
            '--dy': particle.ty,
            transform: `translate(${particle.tx}, ${particle.ty})`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default Speedometer;
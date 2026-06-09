import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface ChromeBallProps {
  n: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'normal' | 'hot' | 'cold' | 'hit' | 'premium';
  animated?: boolean;
  delay?: number;
  onClick?: () => void;
  excluded?: boolean;
  glowing?: boolean;
}

const ChromeBall: React.FC<ChromeBallProps> = ({
  n,
  size = 'md',
  variant = 'normal',
  animated = true,
  delay = 0,
  onClick,
  excluded = false,
  glowing = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const sizeMap = { sm: 36, md: 48, lg: 64 };
  const px = sizeMap[size];

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setAnimateIn(true), delay);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(true);
    }
  }, [animated, delay]);

  /* ── Gradientes por variante ── */
  const getGradient = () => {
    switch (variant) {
      case 'hot':     return 'radial-gradient(circle at 32% 32%, #FF9A8B, #FF4B4B 45%, #CC1A1A)';
      case 'cold':    return 'radial-gradient(circle at 32% 32%, #A8CFFF, #4A90E2 45%, #1A4FAA)';
      case 'hit':     return 'radial-gradient(circle at 32% 32%, #86EFAC, #22C55E 45%, #15803D)';
      case 'premium': return 'radial-gradient(circle at 32% 32%, #FFF176, #FFD700 45%, #B8860B)';
      default:        return 'radial-gradient(circle at 32% 32%, #FFF9C4, #FFD700 45%, #B8860B)';
    }
  };

  /* ── Cores de brilho ── */
  const getGlowColor = () => {
    switch (variant) {
      case 'hot':     return 'rgba(255, 75, 75, 0.75)';
      case 'cold':    return 'rgba(74, 144, 226, 0.75)';
      case 'hit':     return 'rgba(34, 197, 94, 0.75)';
      case 'premium': return 'rgba(255, 215, 0, 0.9)';
      default:        return 'rgba(255, 215, 0, 0.7)';
    }
  };

  /* ── Cor do texto ── */
  const getTextColor = () => {
    if (variant === 'cold') return '#fff';
    if (variant === 'hot')  return '#fff';
    if (variant === 'hit')  return '#fff';
    return '#1a1000'; // dourado → texto escuro
  };

  /* ── Highlight interno (brilho de esfera) ── */
  const getHighlight = () => 'inset 0 2px 6px rgba(255,255,255,0.75), inset 0 -2px 4px rgba(0,0,0,0.25)';

  /* ── Box-shadow final ── */
  const getBoxShadow = () => {
    const glow = getGlowColor();
    const highlight = getHighlight();
    if (excluded) return `${highlight}, 0 2px 6px rgba(0,0,0,0.4)`;
    if (isHovered || glowing) {
      return `${highlight}, 0 0 18px ${glow}, 0 0 36px ${glow.replace('0.75', '0.35')}, 0 4px 12px rgba(0,0,0,0.5)`;
    }
    // estado normal — ainda tem brilho suave
    return `${highlight}, 0 0 8px ${glow.replace('0.75', '0.5')}, 0 0 0 1.5px ${glow.replace('0.75', '0.3')}, 0 3px 8px rgba(0,0,0,0.4)`;
  };

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
    onClick?.();
  };

  const fontSize =
    size === 'sm' ? '0.8rem' :
    size === 'md' ? '1.1rem' :
    '1.5rem';

  return (
    <motion.div
      initial={animated ? { scale: 0, rotate: -180, opacity: 0 } : false}
      animate={animateIn ? { scale: 1, rotate: 0, opacity: 1 } : {}}
      transition={{ type: 'spring', stiffness: 420, damping: 16, delay: delay / 1000 }}
      whileHover={{
        scale: 1.18,
        rotate: [0, -6, 6, -4, 4, 0],
        transition: { duration: 0.35 },
      }}
      whileTap={{ scale: 0.93 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: getGradient(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize,
        color: getTextColor(),
        textShadow: variant === 'normal' || variant === 'premium'
          ? '0 1px 0 rgba(255,255,255,0.6)'
          : '0 1px 3px rgba(0,0,0,0.4)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: getBoxShadow(),
        opacity: excluded ? 0.35 : 1,
        filter: excluded
          ? 'grayscale(0.6) brightness(0.7)'
          : isClicked
          ? 'brightness(1.35)'
          : 'none',
        transition: 'box-shadow 0.2s ease, filter 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── Specular highlight (reflexo branco no topo) ── */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '18%',
          width: '38%',
          height: '22%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
          transform: 'rotate(-30deg)',
          opacity: excluded ? 0.3 : 0.85,
        }}
      />

      {/* ── Shimmer ao hover / glowing ── */}
      {(isHovered || glowing) && !excluded && (
        <motion.div
          initial={{ x: '-120%', y: '-120%', rotate: 45 }}
          animate={{ x: '220%', y: '220%' }}
          transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 1.8 }}
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.35), transparent)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Anel pulsante para hot / premium ── */}
      {(variant === 'hot' || variant === 'premium') && !excluded && (
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: delay / 1000 }}
          style={{
            position: 'absolute',
            inset: -5,
            borderRadius: '50%',
            border: `2px solid ${getGlowColor()}`,
            pointerEvents: 'none',
          }}
        />
      )}

      <span style={{ position: 'relative', zIndex: 1, letterSpacing: '-0.02em' }}>
        {String(n).padStart(2, '0')}
      </span>
    </motion.div>
  );
};

export default ChromeBall;
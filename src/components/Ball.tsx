import type { CSSProperties } from 'react';

interface BallProps {
  n        : number;
  size?    : 'xs' | 'sm' | 'md' | 'lg';
  animated?: boolean;
  delay?   : number;
  variant? : 'default' | 'hot' | 'cold';
}

const sizes = {
  xs: 'w-7 h-7 text-[11px]',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-xl font-bold',
};

export default function Ball({ n, size = 'md', animated = false, delay = 0, variant = 'default' }: BallProps) {
  const label = String(n).padStart(2, '0');
  let cls = '';
  const style: CSSProperties = animated ? { animationDelay: `${delay}ms` } : {};

  if (variant === 'hot') {
    cls = 'bg-gradient-to-br from-[#CC0000] to-[#FF6600] text-white shadow-[0_2px_8px_rgba(204,0,0,0.4)]';
  } else if (variant === 'cold') {
    cls = 'bg-gradient-to-br from-[#0055AA] to-[#0099CC] text-white shadow-[0_2px_8px_rgba(0,85,170,0.3)]';
  } else {
    const decade = Math.floor((n - 1) / 10);
    const palettes = [
      'bg-white text-[#CC0000] ring-2 ring-[#CC0000]',
      'bg-[#CC0000] text-white',
      'bg-[#F0C040] text-[#0A0A0A]',
      'bg-[#0A0A0A] text-white',
      'bg-[#1A6B3A] text-white',
      'bg-white text-[#0A0A0A] ring-2 ring-[#0A0A0A]',
      'bg-[#CC0000] text-[#F0C040]',
      'bg-[#F0C040] text-[#CC0000]',
      'bg-[#0A0A0A] text-[#F0C040]',
    ];
    cls = palettes[decade] ?? palettes[0];
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-display font-bold select-none ${sizes[size]} ${cls} ${animated ? 'ball-drop' : ''}`}
      style={style}
      aria-label={`Número ${n}`}
    >
      {label}
    </span>
  );
}
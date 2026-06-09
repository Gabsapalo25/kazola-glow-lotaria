import type { ReactNode } from 'react';

interface CardProps {
  title?     : string;
  subtitle?  : string;
  icon?      : ReactNode;
  children   : ReactNode;
  className? : string;
  id?        : string;
}

export default function Card({ title, subtitle, icon, children, className = '', id }: CardProps) {
  return (
    <div 
      id={id} 
      className={className}
      style={{
        background: 'rgba(17, 24, 39, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
      }}
    >
      {(title || icon) && (
        <div 
          style={{
            padding: '20px 20px 16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          {icon && (
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && (
              <h2 
                style={{
                  fontWeight: 800,
                  fontSize: '1.125rem',
                  lineHeight: 1.3,
                  color: '#F3F4F6',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p 
                style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginTop: '4px',
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}
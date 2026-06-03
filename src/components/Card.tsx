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
    <div id={id} className={`rounded-3xl bg-white ring-1 ring-neutral-200 shadow-sm overflow-hidden ${className}`}>
      {(title || icon) && (
        <div className="px-5 pt-5 pb-4 border-b border-neutral-100 flex items-start gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-xl shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {title && (
              <h2 className="font-display font-bold text-lg leading-tight text-neutral-900">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-neutral-500 mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
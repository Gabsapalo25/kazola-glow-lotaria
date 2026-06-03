import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open    : boolean;
  onClose : () => void;
  title   : string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal
      aria-labelledby="modal-title"
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl fade-in outline-none"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <h2 id="modal-title" className="font-display font-bold text-xl text-neutral-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 transition flex items-center justify-center text-xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 space-y-3 text-neutral-700 leading-relaxed text-[15px]">
          {children}
        </div>
      </div>
    </div>
  );
}
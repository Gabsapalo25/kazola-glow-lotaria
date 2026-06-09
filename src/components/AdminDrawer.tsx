// ============================================================
// AdminDrawer.tsx
// Peça 8 — Painel lateral secreto para administrador
// Atalho: Ctrl + Shift + A
// TODO: adicionar PIN de acesso na v2
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import ChromeBall from './ChromeBall';

export interface PendingSession {
  id: string;
  date: string;
  numbers: number[];
  sessionLabel: string;
}

interface AdminDrawerProps {
  /** Sessões pendentes de consolidação */
  pendingSessions: PendingSession[];
  /** Callback para consolidar uma sessão */
  onConsolidate: (id: string, result: number[], hits: number) => void;
  /** Controlo externo da visibilidade (opcional) */
  isVisible?: boolean;
  /** Callback para fechar */
  onClose?: () => void;
}

interface SessionResult {
  resultInput: string;
  hits: number;
  error: string;
}

const AdminDrawer: React.FC<AdminDrawerProps> = ({
  pendingSessions,
  onConsolidate,
  isVisible: externalVisible,
  onClose,
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const [sessionResults, setSessionResults] = useState<Record<string, SessionResult>>({});

  // Determina visibilidade (externa ou interna)
  const isVisible = externalVisible !== undefined ? externalVisible : internalVisible;

  // Função para fechar o drawer
  const closeDrawer = useCallback(() => {
    if (onClose) {
      onClose();
    }
    setInternalVisible(false);
  }, [onClose]);

  // Função para abrir o drawer
  const openDrawer = useCallback(() => {
    setInternalVisible(true);
  }, []);

  // Toggle do drawer
  const toggleDrawer = useCallback(() => {
    if (isVisible) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isVisible, closeDrawer, openDrawer]);

  // Listener do atalho Ctrl + Shift + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleDrawer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleDrawer]);

  // Fecha com tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        closeDrawer();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isVisible, closeDrawer]);

  // Previne scroll do body quando drawer está aberto
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  // Inicializa estado de resultados para novas sessões
  useEffect(() => {
    const newResults: Record<string, SessionResult> = {};
    pendingSessions.forEach(session => {
      if (!sessionResults[session.id]) {
        newResults[session.id] = {
          resultInput: '',
          hits: 0,
          error: '',
        };
      } else {
        newResults[session.id] = sessionResults[session.id];
      }
    });
    setSessionResults(prev => ({ ...prev, ...newResults }));
  }, [pendingSessions]);

  // Valida e processa o input do resultado
  const validateResult = (input: string): { isValid: boolean; numbers: number[]; error: string } => {
    // Remove espaços e separa por vírgula
    const cleanInput = input.replace(/\s/g, '');
    const parts = cleanInput.split(',').filter(p => p !== '');
    
    if (parts.length !== 5) {
      return { isValid: false, numbers: [], error: '❌ Insira exactamente 5 números separados por vírgula' };
    }
    
    const numbers: number[] = [];
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        return { isValid: false, numbers: [], error: '❌ Apenas números são permitidos' };
      }
      if (num < 1 || num > 90) {
        return { isValid: false, numbers: [], error: `❌ Número ${num} está fora do intervalo 1-90` };
      }
      numbers.push(num);
    }
    
    // Verifica duplicados
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== 5) {
      return { isValid: false, numbers: [], error: '❌ Não são permitidos números duplicados' };
    }
    
    return { isValid: true, numbers, error: '' };
  };

  const handleResultInputChange = (sessionId: string, value: string) => {
    setSessionResults(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        resultInput: value,
        error: '',
      },
    }));
  };

  const handleHitsChange = (sessionId: string, hits: number) => {
    setSessionResults(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        hits,
      },
    }));
  };

  const handleConsolidate = (sessionId: string) => {
    const session = pendingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const resultData = sessionResults[sessionId];
    if (!resultData) return;
    
    const validation = validateResult(resultData.resultInput);
    
    if (!validation.isValid) {
      setSessionResults(prev => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          error: validation.error,
        },
      }));
      return;
    }
    
    onConsolidate(sessionId, validation.numbers, resultData.hits);
    
    // Limpa o estado da sessão consolidada
    setSessionResults(prev => {
      const newState = { ...prev };
      delete newState[sessionId];
      return newState;
    });
  };

  // Se não está visível, não renderiza nada
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        onClick={closeDrawer}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Painel lateral */}
      <div
        className="drawer-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          maxWidth: '85vw',
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid #00F5A0',
          boxShadow: '-5px 0 30px rgba(0, 0, 0, 0.5)',
          zIndex: 2001,
          animation: 'slideInRight 0.3s ease',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'sticky',
            top: 0,
            background: 'rgba(17, 24, 39, 0.98)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🔧</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Painel Admin</h2>
              <span
                style={{
                  background: '#FF4B4B',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.5px',
                }}
              >
                PRIVADO
              </span>
            </div>
            <button
              onClick={closeDrawer}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#6B7280' }}>Ctrl+Shift+A para fechar</p>
        </div>

        {/* Corpo — lista de sessões pendentes */}
        <div style={{ padding: '20px', flex: 1 }}>
          {pendingSessions.length === 0 ? (
            // Estado vazio
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>Sem sessões pendentes</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Todas as sessões estão verificadas</p>
            </div>
          ) : (
            // Lista de pendentes
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {pendingSessions.map(session => {
                const resultData = sessionResults[session.id] || { resultInput: '', hits: 0, error: '' };
                
                return (
                  <div
                    key={session.id}
                    className="glass-card"
                    style={{
                      padding: '16px',
                      background: 'rgba(17, 24, 39, 0.6)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {/* Cabeçalho da sessão */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#9CA3AF' }}>📅 {session.date}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(0, 245, 160, 0.15)',
                          color: '#00F5A0',
                          border: '1px solid rgba(0, 245, 160, 0.3)',
                        }}
                      >
                        {session.sessionLabel}
                      </span>
                    </div>

                    {/* Bolas geradas */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>
                        🎲 Números gerados
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {session.numbers.map((n, idx) => (
                          <ChromeBall key={idx} n={n} size="sm" variant="normal" animated={false} />
                        ))}
                      </div>
                    </div>

                    {/* Campo resultado oficial */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
                        📋 Resultado oficial (5 números)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 7,23,45,61,88"
                        value={resultData.resultInput}
                        onChange={(e) => handleResultInputChange(session.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: resultData.error ? '1px solid #FF4B4B' : '1px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(0, 0, 0, 0.3)',
                          color: '#fff',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {resultData.error && (
                        <div style={{ fontSize: '11px', color: '#FF4B4B', marginTop: '6px' }}>{resultData.error}</div>
                      )}
                    </div>

                    {/* Campo acertos */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>
                        🎯 Número de acertos (0-5)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={resultData.hits}
                        onChange={(e) => handleHitsChange(session.id, parseInt(e.target.value) || 0)}
                        style={{
                          width: '80px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(0, 0, 0, 0.3)',
                          color: '#fff',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {/* Botão consolidar */}
                    <button
                      onClick={() => handleConsolidate(session.id)}
                      disabled={!resultData.resultInput.trim()}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: resultData.resultInput.trim()
                          ? 'linear-gradient(135deg, #00F5A0, #00C896)'
                          : 'rgba(255, 255, 255, 0.1)',
                        color: resultData.resultInput.trim() ? '#0B0F19' : '#6B7280',
                        fontWeight: 600,
                        cursor: resultData.resultInput.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      ✅ Consolidar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com info */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '10px',
            color: '#4B5563',
            textAlign: 'center',
          }}
        >
          🔒 Painel administrativo — uso restrito
        </div>
      </div>

      {/* Animações CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default AdminDrawer;
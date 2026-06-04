// =============================================================
// KAZOLA GLOW — ACCESS GATE
// Popup de registo obrigatório antes de qualquer geração
// Plano: FREE (7 dias, 1 geração/dia) → activa com email
// =============================================================

import { useState, useEffect } from 'react';

interface UserSession {
  email: string;
  registeredAt: number;
  lastGenerationDate: string | null;
  generationsToday: number;
  isPremium: boolean;
  trialExpires: number;
}

interface Props {
  onRegister: (email: string) => void;
  onClose: () => void;
  existingSession: UserSession | null;
}

const STORAGE_KEY = 'kazola_user_session';

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export default function AccessGate({ onRegister, onClose, existingSession }: Props) {
  const [email, setEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Se já existe sessão expirada, vai para login
  useEffect(() => {
    if (existingSession && !existingSession.isPremium) {
      const expired = Date.now() >= existingSession.trialExpires;
      if (expired) setMode('login');
    }
  }, [existingSession]);

  const handleRegister = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError('Insere um endereço de email válido.');
      return;
    }

    setLoading(true);
    setError('');

    // Verifica se email já existe nesta sessão de browser
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const old = JSON.parse(raw) as UserSession;
        if (old.email === trimmed && Date.now() < old.trialExpires) {
          setError('Este email já está registado com um trial activo. Faz login abaixo.');
          setMode('login');
          setLoading(false);
          return;
        }
      }
    } catch {}

    // Simula delay de registo (em produção: chamada à API / Google Apps Script)
    await new Promise(r => setTimeout(r, 900));

    setLoading(false);
    setSuccess('');
    onRegister(trimmed);
  };

  const handleLogin = async () => {
    const trimmed = loginEmail.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError('Insere um email válido.');
      return;
    }

    setLoading(true);
    setError('');

    await new Promise(r => setTimeout(r, 600));

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const sess = JSON.parse(raw) as UserSession;
        if (sess.email === trimmed) {
          // Reactivar sessão encontrada
          setLoading(false);
          onRegister(trimmed); // reutiliza handler (cria/renova sessão)
          return;
        }
      }
    } catch {}

    setLoading(false);
    setError('Email não encontrado. Regista-te para activar o trial gratuito.');
    setMode('register');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Russo+One&display=swap');

        .gate-card {
          background: linear-gradient(145deg, #0d0d1f, #121225);
          border: 1px solid rgba(245,197,24,0.25);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(245,197,24,0.06);
          font-family: 'Barlow Condensed', sans-serif;
          color: #fff;
          position: relative;
          animation: gateIn 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes gateIn {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .gate-input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: #fff;
          padding: 0.85rem 1rem;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.05rem;
          outline: none;
          transition: border-color 0.2s;
          margin-top: 0.5rem;
        }
        .gate-input:focus { border-color: #F5C518; }

        .gate-btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #F5C518, #d4a800);
          color: #000;
          border: none;
          border-radius: 10px;
          padding: 0.95rem;
          font-family: 'Russo One', sans-serif;
          font-size: 1rem;
          cursor: pointer;
          letter-spacing: 0.08em;
          transition: all 0.2s;
          margin-top: 1rem;
        }
        .gate-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245,197,24,0.35); }
        .gate-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .gate-toggle {
          background: none; border: none;
          color: #F5C518; cursor: pointer;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.9rem; font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .feature-row {
          display: flex; align-items: flex-start; gap: 0.6rem;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.65);
        }
        .feature-icon { font-size: 1rem; margin-top: 1px; flex-shrink: 0; }
      `}</style>

      <div className="gate-card">
        {/* Fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: '50%',
            width: 32, height: 32,
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: '1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Ícone e Título */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎱</div>
          <h2 style={{ fontFamily: "'Russo One', sans-serif", fontSize: '1.7rem', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
            {mode === 'register' ? 'ACESSO GRATUITO' : 'BEM-VINDO DE VOLTA'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            {mode === 'register'
              ? 'Regista o teu email para activar 7 dias grátis'
              : 'Insere o teu email para retomar a sessão'}
          </p>
        </div>

        {/* Benefícios (só no registo) */}
        {mode === 'register' && (
          <div style={{
            background: 'rgba(245,197,24,0.07)',
            border: '1px solid rgba(245,197,24,0.15)',
            borderRadius: 12,
            padding: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div className="feature-row">
              <span className="feature-icon">⚡</span>
              <span><strong style={{ color: '#F5C518' }}>7 dias grátis</strong> de acesso completo ao gerador</span>
            </div>
            <div className="feature-row">
              <span className="feature-icon">📅</span>
              <span>1 geração por dia (Loto + Totobola)</span>
            </div>
            <div className="feature-row">
              <span className="feature-icon">🔒</span>
              <span>Sem cartão de crédito · Sem compromisso</span>
            </div>
            <div className="feature-row">
              <span className="feature-icon">🏆</span>
              <span>Upgrade para Premium a qualquer momento</span>
            </div>
          </div>
        )}

        {/* Formulário */}
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)' }}>
            ENDEREÇO DE EMAIL
          </label>
          <input
            className="gate-input"
            type="email"
            placeholder="o.teu@email.com"
            value={mode === 'register' ? email : loginEmail}
            onChange={e => mode === 'register' ? setEmail(e.target.value) : setLoginEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'register' ? handleRegister() : handleLogin())}
            autoFocus
          />

          {error && (
            <div style={{
              marginTop: '0.75rem',
              background: 'rgba(198,40,40,0.2)',
              border: '1px solid rgba(198,40,40,0.4)',
              borderRadius: 8,
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              color: '#ef9a9a',
            }}>
              ⚠ {error}
            </div>
          )}

          {success && (
            <div style={{
              marginTop: '0.75rem',
              background: 'rgba(27,94,32,0.3)',
              border: '1px solid rgba(76,175,80,0.3)',
              borderRadius: 8,
              padding: '0.6rem 0.8rem',
              fontSize: '0.85rem',
              color: '#a5d6a7',
            }}>
              ✓ {success}
            </div>
          )}

          <button
            className="gate-btn-primary"
            onClick={mode === 'register' ? handleRegister : handleLogin}
            disabled={loading}
          >
            {loading
              ? '⏳ A PROCESSAR...'
              : mode === 'register'
                ? '🚀 ACTIVAR TRIAL GRATUITO'
                : '🔑 ENTRAR'}
          </button>
        </div>

        {/* Toggle modo */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          {mode === 'register' ? (
            <>Já tens conta?{' '}
              <button className="gate-toggle" onClick={() => { setMode('login'); setError(''); }}>
                Fazer login
              </button>
            </>
          ) : (
            <>Novo utilizador?{' '}
              <button className="gate-toggle" onClick={() => { setMode('register'); setError(''); }}>
                Registar grátis
              </button>
            </>
          )}
        </div>

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center',
          marginTop: '1.25rem',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.2)',
          lineHeight: 1.5,
        }}>
          Ao registares-te concordas com os Termos de Utilização e a Política de Privacidade.
          O teu email não será partilhado com terceiros. Joga com responsabilidade. +18.
        </p>
      </div>
    </div>
  );
}
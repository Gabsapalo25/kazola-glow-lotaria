/**
 * AccessGate.tsx — Popup de acesso obrigatório
 * FREE: trial 3 dias, 1 geração/dia
 * PREMIUM: upgrade pago, ilimitado
 */
import { useState, useEffect } from 'react';
import {
  TRIAL_DAYS,
  FREE_GENS_DAY,
  loadSession,
  createSession,
  loginByEmail,
  activatePremiumFromServer,
  type UserSession,
} from '../lib/session';
import { checkPremiumStatus } from '../lib/apiClient';

interface Props {
  onAccess : (session: UserSession) => void;
  reason?  : 'first_visit' | 'trial_expired' | 'daily_limit';
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export default function AccessGate({ onAccess, reason = 'first_visit' }: Props) {
  const [mode, setMode]         = useState<'register' | 'login'>(
    reason === 'trial_expired' ? 'login' : 'register'
  );
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (reason === 'trial_expired') setMode('login');
  }, [reason]);

  async function handleRegister() {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { setError('Insere um endereço de email válido.'); return; }

    setLoading(true); setError('');

    // ===== NOVA VERIFICAÇÃO: Verificar se já é premium no servidor =====
    try {
      const serverResult = await checkPremiumStatus(trimmed);
      
      if (serverResult.ok && serverResult.isPremium && serverResult.expiracao) {
        // Utilizador já é premium no servidor - activar imediatamente
        const plano = serverResult.plano === 'anual' ? 'anual' : 
                      serverResult.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
        const session = activatePremiumFromServer(
          createSession(trimmed),
          plano,
          serverResult.expiracao
        );
        setLoading(false);
        onAccess(session);
        return;
      }
    } catch (err) {
      console.error('Erro ao verificar premium no servidor:', err);
      // Continua com o fluxo normal de registo
    }
    // ===== FIM DA VERIFICAÇÃO =====

    // Verifica se já tem sessão activa com este email
    const existing = loadSession();
    if (existing && existing.email === trimmed && Date.now() < existing.trialExpires) {
      setError('Este email já tem um trial activo. Faz login abaixo.');
      setMode('login'); setLoading(false); return;
    }

    await new Promise(r => setTimeout(r, 800)); // simula chamada API
    const session = createSession(trimmed);
    setLoading(false);
    onAccess(session);
  }

  async function handleLogin() {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { setError('Insere um email válido.'); return; }

    setLoading(true); setError('');

    // ===== NOVA VERIFICAÇÃO: Verificar premium no servidor antes do login =====
    try {
      const serverResult = await checkPremiumStatus(trimmed);
      
      if (serverResult.ok && serverResult.isPremium && serverResult.expiracao) {
        // Utilizador é premium no servidor
        const existingSession = loginByEmail(trimmed);
        const plano = serverResult.plano === 'anual' ? 'anual' : 
                      serverResult.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
        
        let session: UserSession;
        
        if (existingSession) {
          // Actualizar sessão existente com dados do servidor
          session = activatePremiumFromServer(existingSession, plano, serverResult.expiracao);
        } else {
          // Criar nova sessão premium
          session = activatePremiumFromServer(createSession(trimmed), plano, serverResult.expiracao);
        }
        
        setLoading(false);
        onAccess(session);
        return;
      }
    } catch (err) {
      console.error('Erro ao verificar premium no servidor:', err);
      // Continua com o fluxo normal de login
    }
    // ===== FIM DA VERIFICAÇÃO =====

    await new Promise(r => setTimeout(r, 600));

    const session = loginByEmail(trimmed);
    if (session) {
      setLoading(false);
      onAccess(session);
    } else {
      setLoading(false);
      setError('Email não encontrado. Regista-te para activar o trial gratuito.');
      setMode('register');
    }
  }

  const reasonBanner: Record<string, { bg: string; text: string; msg: string }> = {
    trial_expired: { bg: '#3d0000', text: '#ef9a9a', msg: '⏰ O teu trial de 3 dias expirou. Faz upgrade para continuar.' },
    daily_limit  : { bg: '#1a2f00', text: '#a5d6a7', msg: `✅ Usaste a tua geração gratuita de hoje. Volta amanhã ou faz upgrade para ilimitado.` },
  };
  const banner = reasonBanner[reason];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.88)',
      backdropFilter: 'blur(10px)',
      zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Russo+One&display=swap');
        .gate-card {
          background: linear-gradient(145deg, #0d0d1f, #121225);
          border: 1px solid rgba(245,197,24,0.22);
          border-radius: 22px;
          padding: 2.5rem 2rem;
          width: 100%; max-width: 440px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(245,197,24,0.05);
          font-family: 'Barlow Condensed', sans-serif;
          color: #fff;
          animation: gateIn 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes gateIn {
          from { opacity:0; transform:translateY(20px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .gate-input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1.5px solid rgba(255,255,255,0.14);
          border-radius: 10px; color: #fff;
          padding: 0.85rem 1rem;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.05rem; outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .gate-input:focus { border-color: #F5C518; }
        .gate-btn {
          width: 100%;
          background: linear-gradient(135deg,#F5C518,#d4a800);
          color: #000; border: none; border-radius: 10px;
          padding: 0.95rem;
          font-family: 'Russo One', sans-serif;
          font-size: 1rem; cursor: pointer;
          letter-spacing: 0.08em;
          transition: all 0.2s; margin-top: 1rem;
        }
        .gate-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(245,197,24,0.35); }
        .gate-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .gate-link { background:none; border:none; color:#F5C518; cursor:pointer;
          font-family:'Barlow Condensed',sans-serif; font-size:0.9rem; font-weight:700;
          text-decoration:underline; text-underline-offset:3px; }
        .feat { display:flex; align-items:flex-start; gap:0.6rem; margin-bottom:0.45rem;
          font-size:0.85rem; color:rgba(255,255,255,0.6); }
      `}</style>

      <div className="gate-card">

        {/* Banner de razão */}
        {banner && (
          <div style={{
            background: banner.bg, color: banner.text,
            borderRadius: 10, padding: '0.7rem 1rem',
            fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.4,
          }}>
            {banner.msg}
          </div>
        )}

        {/* Ícone + Título */}
        <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
          <div style={{ fontSize: '2.8rem', marginBottom: '0.4rem' }}>🎱</div>
          <h2 style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.7rem', letterSpacing:'0.03em', margin:0 }}>
            {mode === 'register' ? 'ACESSO GRATUITO' : 'BEM-VINDO DE VOLTA'}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.88rem', marginTop:'0.3rem' }}>
            {mode === 'register'
              ? `Regista o teu email para activar ${TRIAL_DAYS} dias grátis`
              : 'Insere o teu email para retomar a sessão'}
          </p>
        </div>

        {/* Benefícios — só no registo */}
        {mode === 'register' && (
          <div style={{
            background:'rgba(245,197,24,0.07)',
            border:'1px solid rgba(245,197,24,0.15)',
            borderRadius:12, padding:'1rem', marginBottom:'1.4rem',
          }}>
            <div className="feat"><span>⚡</span><span><strong style={{color:'#F5C518'}}>{TRIAL_DAYS} dias grátis</strong> de acesso completo ao gerador</span></div>
            <div className="feat"><span>📅</span><span>{FREE_GENS_DAY} geração por dia (Loto + Totobola)</span></div>
            <div className="feat"><span>🔒</span><span>Sem cartão de crédito · Sem compromisso</span></div>
            <div className="feat"><span>🏆</span><span>Upgrade para Premium a qualquer momento</span></div>
          </div>
        )}

        {/* Formulário */}
        <div>
          <label style={{ fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.5)' }}>
            ENDEREÇO DE EMAIL
          </label>
          <input
            className="gate-input"
            type="email"
            placeholder="o.teu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'register' ? handleRegister() : handleLogin())}
            autoFocus
          />

          {error && (
            <div style={{
              marginTop:'0.7rem',
              background:'rgba(198,40,40,0.18)',
              border:'1px solid rgba(198,40,40,0.35)',
              borderRadius:8, padding:'0.6rem 0.8rem',
              fontSize:'0.83rem', color:'#ef9a9a',
            }}>⚠ {error}</div>
          )}

          <button className="gate-btn"
            onClick={mode === 'register' ? handleRegister : handleLogin}
            disabled={loading}>
            {loading
              ? '⏳ A PROCESSAR...'
              : mode === 'register'
                ? '🚀 ACTIVAR TRIAL GRATUITO'
                : '🔑 ENTRAR'}
          </button>
        </div>

        {/* Toggle registo ↔ login */}
        <div style={{ textAlign:'center', marginTop:'1.1rem', fontSize:'0.85rem', color:'rgba(255,255,255,0.35)' }}>
          {mode === 'register' ? (
            <>Já tens conta?{' '}
              <button className="gate-link" onClick={() => { setMode('login'); setError(''); }}>
                Fazer login
              </button>
            </>
          ) : (
            <>Novo utilizador?{' '}
              <button className="gate-link" onClick={() => { setMode('register'); setError(''); }}>
                Registar grátis
              </button>
            </>
          )}
        </div>

        {/* Disclaimer */}
        <p style={{
          textAlign:'center', marginTop:'1.1rem',
          fontSize:'0.68rem', color:'rgba(255,255,255,0.18)', lineHeight:1.5,
        }}>
          Ao registares-te concordas com os Termos de Utilização e a Política de Privacidade.
          O teu email não será partilhado com terceiros. Joga com responsabilidade. +18.
        </p>
      </div>
    </div>
  );
}
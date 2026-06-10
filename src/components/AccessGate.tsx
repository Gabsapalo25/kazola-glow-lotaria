/**
 * AccessGate.tsx — Com verificação de email via código OTP
 * Usa Netlify Functions + Netlify Blobs + Resend
 */
import { useState, useEffect, useRef } from 'react';
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
  onAccess: (session: UserSession) => void;
  reason?: 'first_visit' | 'trial_expired' | 'daily_limit';
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

type Step = 'email' | 'verify' | 'login';

export default function AccessGate({ onAccess, reason = 'first_visit' }: Props) {
  const [step, setStep]       = useState<Step>(reason === 'trial_expired' ? 'login' : 'email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState(['', '', '', '', '', '']);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (reason === 'trial_expired') setStep('login');
  }, [reason]);

  // Countdown para reenviar código
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Verificar premium no servidor
  async function checkServerPremium(trimmed: string): Promise<UserSession | null> {
    try {
      const r = await checkPremiumStatus(trimmed);
      if (r.ok && r.isPremium && r.expiracao) {
        const plano = r.plano === 'anual' ? 'anual' : r.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
        const base = loginByEmail(trimmed) ?? createSession(trimmed);
        return activatePremiumFromServer(base, plano, r.expiracao);
      }
    } catch {}
    return null;
  }

  // STEP 1 — enviar código OTP
  async function handleSendCode() {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { setError('Insere um email válido.'); return; }

    setLoading(true); setError('');

    // Verificar se já é premium no servidor
    const premiumSession = await checkServerPremium(trimmed);
    if (premiumSession) { onAccess(premiumSession); return; }

    // Se já tem trial activo neste dispositivo, deixar entrar directamente
    const existing = loadSession();
    if (existing?.email === trimmed && Date.now() < existing.trialExpires) {
      setLoading(false);
      onAccess(existing);
      return;
    }

    // Pedir código ao backend (Netlify Function)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Erro ao enviar código.');
      } else {
        setStep('verify');
        setResendTimer(60);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      }
    } catch {
      setError('Erro de ligação. Verifica a tua internet e tenta novamente.');
    }

    setLoading(false);
  }

  // STEP 2 — verificar código OTP
  async function handleVerifyCode() {
    const otp = code.join('');
    if (otp.length < 6) { setError('Insere o código completo de 6 dígitos.'); return; }

    setLoading(true); setError('');

    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp }),
      });
      const data = await res.json();

      if (data.ok) {
        const session = createSession(email.trim().toLowerCase());
        onAccess(session);
      } else {
        setError(data.error || 'Código inválido.');
        setLoading(false);
      }
    } catch {
      setError('Erro de ligação. Tenta novamente.');
      setLoading(false);
    }
  }

  // Input OTP — navegar entre caixas automaticamente
  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit quando os 6 dígitos estão preenchidos
    if (newCode.every(d => d !== '') && index === 5) {
      setTimeout(() => handleVerifyCode(), 150);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Colar código copiado (paste)
  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerifyCode(), 150);
    }
  }

  // LOGIN (trial já activo noutro dispositivo ou premium)
  async function handleLogin() {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) { setError('Insere um email válido.'); return; }
    setLoading(true); setError('');

    const premiumSession = await checkServerPremium(trimmed);
    if (premiumSession) { onAccess(premiumSession); return; }

    await new Promise(r => setTimeout(r, 400));
    const session = loginByEmail(trimmed);
    if (session) {
      onAccess(session);
    } else {
      setError('Email não encontrado neste dispositivo. Regista-te para activar o trial.');
      setStep('email');
    }
    setLoading(false);
  }

  const reasonBanner: Record<string, { bg: string; text: string; msg: string }> = {
    trial_expired: { bg: '#3d0000', text: '#ef9a9a', msg: '⏰ O teu trial de 3 dias expirou. Faz upgrade para continuar.' },
    daily_limit:   { bg: '#1a2f00', text: '#a5d6a7', msg: `✅ Usaste a tua geração de hoje. Volta amanhã ou faz upgrade para ilimitado.` },
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
          margin-top: 0.4rem;
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
        .gate-link {
          background: none; border: none; color: #F5C518; cursor: pointer;
          font-family: 'Barlow Condensed', sans-serif; font-size: 0.9rem; font-weight: 700;
          text-decoration: underline; text-underline-offset: 3px;
        }
        .otp-input {
          width: 44px; height: 54px;
          background: rgba(255,255,255,0.07);
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 10px; color: #fff;
          font-family: 'Russo One', sans-serif;
          font-size: 1.5rem; text-align: center; outline: none;
          transition: all 0.2s;
        }
        .otp-input:focus { border-color: #F5C518; box-shadow: 0 0 12px rgba(245,197,24,0.3); }
        .otp-input.filled { border-color: rgba(245,197,24,0.5); background: rgba(245,197,24,0.08); }
        .feat { display:flex; align-items:flex-start; gap:0.6rem; margin-bottom:0.45rem; font-size:0.85rem; color:rgba(255,255,255,0.6); }
        .gate-error {
          margin-top: 0.7rem;
          background: rgba(198,40,40,0.18);
          border: 1px solid rgba(198,40,40,0.35);
          border-radius: 8px; padding: 0.6rem 0.8rem;
          font-size: 0.83rem; color: #ef9a9a;
        }
        .gate-label {
          font-size: 0.8rem; font-weight: 700;
          letter-spacing: 0.1em; color: rgba(255,255,255,0.5);
        }
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

        {/* ── STEP: EMAIL ─────────────────────────────────── */}
        {step === 'email' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '0.4rem' }}>🎱</div>
              <h2 style={{ fontFamily: "'Russo One',sans-serif", fontSize: '1.7rem', margin: 0 }}>
                ACESSO GRATUITO
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                Regista o teu email para activar {TRIAL_DAYS} dias grátis
              </p>
            </div>

            <div style={{
              background: 'rgba(245,197,24,0.07)',
              border: '1px solid rgba(245,197,24,0.15)',
              borderRadius: 12, padding: '1rem', marginBottom: '1.4rem',
            }}>
              <div className="feat"><span>⚡</span><span><strong style={{ color: '#F5C518' }}>{TRIAL_DAYS} dias grátis</strong> de acesso completo ao gerador</span></div>
              <div className="feat"><span>📅</span><span>{FREE_GENS_DAY} geração por dia (Loto + Totobola)</span></div>
              <div className="feat"><span>✅</span><span>Verificação rápida por email · sem senha</span></div>
              <div className="feat"><span>🏆</span><span>Upgrade para Premium a qualquer momento</span></div>
            </div>

            <label className="gate-label">ENDEREÇO DE EMAIL</label>
            <input
              className="gate-input"
              type="email"
              placeholder="o.teu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSendCode()}
              autoFocus
            />

            {error && <div className="gate-error">⚠ {error}</div>}

            <button className="gate-btn" onClick={handleSendCode} disabled={loading}>
              {loading ? '⏳ A ENVIAR...' : '📧 ENVIAR CÓDIGO DE VERIFICAÇÃO'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
              Já tens conta?{' '}
              <button className="gate-link" onClick={() => { setStep('login'); setError(''); }}>
                Fazer login
              </button>
            </div>
          </>
        )}

        {/* ── STEP: VERIFICAR OTP ─────────────────────────── */}
        {step === 'verify' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '0.4rem' }}>📬</div>
              <h2 style={{ fontFamily: "'Russo One',sans-serif", fontSize: '1.7rem', margin: 0 }}>
                VERIFICA O TEU EMAIL
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                Enviámos um código de 6 dígitos para<br />
                <strong style={{ color: '#F5C518' }}>{email}</strong>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                Verifica também a pasta de spam
              </p>
            </div>

            {/* Inputs OTP */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.2rem' }}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  className={`otp-input${digit ? ' filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                />
              ))}
            </div>

            {error && <div className="gate-error" style={{ marginBottom: '0.8rem' }}>⚠ {error}</div>}

            <button className="gate-btn" onClick={handleVerifyCode} disabled={loading}>
              {loading ? '⏳ A VERIFICAR...' : '✅ CONFIRMAR CÓDIGO'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
              Não recebeste o código?{' '}
              {resendTimer > 0
                ? <span>Reenviar em {resendTimer}s</span>
                : <button className="gate-link" onClick={() => { setCode(['', '', '', '', '', '']); setStep('email'); setError(''); }}>
                    Reenviar código
                  </button>
              }
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button className="gate-link" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}
                onClick={() => { setStep('email'); setError(''); setCode(['', '', '', '', '', '']); }}>
                ← Alterar email
              </button>
            </div>
          </>
        )}

        {/* ── STEP: LOGIN ─────────────────────────────────── */}
        {step === 'login' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '0.4rem' }}>🎱</div>
              <h2 style={{ fontFamily: "'Russo One',sans-serif", fontSize: '1.7rem', margin: 0 }}>
                BEM-VINDO DE VOLTA
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                Insere o teu email para retomar a sessão
              </p>
            </div>

            <label className="gate-label">ENDEREÇO DE EMAIL</label>
            <input
              className="gate-input"
              type="email"
              placeholder="o.teu@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />

            {error && <div className="gate-error">⚠ {error}</div>}

            <button className="gate-btn" onClick={handleLogin} disabled={loading}>
              {loading ? '⏳ A PROCESSAR...' : '🔑 ENTRAR'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
              Novo utilizador?{' '}
              <button className="gate-link" onClick={() => { setStep('email'); setError(''); }}>
                Registar grátis
              </button>
            </div>
          </>
        )}

        {/* Disclaimer */}
        <p style={{
          textAlign: 'center', marginTop: '1.1rem',
          fontSize: '0.68rem', color: 'rgba(255,255,255,0.18)', lineHeight: 1.5,
        }}>
          Ao registares-te concordas com os Termos de Utilização e a Política de Privacidade.
          O teu email não será partilhado com terceiros. Joga com responsabilidade. +18.
        </p>
      </div>
    </div>
  );
}
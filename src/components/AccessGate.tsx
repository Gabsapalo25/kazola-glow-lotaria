/**
 * AccessGate.tsx v3.0
 * Registo com nome + email + password + OTP via email
 * Login com email + password
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
import {
  checkPremiumStatus,
  sendOTP,
  verifyOTP,
  registerWithPassword,
  loginWithPassword,
} from '../lib/apiClient';

interface Props {
  onAccess: (session: UserSession) => void;
  reason?: 'first_visit' | 'trial_expired' | 'daily_limit';
}

// ==================== ADMIN EMAILS ====================
const ADMIN_EMAILS = ['gabsapalo20@gmail.com', 'glowscalepro@gmail.com'];

function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
// ======================================================

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function isValidPassword(p: string) {
  return p.length >= 6;
}

function isValidName(n: string) {
  return n.trim().length >= 2;
}

type Step = 'register' | 'verify' | 'login';

export default function AccessGate({ onAccess, reason = 'first_visit' }: Props) {
  // Estado do registo
  const [step, setStep] = useState<Step>(reason === 'trial_expired' ? 'login' : 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Estado comum
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reason === 'trial_expired') setStep('login');
  }, [reason]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ==================== checkServerPremium ====================
  async function checkServerPremium(trimmed: string): Promise<UserSession | null> {
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );
      const r = (await Promise.race([checkPremiumStatus(trimmed), timeoutPromise])) as any;
      if (r?.ok && r?.isPremium && r?.expiracao) {
        const plano = r.plano === 'anual' ? 'anual' : r.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
        const base = loginByEmail(trimmed) ?? createSession(trimmed);
        return activatePremiumFromServer(base, plano, r.expiracao);
      }
    } catch {
      /* servidor indisponível */
    }
    return null;
  }

  // ==================== STEP 1: REGISTO ====================
  async function handleRegister() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const pass = password;
    const confirm = confirmPassword;

    // Validações
    if (!isValidName(trimmedName)) {
      setError('Insere o teu nome completo (mínimo 2 caracteres).');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError('Insere um email válido.');
      return;
    }
    if (!isValidPassword(pass)) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }
    if (pass !== confirm) {
      setError('As passwords não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    // Admin bypass
    if (isAdminEmail(trimmedEmail)) {
      const session = loginByEmail(trimmedEmail) ?? createSession(trimmedEmail);
      onAccess(session);
      return;
    }

    // Verificar se já é premium
    const premiumSession = await checkServerPremium(trimmedEmail);
    if (premiumSession) {
      onAccess(premiumSession);
      return;
    }

    // Trial ativo neste dispositivo
    const existing = loadSession();
    if (existing?.email === trimmedEmail && Date.now() < existing.trialExpires) {
      setLoading(false);
      onAccess(existing);
      return;
    }

    // Enviar OTP
    try {
      const result = await sendOTP(trimmedEmail);

      if (!result.ok) {
        if (result.error?.includes('conexão') || result.error?.includes('timeout')) {
          setError('Servidor temporariamente indisponível. Tenta novamente.');
        } else {
          setError(result.error || 'Erro ao enviar código.');
        }
      } else if (result.skip) {
        // Fallback admin
        const session = loginByEmail(trimmedEmail) ?? createSession(trimmedEmail);
        onAccess(session);
        return;
      } else {
        // Guardar dados para registo após OTP
        setStep('verify');
        setResendTimer(60);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      }
    } catch {
      setError('Erro de ligação. Verifica a tua internet.');
    }

    setLoading(false);
  }

  // ==================== STEP 2: VERIFICAR OTP ====================
  async function handleVerifyCode() {
    const otp = code.join('');
    if (otp.length < 6) {
      setError('Insere o código completo de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const result = await verifyOTP(trimmedEmail, otp);

      if (result.ok && result.verified) {
        // OTP verificado! Agora registar com password no servidor
        const registerResult = await registerWithPassword(
          trimmedEmail,
          name.trim(),
          password
        );

        if (registerResult.ok) {
          const session = createSession(trimmedEmail);
          onAccess(session);
        } else {
          setError(registerResult.error || 'Erro ao criar conta. Tenta novamente.');
          setLoading(false);
        }
      } else {
        setError(result.error || 'Código inválido.');
        setLoading(false);
      }
    } catch {
      setError('Erro de ligação. Tenta novamente.');
      setLoading(false);
    }
  }

  // ==================== STEP 3: LOGIN ====================
  async function handleLogin() {
    const trimmedEmail = email.trim().toLowerCase();
    const pass = password;

    if (!isValidEmail(trimmedEmail)) {
      setError('Insere um email válido.');
      return;
    }
    if (!pass || pass.length < 6) {
      setError('Insere a tua password (mínimo 6 caracteres).');
      return;
    }

    setLoading(true);
    setError('');

    // Admin bypass
    if (isAdminEmail(trimmedEmail)) {
      const session = loginByEmail(trimmedEmail) ?? createSession(trimmedEmail);
      onAccess(session);
      return;
    }

    try {
      const result = await loginWithPassword(trimmedEmail, pass);

      if (result.ok && result.loggedIn) {
        // Login bem-sucedido
        let session = loginByEmail(trimmedEmail) ?? createSession(trimmedEmail);

        // Se for premium, atualizar sessão
        if (result.isPremium && result.expiracao) {
          const plano = result.plano === 'anual' ? 'anual' : result.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
          session = activatePremiumFromServer(session, plano, result.expiracao);
        }

        onAccess(session);
      } else {
        setError(result.error || 'Email ou password incorrectos.');
        setLoading(false);
      }
    } catch {
      setError('Erro de ligação. Tenta novamente.');
      setLoading(false);
    }
  }

  // ==================== Inputs OTP ====================
  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d !== '') && index === 5) {
      setTimeout(() => handleVerifyCode(), 150);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerifyCode(), 150);
    }
  }

  // ==================== Banner ====================
  const reasonBanner: Record<string, { bg: string; text: string; msg: string }> = {
    trial_expired: {
      bg: '#3d0000',
      text: '#ef9a9a',
      msg: '⏰ O teu trial de 3 dias expirou. Faz upgrade para continuar.',
    },
    daily_limit: {
      bg: '#1a2f00',
      text: '#a5d6a7',
      msg: `✅ Usaste a tua geração de hoje. Volta amanhã ou faz upgrade para ilimitado.`,
    },
  };
  const banner = reasonBanner[reason];

  // ==================== RENDER ====================
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
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
          border-radius: 10px;
          color: #fff;
          padding: 0.85rem 1rem;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.05rem;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          margin-top: 0.4rem;
        }
        .gate-input:focus { border-color: #F5C518; }
        .gate-btn {
          width: 100%;
          background: linear-gradient(135deg,#F5C518,#d4a800);
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
        .gate-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(245,197,24,0.35); }
        .gate-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .gate-link {
          background: none;
          border: none;
          color: #F5C518;
          cursor: pointer;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .otp-input {
          width: 44px;
          height: 54px;
          background: rgba(255,255,255,0.07);
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: #fff;
          font-family: 'Russo One', sans-serif;
          font-size: 1.5rem;
          text-align: center;
          outline: none;
          transition: all 0.2s;
        }
        .otp-input:focus { border-color: #F5C518; box-shadow: 0 0 12px rgba(245,197,24,0.3); }
        .otp-input.filled { border-color: rgba(245,197,24,0.5); background: rgba(245,197,24,0.08); }
        .feat { display:flex; align-items:flex-start; gap:0.6rem; margin-bottom:0.45rem; font-size:0.85rem; color:rgba(255,255,255,0.6); }
        .gate-error {
          margin-top: 0.7rem;
          background: rgba(198,40,40,0.18);
          border: 1px solid rgba(198,40,40,0.35);
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          font-size: 0.83rem;
          color: #ef9a9a;
        }
        .gate-label {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.5);
        }
        .input-group {
          margin-bottom: 0.8rem;
        }
      `}</style>

      <div className="gate-card">
        {banner && (
          <div
            style={{
              background: banner.bg,
              color: banner.text,
              borderRadius: 10,
              padding: '0.7rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4,
            }}
          >
            {banner.msg}
          </div>
        )}

        {/* ── STEP: REGISTO ─────────────────────────────────── */}
        {step === 'register' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: '0.4rem' }}>🎱</div>
              <h2 style={{ fontFamily: "'Russo One',sans-serif", fontSize: '1.7rem', margin: 0 }}>
                CRIAR CONTA
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                Regista-te para ativar {TRIAL_DAYS} dias grátis
              </p>
            </div>

            <div
              style={{
                background: 'rgba(245,197,24,0.07)',
                border: '1px solid rgba(245,197,24,0.15)',
                borderRadius: 12,
                padding: '1rem',
                marginBottom: '1.4rem',
              }}
            >
              <div className="feat">
                <span>⚡</span>
                <span>
                  <strong style={{ color: '#F5C518' }}>{TRIAL_DAYS} dias grátis</strong> de acesso completo
                </span>
              </div>
              <div className="feat">
                <span>📅</span>
                <span>{FREE_GENS_DAY} geração por dia</span>
              </div>
              <div className="feat">
                <span>📱</span>
                <span>Acesso sincronizado em todos os dispositivos</span>
              </div>
              <div className="feat">
                <span>🔒</span>
                <span>Password segura para proteger a tua conta</span>
              </div>
            </div>

            <div className="input-group">
              <label className="gate-label">NOME COMPLETO</label>
              <input
                className="gate-input"
                type="text"
                placeholder="Teu nome"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="gate-label">ENDEREÇO DE EMAIL</label>
              <input
                className="gate-input"
                type="email"
                placeholder="o.teu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
              />
            </div>

            <div className="input-group">
              <label className="gate-label">PASSWORD</label>
              <input
                className="gate-input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>

            <div className="input-group">
              <label className="gate-label">CONFIRMAR PASSWORD</label>
              <input
                className="gate-input"
                type="password"
                placeholder="Repete a password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>

            {error && <div className="gate-error">⚠ {error}</div>}

            <button className="gate-btn" onClick={handleRegister} disabled={loading}>
              {loading ? '⏳ A PROCESSAR...' : '📧 REGISTAR E RECEBER CÓDIGO'}
            </button>

            <div
              style={{
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              Já tens conta?{' '}
              <button
                className="gate-link"
                onClick={() => {
                  setStep('login');
                  setError('');
                }}
              >
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
                Enviámos um código de 6 dígitos para
                <br />
                <strong style={{ color: '#F5C518' }}>{email}</strong>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '0.3rem' }}>
                Verifica também a pasta de spam · válido 15 minutos
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
                marginBottom: '1.2rem',
              }}
            >
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  className={`otp-input${digit ? ' filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                />
              ))}
            </div>

            {error && (
              <div className="gate-error" style={{ marginBottom: '0.8rem' }}>
                ⚠ {error}
              </div>
            )}

            <button className="gate-btn" onClick={handleVerifyCode} disabled={loading}>
              {loading ? '⏳ A VERIFICAR...' : '✅ CONFIRMAR CÓDIGO'}
            </button>

            <div
              style={{
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              Não recebeste o código?{' '}
              {resendTimer > 0 ? (
                <span>Reenviar em {resendTimer}s</span>
              ) : (
                <button
                  className="gate-link"
                  onClick={() => {
                    setCode(['', '', '', '', '', '']);
                    setStep('register');
                    setError('');
                  }}
                >
                  Reenviar código
                </button>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                className="gate-link"
                style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}
                onClick={() => {
                  setStep('register');
                  setError('');
                  setCode(['', '', '', '', '', '']);
                }}
              >
                ← Alterar dados
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
                Insere o teu email e password para entrar
              </p>
            </div>

            <div className="input-group">
              <label className="gate-label">ENDEREÇO DE EMAIL</label>
              <input
                className="gate-input"
                type="email"
                placeholder="o.teu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="gate-label">PASSWORD</label>
              <input
                className="gate-input"
                type="password"
                placeholder="A tua password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {error && <div className="gate-error">⚠ {error}</div>}

            <button className="gate-btn" onClick={handleLogin} disabled={loading}>
              {loading ? '⏳ A PROCESSAR...' : '🔑 ENTRAR'}
            </button>

            <div
              style={{
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              Novo utilizador?{' '}
              <button
                className="gate-link"
                onClick={() => {
                  setStep('register');
                  setError('');
                }}
              >
                Criar conta grátis
              </button>
            </div>
          </>
        )}

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.1rem',
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.18)',
            lineHeight: 1.5,
          }}
        >
          Ao registares-te concordas com os Termos de Utilização e a Política de Privacidade. O teu email
          não será partilhado com terceiros. Joga com responsabilidade. +18.
        </p>
      </div>
    </div>
  );
}
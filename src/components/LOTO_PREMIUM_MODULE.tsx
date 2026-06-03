// =============================================================
//  LOTO 5/90 ANGOLA — MÓDULO PREMIUM REACT
//  Ficheiro: LOTO_PREMIUM_MODULE.tsx
//  Estados: PENDENTE_CONFIRMACAO | TRIAL | ATIVO | EXPIRADO | null
// =============================================================

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwkDcYTKdwwk0TVUaGVGDQZajXFDeI9cOW8pxa4YX0Z5rcTfWMizO9CkG5Z2QYJ9r-Hrw/exec'; // URL do doPost
const IBAN            = 'AO06 0040 0000 1859 5631 1019 4';
const BANCO           = 'BAI';
const PRECO_MENSAL    = '2.500 AKZ/mês';
const TRIAL_DIAS      = 7;
const FREE_MAX_LINES  = 1; // Máximo de linhas para utilizadores free

// ─── TIPOS ────────────────────────────────────────────────────
type PremiumStatus = 'TRIAL' | 'ATIVO' | 'EXPIRADO' | 'PENDENTE_CONFIRMACAO' | null;

interface PremiumUser {
  nome: string;
  email: string;
  ref: string;
  status: PremiumStatus;
  dataExpiracao: string | null;
}

interface PremiumState {
  isActive: boolean;       // TRIAL ou ATIVO e não expirado
  isTrial: boolean;
  isPaid: boolean;
  isExpired: boolean;
  isPending: boolean;
  user: PremiumUser | null;
  diasRestantes: number | null;
}

// ─── HOOK: usePremium ─────────────────────────────────────────
export function usePremium() {
  const [state, setState] = useState<PremiumState>({
    isActive: false,
    isTrial: false,
    isPaid: false,
    isExpired: false,
    isPending: false,
    user: null,
    diasRestantes: null,
  });
  const [loading, setLoading] = useState(true);

  const calcularEstado = useCallback((user: PremiumUser | null): PremiumState => {
    if (!user) return { isActive: false, isTrial: false, isPaid: false, isExpired: false, isPending: false, user: null, diasRestantes: null };

    const status = user.status;
    const exp    = user.dataExpiracao ? new Date(user.dataExpiracao) : null;
    const agora  = new Date();
    const expirou = exp ? exp < agora : false;

    let diasRestantes: number | null = null;
    if (exp && !expirou) {
      diasRestantes = Math.ceil((exp.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      isActive:  (status === 'TRIAL' || status === 'ATIVO') && !expirou,
      isTrial:   status === 'TRIAL' && !expirou,
      isPaid:    status === 'ATIVO' && !expirou,
      isExpired: expirou || status === 'EXPIRADO',
      isPending: status === 'PENDENTE_CONFIRMACAO',
      user,
      diasRestantes,
    };
  }, []);

  // Carregar do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem('loto_premium_user');
    if (saved) {
      try {
        const user: PremiumUser = JSON.parse(saved);
        setState(calcularEstado(user));
        // Verificar acesso no servidor silenciosamente
        verificarNoServidor(user);
      } catch {
        localStorage.removeItem('loto_premium_user');
      }
    }
    setLoading(false);
  }, []);

  const verificarNoServidor = async (user: PremiumUser) => {
    try {
      const r = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'verificarAccesso', email: user.email, ref: user.ref }),
      });
      const data = await r.json();
      if (data.ok) {
        const updated: PremiumUser = { ...user, status: data.status, dataExpiracao: data.dataExpiracao };
        localStorage.setItem('loto_premium_user', JSON.stringify(updated));
        setState(calcularEstado(updated));
      }
    } catch {
      // falha silenciosa — usa dados locais
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; erro?: string }> => {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'login', email, password }),
    });
    const data = await r.json();
    if (!data.ok) return { ok: false, erro: data.erro };

    const user: PremiumUser = {
      nome: data.nome,
      email: data.email,
      ref: data.ref,
      status: data.status,
      dataExpiracao: data.dataExpiracao,
    };
    localStorage.setItem('loto_premium_user', JSON.stringify(user));
    setState(calcularEstado(user));
    return { ok: true };
  }, [calcularEstado]);

  const registar = useCallback(async (nome: string, email: string): Promise<{ ok: boolean; erro?: string; ref?: string }> => {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'registar', nome, email }),
    });
    const data = await r.json();
    if (!data.ok) return { ok: false, erro: data.erro };
    return { ok: true, ref: data.ref };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('loto_premium_user');
    setState({ isActive: false, isTrial: false, isPaid: false, isExpired: false, isPending: false, user: null, diasRestantes: null });
  }, []);

  return { ...state, loading, login, registar, logout, FREE_MAX_LINES };
}

// ─── PÁGINA: /loto-premium ────────────────────────────────────
export function PremiumCheckoutPage() {
  const [tab, setTab] = useState<'registar' | 'login'>('registar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro' | 'info'; texto: string } | null>(null);
  const premium = usePremium();

  const handleRegistar = async () => {
    if (!nome.trim() || !email.trim()) return setMsg({ tipo: 'erro', texto: 'Preenche todos os campos.' });
    setLoading(true);
    setMsg(null);
    const res = await premium.registar(nome.trim(), email.trim());
    setLoading(false);
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: `✅ Registo efectuado! Referência: ${res.ref}. Verifica o teu email para activar o trial de ${TRIAL_DIAS} dias.` });
    } else {
      setMsg({ tipo: 'erro', texto: res.erro || 'Erro desconhecido.' });
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return setMsg({ tipo: 'erro', texto: 'Preenche todos os campos.' });
    setLoading(true);
    setMsg(null);
    const res = await premium.login(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: '✅ Login efectuado com sucesso!' });
      setTimeout(() => window.location.href = '/', 1200);
    } else {
      setMsg({ tipo: 'erro', texto: res.erro || 'Credenciais inválidas.' });
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.hero}>
        <div style={styles.badge}>ANÁLISE PREMIUM</div>
        <h1 style={styles.heroTitle}>🎯 Loto 5/90 Angola</h1>
        <p style={styles.heroSub}>Acede a análises estatísticas avançadas e gera combinações ilimitadas</p>
        <div style={styles.priceTag}>{PRECO_MENSAL}</div>
        <div style={styles.trialPill}>✨ {TRIAL_DIAS} dias grátis para novos utilizadores</div>
      </div>

      {/* Features */}
      <div style={styles.features}>
        {[
          { icon: '📊', texto: 'Análise estatística completa dos 90 números' },
          { icon: '🎰', texto: 'Gerador de combinações sem limite de linhas' },
          { icon: '🔥', texto: 'Números quentes, frios e padrões históricos' },
          { icon: '📈', texto: 'Histórico completo de todos os sorteios' },
        ].map(f => (
          <div key={f.texto} style={styles.featureItem}>
            <span style={styles.featureIcon}>{f.icon}</span>
            <span style={styles.featureText}>{f.texto}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={styles.card}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'registar' ? styles.tabActive : {}) }}
            onClick={() => { setTab('registar'); setMsg(null); }}
          >
            Registar
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setTab('login'); setMsg(null); }}
          >
            Já tenho conta
          </button>
        </div>

        {/* Mensagem */}
        {msg && (
          <div style={{
            ...styles.msgBox,
            background: msg.tipo === 'ok' ? '#052e16' : msg.tipo === 'erro' ? '#2d0000' : '#0c1a2e',
            borderColor: msg.tipo === 'ok' ? '#22c55e' : msg.tipo === 'erro' ? '#ef4444' : '#3b82f6',
            color: msg.tipo === 'ok' ? '#86efac' : msg.tipo === 'erro' ? '#fca5a5' : '#93c5fd',
          }}>
            {msg.texto}
          </div>
        )}

        {tab === 'registar' ? (
          <>
            <input style={styles.input} placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} />
            <input style={styles.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleRegistar} disabled={loading}>
              {loading ? 'A registar...' : `Começar Trial de ${TRIAL_DIAS} dias Grátis`}
            </button>
            <p style={styles.hint}>Receberes um email com o link de confirmação e as tuas credenciais.</p>
          </>
        ) : (
          <>
            <input style={styles.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <div style={styles.pwdWrap}>
              <input
                style={{ ...styles.input, paddingRight: 48 }}
                placeholder="Password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button style={styles.pwdToggle} onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
              {loading ? 'A verificar...' : 'Entrar'}
            </button>
          </>
        )}
      </div>

      {/* Instruções de pagamento */}
      <div style={styles.payCard}>
        <h3 style={styles.payTitle}>Como pagar após o trial</h3>
        <div style={styles.payStep}>
          <span style={styles.payNum}>1</span>
          <div>
            <strong>Transferência bancária</strong><br />
            <span style={styles.payDetail}>Banco {BANCO} · IBAN: <code style={styles.iban}>{IBAN}</code></span>
          </div>
        </div>
        <div style={styles.payStep}>
          <span style={styles.payNum}>2</span>
          <div>
            <strong>Valor</strong><br />
            <span style={styles.payDetail}>{PRECO_MENSAL}</span>
          </div>
        </div>
        <div style={styles.payStep}>
          <span style={styles.payNum}>3</span>
          <div>
            <strong>Assunto do email do comprovativo</strong><br />
            <span style={styles.payDetail}>O teu código (ex: <code style={styles.iban}>LOTO-0001</code>) — acesso renovado automaticamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE: LoginModal ───────────────────────────────────
interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const premium = usePremium();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return setErro('Preenche todos os campos.');
    setLoading(true);
    setErro('');
    const res = await premium.login(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      onSuccess?.();
      onClose();
    } else {
      setErro(res.erro || 'Credenciais inválidas.');
    }
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <button style={styles.modalClose} onClick={onClose}>✕</button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <h2 style={{ color: '#ffd700', margin: 0 }}>Acesso Premium</h2>
          <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>Entra com as tuas credenciais</p>
        </div>
        {erro && <div style={{ ...styles.msgBox, background: '#2d0000', borderColor: '#ef4444', color: '#fca5a5', marginBottom: 16 }}>{erro}</div>}
        <input style={styles.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <div style={styles.pwdWrap}>
          <input
            style={{ ...styles.input, paddingRight: 48 }}
            placeholder="Password"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button style={styles.pwdToggle} onClick={() => setShowPwd(!showPwd)}>
            {showPwd ? '🙈' : '👁️'}
          </button>
        </div>
        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? 'A verificar...' : 'Entrar'}
        </button>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#666' }}>
          Ainda não tens conta?{' '}
          <a href="/loto-premium" style={{ color: '#ffd700', textDecoration: 'none' }}>Registar</a>
        </p>
      </div>
    </div>
  );
}

// ─── COMPONENTE: PremiumBanner ────────────────────────────────
// Aparece imediatamente para utilizadores free (>= 1 linha)
interface PremiumBannerProps {
  onLogin: () => void;
  diasRestantes?: number | null;
  isTrial?: boolean;
}

export function PremiumBanner({ onLogin, diasRestantes, isTrial }: PremiumBannerProps) {
  if (isTrial && diasRestantes !== null && diasRestantes !== undefined) {
    // Banner de trial — lembra de pagar
    return (
      <div style={styles.trialBanner}>
        <span>⏳ Trial: <strong>{diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}</strong> restante{diasRestantes !== 1 ? 's' : ''}</span>
        <a href="/loto-premium" style={styles.trialBannerBtn}>Activar Premium</a>
      </div>
    );
  }

  // Banner free — incitar upgrade
  return (
    <div style={styles.freeBanner}>
      <div>
        <strong style={{ color: '#ffd700' }}>🔒 Funcionalidade Premium</strong>
        <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: 13 }}>
          Gera linhas ilimitadas por apenas {PRECO_MENSAL} · Trial de {TRIAL_DIAS} dias grátis
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={onLogin} style={styles.bannerLoginBtn}>Entrar</button>
        <a href="/loto-premium" style={styles.bannerUpgradeBtn}>Upgrade</a>
      </div>
    </div>
  );
}

// ─── COMPONENTE: PremiumHeaderButton ─────────────────────────
// Botão no header — mostra estado e menu de conta
interface PremiumHeaderButtonProps {
  onLoginClick: () => void;
}

export function PremiumHeaderButton({ onLoginClick }: PremiumHeaderButtonProps) {
  const premium = usePremium();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!premium.user) {
    return (
      <button onClick={onLoginClick} style={styles.headerBtn}>
        ⭐ Premium
      </button>
    );
  }

  const labelStatus = premium.isPaid ? '✅ Activo' : premium.isTrial ? `⏳ Trial (${premium.diasRestantes}d)` : '❌ Expirado';
  const corStatus   = premium.isPaid ? '#22c55e' : premium.isTrial ? '#fbbf24' : '#ef4444';

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setMenuOpen(!menuOpen)} style={{ ...styles.headerBtn, background: 'rgba(255,215,0,0.15)', borderColor: '#ffd700' }}>
        👤 {premium.user.nome.split(' ')[0]}
        <span style={{ color: corStatus, fontSize: 11, marginLeft: 6 }}>{labelStatus}</span>
      </button>
      {menuOpen && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <div style={{ color: '#fff', fontWeight: 600 }}>{premium.user.nome}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{premium.user.email}</div>
            <div style={{ color: '#888', fontSize: 12 }}>Ref: {premium.user.ref}</div>
          </div>
          {premium.isExpired && (
            <a href="/loto-premium" style={{ ...styles.dropdownItem, color: '#ffd700' }}>
              🔄 Renovar Subscrição
            </a>
          )}
          <button onClick={() => { premium.logout(); setMenuOpen(false); }} style={{ ...styles.dropdownItem, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            🚪 Terminar Sessão
          </button>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE: TrialExpiredModal ────────────────────────────
// Modal bloqueante quando trial expira — redireciona para /loto-premium
export function TrialExpiredModal() {
  const premium = usePremium();

  // Só mostra se expirado e havia sessão
  if (!premium.isExpired || !premium.user) return null;

  // Redirecionar automaticamente
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/loto-premium';
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ ...styles.overlay, zIndex: 9999 }}>
      <div style={{ ...styles.modal, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
        <h2 style={{ color: '#ffd700', margin: '0 0 12px' }}>Acesso Expirado</h2>
        <p style={{ color: '#aaa', lineHeight: 1.6 }}>
          {premium.isTrial ? 'O teu trial de 7 dias terminou.' : 'A tua subscrição expirou.'}<br />
          Renova por apenas <strong style={{ color: '#ffd700' }}>{PRECO_MENSAL}</strong>.
        </p>
        <p style={{ color: '#666', fontSize: 13 }}>A redirecionar em 3 segundos...</p>
        <a href="/loto-premium" style={{ ...styles.btn, display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
          Renovar Agora
        </a>
      </div>
    </div>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    color: '#f0f0f0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    paddingBottom: 60,
  },
  hero: {
    background: 'linear-gradient(160deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)',
    padding: '60px 24px 40px',
    textAlign: 'center',
    borderBottom: '1px solid #1e1e3a',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255,215,0,0.1)',
    color: '#ffd700',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 20,
    padding: '4px 16px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 40, margin: '0 0 12px', color: '#fff', fontWeight: 800 },
  heroSub:   { color: '#aaa', fontSize: 16, margin: '0 0 24px', lineHeight: 1.5 },
  priceTag:  { fontSize: 36, fontWeight: 800, color: '#ffd700', margin: '0 0 12px' },
  trialPill: {
    display: 'inline-block',
    background: 'rgba(34,197,94,0.1)',
    color: '#86efac',
    border: '1px solid rgba(34,197,94,0.3)',
    borderRadius: 20,
    padding: '6px 20px',
    fontSize: 14,
  },
  features: {
    maxWidth: 560,
    margin: '32px auto',
    padding: '0 24px',
    display: 'grid',
    gap: 12,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#111',
    border: '1px solid #1e1e3a',
    borderRadius: 10,
    padding: '12px 16px',
  },
  featureIcon: { fontSize: 24 },
  featureText: { color: '#ccc', fontSize: 14 },
  card: {
    maxWidth: 480,
    margin: '0 auto 32px',
    background: '#111',
    border: '1px solid #1e1e3a',
    borderRadius: 16,
    padding: '32px 28px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    background: '#0a0a0a',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '10px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#888',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'all 0.2s',
  },
  tabActive: { background: '#1a1a2e', color: '#ffd700' },
  input: {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
    boxSizing: 'border-box',
    outline: 'none',
  },
  pwdWrap:   { position: 'relative', marginBottom: 0 },
  pwdToggle: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    padding: 4,
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: '#ffd700',
    color: '#000',
    border: 'none',
    borderRadius: 8,
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
    marginTop: 12,
    boxSizing: 'border-box',
    transition: 'opacity 0.2s',
  },
  hint: { color: '#666', fontSize: 12, textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 },
  msgBox: {
    border: '1px solid',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 16,
  },
  payCard: {
    maxWidth: 480,
    margin: '0 auto',
    background: '#111',
    border: '1px solid #1e1e3a',
    borderRadius: 16,
    padding: '28px',
  },
  payTitle: { color: '#ffd700', margin: '0 0 20px', fontSize: 18 },
  payStep: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 20,
    color: '#ccc',
    fontSize: 14,
    lineHeight: 1.6,
  },
  payNum: {
    width: 28,
    height: 28,
    background: '#ffd700',
    color: '#000',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    flexShrink: 0,
    fontSize: 13,
  },
  payDetail: { color: '#999', fontSize: 13 },
  iban: { background: '#0a0a0a', color: '#ffd700', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: '#111',
    border: '1px solid #1e1e3a',
    borderRadius: 16,
    padding: '40px 32px',
    width: '100%',
    maxWidth: 440,
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
  },
  // Header button
  headerBtn: {
    background: 'rgba(255,215,0,0.08)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: 8,
    color: '#ffd700',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#111',
    border: '1px solid #2a2a3e',
    borderRadius: 12,
    minWidth: 220,
    overflow: 'hidden',
    zIndex: 200,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  dropdownHeader: {
    padding: '16px',
    borderBottom: '1px solid #1e1e3a',
  },
  dropdownItem: {
    display: 'block',
    padding: '12px 16px',
    fontSize: 14,
    textDecoration: 'none',
    transition: 'background 0.15s',
  },
  // Banners
  freeBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1a1a2e, #0d1a2e)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: 12,
    padding: '16px 20px',
    gap: 16,
    margin: '12px 0',
  },
  bannerLoginBtn: {
    background: 'transparent',
    border: '1px solid #ffd700',
    color: '#ffd700',
    borderRadius: 6,
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
  },
  bannerUpgradeBtn: {
    background: '#ffd700',
    color: '#000',
    borderRadius: 6,
    padding: '8px 16px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 13,
    display: 'inline-block',
  },
  trialBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(251,191,36,0.08)',
    border: '1px solid rgba(251,191,36,0.3)',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 14,
    color: '#fbbf24',
    margin: '8px 0',
  },
  trialBannerBtn: {
    background: '#fbbf24',
    color: '#000',
    borderRadius: 6,
    padding: '6px 14px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 12,
  },
};

// ─── EXPORTAÇÕES ──────────────────────────────────────────────
export default {
  usePremium,
  PremiumCheckoutPage,
  LoginModal,
  PremiumBanner,
  PremiumHeaderButton,
  TrialExpiredModal,
  FREE_MAX_LINES,
};
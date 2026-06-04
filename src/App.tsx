import { useEffect, useMemo, useState, useCallback } from 'react';
import logoImg from './assets/logo.jpg';
import Ball from './components/Ball';
import Card from './components/Card';
import Modal from './components/Modal';
import PrizeCalculator from './components/PrizeCalculator';
import AccessGate from './components/AccessGate';
import PremiumBanner from './components/PremiumBanner';
import UpgradeModal from './components/UpgradeModal';
import TokenActivation from './components/TokenActivation';
import DiarioApostas from './components/DiarioApostas';
import PlanoSemanal from './components/PlanoSemanal';
import RelatorioMensal from './components/RelatorioMensal';
import {
  TOTAL_NUMBERS,
  PICK_SIZE,
  GAME_NAME,
  OPERATOR,
  CONCESSIONAIRE,
  REGULATOR,
  LEGAL_REF,
  DECREE_REF,
  WEBSITE,
  MIN_STAKE_KZ,
  MAX_STAKE_KZ,
  MAX_PRIZE_KZ,
  TAX_FREE_KZ,
  TAX_RATE,
  MULTIPLIERS,
  computeFrequency,
  hotColdRanking,
  gapAnalysis,
  sumStats,
  parityStats,
  decadeStats,
  type Draw,
} from './data/history';
import {
  generateLine,
  probabilityHint,
  type Filter,
  type GenerationStrategy,
} from './lib/generator';
import { fetchRealDraws, checkPremiumStatus } from './lib/apiClient';
import {
  GRELHA_EXEMPLO,
  TOTOBOLA_DATA_IS_SIMULATED,
  gerarBoletimAleatorio,
  totobolaOddsAllCorrect,
  type BoletimTotobola,
  type Prognostico,
} from './lib/totobola';
import { usePremium, PremiumHeaderButton, LoginModal, TrialExpiredModal } from "./components/LOTO_PREMIUM_MODULE";
import {
  loadSession,
  saveSession,
  canGenerate,
  recordGeneration,
  todayStr,
  FREE_GENS_DAY,
  TRIAL_DAYS,
  shouldVerifyWithServer,
  isPremiumValid,
  activatePremiumFromServer,
  shouldSync,
  updateLastSync,
  type UserSession,
} from './lib/session';

// =============================================================
// CABEÇALHOS DISTINTOS POR TAB
// =============================================================
const TAB_HEADERS = {
  loto: {
    title: 'LOTO 5/90',
    subtitle: 'Escolhe 5 números de 1 a 90 e concorre a prémios de até 50.000.000 Kz',
    accent: '#E63946',
    bg: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0d1a0a 100%)',
    icon: '🎱',
    badge: 'SORTEIO DIÁRIO',
    badgeColor: '#E63946',
  },
  totobola: {
    title: 'TOTOBOLA',
    subtitle: 'Prevê os resultados de 13 jogos de futebol e ganha prémios incríveis',
    accent: '#22A55A',
    bg: 'linear-gradient(135deg, #0a1a0a 0%, #0d2a1a 50%, #0a0d1a 100%)',
    icon: '⚽',
    badge: 'EM BREVE',
    badgeColor: '#22A55A',
  },
  premios: {
    title: 'PRÉMIOS & RESULTADOS',
    subtitle: 'Consulta os últimos sorteios, verifica o teu boletim e calcula os teus ganhos',
    accent: '#1E40AF',
    bg: 'linear-gradient(135deg, #1a0a00 0%, #2a1500 50%, #1a0a0a 100%)',
    icon: '🏆',
    badge: 'ÚLTIMOS RESULTADOS',
    badgeColor: '#1E40AF',
  },
};

type FontSize = 'normal' | 'large' | 'xlarge';
type Tab = 'loto' | 'totobola' | 'premios';
type ModalResponsavelType = 'autoavaliacao' | 'limites' | 'reflexao' | null;

const APP_NAME = 'KazolaGlow';
const APP_SLOGAN = 'Joga com dados, não com sorte';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-AO', {
    day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long',
  });
}

function fmtKz(n: number) {
  return n.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 });
}

// =============================================================
// 1. FUNÇÕES DE CACHE
// =============================================================
function loadCachedDraws(): Draw[] | null {
  try {
    const cached = localStorage.getItem('kazola_last_draws');
    return cached ? JSON.parse(cached) : null;
  } catch { 
    return null; 
  }
}

function saveCachedDraws(draws: Draw[]) {
  try {
    localStorage.setItem('kazola_last_draws', JSON.stringify(draws));
    localStorage.setItem('kazola_last_draws_date', new Date().toISOString());
  } catch { /* silent */ }
}

export default function App() {
  // ── SESSÃO PROFISSIONAL ─────────────────────────────────
  const [session, setSession] = useState<UserSession | null>(() => loadSession());
  const [showGate, setShowGate] = useState<boolean>(() => !loadSession());
  const [gateReason, setGateReason] = useState<'first_visit' | 'trial_expired' | 'daily_limit'>('first_visit');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTokenActivation, setShowTokenActivation] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showToast = useCallback((msg: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Acessibilidade / preferências ───────────────────────────────────
  const [ageOk, setAgeOk] = useState<boolean>(() => {
    try { return localStorage.getItem('ln_age_ok') === '1'; } catch { return false; }
  });
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('large');
  const [tab, setTab] = useState<Tab>('loto');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalResponsavel, setModalResponsavel] = useState<ModalResponsavelType>(null);

  // Estado para autoavaliação
  const [autoavaliacaoRespostas, setAutoavaliacaoRespostas] = useState({
    q1: '', q2: '', q3: '', q4: '', q5: ''
  });

  // Estado para temporizador
  const [timerMinutos, setTimerMinutos] = useState<number | null>(null);
  const [timerAtivo, setTimerAtivo] = useState(false);

  // Estado para período de reflexão
  const [reflectionDays, setReflectionDays] = useState<number | null>(null);
  const [showReflectionConfirm, setShowReflectionConfirm] = useState(false);

  // ── Dados dos sorteios ──────────────────────────────────────────────
  const [sorteios, setSorteios] = useState<Draw[]>([]);
  const [loadingApi, setLoadingApi] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [temSorteioHoje, setTemSorteioHoje] = useState(false);

  // ── Gerador ─────────────────────────────────────────────────────────
  const [strategy, setStrategy] = useState<GenerationStrategy>('equilibrado');
  const [lines, setLines] = useState(3);
  const [parity, setParity] = useState<Filter['parityBias']>('equilibrado');
  const [exclude, setExclude] = useState<number[]>([]);
  const [generated, setGenerated] = useState<{ numbers: number[]; id: number }[]>([]);
  const [favorites, setFavorites] = useState<{ numbers: number[]; id: number }[]>(() => {
    try { const r = localStorage.getItem('ln_fav'); return r ? JSON.parse(r) : []; }
    catch { return []; }
  });

  // ── Histórico ───────────────────────────────────────────────────────
  const [windowSize, setWindowSize] = useState(60);
  const [activeDraw, setActiveDraw] = useState<Draw | null>(null);
  const [histPage, setHistPage] = useState(0);
  const HIST_PAGE_SIZE = 20;

  // ── Totobola ────────────────────────────────────────────────────────
  const [boletim, setBoletim] = useState<BoletimTotobola | null>(null);
  const [totoLines, setTotoLines] = useState<string[][]>([]);
  const [totoCount, setTotoCount] = useState(1);

  // ── Modais ──────────────────────────────────────────────────────────
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showResponsible, setShowResponsible] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // ── Premium (sistema existente) ─────────────────────────────────────────
  const premium = usePremium();

  // ── Simulador de Orçamento ──────────────────────────────────────────
  const [budget, setBudget] = useState<number>(500);
  const [stakePerLine, setStakePerLine] = useState<number>(100);

  // ── Estado Prémios ──────────────────────────────────────────────────
  const [checkNumbers, setCheckNumbers] = useState('');
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // ── Verificar se pode gerar hoje (usando sessão profissional) ───────
  const canGenerateTodayCheck = useMemo(() => {
    if (!session) return false;
    if (session.isPremium || premium.isActive) return true;
    return canGenerate(session).ok;
  }, [session, premium.isActive]);

  // ── Métodos disponíveis para free ───────────────────────────────────
  const availableStrategies: GenerationStrategy[] = (session?.isPremium || premium.isActive)
    ? ['equilibrado', 'frequencia', 'montecarlo', 'aleatorio']
    : ['equilibrado', 'aleatorio'];

  // ── Função de verificação premium no servidor ───────────────────────
  const verifyPremiumStatus = useCallback(async (currentSession: UserSession) => {
    if (shouldVerifyWithServer(currentSession)) {
      try {
        const result = await checkPremiumStatus(currentSession.email);
        if (result.ok && result.isPremium && result.expiracao) {
          const plano = result.plano === 'anual' ? 'anual' : 
                        result.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
          const updatedSession = activatePremiumFromServer(currentSession, plano, result.expiracao);
          setSession(updatedSession);
          showToast('Premium verificado e activado!', 'success');
        }
      } catch (error) {
        console.error('Erro ao verificar premium:', error);
      }
    }
  }, [showToast]);

  // ── Verificação periódica de premium ────────────────────────────────
  useEffect(() => {
    if (session && !isPremiumValid(session)) {
      verifyPremiumStatus(session);
    }
  }, [session, verifyPremiumStatus]);

  // ── Registro via Gate ───────────────────────────────────
  const handleRegister = useCallback((email: string) => {
    const now = Date.now();
    const newSession: UserSession = {
      email,
      registeredAt: now,
      lastGenerationDate: null,
      generationsToday: 0,
      isPremium: false,
      trialExpires: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
      plano: null,
      premiumExpiracao: null,
      tokenActivacao: null,
      verificadoNoServidor: false,
      ultimaVerificacao: null,
      syncEnabled: true,
      lastSync: null,
    };
    saveSession(newSession);
    setSession(newSession);
    setShowGate(false);
    showToast(`Bem-vindo! Trial de ${TRIAL_DAYS} dias activado.`, 'success');
  }, [showToast]);

  // ── Verificação de acesso ───────────────────────────────
  const checkAccess = useCallback((): boolean => {
    if (!session) {
      setGateReason('first_visit');
      setShowGate(true);
      return false;
    }
    const check = canGenerate(session);
    if (!check.ok) {
      if (check.reason === 'trial_expired') {
        setGateReason('trial_expired');
        setShowGate(true);
      }
      if (check.reason === 'daily_limit') {
        setGateReason('daily_limit');
        setShowGate(true);
      }
      return false;
    }
    return true;
  }, [session]);

  // ── Cálculo das recomendações ────────────────────────────────────────
  const recs = useMemo(() => {
    const maxLines = Math.floor(budget / stakePerLine);
    if (maxLines <= 3) {
      return { equilibrado: maxLines, aleatorio: 0, montecarlo: 0, frequencia: 0, total: maxLines };
    } else if (maxLines <= 6) {
      return {
        equilibrado: Math.floor(maxLines * 0.6),
        aleatorio: Math.ceil(maxLines * 0.2),
        montecarlo: Math.ceil(maxLines * 0.2),
        frequencia: 0,
        total: maxLines
      };
    } else if (maxLines <= 10) {
      return {
        equilibrado: Math.floor(maxLines * 0.5),
        aleatorio: Math.ceil(maxLines * 0.2),
        montecarlo: Math.ceil(maxLines * 0.2),
        frequencia: Math.ceil(maxLines * 0.1),
        total: maxLines
      };
    } else {
      return {
        equilibrado: Math.floor(maxLines * 0.4),
        aleatorio: Math.ceil(maxLines * 0.2),
        montecarlo: Math.ceil(maxLines * 0.2),
        frequencia: Math.ceil(maxLines * 0.2),
        total: maxLines
      };
    }
  }, [budget, stakePerLine]);

  // ── Efeitos ─────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    try { localStorage.setItem('ln_fav', JSON.stringify(favorites)); } catch { /* ok */ }
  }, [favorites]);

  // Temporizador
  useEffect(() => {
    if (timerAtivo && timerMinutos && timerMinutos > 0) {
      const interval = setInterval(() => {
        setTimerMinutos(prev => {
          if (prev && prev <= 1) {
            setTimerAtivo(false);
            alert('⏰ Tempo esgotado! Faça uma pausa de 5 minutos.');
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [timerAtivo, timerMinutos]);

  // ── Buscar dados da API ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingApi(true);
      setApiError(false);
      
      try {
        const result = await fetchRealDraws();
        
        if (!cancelled && result.draws.length > 0) {
          setSorteios(result.draws);
          setActiveDraw(result.draws[0]);
          setTemSorteioHoje(result.hasToday);
          
          // Guarda em cache para uso offline
          saveCachedDraws(result.draws);
        } else if (!cancelled) {
          // Tenta carregar do cache se API falhou
          const cached = loadCachedDraws();
          if (cached && cached.length > 0) {
            setSorteios(cached);
            setActiveDraw(cached[0]);
            setTemSorteioHoje(false);
            setApiError(true);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setApiError(true);
        
        // Fallback para cache apenas se existir
        const cached = loadCachedDraws();
        if (cached && cached.length > 0) {
          setSorteios(cached);
          setActiveDraw(cached[0]);
          setTemSorteioHoje(false);
        }
      }
      
      setLoadingApi(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Estatísticas
  const draws = sorteios;
  const freq = useMemo(() => computeFrequency(draws.slice(0, windowSize)), [draws, windowSize]);
  const weights = useMemo(() => freq.freq, [freq]);
  const hotCold = useMemo(() => hotColdRanking(draws, windowSize), [draws, windowSize]);
  const gaps = useMemo(() => gapAnalysis(draws), [draws]);
  const sum = useMemo(() => sumStats(draws), [draws]);
  const parityStat = useMemo(() => parityStats(draws), [draws]);
  const decades = useMemo(() => decadeStats(draws), [draws]);
  const probs = useMemo(() => probabilityHint(), []);
  const maxFreq = useMemo(() => Math.max(1, ...freq.freq.slice(1)), [freq]);
  const maxDecade = useMemo(() => Math.max(1, ...decades.map(d => d.count)), [decades]);

  // Gerador Totobola
  function generateTotobolaLine(): string[] {
    const outcomes = ['1', 'X', '2'];
    return Array.from({ length: 13 }, () => outcomes[Math.floor(Math.random() * 3)]);
  }

  // Calcular resultado da autoavaliação
  const autoavaliacaoScore = useMemo(() => {
    let score = 0;
    if (autoavaliacaoRespostas.q1 === 'Frequentemente') score += 3;
    else if (autoavaliacaoRespostas.q1 === 'Às vezes') score += 2;
    else if (autoavaliacaoRespostas.q1 === 'Raramente') score += 1;

    if (autoavaliacaoRespostas.q2 === 'Várias vezes') score += 3;
    else if (autoavaliacaoRespostas.q2 === 'Uma vez') score += 2;

    if (autoavaliacaoRespostas.q3 === 'Sim, várias') score += 3;
    else if (autoavaliacaoRespostas.q3 === 'Sim, uma vez') score += 2;

    if (autoavaliacaoRespostas.q4 === 'Frequentemente') score += 3;
    else if (autoavaliacaoRespostas.q4 === 'Às vezes') score += 2;

    if (autoavaliacaoRespostas.q5 === 'Sim, significativamente') score += 3;
    else if (autoavaliacaoRespostas.q5 === 'Sim, ligeiramente') score += 2;

    return score;
  }, [autoavaliacaoRespostas]);

  const autoavaliacaoFeedback = useMemo(() => {
    if (autoavaliacaoScore >= 10) {
      return {
        nivel: '⚠️ Atenção necessária',
        cor: 'red',
        mensagem: 'Os seus hábitos de jogo apresentam sinais de alerta significativos.',
        acao: 'Recomendamos fortemente que procure apoio profissional no ISJ.'
      };
    } else if (autoavaliacaoScore >= 5) {
      return {
        nivel: '📊 Em observação',
        cor: 'amber',
        mensagem: 'Alguns comportamentos merecem atenção.',
        acao: 'Defina limites de tempo e orçamento. Reveja daqui 30 dias.'
      };
    } else if (autoavaliacaoScore > 0) {
      return {
        nivel: '✅ Hábitos saudáveis',
        cor: 'green',
        mensagem: 'Os seus hábitos de jogo parecem equilibrados.',
        acao: 'Continue a praticar o jogo responsável.'
      };
    }
    return null;
  }, [autoavaliacaoScore]);

  // Handlers
  function onGenerate() {
    if (!checkAccess()) return;

    if (!availableStrategies.includes(strategy)) {
      alert(`⚠️ O método "${strategy}" está disponível apenas para Premium.`);
      return;
    }

    const filter: Filter = { exclude, parityBias: parity };
    const out: { numbers: number[]; id: number }[] = [];
    const maxLines = (session?.isPremium || premium.isActive) ? lines : 1;
    for (let i = 0; i < maxLines; i++) {
      const r = generateLine(weights, strategy, filter);
      if (r) out.push({ numbers: r.numbers, id: Date.now() + i });
    }
    setGenerated(out);
    if (session) {
      const updated = recordGeneration(session);
      setSession(updated);
    }
    showToast('Combinação gerada com sucesso!', 'success');
  }

  function handleGenerateToto() {
    if (!checkAccess()) return;
    const allowed = (session?.isPremium || premium.isActive) ? totoCount : 1;
    const lines = Array.from({ length: allowed }, generateTotobolaLine);
    setTotoLines(lines);
    if (session) {
      const updated = recordGeneration(session);
      setSession(updated);
    }
    showToast('Previsão gerada com sucesso!', 'success');
  }

  function handleCheck() {
    if (!checkAccess()) return;
    const nums = checkNumbers.trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 90);
    if (nums.length !== 5) {
      showToast('Insere 5 números válidos entre 1 e 90.', 'error');
      return;
    }
    const matches = Math.floor(Math.random() * 6);
    const prizes: Record<number, string> = {
      5: '🎉 JACKPOT! Consulta o agente mais próximo!',
      4: '🥇 4 acertos — Prémio de 2ª categoria!',
      3: '🥈 3 acertos — Prémio de 3ª categoria!',
      2: '🥉 2 acertos — Pequeno prémio!',
      1: 'Apenas 1 acerto. Tenta novamente!',
      0: 'Sem acertos desta vez. Boa sorte no próximo sorteio!',
    };
    setCheckResult(prizes[matches]);
    if (session) {
      const updated = recordGeneration(session);
      setSession(updated);
    }
  }

  function toggleExclude(n: number) {
    setExclude(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  }

  function toggleFavorite(line: { numbers: number[]; id: number }) {
    const key = line.numbers.join('-');
    const exists = favorites.some(f => f.numbers.join('-') === key);
    setFavorites(exists
      ? favorites.filter(f => f.numbers.join('-') !== key)
      : [...favorites, { numbers: line.numbers, id: Date.now() }]
    );
  }

  function confirmAge() {
    try { localStorage.setItem('ln_age_ok', '1'); } catch { /* ok */ }
    setAgeOk(true);
  }

  function iniciarPeriodoReflexao(dias: number) {
    setReflectionDays(dias);
    setShowReflectionConfirm(true);
    localStorage.setItem('reflection_start', new Date().toISOString());
    localStorage.setItem('reflection_end', new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString());
  }

  function iniciarTimer(minutos: number) {
    setTimerMinutos(minutos);
    setTimerAtivo(true);
    alert(`⏰ Temporizador de ${minutos} minutos iniciado!`);
  }

  function handleLogout() {
    localStorage.removeItem('kazola_user_session');
    setSession(null);
    setShowGate(true);
    setGateReason('first_visit');
    showToast('Sessão encerrada.', 'info');
  }

  function handleUpgraded(updatedSession: UserSession) {
    const finalSession = { 
      ...updatedSession, 
      syncEnabled: session?.syncEnabled ?? true,
      lastSync: session?.lastSync ?? null,
    };
    setSession(finalSession);
    setShowUpgrade(false);
    setShowTokenActivation(false);
    showToast('Parabéns! Agora você é Premium!', 'success');
  }

  async function handleAccess(s: UserSession) {
    try {
      const result = await checkPremiumStatus(s.email);
      if (result.ok && result.isPremium && result.expiracao) {
        const plano = result.plano === 'anual' ? 'anual' : 
                      result.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
        const premiumSession = activatePremiumFromServer(s, plano, result.expiracao);
        setSession(premiumSession);
        setShowGate(false);
        showToast('Premium activado! Bem-vindo de volta.', 'success');
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar premium:', error);
    }
    
    const syncedSession = { ...s, syncEnabled: true, lastSync: null };
    saveSession(syncedSession);
    setSession(syncedSession);
    setShowGate(false);
  }

  const handleSessionUpdate = useCallback((updatedSession: UserSession) => {
    setSession(updatedSession);
    saveSession(updatedSession);
  }, []);

  const fontClass = fontSize === 'normal' ? 'font-sys-normal' : fontSize === 'large' ? 'font-sys-large' : 'font-sys-xlarge';
  const histSlice = draws.slice(histPage * HIST_PAGE_SIZE, (histPage + 1) * HIST_PAGE_SIZE);
  const histPages = Math.ceil(draws.length / HIST_PAGE_SIZE);
  const header = TAB_HEADERS[tab];
  const daysLeft = session ? Math.max(0, Math.ceil((session.trialExpires - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const gensUsedToday = session ? (session.lastGenerationDate === todayStr() ? session.generationsToday : 0) : 0;

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Determina o último sorteio disponível
  const ultimoSorteio = activeDraw;
  const temDadosHoje = temSorteioHoje;

  return (
    <div className={`min-h-screen ${fontClass} ${highContrast ? 'high-contrast' : ''}`}>

      {/* ── AccessGate — obrigatório antes de gerar ──────────────── */}
      {showGate && (
        <AccessGate
          reason={gateReason}
          onAccess={handleAccess}
        />
      )}

      {/* ── Upgrade Modal ─────────────────────────────────────────── */}
      {showUpgrade && session && (
        <UpgradeModal
          session={session}
          onUpgraded={handleUpgraded}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {/* ── Token Activation Modal ─────────────────────────────────── */}
      {showTokenActivation && session && (
        <TokenActivation
          session={session}
          onUpgraded={handleUpgraded}
          onClose={() => setShowTokenActivation(false)}
        />
      )}

      {/* ── Verificação de idade ─────────────────────────────────── */}
      {!ageOk && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-600 text-white text-4xl flex items-center justify-center mx-auto mb-4 font-display font-black">
              18+
            </div>
            <h1 className="font-display font-black text-2xl md:text-3xl mb-2">Verificação de idade</h1>
            <p className="text-neutral-700 mb-6 leading-relaxed">
              Este site destina-se apenas a maiores de 18 anos. O <strong>{APP_NAME}</strong> é
              uma ferramenta educativa de análise estatística. Os sorteios são eventos aleatórios — nenhuma
              ferramenta garante acertos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={confirmAge}
                className="px-6 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition min-h-[56px]">
                Tenho 18 anos ou mais
              </button>
              <a href="https://www.google.com"
                className="px-6 py-4 rounded-2xl bg-neutral-100 text-neutral-800 font-bold text-lg hover:bg-neutral-200 transition text-center min-h-[56px]">
                Sair
              </a>
            </div>
            <p className="text-xs text-neutral-500 mt-5">
              Jogos de azar podem causar dependência. Jogue com responsabilidade.
            </p>
          </div>
        </div>
      )}

      {/* ── BARRA DE SESSÃO PROFISSIONAL ── */}
      <div className="bg-neutral-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span aria-hidden>🇦🇴</span>
            <span className="font-semibold">{APP_NAME} · {APP_SLOGAN} · Angola</span>
            <span className="hidden md:inline text-neutral-400">· Ferramenta educativa · 18+</span>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-neutral-300">
                  👤 {session.email}
                  {!session.isPremium && <span className="ml-2 text-amber-400">· Trial: {daysLeft}d</span>}
                  {session.isPremium && <span className="ml-2 text-green-400">· PREMIUM ✓</span>}
                </span>
                {session && !session.isPremium && (
                  <button 
                    onClick={() => setShowTokenActivation(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    🔑 Inserir token
                  </button>
                )}
                <button onClick={handleLogout} className="text-neutral-400 hover:text-white text-xs">Sair</button>
              </>
            ) : (
              <button onClick={() => setShowGate(true)} className="px-3 py-1 bg-amber-500 text-black rounded-lg text-xs font-bold">REGISTAR GRÁTIS</button>
            )}
            <label className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-neutral-300">Letra</span>
              <select aria-label="Tamanho da letra" value={fontSize}
                onChange={e => setFontSize(e.target.value as FontSize)}
                className="bg-neutral-800 text-white rounded-lg px-2 py-1 text-sm">
                <option value="normal">Normal</option>
                <option value="large">Grande</option>
                <option value="xlarge">Muito grande</option>
              </select>
            </label>
            <button onClick={() => setHighContrast(v => !v)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold"
              aria-pressed={highContrast}>
              {highContrast ? 'Desligar' : 'Ligar'} alto contraste
            </button>
          </div>
        </div>
      </div>

      {/* ── Header com LOGO ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <a href="#inicio" className="flex items-center gap-3">
            <div className="w-20 h-20 overflow-hidden">
              <img src={logoImg} alt="KazolaGlow" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-display font-black text-xl md:text-2xl leading-tight">{APP_NAME}</div>
              <div className="text-xs md:text-sm text-neutral-600">
                {APP_SLOGAN} · Análise estatística de lotaria
              </div>
            </div>
          </a>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-1 font-semibold text-neutral-700">
            <button onClick={() => { setTab('loto'); scrollToSection('gerador'); }}
              className="px-3 py-2 rounded-xl hover:bg-neutral-100">
              Gerador
            </button>
            <button onClick={() => { setTab('loto'); scrollToSection('estatisticas'); }}
              className="px-3 py-2 rounded-xl hover:bg-neutral-100">
              Estatísticas
            </button>
            <button onClick={() => { setTab('loto'); scrollToSection('historico'); }}
              className="px-3 py-2 rounded-xl hover:bg-neutral-100">
              Histórico
            </button>
            <button onClick={() => setTab('totobola')}
              className="px-3 py-2 rounded-xl hover:bg-neutral-100">
              Totobola <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Em breve</span>
            </button>
            <button onClick={() => { setTab('loto'); scrollToSection('aprender'); }}
              className="px-3 py-2 rounded-xl hover:bg-neutral-100">
              Aprender
            </button>
            <button onClick={() => setShowResponsible(true)}
              className="ml-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
              🛡️ Jogo responsável
            </button>
            <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
          </nav>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-neutral-100 transition">
            <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-neutral-200 py-2 px-4 shadow-lg">
            <div className="flex flex-col gap-1">
              <button onClick={() => { setTab('loto'); scrollToSection('gerador'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 text-left font-semibold">🎲 Gerador</button>
              <button onClick={() => { setTab('loto'); scrollToSection('estatisticas'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 text-left font-semibold">📊 Estatísticas</button>
              <button onClick={() => { setTab('loto'); scrollToSection('historico'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 text-left font-semibold">📜 Histórico</button>
              <button onClick={() => setTab('totobola')} className="px-3 py-3 rounded-xl hover:bg-neutral-100 text-left font-semibold">⚽ Totobola <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Em breve</span></button>
              <button onClick={() => { setTab('loto'); scrollToSection('aprender'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 text-left font-semibold">📖 Aprender</button>
              <button onClick={() => setShowResponsible(true)} className="px-3 py-3 rounded-xl hover:bg-neutral-100 text-left font-semibold text-emerald-700">🛡️ Jogo responsável</button>
              <div className="pt-2 border-t border-neutral-100">
                <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Disclaimer legal ────────────────────────────────────── */}
      <div className="bg-amber-50 border-y border-amber-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-start gap-3 text-amber-900">
          <span aria-hidden className="text-xl leading-none mt-0.5">⚠️</span>
          <p className="text-sm md:text-base leading-relaxed">
            <strong>Importante:</strong> ferramenta <strong>educativa e de entretenimento</strong>,
            <strong> não afiliada</strong> à {OPERATOR} ({CONCESSIONAIRE}) nem ao {REGULATOR}.
            Os sorteios são <strong>aleatórios e independentes</strong> — nenhum método garante acertos.
            Jogue com responsabilidade. +18.
          </p>
        </div>
      </div>

      {/* ── BANNER DE ORIGEM DOS DADOS ───────────────────────── */}
      <div className={`${!apiError && draws.length > 0 ? (temDadosHoje ? 'bg-emerald-50' : 'bg-amber-50') : 'bg-amber-50'} border-b border-neutral-200`}>
        <div className="max-w-6xl mx-auto px-4 py-2 text-xs md:text-sm flex items-center gap-2 flex-wrap">
          <span aria-hidden>{!apiError && draws.length > 0 ? (temDadosHoje ? '✅' : '⚠️') : '🕐'}</span>
          {loadingApi ? (
            <span>A carregar dados da API oficial…</span>
          ) : !apiError && draws.length > 0 ? (
            temDadosHoje ? (
              <span>✅ Dados reais da API oficial da Lotaria Nacional.</span>
            ) : (
              <span>⚠️ Último sorteio disponível: {activeDraw ? formatDate(activeDraw.date) : 'N/A'} — o sorteio de hoje ainda não foi actualizado.</span>
            )
          ) : (
            <span>🕐 A aguardar actualização dos dados.</span>
          )}
        </div>
      </div>

      {/* ── Premium Banner ── */}
      {session && (
        <PremiumBanner
          session={session}
          onUpgrade={() => setShowUpgrade(true)}
          onLogout={handleLogout}
          gensUsedToday={gensUsedToday}
          gensLimitDay={FREE_GENS_DAY}
        />
      )}

      {/* ── CABEÇALHO HERO DISTINTO POR TAB ── */}
      <div className="relative overflow-hidden py-8 px-4" style={{ background: header.bg }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: header.accent, color: '#000' }}>
            {header.badge}
          </div>
          <h1 className="font-display font-black text-4xl md:text-6xl mb-3" style={{ background: `linear-gradient(135deg, #fff, ${header.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {header.title}
          </h1>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto">{header.subtitle}</p>
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────────────────── */}
      <main id="inicio" className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">

        {/* ── BARRA DE CONTROLO (Selector de tempo no topo) ── */}
        <div className="bg-gradient-to-r from-neutral-50 to-white rounded-2xl p-4 shadow-sm border border-neutral-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-neutral-700">📅 Período de análise:</span>
              <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))}
                className="rounded-xl bg-white ring-1 ring-neutral-200 px-4 py-2 font-semibold text-sm">
                <option value={20}>Últimos 20 sorteios</option>
                <option value={60}>Últimos 60 sorteios</option>
                <option value={120}>Últimos 120 sorteios</option>
                <option value={draws.length}>Todos ({draws.length})</option>
              </select>
            </div>
            <div className="text-xs text-neutral-500">
              📊 Os dados abaixo refletem os últimos {Math.min(windowSize, draws.length)} sorteios
            </div>
          </div>
        </div>

        {/* ── ÚLTIMO SORTEIO (VERSÃO CORRIGIDA) ── */}
        {ultimoSorteio && (
          <Card
            title={`${temDadosHoje ? 'Último sorteio' : 'Último sorteio disponível'} · ${formatDate(ultimoSorteio.date)}${ultimoSorteio.time ? ' · ' + ultimoSorteio.time : ''}`}
            subtitle={temDadosHoje 
              ? `Concurso ${ultimoSorteio.id}${ultimoSorteio.session ? ' · ' + (ultimoSorteio.session === 'fezada' ? 'Fezada' : ultimoSorteio.session === 'aqueceu' ? 'Aqueceu' : ultimoSorteio.session === 'kazola' ? 'Kazola' : 'Eskebra') : ''} — ${PICK_SIZE} números de 1 a ${TOTAL_NUMBERS}`
              : `⚠️ Resultado do último sorteio registado (${formatDate(ultimoSorteio.date)}). O sorteio de hoje ainda não está disponível na base de dados.`}
            icon={<span>📅</span>}
          >
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start py-4">
              {ultimoSorteio.numbers.map((n, i) => (
                <Ball key={n} n={n} animated size="lg" delay={i * 120} />
              ))}
            </div>
            
            {/* Aviso claro quando não são dados de hoje */}
            {!temDadosHoje && (
              <div className="mb-4 p-4 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 text-sm text-center">
                <span className="font-bold block mb-1">⏳ Dados históricos</span>
                Estes são os números do último sorteio disponível na nossa base de dados. 
                O resultado do sorteio de hoje será exibido assim que a Lotaria Nacional o disponibilizar.
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <div className="p-4 rounded-2xl bg-neutral-900 text-white text-center">
                <div className="text-xs uppercase text-neutral-300">Prémio máximo</div>
                <div className="text-lg md:text-xl font-display font-black">{fmtKz(MAX_PRIZE_KZ)}</div>
                <div className="text-xs text-neutral-400 mt-1">Opção 5 × {fmtKz(MAX_STAKE_KZ)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white ring-1 ring-neutral-200 text-center">
                <div className="text-xs uppercase text-neutral-500">Sorteios analisados</div>
                <div className="text-lg md:text-xl font-display font-black">{draws.length}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white ring-1 ring-neutral-200 text-center">
                <div className="text-xs uppercase text-neutral-500">Probabilidade (5 certos)</div>
                <div className="text-lg md:text-xl font-display font-black">
                  1 em {probs.five.toLocaleString('pt-AO')}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white ring-1 ring-neutral-200 text-center">
                <div className="text-xs uppercase text-neutral-500">Aposta</div>
                <div className="text-lg md:text-xl font-display font-black">
                  {fmtKz(MIN_STAKE_KZ)}–{fmtKz(MAX_STAKE_KZ)}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-neutral-600">
              Operado pela {OPERATOR} ({CONCESSIONAIRE}), regulado pelo {REGULATOR} ao abrigo
              da {LEGAL_REF} e {DECREE_REF}.{' '}
              <a href={WEBSITE} target="_blank" rel="noopener noreferrer"
                className="underline hover:text-red-600">
                Site oficial
              </a>
            </p>
          </Card>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 border-b border-neutral-200 pb-0">
          <button
            onClick={() => setTab('loto')}
            className={`px-6 py-3 rounded-t-xl font-bold text-base transition-all duration-200 ${
              tab === 'loto'
                ? 'bg-red-600 text-white shadow-lg -translate-y-0.5'
                : 'bg-neutral-100 text-neutral-700 hover:bg-red-100'
            }`}>
            🎲 LOTO 5/90
          </button>
          <button
            onClick={() => setTab('totobola')}
            className={`px-6 py-3 rounded-t-xl font-bold text-base transition-all duration-200 ${
              tab === 'totobola'
                ? 'bg-green-600 text-white shadow-lg -translate-y-0.5'
                : 'bg-neutral-100 text-neutral-700 hover:bg-green-100'
            }`}>
            ⚽ TOTOBOLA
          </button>
          <button
            onClick={() => setTab('premios')}
            className={`px-6 py-3 rounded-t-xl font-bold text-base transition-all duration-200 ${
              tab === 'premios'
                ? 'bg-blue-600 text-white shadow-lg -translate-y-0.5'
                : 'bg-neutral-100 text-neutral-700 hover:bg-blue-100'
            }`}>
            💰 PRÉMIOS
          </button>
        </div>

        {/* ═══════════ TAB: LOTO ═══════════════════════════════════ */}
        {tab === 'loto' && (
          <>
            {/* Gerador */}
            <section id="gerador" className="grid lg:grid-cols-5 gap-6">
              <Card
                title="Gerador inteligente"
                subtitle={`${!session ? '⚠️ Registe-se para começar a gerar!' : (!canGenerateTodayCheck ? '⚠️ Limite diário atingido. Volte amanhã ou adquira Premium.' : 'Escolha um método e gere combinações para estudo. Nenhuma garante vitória.')}`}
                icon={<span>🎲</span>}
                className="lg:col-span-3"
              >
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2">Método de geração</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableStrategies.map((key) => {
                        const config: Record<string, { label: string; hint: string }> = {
                          equilibrado: { label: 'Equilibrado (recomendado)', hint: 'Um número por cada faixa de 18 (1-18, 19-36…).' },
                          aleatorio: { label: 'Aleatório puro', hint: 'Cada combinação tem exatamente a mesma probabilidade.' },
                          frequencia: { label: 'Frequência histórica', hint: 'Pondera pelos números mais frequentes recentes. 🔒 Premium' },
                          montecarlo: { label: 'Monte Carlo', hint: 'Pesos históricos + ruído gaussiano. 🔒 Premium' },
                        };
                        const isLocked = !(session?.isPremium || premium.isActive) && (key === 'frequencia' || key === 'montecarlo');
                        return (
                          <button key={key} onClick={() => !isLocked && setStrategy(key as GenerationStrategy)}
                            className={`text-left rounded-2xl p-4 ring-2 transition min-h-[88px] ${isLocked ? 'opacity-60 cursor-not-allowed' : ''} ${
                              strategy === key ? 'ring-red-600 bg-red-50' : 'ring-neutral-200 bg-white hover:ring-neutral-300'
                            }`}>
                            <div className="font-display font-bold text-base md:text-lg">{config[key].label}</div>
                            <div className="text-xs md:text-sm text-neutral-600 mt-1">{config[key].hint}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Linhas: <strong>{lines}</strong></label>
                      <input type="range" min={1}
                        max={(session?.isPremium || premium.isActive) ? 10 : 1}
                        value={lines}
                        onChange={e => setLines(Number(e.target.value))}
                        className="w-full accent-red-600" />
                      <div className="text-xs text-neutral-500 mt-1">
                        1 a {(session?.isPremium || premium.isActive) ? 10 : 1} combinações por geração
                        {!(session?.isPremium || premium.isActive) && <span className="ml-2 text-amber-600">🔒 Premium permite até 10</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Par / Ímpar</label>
                      <select value={parity} onChange={e => setParity(e.target.value as Filter['parityBias'])}
                        className="w-full rounded-2xl bg-white ring-1 ring-neutral-200 p-3 font-semibold min-h-[52px]">
                        <option value="nenhum">Qualquer combinação</option>
                        <option value="equilibrado">Equilibrado (2P/3I ou 3P/2I)</option>
                        <option value="par">Maioria par</option>
                        <option value="impar">Maioria ímpar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Excluir números — toque para marcar/desmarcar
                      {exclude.length > 0 && <span className="ml-2 text-red-600">({exclude.length} excluídos)</span>}
                    </label>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(n => {
                        const off = exclude.includes(n);
                        return (
                          <button key={n} onClick={() => toggleExclude(n)} aria-pressed={off}
                            className={`aspect-square rounded-lg font-bold text-[10px] md:text-xs transition ${
                              off ? 'bg-neutral-900 text-white line-through' : 'bg-white ring-1 ring-neutral-200 hover:ring-neutral-400'
                            }`}>
                            {String(n).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!premium.isActive && !premium.isTrial && !session?.isPremium && (
                    <PremiumBanner onLogin={() => setShowLogin(true)} />
                  )}
                  {premium.isTrial && premium.diasRestantes !== null && (
                    <PremiumBanner isTrial={true} diasRestantes={premium.diasRestantes} onLogin={() => setShowLogin(true)} />
                  )}

                  {(!session || !canGenerateTodayCheck) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                      <span className="text-amber-800">
                        {!session ? '⚠️ Registe-se com email para começar a gerar!' : '⚠️ Limite diário atingido! Apenas 1 geração por dia para utilizadores gratuitos.'}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button onClick={onGenerate} disabled={!session || !canGenerateTodayCheck}
                      className={`flex-1 min-h-[60px] px-6 py-4 rounded-2xl font-display font-black text-lg shadow-md transition ${
                        !session || !canGenerateTodayCheck
                          ? 'bg-neutral-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}>
                      🎯 Gerar {(session?.isPremium || premium.isActive) ? lines : 1} combinação{lines > 1 ? 'ões' : ''}
                    </button>
                    <button onClick={() => setShowHelp(true)}
                      className="min-h-[60px] px-5 py-4 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-lg transition">
                      Como funciona?
                    </button>
                  </div>

                  {session && !premium.isActive && !session.isPremium && (
                    <div className="text-xs text-center text-neutral-500">
                      {canGenerateTodayCheck
                        ? `✅ Geração disponível hoje (1/1). Amanhã poderá gerar novamente. Trial restante: ${daysLeft} dias.`
                        : `⏳ Próxima geração disponível amanhã. Adquira Premium para gerações ilimitadas.`}
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Combinações geradas"
                subtitle={generated.length ? 'Toque no ♡ para guardar nos favoritos.' : 'As suas combinações aparecerão aqui.'}
                icon={<span>✨</span>} className="lg:col-span-2">
                {generated.length === 0 ? (
                  <div className="py-10 text-center text-neutral-500">
                    <div className="text-5xl mb-3">🎟️</div>
                    <p className="font-semibold">Sem combinações ainda.</p>
                    <p className="text-sm mt-1">Configure as opções e toque em "Gerar".</p>
                    {!(session?.isPremium || premium.isActive) && (
                      <p className="text-xs text-amber-600 mt-3">🔒 Utilizadores gratuitos: máximo 1 linha por geração</p>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {generated.map((g, idx) => {
                      const saved = favorites.some(f => f.numbers.join('-') === g.numbers.join('-'));
                      return (
                        <li key={g.id} className="rounded-2xl ring-1 ring-neutral-200 p-3 bg-white fade-in">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-neutral-700">Linha {idx + 1}</span>
                            <button onClick={() => toggleFavorite(g)} aria-label="Guardar nos favoritos"
                              className={`w-11 h-11 rounded-full text-2xl transition ${saved ? 'bg-red-600 text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}>
                              {saved ? '♥' : '♡'}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {g.numbers.map(n => <Ball key={n} n={n} size="sm" />)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </section>

            {/* Diário de Apostas */}
            {session?.isPremium || premium.isActive ? (
              <DiarioApostas session={session!} onSessionUpdate={handleSessionUpdate} />
            ) : (
              <Card title="📓 Diário de Apostas" icon={<span>📓</span>}>
                <div className="text-center py-6 text-neutral-500">
                  🔒 Disponível apenas para utilizadores Premium.
                  <button onClick={() => setShowUpgrade(true)} className="block mx-auto mt-3 px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-sm">
                    Upgrade Premium
                  </button>
                </div>
              </Card>
            )}

            {/* Plano Semanal */}
            {session?.isPremium || premium.isActive ? (
              <PlanoSemanal 
                session={session!}
                weights={weights}
                hotCold={hotCold}
                gaps={gaps}
                draws={draws}
                onSessionUpdate={handleSessionUpdate}
              />
            ) : (
              <Card title="📅 Plano Semanal" icon={<span>📅</span>}>
                <div className="text-center py-6 text-neutral-500">
                  🔒 Disponível apenas para utilizadores Premium.
                  <button onClick={() => setShowUpgrade(true)} className="block mx-auto mt-3 px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-sm">
                    Upgrade Premium
                  </button>
                </div>
              </Card>
            )}

            {/* Simulador de Orçamento */}
            <Card title="💰 Simulador de apostas" icon={<span>🎯</span>}>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold">Orçamento por sessão (Kz)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-neutral-500">Kz</span>
                      <input
                        type="number"
                        min={50}
                        max={10000}
                        step={50}
                        value={budget}
                        onChange={e => setBudget(Number(e.target.value))}
                        className="flex-1 rounded-xl bg-white ring-1 ring-neutral-200 px-4 py-3 font-semibold"
                      />
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={2000}
                      step={50}
                      value={budget}
                      onChange={e => setBudget(Number(e.target.value))}
                      className="w-full mt-2 accent-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold">Valor por combinação (Kz)</label>
                    <select
                      value={stakePerLine}
                      onChange={e => setStakePerLine(Number(e.target.value))}
                      className="w-full rounded-xl bg-white ring-1 ring-neutral-200 px-4 py-3 font-semibold mt-1"
                    >
                      <option value={50}>50 Kz (mínimo)</option>
                      <option value={100}>100 Kz</option>
                      <option value={200}>200 Kz</option>
                      <option value={500}>500 Kz</option>
                      <option value={1000}>1000 Kz (máximo)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-neutral-100 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{recs.total} combinações</div>
                  <div className="text-sm text-neutral-600">
                    Custo total: {fmtKz(recs.total * stakePerLine)} •
                    {budget - (recs.total * stakePerLine) > 0
                      ? ` Sobra: ${fmtKz(budget - (recs.total * stakePerLine))}`
                      : ' ✅ Orçamento ajustado'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white rounded-xl p-2 ring-1 ring-neutral-200">
                    <div className="text-xs text-neutral-500">⚖️ Equilibrado</div>
                    <div className="text-xl font-bold text-red-600">{recs.equilibrado}</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 ring-1 ring-neutral-200">
                    <div className="text-xs text-neutral-500">🎲 Aleatório</div>
                    <div className="text-xl font-bold text-red-600">{recs.aleatorio}</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 ring-1 ring-neutral-200">
                    <div className="text-xs text-neutral-500">📊 Monte Carlo</div>
                    <div className="text-xl font-bold text-red-600">{recs.montecarlo}</div>
                  </div>
                  <div className="bg-white rounded-xl p-2 ring-1 ring-neutral-200">
                    <div className="text-xs text-neutral-500">📈 Frequência</div>
                    <div className="text-xl font-bold text-red-600">{recs.frequencia}</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Tabela de Ganhos */}
            <Card title="🏆 Se ganhar, quanto recebe?" icon={<span>💰</span>}>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Acertos</th>
                        <th className="px-4 py-2 text-right">Prémio por linha</th>
                        <th className="px-4 py-2 text-right">Se acertar 1 linha</th>
                        <th className="px-4 py-2 text-right">Se acertar todas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { hits: 2, mult: 10 },
                        { hits: 3, mult: 120 },
                        { hits: 4, mult: 5000 },
                        { hits: 5, mult: 100000 },
                      ].map(({ hits, mult }) => {
                        const prize = stakePerLine * mult;
                        const prizeWithTax = prize <= TAX_FREE_KZ ? prize : TAX_FREE_KZ + (prize - TAX_FREE_KZ) * (1 - TAX_RATE);
                        return (
                          <tr key={hits} className="border-b">
                            <td className="px-4 py-2 font-bold">{hits} números</td>
                            <td className="px-4 py-2 text-right font-mono">×{mult.toLocaleString('pt-AO')} = {fmtKz(prize)}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-green-600">{fmtKz(prizeWithTax)}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-red-600">{fmtKz(prizeWithTax * recs.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-neutral-900 text-white rounded-xl p-2 text-center">
                    <div className="text-xs">Aposta total</div>
                    <div className="font-bold">{fmtKz(recs.total * stakePerLine)}</div>
                  </div>
                  <div className="bg-green-600 text-white rounded-xl p-2 text-center">
                    <div className="text-xs">⭐ 3 acertos</div>
                    <div className="font-bold">{fmtKz(stakePerLine * 120)}</div>
                  </div>
                  <div className="bg-blue-600 text-white rounded-xl p-2 text-center">
                    <div className="text-xs">⭐⭐ 4 acertos</div>
                    <div className="font-bold">{fmtKz(stakePerLine * 5000)}</div>
                  </div>
                  <div className="bg-red-600 text-white rounded-xl p-2 text-center">
                    <div className="text-xs">⭐⭐⭐ JACKPOT</div>
                    <div className="font-bold">{fmtKz(stakePerLine * 100000)}</div>
                  </div>
                </div>

                <div className="text-xs text-neutral-500 text-center">
                  💡 Imposto: prémios ≤ {fmtKz(TAX_FREE_KZ)} são isentos. Acima disso, paga 15% sobre o excedente.
                </div>
              </div>
            </Card>

            {/* Relatório Mensal */}
            {session?.isPremium || premium.isActive ? (
              <RelatorioMensal session={session!} />
            ) : (
              <Card title="📊 Relatório Mensal" icon={<span>📊</span>}>
                <div className="text-center py-6 text-neutral-500">
                  🔒 Disponível apenas para utilizadores Premium.
                  <button onClick={() => setShowUpgrade(true)} className="block mx-auto mt-3 px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-sm">
                    Upgrade Premium
                  </button>
                </div>
              </Card>
            )}

            {/* Favoritos */}
            <Card title="Os seus favoritos" subtitle="Guardados neste dispositivo (localStorage)." icon={<span>💾</span>}>
              {favorites.length === 0 ? (
                <p className="text-neutral-500 text-center py-6">
                  Ainda não guardou nenhuma combinação. Toque no ♡ após gerar.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {favorites.map(f => (
                    <div key={f.id} className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-200">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {f.numbers.map(n => <Ball key={n} n={n} size="sm" />)}
                      </div>
                      <button onClick={() => toggleFavorite(f)}
                        className="text-sm font-bold text-red-600 hover:underline">Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Estatísticas */}
            <section id="estatisticas" className="grid lg:grid-cols-2 gap-6">
              <Card title="Frequência dos números"
                subtitle={`Últimos ${Math.min(windowSize, draws.length)} sorteios — ocorrências de cada número.`}
                icon={<span>📊</span>}>
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm font-bold shrink-0">Janela:</label>
                  <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))}
                    className="rounded-xl bg-white ring-1 ring-neutral-200 px-3 py-2 font-semibold text-sm">
                    <option value={20}>20 sorteios</option>
                    <option value={60}>60 sorteios</option>
                    <option value={120}>120 sorteios</option>
                    <option value={draws.length}>Todos ({draws.length})</option>
                  </select>
                </div>
                <div className="space-y-0.5 max-h-[420px] overflow-y-auto pr-1">
                  {freq.freq.slice(1).map((c, i) => {
                    const n = i + 1;
                    const denom = Math.min(windowSize, draws.length) || 1;
                    return (
                      <div key={n} className="flex items-center gap-2 text-sm">
                        <div className="w-8 text-right font-mono font-bold text-xs">{String(n).padStart(2, '0')}</div>
                        <div className="flex-1 h-5 rounded-md bg-neutral-100 overflow-hidden">
                          <div className="bar-grow h-full bg-gradient-to-r from-red-600 to-amber-400"
                            style={{ width: `${(c / maxFreq) * 100}%` }} />
                        </div>
                        <div className="w-14 text-right text-neutral-500 text-xs">
                          {c}x · {((c / denom) * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="space-y-6">
                <Card title="🔥 Quentes & ❄️ Frios"
                  subtitle="Os 8 mais e menos frequentes na janela seleccionada." icon={<span>📈</span>}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="font-bold mb-2 text-red-600 text-sm">🔥 Mais frequentes</div>
                      <div className="flex flex-wrap gap-1.5">
                        {hotCold.hot.map(n => <Ball key={n} n={n} variant="hot" size="sm" />)}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold mb-2 text-sky-700 text-sm">❄️ Menos frequentes</div>
                      <div className="flex flex-wrap gap-1.5">
                        {hotCold.cold.map(n => <Ball key={n} n={n} variant="cold" size="sm" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-3">
                    A frequência passada <strong>não prevê resultados futuros</strong>. Cada sorteio é independente.
                  </p>
                </Card>

                <Card title="Atraso (gap analysis)"
                  subtitle="Há quantos sorteios cada número não sai." icon={<span>⏳</span>}>
                  <div className="grid grid-cols-10 gap-1">
                    {gaps.map(({ n, gap }) => (
                      <div key={n} title={`Nº ${n} — ${gap} sorteios sem sair`}
                        className={`aspect-square rounded-md text-[9px] font-bold flex items-center justify-center ring-1 ${
                          gap >= 30 ? 'bg-red-600 text-white ring-red-600'
                          : gap >= 15 ? 'bg-amber-100 ring-amber-300'
                          : 'bg-neutral-100 ring-neutral-200'
                        }`}>
                        {String(n).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-neutral-600">
                    <span><span className="inline-block w-3 h-3 rounded bg-red-600 align-middle mr-1"/>≥ 30 sorteios</span>
                    <span><span className="inline-block w-3 h-3 rounded bg-amber-200 align-middle mr-1"/>15–29</span>
                    <span><span className="inline-block w-3 h-3 rounded bg-neutral-200 align-middle mr-1"/>0–14</span>
                  </div>
                </Card>
              </div>
            </section>

            {/* Distribuição por dezena */}
            <Card title="Distribuição por dezena"
              subtitle="Quantas vezes saíram números de cada faixa de 10, no total do histórico."
              icon={<span>📉</span>}>
              <div className="space-y-2">
                {decades.map(({ label, count }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <div className="w-14 text-right font-mono font-bold text-xs text-neutral-600">{label}</div>
                    <div className="flex-1 h-6 rounded-lg bg-neutral-100 overflow-hidden">
                      <div className="bar-grow h-full bg-gradient-to-r from-red-600/60 to-amber-400"
                        style={{ width: `${(count / maxDecade) * 100}%` }} />
                    </div>
                    <div className="w-10 text-right text-neutral-500 text-xs font-mono">{count}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Par/Ímpar · Soma · Probabilidades */}
            <section className="grid md:grid-cols-3 gap-6">
              <Card title="Par / Ímpar" subtitle="Distribuição observada no histórico." icon={<span>⚖️</span>}>
                <div className="text-sm mb-3 text-neutral-500">
                  {parityStat.pairs + parityStat.odds} números no total
                </div>
                {(parityStat.pairs + parityStat.odds) > 0 && (
                  <div className="h-10 rounded-2xl flex overflow-hidden">
                    <div className="bg-red-600 flex items-center justify-center text-white text-sm font-bold"
                      style={{ width: `${(parityStat.pairs / (parityStat.pairs + parityStat.odds)) * 100}%` }}>
                      Pares {((parityStat.pairs / (parityStat.pairs + parityStat.odds)) * 100).toFixed(0)}%
                    </div>
                    <div className="bg-neutral-800 flex items-center justify-center text-white text-sm font-bold"
                      style={{ width: `${(parityStat.odds / (parityStat.pairs + parityStat.odds)) * 100}%` }}>
                      Ímpares {((parityStat.odds / (parityStat.pairs + parityStat.odds)) * 100).toFixed(0)}%
                    </div>
                  </div>
                )}
              </Card>

              <Card title="Soma dos 5 números" subtitle="Mínimo, máximo e média observados." icon={<span>➕</span>}>
                <div className="space-y-2 text-sm">
                  {[['Mínimo', sum.min], ['Máximo', sum.max], ['Média', sum.avg.toFixed(1)]].map(([k, v]) => (
                    <div key={String(k)} className="flex justify-between">
                      <span className="text-neutral-600">{k}</span>
                      <strong className="font-display">{v}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between text-neutral-500 text-xs pt-1 border-t">
                    <span>Intervalo teórico possível</span><span>15 – 440</span>
                  </div>
                </div>
              </Card>

              <Card title="Probabilidades reais" subtitle="Por linha jogada no Loto 5/90." icon={<span>🎯</span>}>
                <ul className="space-y-1.5 text-sm">
                  {[
                    ['5 certos (jackpot)', probs.five],
                    ['4 certos', probs.four],
                    ['3 certos', probs.three],
                    ['2 certos', probs.two],
                  ].map(([label, val]) => (
                    <li key={String(label)} className="flex justify-between">
                      <span className="text-neutral-600">{label}</span>
                      <strong className="font-mono text-xs">1 em {Number(val).toLocaleString('pt-AO')}</strong>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-neutral-500 mt-3 border-t pt-2">
                  Total combinações C(90,5) = {probs.total.toLocaleString('pt-AO')}
                </p>
              </Card>
            </section>

            {/* Histórico */}
            <section id="historico">
              <Card title="Histórico interactivo"
                subtitle="Clique num sorteio para o seleccionar. Dados mais recentes primeiro."
                icon={<span>📜</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-100 text-neutral-700">
                      <tr>
                        <th className="px-3 py-3 font-bold">Data</th>
                        <th className="px-3 py-3 font-bold">Hora</th>
                        <th className="px-3 py-3 font-bold">Sessão</th>
                        <th className="px-3 py-3 font-bold">Concurso</th>
                        <th className="px-3 py-3 font-bold">Números sorteados</th>
                        <th className="px-3 py-3 font-bold">Soma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histSlice.map(d => (
                        <tr key={d.id} onClick={() => setActiveDraw(d)}
                          className={`border-b border-neutral-100 cursor-pointer transition ${
                            activeDraw?.id === d.id ? 'bg-amber-50 font-semibold' : 'hover:bg-neutral-50'
                          }`}>
                          <td className="px-3 py-2.5 whitespace-nowrap text-sm">{formatDate(d.date)}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-neutral-600">{d.time ?? '—'}</td>
                          <td className="px-3 py-2.5 text-xs font-semibold">
                            {d.session === 'fezada' && <span className="text-red-600">☀️ Fezada</span>}
                            {d.session === 'aqueceu' && <span className="text-orange-600">🔥 Aqueceu</span>}
                            {d.session === 'kazola' && <span className="text-green-600">🌙 Kazola</span>}
                            {d.session === 'eskebra' && <span className="text-purple-600">⚡ Eskebra</span>}
                            {!d.session && '—'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-neutral-500">{d.id}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {d.numbers.map(n => (
                                <span key={n}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white ring-2 ring-neutral-300 font-bold text-[10px]">
                                  {String(n).padStart(2, '0')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-bold font-mono">
                            {d.numbers.reduce((a, b) => a + b, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {histPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <button onClick={() => setHistPage(p => Math.max(0, p - 1))}
                      disabled={histPage === 0}
                      className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 font-semibold transition">
                      ← Anterior
                    </button>
                    <span className="text-neutral-600">
                      Página {histPage + 1} de {histPages} · {draws.length} sorteios
                    </span>
                    <button onClick={() => setHistPage(p => Math.min(histPages - 1, p + 1))}
                      disabled={histPage === histPages - 1}
                      className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 font-semibold transition">
                      Próxima →
                    </button>
                  </div>
                )}
              </Card>
            </section>
          </>
        )}

        {/* ═══════════ TAB: TOTOBOLA — EM BREVE ══════════════════════ */}
        {tab === 'totobola' && (
          <section id="totobola">
            <Card
              title="⚽ Totobola — Em breve"
              subtitle="Prognósticos de futebol · A caminho"
              icon={<span>⚽</span>}
            >
              <div className="flex flex-col items-center text-center py-10 gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-5xl shadow-lg animate-pulse">
                  ⚽
                </div>
                <div>
                  <h2 className="font-display font-black text-3xl md:text-4xl mb-2">
                    Totobola em preparação
                  </h2>
                  <p className="text-neutral-600 text-base md:text-lg max-w-xl leading-relaxed">
                    Estamos a trabalhar para integrar a grelha oficial de prognósticos desportivos
                    do <strong>Totobola de Angola</strong>, em parceria com dados oficiais do{' '}
                    <strong>ISJ (Instituto de Supervisão de Jogos)</strong> e da{' '}
                    <strong>FAF (Federação Angolana de Futebol)</strong>.
                  </p>
                </div>
                <div className="w-full max-w-lg bg-neutral-50 ring-1 ring-neutral-200 rounded-2xl p-6 text-left">
                  <p className="font-bold text-base mb-3 text-neutral-800">📋 O que vai incluir:</p>
                  <ul className="space-y-2 text-sm text-neutral-700">
                    <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">✓</span>Grelha semanal oficial com jogos do <strong>Girabola</strong> e outras competições</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">✓</span>Prognósticos <strong>1 · X · 2</strong> com resumo do boletim</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">✓</span>Resultados reais e contagem de acertos automática</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">✓</span>Probabilidades e estatísticas de prognósticos</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">✓</span>Histórico de boletins e desempenho pessoal</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-bold text-sm ring-1 ring-amber-300">🔧 Em desenvolvimento</span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm ring-1 ring-emerald-300">🇦🇴 Dados oficiais ISJ</span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 text-neutral-700 font-bold text-sm ring-1 ring-neutral-300">⚽ Girabola 2025/26</span>
                </div>
                <p className="text-xs text-neutral-500 max-w-md leading-relaxed border-t pt-4 w-full">
                  ⚠️ Para garantir qualidade e fiabilidade, o Totobola só será lançado com dados
                  oficiais verificados. Não serão usadas grelhas fictícias ou simuladas.
                </p>
              </div>
            </Card>
          </section>
        )}

        {/* ═══════════ TAB: PRÉMIOS ════════════════════════════════ */}
        {tab === 'premios' && (
          <section id="premios" className="space-y-6">
            <Card title="Simulador de prémios" subtitle="Calcule o prémio líquido com base no Decreto Executivo n.º 695/25." icon={<span>💰</span>}>
              <PrizeCalculator />
            </Card>

            <Card title="Tabela de multiplicadores" subtitle="Cotas fixas por opção de aposta (Art.º 16 do Decreto 695/25)." icon={<span>📋</span>}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Opção</th>
                      <th className="px-4 py-3 text-left font-bold">Acerta</th>
                      <th className="px-4 py-3 text-right font-bold">Multiplicador</th>
                      <th className="px-4 py-3 text-right font-bold">Prémio por {fmtKz(100)}</th>
                      <th className="px-4 py-3 text-right font-bold">Prémio por {fmtKz(1000)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      [2, 'os 2 números escolhidos', 4],
                      [3, 'os 3 números escolhidos', 25],
                      [4, 'os 4 números escolhidos', 120],
                      [5, 'os 5 números escolhidos', 2500],
                    ] as [number, string, number][]).map(([opt, desc, mult]) => (
                      <tr key={opt} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-4 py-3 font-display font-black text-lg">{opt} números</td>
                        <td className="px-4 py-3 text-neutral-600">{desc}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">×{mult}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmtKz(100 * mult)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">{fmtKz(1000 * mult)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-200 text-sm text-amber-900">
                <strong>Regime fiscal</strong> ({DECREE_REF}, Art.º 26): prémios ≤ {fmtKz(280_000)} isentos de
                imposto · excedente sujeito a 15% de Imposto Especial de Jogos.
                Aposta: mínimo {fmtKz(MIN_STAKE_KZ)} · máximo {fmtKz(MAX_STAKE_KZ)}.
              </div>
            </Card>
          </section>
        )}

        {/* ── Aprender / Educativo ─────────────────────────────── */}
        <section id="aprender" className="grid md:grid-cols-2 gap-6">
          <Card title={`Como funciona o ${APP_NAME}`} subtitle="Regras reais, de forma simples." icon={<span>📖</span>}>
            <ol className="list-decimal pl-5 space-y-2 text-neutral-800 text-sm">
              <li>Escolha <strong>{PICK_SIZE} números</strong> de 1 a {TOTAL_NUMBERS}.</li>
              <li>São sorteadas 5 bolas de entre 90, por máquina automática ou gerador eletrónico supervisionado pelo {REGULATOR}.</li>
              <li>Apostas de <strong>{fmtKz(MIN_STAKE_KZ)} a {fmtKz(MAX_STAKE_KZ)}</strong>; pode jogar 2, 3, 4 ou 5 números.</li>
              <li>Até 28 concursos por semana (2ª–Dom, até 4×/dia). Nomes dos sorteios: <em>Fezada</em> (manhã) e <em>Kazola</em> (tarde).</li>
              <li>Prémio = valor apostado × multiplicador de cota fixa.</li>
            </ol>
            <p className="text-xs text-neutral-500 mt-3 pt-3 border-t">
              Operado pela {OPERATOR} ({CONCESSIONAIRE}) ao abrigo da {LEGAL_REF} e {DECREE_REF}.{' '}
              <a href={WEBSITE} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-600">
                {WEBSITE}
              </a>
            </p>
          </Card>

          <Card title="Mitos vs. Realidade" subtitle="Desmistifique crenças comuns sobre lotarias." icon={<span>🧠</span>}>
            <ul className="space-y-3 text-sm">
              <li className="rounded-2xl bg-neutral-50 p-3">
                <strong>❌ Mito:</strong> "Este número está atrasado, tem de sair."<br />
                <strong>✅ Realidade:</strong> cada sorteio é independente — a probabilidade de qualquer número é sempre 5/90.
              </li>
              <li className="rounded-2xl bg-neutral-50 p-3">
                <strong>❌ Mito:</strong> "Jogar as combinações vencedoras do passado é mais inteligente."<br />
                <strong>✅ Realidade:</strong> o histórico não influencia o próximo sorteio — lei dos grandes números.
              </li>
              <li className="rounded-2xl bg-neutral-50 p-3">
                <strong>✅ Bom senso:</strong> jogue por entretenimento, com um orçamento que pode perder, nunca por necessidade financeira.
              </li>
            </ul>
          </Card>
        </section>

        {/* ── Jogo responsável ────────────────────────────────────── */}
        <Card title="Jogo responsável" subtitle="Ferramentas de apoio para uma experiência saudável."
          icon={<span>🛡️</span>} className="bg-emerald-50 ring-1 ring-emerald-200">

          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => setModalResponsavel('autoavaliacao')}
              className="text-left rounded-2xl bg-white p-5 ring-1 ring-emerald-200 hover:ring-emerald-500 transition-all hover:scale-[1.02] group">
              <div className="text-3xl mb-2 group-hover:scale-110 transition">📋</div>
              <div className="font-display font-bold text-lg">Autoavaliação</div>
              <p className="text-sm text-neutral-700 mt-1">Responda a perguntas para avaliar os seus hábitos de jogo.</p>
            </button>

            <button onClick={() => setModalResponsavel('limites')}
              className="text-left rounded-2xl bg-white p-5 ring-1 ring-emerald-200 hover:ring-emerald-500 transition-all hover:scale-[1.02] group">
              <div className="text-3xl mb-2 group-hover:scale-110 transition">⏱️</div>
              <div className="font-display font-bold text-lg">Limites de tempo</div>
              <p className="text-sm text-neutral-700 mt-1">Defina alertas e organize pausas regulares.</p>
            </button>

            <button onClick={() => setModalResponsavel('reflexao')}
              className="text-left rounded-2xl bg-white p-5 ring-1 ring-emerald-200 hover:ring-emerald-500 transition-all hover:scale-[1.02] group">
              <div className="text-3xl mb-2 group-hover:scale-110 transition">🚪</div>
              <div className="font-display font-bold text-lg">Período de reflexão</div>
              <p className="text-sm text-neutral-700 mt-1">Afaste-se temporariamente se sentir necessidade.</p>
            </button>
          </div>

          <p className="text-xs text-neutral-500 mt-4 pt-3 border-t border-emerald-200">
            🧠 O jogo deve ser uma atividade de lazer, não uma fonte de rendimento.
            Se sentir dificuldades em controlar o tempo ou dinheiro investido, procure apoio profissional.
          </p>
        </Card>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-12 bg-neutral-900 text-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-amber-400 text-white flex items-center justify-center font-display font-black text-sm">KG</div>
              <div>
                <div className="font-display font-black text-lg">{APP_NAME}</div>
                <div className="text-xs text-neutral-400">{APP_SLOGAN} · +18</div>
              </div>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Análise estatística transparente para estudo de lotaria em Angola.
              <strong> Não afiliada</strong> à {OPERATOR} nem ao {REGULATOR}.
            </p>
          </div>
          <div>
            <div className="font-bold mb-2 text-white">Ferramentas</div>
            <ul className="space-y-1 text-sm">
              <li><button onClick={() => setTab('loto')} className="hover:text-white">Gerador Loto 5/90</button></li>
              <li><button onClick={() => setTab('loto')} className="hover:text-white">Estatísticas</button></li>
              <li><button onClick={() => setTab('loto')} className="hover:text-white">Histórico</button></li>
              <li><button onClick={() => setTab('totobola')} className="hover:text-white">Totobola</button></li>
              <li><button onClick={() => setTab('premios')} className="hover:text-white">Simulador de prémios</button></li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-2 text-white">Legal</div>
            <ul className="space-y-1 text-sm">
              <li><button onClick={() => setShowTerms(true)} className="hover:text-white">Termos de uso</button></li>
              <li><button onClick={() => setShowPrivacy(true)} className="hover:text-white">Política de privacidade</button></li>
              <li><button onClick={() => setShowResponsible(true)} className="hover:text-white">Jogo responsável</button></li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-2 text-white">Oficial</div>
            <p className="text-sm text-neutral-300 mb-2">
              Para informação oficial e resultados em tempo real, consulte sempre a entidade gestora:
            </p>
            <a href={WEBSITE} target="_blank" rel="noopener noreferrer"
              className="inline-block px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition">
              🌐 {CONCESSIONAIRE}
            </a>
            <div className="mt-3 inline-flex items-center gap-2 bg-amber-500 text-neutral-900 font-bold px-3 py-2 rounded-xl text-sm ml-2">
              +18 · Responsabilidade
            </div>
          </div>
        </div>
        <div className="border-t border-neutral-800">
          <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-neutral-400 text-center">
            © {new Date().getFullYear()} {APP_NAME} · {APP_SLOGAN} · Angola —
            Ferramenta educativa e de entretenimento. Não emite, vende ou promove apostas.
            Ao abrigo da {LEGAL_REF} · {DECREE_REF}.
          </div>
        </div>
      </footer>

      {/* ── Modais ──────────────────────────────────────────────── */}
      <Modal open={showTerms} onClose={() => setShowTerms(false)} title="Termos de uso">
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>Idade mínima de 18 anos e residência em jurisdição onde o acesso é permitido por lei.</li>
          <li>A aplicação é <strong>educativa e de entretenimento</strong>; não emite, vende nem promove apostas, nem está afiliada à {OPERATOR} ({CONCESSIONAIRE}) ou ao {REGULATOR}.</li>
          <li>Os dados de sorteios podem ser <strong>simulados</strong>. Os valores oficiais devem ser consultados em <a href={WEBSITE} target="_blank" rel="noopener noreferrer" className="underline">{WEBSITE}</a>.</li>
          <li>É proibido reproduzir promessas de "ganhos garantidos" ou "métodos infalíveis".</li>
          <li>Regulamentação: {LEGAL_REF} · {DECREE_REF}.</li>
        </ul>
      </Modal>

      <Modal open={showPrivacy} onClose={() => setShowPrivacy(false)} title="Política de privacidade">
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>Armazenamento local apenas (<code>localStorage</code>) para preferências e favoritos. Nenhum dado pessoal identificável é recolhido ou transmitido.</li>
          <li>Não há partilha de informação com terceiros, exceto quando exigida por lei.</li>
          <li>Pode apagar os dados locais a qualquer momento nas configurações do seu browser.</li>
          <li>Em conformidade com a Lei n.º 22/11 de Protecção de Dados Pessoais de Angola e boas práticas internacionais (RGPD).</li>
        </ul>
      </Modal>

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Como funciona o gerador?">
        <ol className="list-decimal pl-5 space-y-3 text-sm">
          <li><strong>Equilibrado:</strong> escolhe um número por cada faixa de 18 (1-18, 19-36, 37-54, 55-72, 73-90), para cobrir o espaço amostral de forma distribuída.</li>
          <li><strong>Frequência histórica:</strong> pesos maiores para os números mais frequentes nos últimos sorteios. Viés estatístico — não aumenta probabilidades reais.</li>
          <li><strong>Monte Carlo:</strong> pesos históricos com adição de ruído gaussiano (Box-Muller), criando combinações diversas e menos enviesadas.</li>
          <li><strong>Aleatório puro:</strong> todas as C(90,5) = {probs.total.toLocaleString('pt-AO')} combinações são igualmente prováveis. Matematicamente idêntico ao sorteio real.</li>
        </ol>
        <p className="text-sm text-neutral-600 pt-3 border-t mt-3">
          <strong>Importante:</strong> nenhum método prevê o futuro. As opções modelam apenas preferências de selecção, não aumentam a probabilidade de ganhar.
        </p>
      </Modal>

      {/* MODAL 1 - AUTOAVALIAÇÃO */}
      <Modal open={modalResponsavel === 'autoavaliacao'} onClose={() => setModalResponsavel(null)} title="📋 Autoavaliação - Hábitos de Jogo">
        <div className="space-y-4 text-sm">
          <p className="font-bold text-emerald-800">Responda com sinceridade para avaliar os seus hábitos:</p>

          <div className="space-y-4">
            <div className="bg-neutral-50 p-3 rounded-xl">
              <p className="font-semibold mb-2">1. Com que frequência joga?</p>
              <div className="flex gap-3 flex-wrap">
                {['Nunca', 'Raramente', 'Às vezes', 'Frequentemente'].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs">
                    <input type="radio" name="q1" value={opt} onChange={(e) => setAutoavaliacaoRespostas({ ...autoavaliacaoRespostas, q1: e.target.value })} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl">
              <p className="font-semibold mb-2">2. Já tentou reduzir ou parar sem sucesso?</p>
              <div className="flex gap-3 flex-wrap">
                {['Nunca', 'Uma vez', 'Várias vezes'].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs">
                    <input type="radio" name="q2" value={opt} onChange={(e) => setAutoavaliacaoRespostas({ ...autoavaliacaoRespostas, q2: e.target.value })} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl">
              <p className="font-semibold mb-2">3. Já escondeu ou mentiu sobre o quanto joga?</p>
              <div className="flex gap-3 flex-wrap">
                {['Não', 'Sim, uma vez', 'Sim, várias'].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs">
                    <input type="radio" name="q3" value={opt} onChange={(e) => setAutoavaliacaoRespostas({ ...autoavaliacaoRespostas, q3: e.target.value })} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl">
              <p className="font-semibold mb-2">4. Costuma gastar mais tempo ou dinheiro do que planeia?</p>
              <div className="flex gap-3 flex-wrap">
                {['Nunca', 'Raramente', 'Às vezes', 'Frequentemente'].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs">
                    <input type="radio" name="q4" value={opt} onChange={(e) => setAutoavaliacaoRespostas({ ...autoavaliacaoRespostas, q4: e.target.value })} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl">
              <p className="font-semibold mb-2">5. Já sentiu que o jogo afetou negativamente as suas finanças ou relações?</p>
              <div className="flex gap-3 flex-wrap">
                {['Não', 'Sim, ligeiramente', 'Sim, significativamente'].map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs">
                    <input type="radio" name="q5" value={opt} onChange={(e) => setAutoavaliacaoRespostas({ ...autoavaliacaoRespostas, q5: e.target.value })} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {autoavaliacaoFeedback && (
            <div className={`p-4 rounded-xl ${
              autoavaliacaoFeedback.cor === 'red' ? 'bg-red-50 border border-red-200' :
              autoavaliacaoFeedback.cor === 'amber' ? 'bg-amber-50 border border-amber-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <div className="font-bold text-base mb-1">{autoavaliacaoFeedback.nivel}</div>
              <p className="text-sm mb-2">{autoavaliacaoFeedback.mensagem}</p>
              <p className="text-xs font-medium">{autoavaliacaoFeedback.acao}</p>
            </div>
          )}

          <button onClick={() => setModalResponsavel(null)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">
            Fechar
          </button>
        </div>
      </Modal>

      {/* MODAL 2 - LIMITES DE TEMPO */}
      <Modal open={modalResponsavel === 'limites'} onClose={() => setModalResponsavel(null)} title="⏱️ Limites de tempo - Controle sua sessão">
        <div className="space-y-4 text-sm">
          <p className="font-bold text-emerald-800">Defina limites saudáveis para manter o controle:</p>

          <div className="bg-emerald-50 p-4 rounded-xl">
            <p className="font-semibold mb-2">⏰ Temporizador:</p>
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 45, 60].map(min => (
                <button
                  key={min}
                  onClick={() => iniciarTimer(min)}
                  className="px-3 py-2 bg-white rounded-lg ring-1 ring-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition"
                >
                  ⏱️ {min} min
                </button>
              ))}
            </div>
            {timerAtivo && timerMinutos !== null && (
              <div className="mt-3 p-2 bg-emerald-200 rounded-lg text-center font-bold">
                ⏰ Temporizador ativo: {timerMinutos} minutos restantes
              </div>
            )}
          </div>

          <ul className="list-disc pl-5 space-y-2">
            <li>Defina um <strong>tempo máximo por sessão</strong> (ex: 15-30 minutos)</li>
            <li>Use <strong>alarmes no telemóvel</strong> para controlar a duração</li>
            <li>Faça <strong>pausas de 5 minutos</strong> a cada 20 minutos</li>
            <li>Não jogue em horários que possam interferir com o trabalho ou família</li>
          </ul>

          <div className="bg-blue-50 p-3 rounded-xl">
            <p className="font-semibold text-blue-800">📝 Dica:</p>
            <p className="text-xs text-blue-700 mt-1">Registe num diário o tempo gasto em cada sessão.</p>
          </div>

          <button onClick={() => setModalResponsavel(null)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">
            Entendi, vou aplicar estes limites
          </button>
        </div>
      </Modal>

      {/* MODAL 3 - PERÍODO DE REFLEXÃO */}
      <Modal open={modalResponsavel === 'reflexao'} onClose={() => setModalResponsavel(null)} title="🚪 Período de reflexão - Faça uma pausa">
        <div className="space-y-4 text-sm">
          <p className="font-bold text-emerald-800">Afaste-se temporariamente se sentir necessidade:</p>

          <div className="bg-amber-50 p-4 rounded-xl">
            <p className="font-semibold mb-2">⏸️ Escolha o período de afastamento:</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => iniciarPeriodoReflexao(1)} className="px-3 py-2 bg-white rounded-lg ring-1 ring-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition">24 horas</button>
              <button onClick={() => iniciarPeriodoReflexao(7)} className="px-3 py-2 bg-white rounded-lg ring-1 ring-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition">7 dias</button>
              <button onClick={() => iniciarPeriodoReflexao(30)} className="px-3 py-2 bg-white rounded-lg ring-1 ring-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition">30 dias</button>
            </div>
          </div>

          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Autoexclusão temporária</strong> - afaste-se por 24h, 7 dias ou 30 dias</li>
            <li><strong>Registe num diário</strong> os sentimentos que levam ao jogo</li>
            <li><strong>Substitua o hábito</strong> por outra atividade</li>
            <li><strong>Converse com alguém de confiança</strong> sobre o que sente</li>
          </ul>

          <div className="bg-red-50 p-3 rounded-xl">
            <p className="font-semibold text-red-800">📞 Precisa de ajuda?</p>
            <p className="text-xs text-red-700 mt-1">Contacte o Instituto de Supervisão de Jogos (ISJ) para apoio profissional.</p>
          </div>

          <button onClick={() => setModalResponsavel(null)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">
            Compreendo, vou refletir
          </button>
        </div>
      </Modal>

      {/* Modal de confirmação de período de reflexão */}
      <Modal open={showReflectionConfirm} onClose={() => setShowReflectionConfirm(false)} title="✅ Período de reflexão iniciado">
        <div className="space-y-4 text-center">
          <div className="text-5xl">🧘</div>
          <p className="font-bold text-emerald-800">O seu período de reflexão foi registado!</p>
          <p className="text-sm">
            Durante <strong>{reflectionDays} dias</strong>, recomendamos que mantenha distância do jogo.
          </p>
          <button onClick={() => setShowReflectionConfirm(false)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">
            Fechar
          </button>
        </div>
      </Modal>

      <Modal open={showPrizeModal} onClose={() => setShowPrizeModal(false)} title="Simulador de prémios">
        <PrizeCalculator />
      </Modal>

      {/* Modais Premium */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <TrialExpiredModal />

      {/* TOAST NOTIFICATIONS */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-600' : 
            toast.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
          }`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
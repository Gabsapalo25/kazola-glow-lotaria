import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import ChatBot from './components/ChatBot';
import ChromeBall from './components/ChromeBall';
import MethodCard, { type MethodId } from './components/MethodCard';
import MetricsStrip from './components/MetricsStrip';
import Speedometer from './components/Speedometer';
import HistoryRowV2 from './components/HistoryRowV2';
import AdminDrawer from './components/AdminDrawer';
import './Styles/kazola-theme.css';
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
  MAX_PRIZE_PER_CHANCE,
  TAX_FREE_KZ,
  TAX_RATE,
  MULTIPLIERS,
  NUMBERS_PER_CHANCE,
  CHANCE_LABELS,
  calcularPremio,
  calcularPremioLiquido,
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
  type Modalidade,
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
  isTrialActive,
  hasFullAccess,
  getMaxLinesPerGeneration,
  getAvailableMethods,
} from './lib/session';

// =============================================================
// IMPORTAÇÃO DO SISTEMA DE AGENTES
// =============================================================
import VotePanel from './components/VotePanel';
import { useAgents } from './hooks/useAgents';

// =============================================================
// DECLARAÇÕES GLOBAIS PARA ANALYTICS
// =============================================================
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: any;
  }
}

// =============================================================
// GOOGLE ANALYTICS, FACEBOOK PIXEL
// =============================================================
const GA_ID = 'G-T60PHEZ1S0';
const FB_ID = '1714043449606804';
let _gaInitialized = false;
let _fbInitialized = false;
function initGA() {
  if (_gaInitialized) return;
  _gaInitialized = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

function initFB() {
   if (_fbInitialized) return;
  _fbInitialized = true;
  window.fbq = function() {(window.fbq.queue = window.fbq.queue || []).push(arguments)};
  const script = document.createElement('script');
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  window.fbq('init', FB_ID);
  window.fbq('track', 'PageView');
}

function track(event: string, data?: any) {
  if (typeof window.gtag === 'function') window.gtag('event', event, data);
  if (typeof window.fbq === 'function') window.fbq('track', event, data);
}

// =============================================================
// SISTEMA DE VALIDAÇÃO DE PERFORMANCE
// =============================================================
interface ValidationRecord {
  id: string;
  date: string;
  strategy: string;
  modalidade?: string;
  hits: number;
  lines: number;
  drawnNumbers: number[];
  stakePerLine?: number;
  winAmount?: number;
}

function savePerformance(strategy: string, hits: number, lines: number, drawnNumbers: number[], stakePerLine: number = 100, modalidade: string = 'chance5') {
  const history: ValidationRecord[] = JSON.parse(localStorage.getItem('kazola_performance') || '[]');
  const winAmount = calcularPremio(modalidade, hits, stakePerLine);
  history.unshift({ id: Date.now().toString(), date: new Date().toISOString(), strategy, modalidade, hits, lines, drawnNumbers, stakePerLine, winAmount });
  localStorage.setItem('kazola_performance', JSON.stringify(history.slice(0, 200)));
  track('validation', { strategy, modalidade, hits, lines, winAmount });
  
  if (hits >= 3) {
    celebrateWin(hits, winAmount);
  }
}

function celebrateWin(hits: number, winAmount: number) {
  const colors = ['#FFD700', '#00F5A0', '#FF4B4B', '#60A5FA', '#FF6B6B', '#DC2626'];
  for (let i = 0; i < 60; i++) {
    const particle = document.createElement('div');
    particle.className = 'ball-particle';
    particle.style.left = Math.random() * window.innerWidth + 'px';
    particle.style.top = window.innerHeight - 100 + 'px';
    particle.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]}, transparent)`;
    particle.style.width = Math.random() * 12 + 4 + 'px';
    particle.style.height = particle.style.width;
    particle.style.animationDuration = `${0.5 + Math.random() * 0.8}s`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
  }
  
  if ('vibrate' in navigator && hits >= 4) {
    navigator.vibrate([200, 100, 200, 100, 300]);
  }
}

function getPerformance() {
  const history: ValidationRecord[] = JSON.parse(localStorage.getItem('kazola_performance') || '[]');
  const byStrategy = new Map<string, { total: number; hits2Plus: number; totalWin: number; linesPlayed: number }>();
  for (const record of history) {
    const strat = record.strategy;
    if (!byStrategy.has(strat)) byStrategy.set(strat, { total: 0, hits2Plus: 0, totalWin: 0, linesPlayed: 0 });
    const stats = byStrategy.get(strat)!;
    stats.total++;
    stats.linesPlayed += record.lines;
    if (record.hits >= 2) stats.hits2Plus++;
    if (record.winAmount) stats.totalWin += record.winAmount;
  }
  const kazolaStats = byStrategy.get('kazola') || { total: 0, hits2Plus: 0, totalWin: 0, linesPlayed: 0 };
  const { total, hits2Plus, totalWin, linesPlayed } = kazolaStats;
  return {
    total,
    hits2Plus,
    winRate: total ? (hits2Plus / total * 100).toFixed(1) : 0,
    totalWin,
    linesPlayed,
    byStrategy: Object.fromEntries(byStrategy),
  };
}

// =============================================================
// COMPONENTES DE ESTILO PREMIUM
// =============================================================

const ShimmerText = ({ children, className = '', speed = 3 }: { children: React.ReactNode; className?: string; speed?: number }) => (
  <span 
    className={className}
    style={{
      background: 'linear-gradient(90deg, #FFFFFF, #00F5A0, #FFD700, #FF4B4B, #FFFFFF)',
      backgroundSize: '300% auto',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: `shimmer ${speed}s linear infinite`,
      fontWeight: 'inherit'
    }}
  >
    {children}
  </span>
);

const GlowCard = ({ children, className = '', accentColor = '#00F5A0' }: { children: React.ReactNode; className?: string; accentColor?: string }) => (
  <div 
    className={className}
    style={{
      position: 'relative',
      background: 'rgba(17,24,39,0.7)',
      backdropFilter: 'blur(12px)',
      borderRadius: '24px',
      border: `1px solid ${accentColor}30`,
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.borderColor = accentColor;
      e.currentTarget.style.boxShadow = `0 8px 32px ${accentColor}20`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = `${accentColor}30`;
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{
      position: 'absolute',
      inset: '-2px',
      background: `linear-gradient(135deg, ${accentColor}, transparent, ${accentColor})`,
      borderRadius: '26px',
      opacity: 0,
      transition: 'opacity 0.3s ease',
      zIndex: -1,
    }}
    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'}
    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
    />
    {children}
  </div>
);

// =============================================================
// CABEÇALHOS POR TAB
// =============================================================
const TAB_HEADERS = {
  loto: {
    title: 'LOTO 5/90',
    subtitle: 'Escolhe entre 2 a 5 números de 1 a 90 e concorre a prémios de até 100.000.000 Kz',
    accent: '#E63946',
    bg: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0d1a0a 100%)',
    icon: '🎱',
    badge: 'SORTEIO DIÁRIO',
  },
  totobola: {
    title: 'TOTOBOLA',
    subtitle: 'Prevê os resultados de 13 jogos de futebol e ganha prémios incríveis',
    accent: '#22A55A',
    bg: 'linear-gradient(135deg, #0a1a0a 0%, #0d2a1a 50%, #0a0d1a 100%)',
    icon: '⚽',
    badge: 'EM BREVE',
  },
  premios: {
    title: 'PRÉMIOS & RESULTADOS',
    subtitle: 'Consulta os últimos sorteios, verifica o teu boletim e calcula os teus ganhos',
    accent: '#1E40AF',
    bg: 'linear-gradient(135deg, #1a0a00 0%, #2a1500 50%, #1a0a0a 100%)',
    icon: '🏆',
    badge: 'ÚLTIMOS RESULTADOS',
  },
};

const METHOD_CONFIG: Record<string, { name: string; description: string; icon: string; color: string; premium: boolean; badge?: string }> = {
  kazola:      { name: 'Kazola',      description: 'Motor principal V4-D. Padrões históricos + cobertura por faixas + anti-partilha. Benchmark: 54.3% (≥2 acertos).', icon: '🌙', color: '#00F5A0', premium: false, badge: 'PRINCIPAL' },
  equilibrado: { name: 'Equilibrado', description: 'Um número por cada faixa adaptada à modalidade. Cobertura garantida com peso histórico.',                          icon: '⚖️', color: '#60A5FA', premium: false },
  frequencia:  { name: 'Frequência',  description: 'Pondera pelos números mais frequentes nos últimos sorteios reais.',                                                icon: '📈', color: '#FFD700', premium: true  },
  montecarlo:  { name: 'Monte Carlo', description: 'Pesos históricos + ruído gaussiano (Box-Muller). Alta variância controlada.',                                      icon: '🎲', color: '#FFD700', premium: true  },
};

const MODALIDADE_COLORS: Record<Modalidade, { primary: string; glow: string }> = {
  chance2: { primary: '#60A5FA', glow: 'rgba(96,165,250,0.4)'  },
  chance3: { primary: '#00F5A0', glow: 'rgba(0,245,160,0.4)'   },
  chance4: { primary: '#F59E0B', glow: 'rgba(245,158,11,0.4)'  },
  chance5: { primary: '#EF4444', glow: 'rgba(239,68,68,0.4)'   },
};

const MODALIDADE_DESCRICAO: Record<Modalidade, string> = {
  chance2: 'Escolhe 2 números. Se saírem entre os 5 sorteados — ganhas! A mais fácil.',
  chance3: 'Escolhe 3 números. Prémios crescentes conforme os acertos.',
  chance4: 'Escolhe 4 números. Mais difícil, prémios muito mais atractivos.',
  chance5: 'Escolhe todos os 5 números. JACKPOT se acertares todos!',
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

function loadCachedDraws(): Draw[] | null {
  try { const c = localStorage.getItem('kazola_last_draws'); return c ? JSON.parse(c) : null; }
  catch { return null; }
}

function saveCachedDraws(draws: Draw[]) {
  try {
    localStorage.setItem('kazola_last_draws', JSON.stringify(draws));
    localStorage.setItem('kazola_last_draws_date', new Date().toISOString());
  } catch { /* silent */ }
}

async function shareCombination(numbers: number[], appName: string) {
  const text = `🎯 Minha combinação no ${appName}: ${numbers.join(', ')}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: appName, text, url: window.location.href });
      track('share', { method: 'native' });
    } else {
      await navigator.clipboard.writeText(text);
      track('share', { method: 'clipboard' });
      return 'copied';
    }
  } catch (error) {
    track('share_error', { error: String(error) });
    throw error;
  }
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => loadSession());
  const [showGate, setShowGate] = useState<boolean>(() => !loadSession());
  const [gateReason, setGateReason] = useState<'first_visit' | 'trial_expired' | 'daily_limit'>('first_visit');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showTokenActivation, setShowTokenActivation] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('kazola_dark_mode') === '1'; } catch { return false; }
  });

  const showToast = useCallback((msg: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    try { localStorage.setItem('kazola_dark_mode', darkMode ? '1' : '0'); } catch { /* ok */ }
  }, [darkMode]);

  const [ageOk, setAgeOk] = useState<boolean>(() => {
    try { return localStorage.getItem('ln_age_ok') === '1'; } catch { return false; }
  });
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('large');
  const [tab, setTab] = useState<Tab>('loto');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalResponsavel, setModalResponsavel] = useState<ModalResponsavelType>(null);

  const [autoavaliacaoRespostas, setAutoavaliacaoRespostas] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' });
  const [timerMinutos, setTimerMinutos] = useState<number | null>(null);
  const [timerAtivo, setTimerAtivo] = useState(false);
  const [reflectionDays, setReflectionDays] = useState<number | null>(null);
  const [showReflectionConfirm, setShowReflectionConfirm] = useState(false);

  const [sorteios, setSorteios] = useState<Draw[]>([]);
  const [loadingApi, setLoadingApi] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [temSorteioHoje, setTemSorteioHoje] = useState(false);

  const [strategy, setStrategy] = useState<GenerationStrategy>('kazola');
  const [modalidade, setModalidade] = useState<Modalidade>('chance5');
  const [lines, setLines] = useState(3);
  const [parity, setParity] = useState<Filter['parityBias']>('equilibrado');
  const [exclude, setExclude] = useState<number[]>([]);
  const [generated, setGenerated] = useState<{ numbers: number[]; id: number }[]>([]);
  const [favorites, setFavorites] = useState<{ numbers: number[]; id: number }[]>(() => {
    try { const r = localStorage.getItem('ln_fav'); return r ? JSON.parse(r) : []; } catch { return []; }
  });

  const [windowSize, setWindowSize] = useState(60);
  const [activeDraw, setActiveDraw] = useState<Draw | null>(null);
  const [histPage, setHistPage] = useState(0);
  const HIST_PAGE_SIZE = 20;

  const [boletim, setBoletim] = useState<BoletimTotobola | null>(null);
  const [totoLines, setTotoLines] = useState<string[][]>([]);
  const [totoCount, setTotoCount] = useState(1);

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showResponsible, setShowResponsible] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [speedometerKey, setSpeedometerKey] = useState(0);
  const [speedometerHits, setSpeedometerHits] = useState(0);

  const premium = usePremium();
  const [budget, setBudget] = useState<number>(500);
  const [stakePerLine, setStakePerLine] = useState<number>(100);
  const [checkNumbers, setCheckNumbers] = useState('');
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // =============================================================
  // SISTEMA DE AGENTES
  // =============================================================
  const { result: agentResult, evaluateCombination, reset: resetAgents } = useAgents();

  const canGenerateCheck = useCallback((sess: UserSession): { ok: boolean; reason?: string } => {
    if (!sess) return { ok: false, reason: 'trial_expired' };
    if (sess.isPremium) return { ok: true };
    if (!isTrialActive(sess)) return { ok: false, reason: 'trial_expired' };
    const today = todayStr();
    const isToday = sess.lastGenerationDate === today;
    const usedToday = isToday ? sess.generationsToday : 0;
    if (usedToday >= FREE_GENS_DAY) return { ok: false, reason: 'daily_limit' };
    return { ok: true };
  }, []);

  const canGenerateTodayCheck = useMemo(() => {
    if (!session) return false;
    if (session.isPremium) return true;
    return canGenerateCheck(session).ok;
  }, [session, premium.isActive]);

  const availableStrategies = useMemo(() => getAvailableMethods(session), [session, premium.isActive]);

  const verifyPremiumStatus = useCallback(async (currentSession: UserSession) => {
    if (shouldVerifyWithServer(currentSession)) {
      try {
        const result = await checkPremiumStatus(currentSession.email);
        if (result.ok && result.isPremium && result.expiracao) {
          const plano = result.plano === 'anual' ? 'anual' : result.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
          const updatedSession = activatePremiumFromServer(currentSession, plano, result.expiracao);
          setSession(updatedSession);
          showToast('Premium verificado e activado!', 'success');
        }
      } catch (error) { console.error('Erro ao verificar premium:', error); }
    }
  }, [showToast]);

  useEffect(() => {
    if (session && !isPremiumValid(session)) verifyPremiumStatus(session);
  }, [session, verifyPremiumStatus]);

  useEffect(() => {
    initGA();
    initFB();
    track('PageView', { page: 'home', timestamp: new Date().toISOString() });
  }, []);

  const handleRegister = useCallback((email: string) => {
    const now = Date.now();
    const newSession: UserSession = {
      email, registeredAt: now, lastGenerationDate: null, generationsToday: 0,
      isPremium: false, trialExpires: now + TRIAL_DAYS * 24 * 60 * 60 * 1000,
      plano: null, premiumExpiracao: null, tokenActivacao: null,
      verificadoNoServidor: false, ultimaVerificacao: null, syncEnabled: true, lastSync: null,
    };
    saveSession(newSession);
    setSession(newSession);
    setShowGate(false);
    track('complete_registration', { method: 'trial', days: TRIAL_DAYS });
    showToast(`Bem-vindo! Trial de ${TRIAL_DAYS} dias activado. Durante o trial tem acesso TOTAL a todas as funcionalidades!`, 'success');
  }, [showToast]);

  const checkAccess = useCallback((): boolean => {
    if (!session) { setGateReason('first_visit'); setShowGate(true); return false; }
    const check = canGenerateCheck(session);
    if (!check.ok) {
      if (check.reason === 'trial_expired') { setGateReason('trial_expired'); setShowGate(true); }
      if (check.reason === 'daily_limit') { setGateReason('daily_limit'); setShowGate(true); }
      return false;
    }
    return true;
  }, [session]);

  const recs = useMemo(() => {
    const maxLines = Math.floor(budget / stakePerLine);
    if (maxLines <= 3) return { equilibrado: maxLines, kazola: 0, montecarlo: 0, frequencia: 0, total: maxLines };
    if (maxLines <= 6) return { equilibrado: Math.floor(maxLines * 0.6), kazola: Math.ceil(maxLines * 0.2), montecarlo: Math.ceil(maxLines * 0.2), frequencia: 0, total: maxLines };
    if (maxLines <= 10) return { equilibrado: Math.floor(maxLines * 0.5), kazola: Math.ceil(maxLines * 0.2), montecarlo: Math.ceil(maxLines * 0.2), frequencia: Math.ceil(maxLines * 0.1), total: maxLines };
    return { equilibrado: Math.floor(maxLines * 0.4), kazola: Math.ceil(maxLines * 0.2), montecarlo: Math.ceil(maxLines * 0.2), frequencia: Math.ceil(maxLines * 0.2), total: maxLines };
  }, [budget, stakePerLine]);

  useEffect(() => { document.documentElement.classList.toggle('high-contrast', highContrast); }, [highContrast]);
  useEffect(() => { try { localStorage.setItem('ln_fav', JSON.stringify(favorites)); } catch { /* ok */ } }, [favorites]);

  useEffect(() => {
    if (timerAtivo && timerMinutos && timerMinutos > 0) {
      const interval = setInterval(() => {
        setTimerMinutos(prev => {
          if (prev && prev <= 1) { setTimerAtivo(false); alert('⏰ Tempo esgotado! Faça uma pausa de 5 minutos.'); return 0; }
          return prev ? prev - 1 : 0;
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [timerAtivo, timerMinutos]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingApi(true);
      setApiError(false);
      if (!isOnline) {
        const cached = loadCachedDraws();
        if (cached && cached.length > 0) { setSorteios(cached); setActiveDraw(cached[0]); setTemSorteioHoje(false); setLoadingApi(false); return; }
      }
      try {
        const result = await fetchRealDraws();
        if (!cancelled && result.draws.length > 0) { setSorteios(result.draws); setActiveDraw(result.draws[0]); setTemSorteioHoje(result.hasToday); saveCachedDraws(result.draws); }
        else if (!cancelled) { const cached = loadCachedDraws(); if (cached && cached.length > 0) { setSorteios(cached); setActiveDraw(cached[0]); setTemSorteioHoje(false); setApiError(true); } }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setApiError(true);
        const cached = loadCachedDraws();
        if (cached && cached.length > 0) { setSorteios(cached); setActiveDraw(cached[0]); setTemSorteioHoje(false); }
      }
      setLoadingApi(false);
    })();
    return () => { cancelled = true; };
  }, [isOnline]);

  const draws = sorteios;
  const freq = useMemo(() => computeFrequency(draws.slice(0, windowSize)), [draws, windowSize]);
  const weights = useMemo(() => freq.freq, [freq]);
  const hotCold = useMemo(() => hotColdRanking(draws, windowSize), [draws, windowSize]);
  const gaps = useMemo(() => gapAnalysis(draws), [draws]);
  const sum = useMemo(() => sumStats(draws), [draws]);
  const parityStat = useMemo(() => {
  if (draws.length === 0) return { pairs: 0, odds: 0 };
  const allNumbers = draws.slice(0, windowSize).flatMap(d => d.numbers);
  return { pairs: allNumbers.filter(n => n % 2 === 0).length, odds: allNumbers.filter(n => n % 2 !== 0).length };
}, [draws, windowSize]);
  const decades = useMemo(() => decadeStats(draws), [draws]);
  const probs = useMemo(() => probabilityHint(), []);
  const maxFreq = useMemo(() => Math.max(1, ...freq.freq.slice(1)), [freq]);
  const maxDecade = useMemo(() => Math.max(1, ...decades.map(d => d.count)), [decades]);

  function generateTotobolaLine(): string[] {
    const outcomes = ['1', 'X', '2'];
    return Array.from({ length: 13 }, () => outcomes[Math.floor(Math.random() * 3)]);
  }

  const autoavaliacaoScore = useMemo(() => {
    let score = 0;
    if (autoavaliacaoRespostas.q1 === 'Frequentemente') score += 3; else if (autoavaliacaoRespostas.q1 === 'Às vezes') score += 2; else if (autoavaliacaoRespostas.q1 === 'Raramente') score += 1;
    if (autoavaliacaoRespostas.q2 === 'Várias vezes') score += 3; else if (autoavaliacaoRespostas.q2 === 'Uma vez') score += 2;
    if (autoavaliacaoRespostas.q3 === 'Sim, várias') score += 3; else if (autoavaliacaoRespostas.q3 === 'Sim, uma vez') score += 2;
    if (autoavaliacaoRespostas.q4 === 'Frequentemente') score += 3; else if (autoavaliacaoRespostas.q4 === 'Às vezes') score += 2;
    if (autoavaliacaoRespostas.q5 === 'Sim, significativamente') score += 3; else if (autoavaliacaoRespostas.q5 === 'Sim, ligeiramente') score += 2;
    return score;
  }, [autoavaliacaoRespostas]);

  const autoavaliacaoFeedback = useMemo(() => {
    if (autoavaliacaoScore >= 10) return { nivel: '⚠️ Atenção necessária', cor: 'red', mensagem: 'Os seus hábitos de jogo apresentam sinais de alerta significativos.', acao: 'Recomendamos fortemente que procure apoio profissional no ISJ.' };
    if (autoavaliacaoScore >= 5) return { nivel: '📊 Em observação', cor: 'amber', mensagem: 'Alguns comportamentos merecem atenção.', acao: 'Defina limites de tempo e orçamento. Reveja daqui 30 dias.' };
    if (autoavaliacaoScore > 0) return { nivel: '✅ Hábitos saudáveis', cor: 'green', mensagem: 'Os seus hábitos de jogo parecem equilibrados.', acao: 'Continue a praticar o jogo responsável.' };
    return null;
  }, [autoavaliacaoScore]);

  // =============================================================
  // FUNÇÃO ONGENERATE — MODIFICADA PARA INCLUIR AGENTES
  // =============================================================
  function onGenerate() {
    if (!checkAccess()) return;
    if (!availableStrategies.includes(strategy)) { alert(`⚠️ O método "${strategy}" está disponível apenas para Premium ou Trial (3 dias).`); return; }
    const filter: Filter = { exclude, parityBias: parity, modalidade };
    const out: { numbers: number[]; id: number }[] = [];
    const maxLines = getMaxLinesPerGeneration(session);
    const linesToGenerate = Math.min(lines, maxLines);
    
    for (let i = 0; i < linesToGenerate; i++) {
      const r = generateLine(weights, strategy, filter);
      if (r) {
        out.push({ numbers: r.numbers, id: Date.now() + i });
      }
    }
    
    setGenerated(out);
    
    // =============================================================
    // EXECUTA OS AGENTES NA PRIMEIRA LINHA GERADA
    // =============================================================
    if (out.length > 0) {
      evaluateCombination({
        nums: out[0].numbers,
        modalidade,
        stakePerLine,
        bankroll: budget,
        userHistory: null,
        orcamento: budget,
      });
    } else {
      resetAgents();
    }
    
    if (session) { const updated = recordGeneration(session); setSession(updated); }
    track('generate', { strategy, modalidade, lines: out.length, isPremium: !!(session?.isPremium || premium.isActive || isTrialActive(session)) });
    showToast(`${CHANCE_LABELS[modalidade]} gerada com sucesso!`, 'success');
    setSpeedometerHits(0);
    setSpeedometerKey(k => k + 1);
  }

  function checkWin() {
    if (!activeDraw || generated.length === 0) { showToast('Gere combinações primeiro ou aguarde o sorteio!', 'error'); return; }
    const drawn = activeDraw.numbers;
    let bestHits = 0;
    for (const g of generated) {
      const hits = g.numbers.filter(n => drawn.includes(n)).length;
      if (hits > bestHits) bestHits = hits;
    }
    savePerformance(strategy, bestHits, generated.length, drawn, stakePerLine, modalidade);
    setSpeedometerHits(bestHits);
    setSpeedometerKey(k => k + 1);
    if (bestHits >= 1) {
      const winAmount = calcularPremio(modalidade, bestHits, stakePerLine);
      if (winAmount > 0) {
        showToast(`🎉 Parabéns! ${bestHits} acerto${bestHits > 1 ? 's' : ''}! Ganhou ${fmtKz(winAmount)}!`, 'success');
        
        if (bestHits >= 3) {
          setTimeout(() => {
            const elements = document.querySelectorAll('.chrome-ball');
            elements.forEach((el, idx) => {
              setTimeout(() => {
                (el as HTMLElement).style.animation = 'slotWin 0.5s ease-out';
                setTimeout(() => {
                  (el as HTMLElement).style.animation = '';
                }, 500);
              }, idx * 80);
            });
          }, 100);
        }
      } else {
        showToast(`😢 ${bestHits} acerto${bestHits !== 1 ? 's' : ''}. Tente novamente!`, 'info');
      }
    } else {
      showToast(`😢 0 acertos. Tente novamente!`, 'info');
    }
  }

  async function handleShareCombination(numbers: number[]) {
    try {
      const result = await shareCombination(numbers, APP_NAME);
      if (result === 'copied') showToast('📋 Combinação copiada para clipboard!', 'success');
      else showToast('✨ Partilha concluída!', 'success');
    } catch { showToast('Não foi possível partilhar', 'error'); }
  }

  function handleGenerateToto() {
    if (!checkAccess()) return;
    const allowed = (session?.isPremium || premium.isActive || isTrialActive(session)) ? totoCount : 1;
    const newLines = Array.from({ length: allowed }, generateTotobolaLine);
    setTotoLines(newLines);
    if (session) { const updated = recordGeneration(session); setSession(updated); }
    showToast('Previsão gerada com sucesso!', 'success');
  }

  function toggleExclude(n: number) {
    setExclude(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  }

  function toggleFavorite(line: { numbers: number[]; id: number }) {
    const key = line.numbers.join('-');
    const exists = favorites.some(f => f.numbers.join('-') === key);
    setFavorites(exists ? favorites.filter(f => f.numbers.join('-') !== key) : [...favorites, { numbers: line.numbers, id: Date.now() }]);
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
    track('logout', {});
    showToast('Sessão encerrada.', 'info');
  }

  function handleUpgraded(updatedSession: UserSession) {
    const finalSession = { ...updatedSession, syncEnabled: session?.syncEnabled ?? true, lastSync: session?.lastSync ?? null };
    setSession(finalSession);
    setShowUpgrade(false);
    setShowTokenActivation(false);
    track('purchase', { plan: finalSession.plano, isPremium: true });
    showToast('Parabéns! Agora você é Premium!', 'success');
  }

  async function handleAccess(s: UserSession) {
    try {
      const result = await checkPremiumStatus(s.email);
      if (result.ok && result.isPremium && result.expiracao) {
        const plano = result.plano === 'anual' ? 'anual' : result.plano === 'vitalicio' ? 'vitalicio' : 'mensal';
        const premiumSession = activatePremiumFromServer(s, plano, result.expiracao);
        setSession(premiumSession);
        setShowGate(false);
        track('premium_activated', { plan: plano });
        showToast('Premium activado! Bem-vindo de volta.', 'success');
        return;
      }
    } catch (error) { console.error('Erro ao verificar premium:', error); }
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
  const ultimoSorteio = activeDraw;
  const temDadosHoje = temSorteioHoje;
  const performance = getPerformance();

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChatScrollTo = useCallback((sectionId: string) => {
    if (sectionId === 'premios') { setTab('premios'); setTimeout(() => { const el = document.getElementById('premios'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); return; }
    if (['gerador','estatisticas','historico','diario','plano_semanal','relatorio','favoritos'].includes(sectionId)) { setTab('loto'); setTimeout(() => { const el = document.getElementById(sectionId); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100); return; }
    scrollToSection(sectionId);
  }, []);

  const handleChatOpenModal = useCallback((modal: 'terms' | 'privacy' | 'responsible') => {
    if (modal === 'responsible') setShowResponsible(true);
    if (modal === 'terms') setShowTerms(true);
    if (modal === 'privacy') setShowPrivacy(true);
  }, []);

  const avgHitsCalc = performance.total > 0 ? (performance.hits2Plus / performance.total) * 5 : 0;

  const premiumAnimations = `
    @keyframes pulseGreen {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    @keyframes barGrow { from { width: 0 !important; } }
    @keyframes gradientShift {
      0%, 100% { opacity: 0.3; transform: translate(-10%, -10%) scale(1); }
      50% { opacity: 0.6; transform: translate(10%, 10%) scale(1.2); }
    }
    @keyframes ballFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
    @keyframes ballPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,215,0,0.7); }
      50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(255,215,0,0); }
    }
    @keyframes slotWin {
      0% { transform: scale(1); filter: brightness(1); }
      30% { transform: scale(1.2); filter: brightness(1.5); text-shadow: 0 0 20px gold; }
      70% { transform: scale(0.95); filter: brightness(1.2); }
      100% { transform: scale(1); filter: brightness(1); }
    }
    @keyframes floatParticle {
      0% { transform: translateY(0) scale(0); opacity: 1; }
      100% { transform: translateY(-60px) scale(1); opacity: 0; }
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes rotateGlow {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes textGlow {
      0%, 100% { text-shadow: 0 0 5px rgba(0,245,160,0.5); }
      50% { text-shadow: 0 0 20px rgba(0,245,160,0.8), 0 0 10px rgba(255,215,0,0.5); }
    }
    @keyframes borderPulse {
      0%, 100% { border-color: rgba(0,245,160,0.3); box-shadow: 0 0 0 0 rgba(0,245,160,0.2); }
      50% { border-color: rgba(0,245,160,0.8); box-shadow: 0 0 20px 0 rgba(0,245,160,0.4); }
    }
    @keyframes numberPop {
      0% { transform: scale(0.8); opacity: 0; }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    
    .ball-particle {
      position: fixed;
      width: 8px;
      height: 8px;
      background: radial-gradient(circle, #ffd700, #ff8c00);
      border-radius: 50%;
      pointer-events: none;
      animation: floatParticle 1s ease-out forwards;
      z-index: 9999;
    }
    
    .dark-mode { background-color: #0B0F19; color: #E5E7EB; }
    .dark-mode .bg-white { background-color: #111827 !important; color: #E5E7EB !important; }
    .dark-mode .bg-neutral-50, .dark-mode .bg-neutral-100 { background-color: #1F2937 !important; }
    .dark-mode .text-neutral-600, .dark-mode .text-neutral-700 { color: #9CA3AF !important; }
    .dark-mode .ring-neutral-200 { border-color: rgba(255,255,255,0.1) !important; }
    .dark-mode .border-neutral-200 { border-color: rgba(255,255,255,0.1) !important; }
    .bar-grow { animation: barGrow 0.8s ease-out; }
    .fade-in-up { animation: fadeInUp 0.5s ease-out; }
    
    .number-animated {
      animation: numberPop 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
    }
    
    .glow-card {
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .glow-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      transition: left 0.5s ease;
    }
    .glow-card:hover::before {
      left: 100%;
    }
    
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
    ::-webkit-scrollbar-thumb { background: linear-gradient(135deg, #00F5A0, #00C896); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: linear-gradient(135deg, #FFD700, #FFA500); }
    
    .btn-glow {
      position: relative;
      overflow: hidden;
    }
    .btn-glow::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -60%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.3), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    .btn-glow:hover::after {
      opacity: 1;
      animation: rotateGlow 1s linear;
    }
  `;

  return (
    <div
      className={`min-h-screen ${fontClass} ${highContrast ? 'high-contrast' : ''}`}
      style={{ background: '#0B0F19', color: '#E5E7EB', position: 'relative', overflowX: 'hidden' }}
    >
      <style>{premiumAnimations}</style>
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(0,245,160,0.03), transparent 70%)',
        animation: 'gradientShift 8s ease infinite',
      }} />

      {!isOnline && !offlineBannerDismissed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: '#F59E0B', color: '#000', textAlign: 'center', padding: '8px 16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📶</span>
            <span>Sem ligação à internet — a mostrar dados da última visita</span>
          </div>
          <button onClick={() => setOfflineBannerDismissed(true)} style={{ marginLeft: '16px', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {performance.total > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,160,0.1), rgba(255,215,0,0.05))',
            borderBottom: '1px solid rgba(0,245,160,0.3)',
            borderTop: '1px solid rgba(0,245,160,0.3)',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: 700, color: '#00F5A0' }}>🎯 Win Rate Kazola:</span>
                <motion.span 
                  key={performance.winRate}
                  animate={{ 
                    scale: [1, 1.05, 1],
                    textShadow: ['0 0 0px #00F5A0', '0 0 10px #00F5A0', '0 0 0px #00F5A0']
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  style={{ fontSize: '1.5rem', fontWeight: 900, color: '#00F5A0' }}
                >
                  <ShimmerText speed={2}>{performance.winRate}%</ShimmerText>
                </motion.span>
                <span style={{ color: '#6B7280' }}>({performance.hits2Plus}/{performance.total} acertos ≥2)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: 700, color: '#FFD700' }}>💰 Total ganho:</span>
                <motion.span 
                  animate={{ color: ['#FFD700', '#FFA500', '#FFD700'] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ fontSize: '1.25rem', fontWeight: 900 }}
                >
                  {fmtKz(performance.totalWin)}
                </motion.span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: 700, color: '#60A5FA' }}>📊 Linhas jogadas:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#60A5FA' }}>{performance.linesPlayed}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {showGate && <AccessGate reason={gateReason} onAccess={handleAccess} />}
      {showUpgrade && session && <UpgradeModal session={session} onUpgraded={handleUpgraded} onClose={() => setShowUpgrade(false)} />}
      {showTokenActivation && session && <TokenActivation session={session} onUpgraded={handleUpgraded} onClose={() => setShowTokenActivation(false)} />}

      {!ageOk && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            style={{ background: '#111827', borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '32px', textAlign: 'center', border: '1px solid rgba(0,245,160,0.3)', boxShadow: '0 0 40px rgba(0,245,160,0.2)' }}
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5 }}
              style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #DC2626, #FF4B4B)', color: '#fff', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 900 }}
            >18+</motion.div>
            <h1 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '8px', background: 'linear-gradient(135deg, #fff, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Verificação de idade</h1>
            <p style={{ color: '#9CA3AF', marginBottom: '24px', lineHeight: 1.6 }}>
              Este site destina-se apenas a maiores de 18 anos. O <strong style={{ color: '#00F5A0' }}>{APP_NAME}</strong> é uma ferramenta educativa de análise estatística. Os sorteios são eventos aleatórios — nenhuma ferramenta garante acertos.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px #DC2626' }}
                whileTap={{ scale: 0.98 }}
                onClick={confirmAge} 
                style={{ padding: '16px 24px', borderRadius: '16px', background: 'linear-gradient(135deg, #DC2626, #FF4B4B)', color: '#fff', fontWeight: 700, fontSize: '1.125rem', border: 'none', cursor: 'pointer' }}
              >Tenho 18 anos ou mais</motion.button>
              <a href="https://www.google.com" style={{ padding: '16px 24px', borderRadius: '16px', background: 'rgba(255,255,255,0.08)', color: '#9CA3AF', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none', textAlign: 'center' }}>Sair</a>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '20px' }}>Jogos de azar podem causar dependência. Jogue com responsabilidade.</p>
          </motion.div>
        </motion.div>
      )}

      <div style={{ background: '#0B0F19', color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.span 
              animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
              transition={{ duration: 0.5, delay: 1 }}
            >🇦🇴</motion.span>
            <span style={{ fontWeight: 600 }}>{APP_NAME} · {APP_SLOGAN} · Angola</span>
            <span className="hidden md:inline" style={{ color: '#6B7280' }}>· Ferramenta educativa · 18+</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.button 
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)} 
              style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', color: '#fff' }} 
              aria-label="Alternar modo escuro"
            >
              {darkMode ? '☀️' : '🌙'}
            </motion.button>
            {session ? (
              <>
                <span style={{ color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <motion.span 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F5A0', display: 'inline-block', boxShadow: '0 0 8px #00F5A0' }} 
                  />
                  👤 {session.email}
                  {isTrialActive(session) && <span style={{ marginLeft: '8px', color: '#00F5A0' }}>· TRIAL ACTIVO ({daysLeft}d) ⭐</span>}
                  {!session.isPremium && !isTrialActive(session) && <span style={{ marginLeft: '8px', color: '#F59E0B' }}>· Trial expirado</span>}
                  {session.isPremium && <span style={{ marginLeft: '8px', color: '#00F5A0' }}>· <ShimmerText>PREMIUM ✓</ShimmerText></span>}
                </span>
                {!session.isPremium && (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setShowTokenActivation(true)} 
                    style={{ fontSize: '0.75rem', color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer' }}
                  >🔑 Inserir token</motion.button>
                )}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout} 
                  style={{ fontSize: '0.75rem', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
                >Sair</motion.button>
              </>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px #00F5A0' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGate(true)} 
                style={{ background: 'linear-gradient(135deg, #00F5A0, #00C896)', color: '#0B0F19', padding: '4px 12px', borderRadius: '8px', fontSize: '0.6875rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >REGISTAR GRÁTIS</motion.button>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF' }}>Letra</span>
              <select value={fontSize} onChange={e => setFontSize(e.target.value as FontSize)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.12)' }}>
                <option value="normal">Normal</option>
                <option value="large">Grande</option>
                <option value="xlarge">Muito grande</option>
              </select>
            </label>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setHighContrast(v => !v)} 
              style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700, color: '#fff' }} 
              aria-pressed={highContrast}
            >
              {highContrast ? 'Desligar' : 'Ligar'} alto contraste
            </motion.button>
          </div>
        </div>
      </div>

      <header style={{ background: 'rgba(11, 15, 25, 0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', position: 'sticky', top: 0, zIndex: 30, boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)', overflow: 'visible', }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <a href="#inicio" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 3 }}
              whileTap={{ scale: 0.98 }}
              style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 0 20px rgba(0, 245, 160, 0.3)', width: '80px', height: '80px', flexShrink: 0 }}
            >
              <img src={logoImg} alt="KazolaGlow" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ fontWeight: 900, fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}
              >
                <ShimmerText speed={3}>{APP_NAME}</ShimmerText>
              </motion.div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(156, 163, 175, 0.8)' }}>{APP_SLOGAN} · Análise estatística de lotaria</div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1" style={{ fontWeight: 600 }}>
            {[
              { label: 'Plano Semanal', action: () => { setTab('loto'); scrollToSection('plano_semanal'); } },
              { label: 'Gerador', action: () => { setTab('loto'); scrollToSection('gerador'); } },
              { label: 'Diário', action: () => { setTab('loto'); scrollToSection('diario'); } },
              { label: 'Relatório', action: () => { setTab('loto'); scrollToSection('relatorio'); } },
              { label: 'Estatísticas', action: () => { setTab('loto'); scrollToSection('estatisticas'); } },
              { label: 'Histórico', action: () => { setTab('loto'); scrollToSection('historico'); } },
            ].map(item => (
              <motion.button 
                key={item.label} 
                whileHover={{ scale: 1.05, background: 'rgba(0,245,160,0.1)' }}
                onClick={item.action}
                style={{ padding: '8px 12px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'rgba(229, 231, 235, 0.8)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
              >{item.label}</motion.button>
            ))}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              onClick={() => setTab('totobola')}
              style={{ padding: '8px 12px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'rgba(229, 231, 235, 0.8)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Totobola
              <span style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05))', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '20px', padding: '2px 8px', fontSize: '0.6rem', fontWeight: 700 }}>Em breve</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02, y: -1, boxShadow: '0 0 15px #00F5A0' }}
              onClick={() => setShowResponsible(true)}
              style={{ marginLeft: '8px', background: 'linear-gradient(135deg, rgba(0,245,160,0.2), rgba(0,245,160,0.05))', border: '1px solid rgba(0,245,160,0.4)', color: '#00F5A0', padding: '8px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            >🛡️ Jogo responsável</motion.button>
            <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
          </nav>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="md:hidden"
          >
            <svg style={{ width: '24px', height: '24px', color: '#E5E7EB' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </motion.button>
        </div>

        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: 'rgba(11,15,25,0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { label: '📅 Plano Semanal', action: () => { setTab('loto'); scrollToSection('plano_semanal'); setMobileMenuOpen(false); } },
                { label: '🎲 Gerador', action: () => { setTab('loto'); scrollToSection('gerador'); setMobileMenuOpen(false); } },
                { label: '📓 Diário', action: () => { setTab('loto'); scrollToSection('diario'); setMobileMenuOpen(false); } },
                { label: '📊 Relatório', action: () => { setTab('loto'); scrollToSection('relatorio'); setMobileMenuOpen(false); } },
                { label: '📈 Estatísticas', action: () => { setTab('loto'); scrollToSection('estatisticas'); setMobileMenuOpen(false); } },
                { label: '📜 Histórico', action: () => { setTab('loto'); scrollToSection('historico'); setMobileMenuOpen(false); } },
              ].map(item => (
                <motion.button 
                  key={item.label} 
                  whileHover={{ background: 'rgba(0,245,160,0.1)' }}
                  onClick={item.action} 
                  style={{ padding: '12px', borderRadius: '10px', background: 'transparent', border: 'none', color: '#E5E7EB', textAlign: 'left', fontWeight: 600, cursor: 'pointer', width: '100%' }}
                >{item.label}</motion.button>
              ))}
              <motion.button 
                whileHover={{ background: 'rgba(0,245,160,0.1)' }}
                onClick={() => { setTab('totobola'); setMobileMenuOpen(false); }} 
                style={{ padding: '12px', borderRadius: '10px', background: 'transparent', border: 'none', color: '#E5E7EB', textAlign: 'left', fontWeight: 600, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ⚽ Totobola
                <span style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '20px', padding: '2px 8px', fontSize: '0.6rem', fontWeight: 700 }}>Em breve</span>
              </motion.button>
              <motion.button 
                whileHover={{ background: 'rgba(0,245,160,0.1)' }}
                onClick={() => { setShowResponsible(true); setMobileMenuOpen(false); }} 
                style={{ padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(0,245,160,0.15), rgba(0,245,160,0.05))', border: '1px solid rgba(0,245,160,0.3)', color: '#00F5A0', textAlign: 'left', fontWeight: 600, cursor: 'pointer', width: '100%' }}
              >
                🛡️ Jogo responsável
              </motion.button>
              <div style={{ paddingTop: '8px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
              </div>
            </div>
          </motion.div>
        )}
      </header>

      <div style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.07), rgba(255,215,0,0.02))', borderTop: '1px solid rgba(255,215,0,0.2)', borderBottom: '1px solid rgba(255,215,0,0.2)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#FFD700' }}>
          <motion.span 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ fontSize: '1.25rem', lineHeight: 1, marginTop: '2px' }}
          >⚠️</motion.span>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
            <strong>Importante:</strong> ferramenta <strong>educativa e de entretenimento</strong>,
            <strong> não afiliada</strong> à {OPERATOR} ({CONCESSIONAIRE}) nem ao {REGULATOR}.
            Os sorteios são <strong>aleatórios e independentes</strong> — nenhum método garante acertos. Jogue com responsabilidade. +18.
          </p>
        </div>
      </div>

      <div style={{ background: !apiError && draws.length > 0 ? (temDadosHoje ? 'rgba(0,245,160,0.05)' : 'rgba(255,215,0,0.05)') : 'rgba(255,215,0,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 py-2 text-xs md:text-sm flex items-center gap-2 flex-wrap" style={{ color: '#9CA3AF' }}>
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >{!apiError && draws.length > 0 ? (temDadosHoje ? '✅' : '⚠️') : '🕐'}</motion.span>
          {loadingApi ? <span>A carregar dados da API oficial…</span>
            : !apiError && draws.length > 0
              ? temDadosHoje ? <span style={{ color: '#00F5A0' }}>✅ Dados reais da API oficial da Lotaria Nacional.</span>
                : <span>⚠️ Último sorteio disponível: {activeDraw ? formatDate(activeDraw.date) : 'N/A'} — o sorteio de hoje ainda não foi actualizado.</span>
              : <span>🕐 A aguardar actualização dos dados.</span>
          }
        </div>
      </div>

      {session && <PremiumBanner session={session} onUpgrade={() => setShowUpgrade(true)} onLogout={handleLogout} gensUsedToday={gensUsedToday} gensLimitDay={FREE_GENS_DAY} />}

      <div className="relative overflow-hidden py-8 px-4" style={{ background: header.bg }}>
        <div className="max-w-6xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="fade-in-up" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,245,160,0.3)', borderRadius: '999px', marginBottom: '16px' }}
          >
            <motion.span 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F5A0', display: 'inline-block', boxShadow: '0 0 8px #00F5A0' }} 
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#00F5A0' }}>⚡ Ecossistema Glow — Inteligência para cada aposta</span>
          </motion.div>
          <div>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: header.accent, color: '#000', boxShadow: '0 0 10px rgba(0,0,0,0.3)' }}>{header.badge}</div>
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display font-black mb-3" 
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}
          >
            <ShimmerText speed={2}>{header.title}</ShimmerText>
          </motion.h1>
          {(session?.isPremium || premium.isActive || isTrialActive(session)) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="fade-in-up" 
              style={{ animationDelay: '200ms', marginBottom: '12px' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05))', border: '1px solid rgba(255,215,0,0.4)', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, animation: 'borderPulse 2s infinite' }}>
                ⭐ <ShimmerText speed={1.5}>{isTrialActive(session) ? 'TRIAL ACTIVO' : 'PREMIUM ACTIVO'}</ShimmerText>
              </span>
            </motion.div>
          )}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: '#D1D5DB', fontSize: '1.125rem', maxWidth: '672px', margin: '0 auto' }}
          >{header.subtitle}</motion.p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', padding: '24px 16px 0', flexWrap: 'wrap' }}>
        {(['loto', 'totobola', 'premios'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { loto: '🎲 LOTO 5/90', totobola: '⚽ TOTOBOLA', premios: '💰 PRÉMIOS' };
          const activeColors: Record<Tab, string> = { loto: 'linear-gradient(135deg, #00F5A0, #00C896)', totobola: 'linear-gradient(135deg, #FFD700, #d4a800)', premios: 'linear-gradient(135deg, #FF4B4B, #cc0000)' };
          const activeGlows: Record<Tab, string> = { loto: '0 0 15px rgba(0,245,160,0.5)', totobola: '0 0 15px rgba(255,215,0,0.5)', premios: '0 0 15px rgba(255,75,75,0.5)' };
          const isActive = tab === t;
          return (
            <motion.button 
              key={t} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab(t)} 
              style={{ 
                padding: '12px 24px', 
                borderRadius: '40px', 
                fontWeight: 700, 
                fontSize: '0.875rem', 
                transition: 'all 0.2s ease', 
                cursor: 'pointer', 
                ...(isActive ? { 
                  background: activeColors[t], 
                  color: t === 'premios' ? '#fff' : '#0B0F19', 
                  border: 'none', 
                  boxShadow: activeGlows[t] 
                } : { 
                  background: 'rgba(17,24,39,0.7)', 
                  backdropFilter: 'blur(12px)', 
                  color: '#9CA3AF', 
                  border: '1px solid rgba(255,255,255,0.1)' 
                }) 
              }}
            >
              {labels[t]}
            </motion.button>
          );
        })}
      </div>

      <main id="inicio" className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(0,245,160,0.2)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="sm:flex-row sm:items-center sm:justify-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#D1D5DB' }}>📅 Período de análise:</span>
              <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 16px', fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                <option value={20}>Últimos 20 sorteios</option>
                <option value={60}>Últimos 60 sorteios</option>
                <option value={120}>Últimos 120 sorteios</option>
                <option value={draws.length}>Todos ({draws.length})</option>
              </select>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>📊 Os dados abaixo refletem os últimos {Math.min(windowSize, draws.length)} sorteios</div>
          </div>
        </motion.div>

        {ultimoSorteio && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <GlowCard accentColor={temDadosHoje ? '#00F5A0' : '#FFD700'}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📅</span>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>{`${temDadosHoje ? 'Último sorteio' : 'Último sorteio disponível'} · ${formatDate(ultimoSorteio.date)}${ultimoSorteio.time ? ' · ' + ultimoSorteio.time : ''}`}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>{temDadosHoje
                      ? `Concurso ${ultimoSorteio.id}${ultimoSorteio.session ? ' · ' + (ultimoSorteio.session === 'fezada' ? 'Fezada' : ultimoSorteio.session === 'aqueceu' ? 'Aqueceu' : ultimoSorteio.session === 'kazola' ? 'Kazola' : 'Eskebra') : ''} — ${PICK_SIZE} números de 1 a ${TOTAL_NUMBERS}`
                      : `⚠️ Resultado do último sorteio registado (${formatDate(ultimoSorteio.date)}). O sorteio de hoje ainda não está disponível.`}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'center', padding: '16px 0' }}>
                  {ultimoSorteio.numbers.map((n, i) => (
                    <ChromeBall 
                      key={n} 
                      n={n} 
                      animated 
                      size="lg" 
                      delay={i * 120} 
                      variant="premium"
                      glowing={true}
                    />
                  ))}
                </div>
                
                {!temDadosHoje && (
                  <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', fontSize: '0.875rem', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, display: 'block', marginBottom: '4px' }}>⏳ Dados históricos</span>
                    Estes são os números do último sorteio disponível. O resultado de hoje será exibido assim que a Lotaria Nacional o disponibilizar.
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '8px' }} className="md:grid-cols-4">
                  
                  <motion.div 
                    whileHover={{ y: -4, scale: 1.02 }}
                    animate={{ boxShadow: ['0 0 0px rgba(255,215,0,0)', '0 0 20px rgba(255,215,0,0.5)', '0 0 0px rgba(255,215,0,0)'] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: '16px', padding: '16px', textAlign: 'center', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFD700' }}>🏆 Prémio máximo</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFD700', textShadow: '0 0 8px rgba(255,215,0,0.6)', marginTop: '4px' }}>{fmtKz(MAX_PRIZE_KZ)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>Opção 5 × {fmtKz(MAX_STAKE_KZ)}</div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -4, scale: 1.02 }}
                    style={{ background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,245,160,0.4)', borderRadius: '16px', padding: '16px', textAlign: 'center', transition: 'all 0.2s ease', animation: 'borderPulse 3s infinite' }}
                  >
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#00F5A0' }}>📊 Sorteios analisados</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00F5A0', textShadow: '0 0 8px rgba(0,245,160,0.6)', marginTop: '4px' }}>{draws.length}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>base histórica</div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -4, scale: 1.02 }}
                    style={{ background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '16px', padding: '16px', textAlign: 'center', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60A5FA' }}>🎯 Probabilidade (5 certos)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60A5FA', textShadow: '0 0 8px rgba(96,165,250,0.6)', marginTop: '4px' }}>1 em {probs.five.toLocaleString('pt-AO')}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>C(90,5) = {probs.total.toLocaleString('pt-AO')}</div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -4, scale: 1.02 }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,75,75,0.4)', borderRadius: '16px', padding: '16px', textAlign: 'center', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FF4B4B' }}>💰 Aposta</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FF4B4B', textShadow: '0 0 8px rgba(255,75,75,0.6)', marginTop: '4px' }}>{fmtKz(MIN_STAKE_KZ)}–{fmtKz(MAX_STAKE_KZ)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>mínimo · máximo</div>
                  </motion.div>
                </div>

                <p style={{ marginTop: '16px', fontSize: '0.875rem', color: '#6B7280' }}>
                  Operado pela {OPERATOR} ({CONCESSIONAIRE}), regulado pelo {REGULATOR} ao abrigo da {LEGAL_REF} e {DECREE_REF}.{' '}
                  <a href={WEBSITE} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: '#60A5FA', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#00F5A0'} onMouseLeave={e => e.currentTarget.style.color = '#60A5FA'}>Site oficial</a>
                </p>
              </div>
            </GlowCard>
          </motion.div>
        )}

        {tab === 'loto' && (
          <>
            {performance.total > 0 && (
              <MetricsStrip
                totalSessions={performance.total}
                winRate={Number(performance.winRate)}
                avgHits={avgHitsCalc}
                totalReturn={performance.totalWin}
              />
            )}

            <div id="plano_semanal">
              {hasFullAccess(session) ? (
                <PlanoSemanal session={session!} weights={weights} hotCold={hotCold} gaps={gaps} draws={draws} onSessionUpdate={handleSessionUpdate} />
              ) : (
                <GlowCard accentColor="#F59E0B">
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem' }}>📅</span>
                    <p style={{ color: '#6B7280', marginTop: '12px' }}>🔒 Disponível apenas para utilizadores Premium ou Trial (3 dias).</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowUpgrade(true)} style={{ display: 'block', margin: '12px auto 0', padding: '8px 16px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#000', borderRadius: '12px', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>Upgrade Premium</motion.button>
                  </div>
                </GlowCard>
              )}
            </div>

            <div id="gerador">
              <section className="grid lg:grid-cols-5 gap-6">
                <GlowCard accentColor="#00F5A0" className="lg:col-span-3">
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <span style={{ fontSize: '1.5rem' }}>🎲</span>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Gerador inteligente</h3>
                        <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                          {!session ? '⚠️ Registe-se para começar a gerar!' : !canGenerateTodayCheck ? '⚠️ Limite diário atingido. Volte amanhã ou adquira Premium.' : 'Escolha um método e gere combinações para estudo. Nenhuma garante vitória.'}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: '#D1D5DB' }}>🎯 Modalidade de jogo</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {(['chance2', 'chance3', 'chance4', 'chance5'] as Modalidade[]).map((mod) => {
                          const colors = MODALIDADE_COLORS[mod];
                          const isSelected = modalidade === mod;
                          return (
                            <motion.button
                              key={mod}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => { setModalidade(mod); setGenerated([]); resetAgents(); }}
                              style={{
                                padding: '12px 8px',
                                borderRadius: '12px',
                                background: isSelected ? `linear-gradient(135deg, ${colors.primary}, ${colors.primary}80)` : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${isSelected ? colors.primary : 'rgba(255,255,255,0.1)'}`,
                                color: isSelected ? '#fff' : '#9CA3AF',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? `0 0 15px ${colors.glow}` : 'none'
                              }}
                            >
                              <div>{CHANCE_LABELS[mod]}</div>
                              <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{NUMBERS_PER_CHANCE[mod]} números</div>
                            </motion.button>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '8px' }}>{MODALIDADE_DESCRICAO[modalidade]}</p>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: '#D1D5DB' }}>Método de geração</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                          {availableStrategies.map(key => {
                            const cfg = METHOD_CONFIG[key];
                            const isLocked = !hasFullAccess(session) && (key === 'frequencia' || key === 'montecarlo');
                            return (
                              <MethodCard
                                key={key}
                                id={key as MethodId}
                                name={cfg.name}
                                description={cfg.description}
                                icon={cfg.icon}
                                color={cfg.color}
                                premium={cfg.premium}
                                selected={strategy === key}
                                locked={isLocked}
                                badge={cfg.badge}
                                onSelect={(id) => setStrategy(id as GenerationStrategy)}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: '#D1D5DB' }}>Linhas: <strong>{lines}</strong></label>
                          <input type="range" min={1} max={getMaxLinesPerGeneration(session)} value={lines} onChange={e => setLines(Number(e.target.value))} style={{ width: '100%', accentColor: '#00F5A0' }} />
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
                            1 a {getMaxLinesPerGeneration(session)} combinações por geração
                            {!hasFullAccess(session) && <span style={{ marginLeft: '8px', color: '#F59E0B' }}>🔒 Premium ou Trial permite até 10</span>}
                            {isTrialActive(session) && <span style={{ marginLeft: '8px', color: '#00F5A0' }}>✨ Trial: até 3 linhas!</span>}
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: '#D1D5DB' }}>Par / Ímpar</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {([
                              { value: 'nenhum',      label: 'Qualquer',       icon: '🎲' },
                              { value: 'equilibrado', label: '2P/3I ou 3P/2I', icon: '⚖️' },
                              { value: 'par',         label: 'Maioria par',     icon: '2️⃣' },
                              { value: 'impar',       label: 'Maioria ímpar',   icon: '1️⃣' },
                            ] as { value: Filter['parityBias']; label: string; icon: string }[]).map(opt => {
                              const isSelected = parity === opt.value;
                              return (
                                <motion.button
                                  key={opt.value}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => setParity(opt.value)}
                                  style={{
                                    padding: '10px 8px',
                                    borderRadius: '12px',
                                    background: isSelected ? 'linear-gradient(135deg, #00F5A0, #00C896)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${isSelected ? '#00F5A0' : 'rgba(255,255,255,0.1)'}`,
                                    color: isSelected ? '#0B0F19' : '#9CA3AF',
                                    fontWeight: isSelected ? 700 : 500,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isSelected ? '0 0 12px rgba(0,245,160,0.4)' : 'none',
                                    display: 'flex',
                                    flexDirection: 'column' as const,
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                                  <span>{opt.label}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: '#D1D5DB' }}>
                          Excluir números — toque para marcar/desmarcar
                          {exclude.length > 0 && <span style={{ marginLeft: '8px', color: '#EF4444' }}>({exclude.length} excluídos)</span>}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
                          {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map(n => {
                            const off = exclude.includes(n);
                            return (
                              <motion.button 
                                key={n} 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleExclude(n)} 
                                aria-pressed={off}
                                style={{ 
                                  aspectRatio: '1', 
                                  borderRadius: '8px', 
                                  fontWeight: 700, 
                                  fontSize: '0.625rem', 
                                  transition: 'all 0.15s', 
                                  background: off ? '#1F2937' : 'rgba(255,255,255,0.08)', 
                                  border: off ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,245,160,0.3)', 
                                  color: off ? '#6B7280' : '#D1D5DB', 
                                  textDecoration: off ? 'line-through' : 'none', 
                                  cursor: 'pointer',
                                  boxShadow: !off ? '0 0 5px rgba(0,245,160,0.2)' : 'none'
                                }}
                              >
                                {String(n).padStart(2, '0')}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {!premium.isActive && !premium.isTrial && !session?.isPremium && !isTrialActive(session) && <PremiumBanner onLogin={() => setShowLogin(true)} />}
                      {premium.isTrial && premium.diasRestantes !== null && <PremiumBanner isTrial={true} diasRestantes={premium.diasRestantes} onLogin={() => setShowLogin(true)} />}
                      {isTrialActive(session) && !session?.isPremium && (
                        <div style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.3)', borderRadius: '16px', padding: '16px', textAlign: 'center', color: '#00F5A0' }}>
                          ✨ Período Trial activo! Tens acesso a todos os métodos Premium e até {getMaxLinesPerGeneration(session)} linhas por geração. Aproveita!
                        </div>
                      )}

                      {(!session || !canGenerateTodayCheck) && (
                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '16px', textAlign: 'center', color: '#F59E0B' }}>
                          {!session ? '⚠️ Registe-se com email para começar a gerar!' : '⚠️ Limite diário atingido! Apenas 1 geração por dia para utilizadores gratuitos.'}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }} className="sm:flex-row">
                        <motion.button 
                          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,245,160,0.5)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onGenerate} 
                          disabled={!session || !canGenerateTodayCheck}
                          className="btn-glow"
                          style={{ 
                            flex: 1, 
                            minHeight: '60px', 
                            padding: '16px 24px', 
                            borderRadius: '16px', 
                            fontWeight: 900, 
                            fontSize: '1.125rem', 
                            transition: 'all 0.2s', 
                            cursor: !session || !canGenerateTodayCheck ? 'not-allowed' : 'pointer', 
                            background: !session || !canGenerateTodayCheck ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00F5A0, #00C896)', 
                            color: !session || !canGenerateTodayCheck ? '#6B7280' : '#0B0F19', 
                            border: 'none', 
                            boxShadow: !session || !canGenerateTodayCheck ? 'none' : '0 0 20px rgba(0,245,160,0.3)' 
                          }}
                        >
                          ⚡ Gerar {getMaxLinesPerGeneration(session)} {CHANCE_LABELS[modalidade]}
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowHelp(true)} 
                          style={{ minHeight: '60px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#D1D5DB', fontWeight: 700, fontSize: '1.125rem', cursor: 'pointer' }}
                        >
                          Como funciona?
                        </motion.button>
                      </div>

                      {session && !premium.isActive && !session.isPremium && !isTrialActive(session) && (
                        <div style={{ fontSize: '0.75rem', textAlign: 'center', color: '#6B7280' }}>
                          {canGenerateTodayCheck ? `✅ Geração disponível hoje (1/1).` : `⏳ Próxima geração disponível amanhã. Adquira Premium para gerações ilimitadas.`}
                        </div>
                      )}
                      {isTrialActive(session) && (
                        <div style={{ fontSize: '0.75rem', textAlign: 'center', color: '#00F5A0' }}>
                          ✨ Trial activo: {FREE_GENS_DAY - gensUsedToday} de {FREE_GENS_DAY} gerações disponíveis hoje. Expira em {daysLeft} dias.
                        </div>
                      )}
                    </div>
                  </div>
                </GlowCard>

                <GlowCard accentColor="#FFD700" className="lg:col-span-2">
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <span style={{ fontSize: '1.5rem' }}>✨</span>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Combinações geradas</h3>
                        <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>{generated.length ? 'Toque no ♡ para guardar nos favoritos.' : 'As suas combinações aparecerão aqui.'}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <Speedometer hits={speedometerHits} animateKey={speedometerKey} size={220} />
                    </div>

                    {generated.length === 0 ? (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: '#6B7280' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎟️</div>
                        <p style={{ fontWeight: 600 }}>Sem combinações ainda.</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>Configure as opções e toque em "Gerar".</p>
                        {!hasFullAccess(session) && <p style={{ fontSize: '0.75rem', color: '#F59E0B', marginTop: '12px' }}>🔒 Utilizadores gratuitos: máximo 1 linha por geração</p>}
                      </div>
                    ) : (
                      <>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {generated.map((g, idx) => {
                            const saved = favorites.some(f => f.numbers.join('-') === g.numbers.join('-'));
                            return (
                              <motion.li 
                                key={g.id} 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{ borderRadius: '16px', border: '1px solid rgba(0,245,160,0.2)', padding: '12px', background: 'rgba(0,245,160,0.05)' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#9CA3AF' }}>{CHANCE_LABELS[modalidade]} · Linha {idx + 1}</span>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleShareCombination(g.numbers)} 
                                      style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#059669', color: '#fff', fontSize: '1.125rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                      aria-label="Partilhar"
                                    >📤</motion.button>
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => toggleFavorite(g)} 
                                      aria-label="Guardar nos favoritos" 
                                      style={{ width: '44px', height: '44px', borderRadius: '50%', fontSize: '1.5rem', border: 'none', cursor: 'pointer', background: saved ? '#DC2626' : 'rgba(255,255,255,0.1)', color: saved ? '#fff' : '#9CA3AF' }}
                                    >
                                      {saved ? '♥' : '♡'}
                                    </motion.button>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                                  {g.numbers.map((n, i) => (
                                    <ChromeBall 
                                      key={n} 
                                      n={n} 
                                      size="sm" 
                                      delay={i * 50}
                                      animated
                                    />
                                  ))}
                                </div>
                              </motion.li>
                            );
                          })}
                        </ul>
                        {activeDraw && (
                          <motion.button 
                            whileHover={{ scale: 1.02, boxShadow: '0 0 20px #059669' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={checkWin} 
                            style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                          >
                            ✅ Conferir com sorteio de {formatDate(activeDraw.date)}
                          </motion.button>
                        )}
                      </>
                    )}
                  </div>
                </GlowCard>
              </section>

              {/* ============================================================ */}
              {/* PAINEL DE VOTAÇÃO DOS AGENTES */}
              {/* ============================================================ */}
              {generated.length > 0 && agentResult && (
                <div style={{ marginTop: '24px' }}>
                  <VotePanel result={agentResult} modalidade={modalidade} />
                </div>
              )}
            </div>

            <div id="favoritos">
              <GlowCard accentColor="#DC2626">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>💾</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Os seus favoritos</h3>
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Guardados neste dispositivo.</p>
                    </div>
                  </div>
                  {favorites.length === 0 ? (
                    <p style={{ color: '#6B7280', textAlign: 'center', padding: '24px 0' }}>Ainda não guardou nenhuma combinação. Toque no ♡ após gerar.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }} className="sm:grid-cols-2 lg:grid-cols-3">
                      {favorites.map(f => (
                        <motion.div 
                          key={f.id} 
                          whileHover={{ scale: 1.02 }}
                          style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', border: '1px solid rgba(220,38,38,0.3)' }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            {f.numbers.map((n, i) => (
                              <ChromeBall key={n} n={n} size="sm" delay={i * 30} animated />
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleFavorite(f)} 
                              style={{ fontSize: '0.875rem', fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
                            >Remover</motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleShareCombination(f.numbers)} 
                              style={{ fontSize: '0.875rem', fontWeight: 700, color: '#00F5A0', background: 'none', border: 'none', cursor: 'pointer' }}
                            >Partilhar</motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </GlowCard>
            </div>

            <div id="diario">
              {hasFullAccess(session) ? (
                <DiarioApostas session={session!} onSessionUpdate={handleSessionUpdate} draws={sorteios} />
              ) : (
                <GlowCard accentColor="#F59E0B">
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem' }}>📓</span>
                    <p style={{ color: '#6B7280', marginTop: '12px' }}>🔒 Disponível apenas para utilizadores Premium ou Trial (3 dias).</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowUpgrade(true)} style={{ display: 'block', margin: '12px auto 0', padding: '8px 16px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#000', borderRadius: '12px', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>Upgrade Premium</motion.button>
                  </div>
                </GlowCard>
              )}
            </div>

            <div id="relatorio">
              {hasFullAccess(session) ? (
                <RelatorioMensal session={session!} />
              ) : (
                <GlowCard accentColor="#F59E0B">
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem' }}>📊</span>
                    <p style={{ color: '#6B7280', marginTop: '12px' }}>🔒 Disponível apenas para utilizadores Premium ou Trial (3 dias).</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowUpgrade(true)} style={{ display: 'block', margin: '12px auto 0', padding: '8px 16px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#000', borderRadius: '12px', fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>Upgrade Premium</motion.button>
                  </div>
                </GlowCard>
              )}
            </div>

            <div id="estatisticas">
              <section className="grid lg:grid-cols-2 gap-6">
                <GlowCard accentColor="#EF4444">
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <span style={{ fontSize: '1.5rem' }}>📊</span>
                      <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Frequência dos números</h3>
                        <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Últimos {Math.min(windowSize, draws.length)} sorteios</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 700, flexShrink: 0, color: '#D1D5DB' }}>Janela:</label>
                      <select value={windowSize} onChange={e => setWindowSize(Number(e.target.value))} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 12px', fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                        <option value={20}>20 sorteios</option>
                        <option value={60}>60 sorteios</option>
                        <option value={120}>120 sorteios</option>
                        <option value={draws.length}>Todos ({draws.length})</option>
                      </select>
                    </div>
                    <div className="freq-scroll" style={{ maxHeight: '700px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', scrollbarWidth: 'thin', scrollbarColor: '#00F5A0 rgba(255,255,255,0.05)' } as React.CSSProperties}>
                      {freq.freq && freq.freq.length > 1 ? (
                        freq.freq.slice(1).map((c, i) => {
                          const n = i + 1;
                          const denom = Math.min(windowSize, draws.length) || 1;
                          const percent = ((c / denom) * 100);
                          const width = maxFreq > 0 ? (c / maxFreq) * 100 : 0;
                          
                          return (
                            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                              <div style={{ width: '32px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', color: '#E5E7EB' }}>
                                {String(n).padStart(2, '0')}
                              </div>
                              <div style={{ flex: 1, height: '20px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <motion.div 
                                  className="bar-grow" 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${width}%` }}
                                  transition={{ duration: 0.5, delay: i * 0.01 }}
                                  style={{ height: '100%', background: 'linear-gradient(90deg, #EF4444, #F59E0B)', position: 'relative', overflow: 'hidden' }}
                                >
                                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 2s infinite' }} />
                                </motion.div>
                              </div>
                              <div style={{ width: '56px', textAlign: 'right', color: '#E5E7EB', fontSize: '0.75rem', fontWeight: 600 }}>
                                {c}x · {percent.toFixed(0)}%
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#6B7280' }}>
                          <span style={{ fontSize: '2rem' }}>📊</span>
                          <p style={{ marginTop: '8px' }}>A carregar dados de frequência...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlowCard>

                <div className="space-y-6">
                  <GlowCard accentColor="#EF4444">
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📈</span>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>🔥 Quentes & ❄️ Frios</h3>
                          <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Os 8 mais e menos frequentes.</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: '8px', color: '#EF4444', fontSize: '0.875rem' }}>🔥 Mais frequentes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {hotCold.hot.map(n => <ChromeBall key={n} n={n} variant="hot" size="sm" animated />)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: '8px', color: '#60A5FA', fontSize: '0.875rem' }}>❄️ Menos frequentes</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {hotCold.cold.map(n => <ChromeBall key={n} n={n} variant="cold" size="sm" animated />)}
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '12px' }}>A frequência passada <strong>não prevê resultados futuros</strong>. Cada sorteio é independente.</p>
                    </div>
                  </GlowCard>

                  <GlowCard accentColor="#60A5FA">
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '1.5rem' }}>⏳</span>
                        <div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Atraso (gap analysis)</h3>
                          <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Há quantos sorteios cada número não sai.</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
                        {gaps.map(({ n, gap }) => (
                          <motion.div 
                            key={n} 
                            whileHover={{ scale: 1.1 }}
                            title={`Nº ${n} — ${gap} sorteios sem sair`}
                            style={{ 
                              aspectRatio: '1', 
                              borderRadius: '6px', 
                              fontSize: '0.5625rem', 
                              fontWeight: 700, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              background: gap >= 30 ? '#DC2626' : gap >= 15 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)', 
                              color: gap >= 30 ? '#fff' : '#9CA3AF', 
                              border: '1px solid rgba(255,255,255,0.08)',
                              cursor: 'pointer'
                            }}
                          >
                            {String(n).padStart(2, '0')}
                          </motion.div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.75rem', color: '#9CA3AF' }}>
                        <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#DC2626', verticalAlign: 'middle', marginRight: '4px' }}/>≥ 30 sorteios</span>
                        <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245,158,11,0.3)', verticalAlign: 'middle', marginRight: '4px' }}/>15–29</span>
                        <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', verticalAlign: 'middle', marginRight: '4px' }}/>0–14</span>
                      </div>
                    </div>
                  </GlowCard>
                </div>
              </section>
            </div>

            <GlowCard accentColor="#F59E0B">
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📉</span>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Distribuição por dezena</h3>
                    <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Quantas vezes saíram números de cada faixa de 10.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {decades.map(({ label, count }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.875rem' }}>
                      <div style={{ width: '56px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', color: '#6B7280' }}>{label}</div>
                      <div style={{ flex: 1, height: '24px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <motion.div 
                          className="bar-grow" 
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / maxDecade) * 100}%` }}
                          transition={{ duration: 0.5 }}
                          style={{ height: '100%', background: 'linear-gradient(90deg, rgba(239,68,68,0.6), #F59E0B)', position: 'relative', overflow: 'hidden' }}
                        >
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', animation: 'shimmer 2s infinite' }} />
                        </motion.div>
                      </div>
                      <div style={{ width: '40px', textAlign: 'right', color: '#6B7280', fontSize: '0.75rem', fontFamily: 'monospace' }}>{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>

            <section className="grid md:grid-cols-3 gap-6">
              <GlowCard accentColor="#DC2626">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>⚖️</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Par / Ímpar</h3>
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Distribuição observada no histórico.</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', marginBottom: '12px', color: '#6B7280' }}>{isNaN(parityStat.pairs + parityStat.odds) ? 0 : parityStat.pairs + parityStat.odds} números no total</div>
                  {!loadingApi && !isNaN(parityStat.pairs + parityStat.odds) && (parityStat.pairs + parityStat.odds) > 0 && (
                    <div style={{ height: '40px', borderRadius: '16px', display: 'flex', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(parityStat.pairs / (parityStat.pairs + parityStat.odds)) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}
                      >
                        Pares {((parityStat.pairs / (parityStat.pairs + parityStat.odds)) * 100).toFixed(0)}%
                      </motion.div>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(parityStat.odds / (parityStat.pairs + parityStat.odds)) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        style={{ background: '#1F2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}
                      >
                        Ímpares {((parityStat.odds / (parityStat.pairs + parityStat.odds)) * 100).toFixed(0)}%
                      </motion.div>
                    </div>
                  )}
                </div>
              </GlowCard>
              
              <GlowCard accentColor="#00F5A0">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>➕</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Soma dos {NUMBERS_PER_CHANCE[modalidade]} números</h3>
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Mínimo, máximo e média observados.</p>
                    </div>
                  </div>
                  <div className="space-y-2" style={{ fontSize: '0.875rem' }}>
                    {[['Mínimo', sum.min], ['Máximo', sum.max], ['Média', sum.avg.toFixed(1)]].map(([k, v]) => (
                      <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6B7280' }}>{k}</span>
                        <strong style={{ color: '#00F5A0' }}>{v}</strong>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', fontSize: '0.75rem', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span>Intervalo teórico possível</span><span>{NUMBERS_PER_CHANCE[modalidade]} – {TOTAL_NUMBERS * NUMBERS_PER_CHANCE[modalidade] - (NUMBERS_PER_CHANCE[modalidade] - 1) * NUMBERS_PER_CHANCE[modalidade] / 2}</span>
                    </div>
                  </div>
                </div>
              </GlowCard>
              
              <GlowCard accentColor="#60A5FA">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎯</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Probabilidades reais</h3>
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Por linha jogada no Loto 5/90.</p>
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.875rem' }}>
                    {[['5 certos (jackpot)', probs.five], ['4 certos', probs.four], ['3 certos', probs.three], ['2 certos', probs.two]].map(([label, val]) => (
                      <li key={String(label)} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6B7280' }}>{label}</span>
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#60A5FA' }}>1 em {Number(val).toLocaleString('pt-AO')}</strong>
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>Total combinações C(90,{NUMBERS_PER_CHANCE[modalidade]}) = {(() => {
                    const n = TOTAL_NUMBERS;
                    const k = NUMBERS_PER_CHANCE[modalidade];
                    let result = 1;
                    for (let i = 0; i < k; i++) result *= (n - i) / (k - i);
                    return Math.round(result).toLocaleString('pt-AO');
                  })()}</p>
                </div>
              </GlowCard>
            </section>

            <div id="historico">
              <GlowCard accentColor="#FFD700">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📜</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Histórico interactivo</h3>
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Clique num sorteio para o seleccionar. Dados mais recentes primeiro.</p>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,215,0,0.1)' }}>
                          {['Data', 'Hora', 'Sessão', 'Concurso', 'Números sorteados', 'Soma'].map(h => (
                            <th key={h} style={{ padding: '12px', fontWeight: 700, color: '#FFD700' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {histSlice.map(d => (
                          <motion.tr 
                            key={d.id} 
                            whileHover={{ background: 'rgba(255,215,0,0.1)' }}
                            onClick={() => setActiveDraw(d)}
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: activeDraw?.id === d.id ? 'rgba(255,215,0,0.15)' : 'transparent', transition: 'background 0.15s' }}
                          >
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#D1D5DB' }}>{formatDate(d.date)}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#6B7280' }}>{d.time ?? '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {d.session === 'fezada' && <span style={{ color: '#EF4444' }}>☀️ Fezada</span>}
                              {d.session === 'aqueceu' && <span style={{ color: '#F97316' }}>🔥 Aqueceu</span>}
                              {d.session === 'kazola' && <span style={{ color: '#00F5A0' }}>🌙 Kazola</span>}
                              {d.session === 'eskebra' && <span style={{ color: '#A855F7' }}>⚡ Eskebra</span>}
                              {!d.session && '—'}
                            </td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#6B7280' }}>{d.id}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {d.numbers.map((n, i) => (
                                  <ChromeBall key={n} n={n} size="sm" delay={i * 20} animated />
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#FFD700' }}>{d.numbers.reduce((a, b) => a + b, 0)}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {histPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.875rem' }}>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setHistPage(p => Math.max(0, p - 1))} 
                        disabled={histPage === 0} 
                        style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#D1D5DB', fontWeight: 600, cursor: histPage === 0 ? 'not-allowed' : 'pointer', opacity: histPage === 0 ? 0.4 : 1 }}
                      >← Anterior</motion.button>
                      <span style={{ color: '#6B7280' }}>Página {histPage + 1} de {histPages} · {draws.length} sorteios</span>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setHistPage(p => Math.min(histPages - 1, p + 1))} 
                        disabled={histPage === histPages - 1} 
                        style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#D1D5DB', fontWeight: 600, cursor: histPage === histPages - 1 ? 'not-allowed' : 'pointer', opacity: histPage === histPages - 1 ? 0.4 : 1 }}
                      >Próxima →</motion.button>
                    </div>
                  )}
                </div>
              </GlowCard>
            </div>
          </>
        )}

        {tab === 'totobola' && (
          <section id="totobola">
            <GlowCard accentColor="#22A55A">
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1.5rem' }}>⚽</span>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Totobola — Em breve</h3>
                    <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Prognósticos de futebol · A caminho</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 0', gap: '24px' }}>
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #14532d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', boxShadow: '0 0 30px rgba(34,165,90,0.5)' }}
                  >⚽</motion.div>
                  <div>
                    <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '8px' }}><ShimmerText speed={2}>Totobola em preparação</ShimmerText></h2>
                    <p style={{ color: '#9CA3AF', maxWidth: '520px', lineHeight: 1.6 }}>
                      Estamos a trabalhar para integrar a grelha oficial de prognósticos desportivos do <strong style={{ color: '#22A55A' }}>Totobola de Angola</strong>.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                    {['🔧 Em desenvolvimento', '🇦🇴 Dados oficiais ISJ', '⚽ Girabola 2025/26'].map(b => (
                      <motion.span 
                        key={b} 
                        whileHover={{ scale: 1.05 }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', background: 'rgba(34,165,90,0.1)', border: '1px solid rgba(34,165,90,0.3)', fontWeight: 700, fontSize: '0.875rem', color: '#22A55A' }}
                      >{b}</motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </GlowCard>
          </section>
        )}

        {tab === 'premios' && (
          <div id="premios">
            <section className="space-y-6">
              <GlowCard accentColor="#FF4B4B">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>💰</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Simulador de prémios</h3>
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Calcule o prémio líquido com base no Decreto Executivo n.º 695/25.</p>
                    </div>
                  </div>
                  <PrizeCalculator />
                </div>
              </GlowCard>
              
              <GlowCard accentColor="#00F5A0">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎯</span>
                    <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Simulador de apostas</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#D1D5DB' }}>Orçamento por sessão (Kz)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ color: '#6B7280' }}>Kz</span>
                          <input type="number" min={50} max={10000} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))} style={{ flex: 1, borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '12px 16px', fontWeight: 600, color: '#fff' }} />
                        </div>
                        <input type="range" min={50} max={2000} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))} style={{ width: '100%', marginTop: '8px', accentColor: '#00F5A0' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#D1D5DB' }}>Valor por combinação (Kz)</label>
                        <select value={stakePerLine} onChange={e => setStakePerLine(Number(e.target.value))} style={{ width: '100%', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '12px 16px', fontWeight: 600, marginTop: '4px', color: '#fff', colorScheme: 'dark' }}>
                        <option value={50}  style={{ background: '#1a1a2e', color: '#E5E7EB' }}>50 Kz (mínimo)</option>
                        <option value={100} style={{ background: '#1a1a2e', color: '#E5E7EB' }}>100 Kz</option>
                        <option value={200} style={{ background: '#1a1a2e', color: '#E5E7EB' }}>200 Kz</option>
                        <option value={500} style={{ background: '#1a1a2e', color: '#E5E7EB' }}>500 Kz</option>
                        <option value={1000} style={{ background: '#1a1a2e', color: '#E5E7EB' }}>1000 Kz (máximo)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,245,160,0.1)', borderRadius: '16px', padding: '16px', textAlign: 'center', border: '1px solid rgba(0,245,160,0.3)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00F5A0' }}>{recs.total} combinações</div>
                      <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Custo total: {fmtKz(recs.total * stakePerLine)} · {budget - (recs.total * stakePerLine) > 0 ? `Sobra: ${fmtKz(budget - (recs.total * stakePerLine))}` : '✅ Orçamento ajustado'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', textAlign: 'center' }}>
                      {[['⚖️ Equilibrado', recs.equilibrado], ['🌙 Kazola', recs.kazola], ['🎲 Monte Carlo', recs.montecarlo], ['📈 Frequência', recs.frequencia]].map(([label, val]) => (
                        <div key={String(label)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{label}</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00F5A0' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>

              <GlowCard accentColor="#1E40AF">
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🏆</span>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Tabela de multiplicadores por modalidade</h3>
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Cotas fixas oficiais (Decreto Executivo n.º 695/25).</p>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(30,64,175,0.2)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#60A5FA' }}>Modalidade</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#60A5FA' }}>Nº números</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#60A5FA' }}>Acertos</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#60A5FA' }}>Multiplicador</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#60A5FA' }}>Prémio (100 Kz)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#60A5FA' }}>Prémio (1000 Kz)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(['chance2', 'chance3', 'chance4', 'chance5'] as Modalidade[]).map(mod => {
                          const nums = NUMBERS_PER_CHANCE[mod];
                          const mults = MULTIPLIERS[mod];
                          const rows = Object.entries(mults).filter(([hits]) => parseInt(hits) <= nums && parseInt(hits) > 0);
                          return rows.map(([hits, mult], idx) => {
                            const colors = MODALIDADE_COLORS[mod];
                            return (
                              <tr key={`${mod}-${hits}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: idx === 0 ? `linear-gradient(90deg, ${colors.primary}10, transparent)` : 'transparent' }}>
                                {idx === 0 && (
                                  <td rowSpan={rows.length} style={{ padding: '12px 16px', fontWeight: 900, fontSize: '1rem', color: '#D1D5DB', verticalAlign: 'middle', background: `${colors.primary}10` }}>
                                    {CHANCE_LABELS[mod]}
                                    <div style={{ fontSize: '0.65rem', color: colors.primary }}>{nums} números</div>
                                  </td>
                                )}
                                {idx === 0 && <td rowSpan={rows.length} style={{ padding: '12px 16px', textAlign: 'center', color: '#6B7280', verticalAlign: 'middle' }}>{nums}</td>}
                                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#9CA3AF' }}>{hits} acerto{hits !== '1' ? 's' : ''}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: colors.primary }}>×{mult.toLocaleString('pt-AO')}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#9CA3AF' }}>{fmtKz(100 * mult)}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#D1D5DB' }}>{fmtKz(1000 * mult)}</td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '16px', padding: '16px', borderRadius: '16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.875rem', color: '#F59E0B' }}>
                    <strong>💡 Regime fiscal</strong> ({DECREE_REF}, Art.º 26): prémios ≤ {fmtKz(TAX_FREE_KZ)} isentos de imposto · excedente sujeito a 15% de Imposto Especial de Jogos. Aposta: mínimo {fmtKz(MIN_STAKE_KZ)} · máximo {fmtKz(MAX_STAKE_KZ)}.
                  </div>
                </div>
              </GlowCard>
            </section>
          </div>
        )}

        <section className="grid md:grid-cols-2 gap-6">
          <GlowCard accentColor="#00F5A0">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.5rem' }}>📖</span>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Como funciona o {APP_NAME}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Regras reais, de forma simples.</p>
                </div>
              </div>
              <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: '#D1D5DB' }}>
                <li>Escolha <strong>2 a 5 números</strong> de 1 a {TOTAL_NUMBERS} (conforme a modalidade).</li>
                <li>São sorteadas 5 bolas de entre 90, por máquina automática supervisionada pelo {REGULATOR}.</li>
                <li>Apostas de <strong>{fmtKz(MIN_STAKE_KZ)} a {fmtKz(MAX_STAKE_KZ)}</strong>.</li>
                <li>Até 28 concursos por semana (2ª–Dom, até 4×/dia).</li>
                <li>Prémio = valor apostado × multiplicador de cota fixa (ver tabela em PRÉMIOS).</li>
              </ol>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                Operado pela {OPERATOR} ({CONCESSIONAIRE}) ao abrigo da {LEGAL_REF} e {DECREE_REF}.{' '}
                <a href={WEBSITE} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: '#60A5FA', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#00F5A0'} onMouseLeave={e => e.currentTarget.style.color = '#60A5FA'}>{WEBSITE}</a>
              </p>
            </div>
          </GlowCard>
          
          <GlowCard accentColor="#FFD700">
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.5rem' }}>🧠</span>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Mitos vs. Realidade</h3>
                  <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Desmistifique crenças comuns sobre lotarias.</p>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
                {[
                  ['❌ Mito: "Este número está atrasado, tem de sair."', '✅ Realidade: cada sorteio é independente — a probabilidade de qualquer número é sempre 5/90.'],
                  ['❌ Mito: "Jogar combinações vencedoras do passado é mais inteligente."', '✅ Realidade: o histórico não influencia o próximo sorteio — lei dos grandes números.'],
                  ['✅ Bom senso:', 'Jogue por entretenimento, com um orçamento que pode perder, nunca por necessidade financeira.'],
                ].map(([mito, real]) => (
                  <li key={mito} style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', border: '1px solid rgba(255,215,0,0.2)' }}>
                    <strong style={{ color: '#D1D5DB' }}>{mito}</strong><br />
                    <span style={{ color: '#9CA3AF' }}>{real}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GlowCard>
        </section>

        <GlowCard accentColor="#00F5A0">
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Jogo responsável</h3>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Ferramentas de apoio para uma experiência saudável.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '16px' }} className="md:grid-cols-3">
              {[
                { modal: 'autoavaliacao' as ModalResponsavelType, icon: '📋', title: 'Autoavaliação', desc: 'Responda a perguntas para avaliar os seus hábitos de jogo.' },
                { modal: 'limites' as ModalResponsavelType, icon: '⏱️', title: 'Limites de tempo', desc: 'Defina alertas e organize pausas regulares.' },
                { modal: 'reflexao' as ModalResponsavelType, icon: '🚪', title: 'Período de reflexão', desc: 'Afaste-se temporariamente se sentir necessidade.' },
              ].map(item => (
                <motion.button 
                  key={item.title} 
                  whileHover={{ scale: 1.02, borderColor: 'rgba(0,245,160,0.8)', boxShadow: '0 0 20px rgba(0,245,160,0.3)' }}
                  onClick={() => setModalResponsavel(item.modal)}
                  style={{ textAlign: 'left', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', padding: '20px', border: '1px solid rgba(0,245,160,0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ fontSize: '1.875rem', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#D1D5DB', marginBottom: '4px' }}>{item.title}</div>
                  <p style={{ fontSize: '0.875rem', color: '#9CA3AF', margin: 0 }}>{item.desc}</p>
                </motion.button>
              ))}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(0,245,160,0.15)' }}>
              🧠 O jogo deve ser uma atividade de lazer, não uma fonte de rendimento. Se sentir dificuldades em controlar o tempo ou dinheiro investido, procure apoio profissional.
            </p>
          </div>
        </GlowCard>
      </main>

      <footer style={{ marginTop: '48px', background: '#060911', color: '#9CA3AF', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-6">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #DC2626, #F59E0B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.875rem' }}>KG</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.125rem', color: '#fff' }}>{APP_NAME}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{APP_SLOGAN} · +18</div>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>Análise estatística transparente para estudo de lotaria em Angola. <strong style={{ color: '#fff' }}> Não afiliada</strong> à {OPERATOR} nem ao {REGULATOR}.</p>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#fff' }}>Ferramentas</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem' }}>
              {[['Plano Semanal', 'loto'], ['Gerador Loto 5/90', 'loto'], ['Diário de Apostas', 'loto'], ['Relatório Mensal', 'loto'], ['Estatísticas', 'loto'], ['Histórico', 'loto'], ['Totobola', 'totobola'], ['Simulador de prémios', 'premios']].map(([label, t]) => (
                <li key={label}><motion.button whileHover={{ color: '#00F5A0' }} onClick={() => setTab(t as Tab)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}>{label}</motion.button></li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#fff' }}>Legal</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem' }}>
              {[['Termos de uso', () => setShowTerms(true)], ['Política de privacidade', () => setShowPrivacy(true)], ['Jogo responsável', () => setShowResponsible(true)]].map(([label, fn]) => (
                <li key={String(label)}><motion.button whileHover={{ color: '#00F5A0' }} onClick={fn as () => void} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}>{String(label)}</motion.button></li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#fff' }}>Oficial</div>
            <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>Para informação oficial e resultados em tempo real, consulte sempre a entidade gestora:</p>
            <motion.a whileHover={{ scale: 1.05, boxShadow: '0 0 15px #DC2626' }} href={WEBSITE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '12px', background: '#DC2626', color: '#fff', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s' }}>🌐 {CONCESSIONAIRE}</motion.a>
            <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F59E0B', color: '#111827', fontWeight: 700, padding: '8px 12px', borderRadius: '12px', fontSize: '0.875rem', marginLeft: '8px' }}>+18 · Responsabilidade</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-6xl mx-auto px-4 py-4" style={{ fontSize: '0.75rem', color: '#4B5563', textAlign: 'center' }}>
            © {new Date().getFullYear()} {APP_NAME} · {APP_SLOGAN} · Angola — Ferramenta educativa e de entretenimento. Não emite, vende ou promove apostas. Ao abrigo da {LEGAL_REF} · {DECREE_REF}.
          </div>
        </div>
      </footer>

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
          <li>Em conformidade com a Lei n.º 22/11 de Protecção de Dados Pessoais de Angola.</li>
        </ul>
      </Modal>

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="Como funciona o gerador?">
        <ol className="list-decimal pl-5 space-y-3 text-sm">
          <li><strong>Kazola (principal):</strong> método baseado em padrões históricos V4-D + cobertura por faixas adaptada à modalidade.</li>
          <li><strong>Equilibrado:</strong> escolhe um número por cada faixa adaptada à modalidade (ex: Chance 2 → 2 faixas, Chance 5 → 5 faixas).</li>
          <li><strong>Frequência histórica:</strong> pesos maiores para os números mais frequentes nos últimos sorteios.</li>
          <li><strong>Monte Carlo:</strong> pesos históricos com adição de ruído gaussiano (Box-Muller).</li>
        </ol>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 pt-3 border-t mt-3 border-neutral-200 dark:border-neutral-800"><strong>Importante:</strong> nenhum método prevê o futuro. Os sorteios são eventos independentes.</p>
      </Modal>

      <Modal open={modalResponsavel === 'autoavaliacao'} onClose={() => setModalResponsavel(null)} title="📋 Autoavaliação - Hábitos de Jogo">
        <div className="space-y-4 text-sm">
          <p className="font-bold text-emerald-800 dark:text-emerald-400">Responda com sinceridade para avaliar os seus hábitos:</p>
          {[
            { key: 'q1', question: '1. Com que frequência joga?', opts: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente'] },
            { key: 'q2', question: '2. Já tentou reduzir ou parar sem sucesso?', opts: ['Nunca', 'Uma vez', 'Várias vezes'] },
            { key: 'q3', question: '3. Já escondeu ou mentiu sobre o quanto joga?', opts: ['Não', 'Sim, uma vez', 'Sim, várias'] },
            { key: 'q4', question: '4. Costuma gastar mais tempo ou dinheiro do que planeia?', opts: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente'] },
            { key: 'q5', question: '5. Já sentiu que o jogo afetou negativamente as suas finanças ou relações?', opts: ['Não', 'Sim, ligeiramente', 'Sim, significativamente'] },
          ].map(({ key, question, opts }) => (
            <div key={key} className="bg-neutral-50 dark:bg-[#0f3460] p-3 rounded-xl">
              <p className="font-semibold mb-2 dark:text-white">{question}</p>
              <div className="flex gap-3 flex-wrap">
                {opts.map(opt => (
                  <label key={opt} className="flex items-center gap-1 text-xs dark:text-neutral-300">
                    <input type="radio" name={key} value={opt} onChange={e => setAutoavaliacaoRespostas(prev => ({ ...prev, [key]: e.target.value }))} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {autoavaliacaoFeedback && (
            <div className={`p-4 rounded-xl ${autoavaliacaoFeedback.cor === 'red' ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' : autoavaliacaoFeedback.cor === 'amber' ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800' : 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'}`}>
              <div className="font-bold text-base mb-1">{autoavaliacaoFeedback.nivel}</div>
              <p className="text-sm mb-2">{autoavaliacaoFeedback.mensagem}</p>
              <p className="text-xs font-medium">{autoavaliacaoFeedback.acao}</p>
            </div>
          )}
          <button onClick={() => setModalResponsavel(null)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">Fechar</button>
        </div>
      </Modal>

      <Modal open={modalResponsavel === 'limites'} onClose={() => setModalResponsavel(null)} title="⏱️ Limites de tempo">
        <div className="space-y-4 text-sm">
          <div className="bg-emerald-50 dark:bg-emerald-950 p-4 rounded-xl">
            <p className="font-semibold mb-2 dark:text-white">⏰ Temporizador:</p>
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 45, 60].map(min => (
                <motion.button key={min} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => iniciarTimer(min)} className="px-3 py-2 bg-white dark:bg-[#1a2a4a] rounded-lg ring-1 ring-emerald-300 dark:ring-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900 transition">⏱️ {min} min</motion.button>
              ))}
            </div>
            {timerAtivo && timerMinutos !== null && <div className="mt-3 p-2 bg-emerald-200 dark:bg-emerald-800 rounded-lg text-center font-bold dark:text-white">⏰ Temporizador ativo: {timerMinutos} minutos restantes</div>}
          </div>
          <button onClick={() => setModalResponsavel(null)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">Entendi, vou aplicar estes limites</button>
        </div>
      </Modal>

      <Modal open={modalResponsavel === 'reflexao'} onClose={() => setModalResponsavel(null)} title="🚪 Período de reflexão">
        <div className="space-y-4 text-sm">
          <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-xl">
            <p className="font-semibold mb-2 dark:text-white">⏸️ Escolha o período:</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 7, 30].map(d => (
                <motion.button key={d} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => iniciarPeriodoReflexao(d)} className="px-3 py-2 bg-white dark:bg-[#1a2a4a] rounded-lg ring-1 ring-amber-300 dark:ring-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900 transition">{d === 1 ? '24 horas' : `${d} dias`}</motion.button>
              ))}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-xl">
            <p className="font-semibold text-red-800 dark:text-red-300">📞 Precisa de ajuda?</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">Contacte o Instituto de Supervisão de Jogos (ISJ) para apoio profissional.</p>
          </div>
          <button onClick={() => setModalResponsavel(null)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">Compreendo, vou refletir</button>
        </div>
      </Modal>

      <Modal open={showReflectionConfirm} onClose={() => setShowReflectionConfirm(false)} title="✅ Período de reflexão iniciado">
        <div className="space-y-4 text-center">
          <div className="text-5xl">🧘</div>
          <p className="font-bold text-emerald-800 dark:text-emerald-400">O seu período de reflexão foi registado!</p>
          <p className="text-sm dark:text-neutral-300">Durante <strong>{reflectionDays} dias</strong>, recomendamos que mantenha distância do jogo.</p>
          <button onClick={() => setShowReflectionConfirm(false)} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm">Fechar</button>
        </div>
      </Modal>

      <Modal open={showPrizeModal} onClose={() => setShowPrizeModal(false)} title="Simulador de prémios">
        <PrizeCalculator />
      </Modal>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <TrialExpiredModal />

      <ChatBot session={session} onUpgrade={() => setShowUpgrade(true)} onLogin={() => setShowGate(true)} onScrollTo={handleChatScrollTo} onOpenModal={handleChatOpenModal} />

      <AdminDrawer pendingSessions={[]} onConsolidate={(id, result, hits) => { console.log('Admin consolidar:', id, result, hits); }} />

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 50 }}>
            <div style={{ padding: '12px 16px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', color: '#fff', fontWeight: 600, background: toast.type === 'error' ? '#DC2626' : toast.type === 'success' ? '#059669' : '#2563EB', border: '1px solid rgba(255,255,255,0.2)' }}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
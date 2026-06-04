/**
 * session.ts — Gestão de sessões freemium + Pagamentos Premium
 * =========================================
 * FREE  : trial 3 dias · 1 geração por dia
 * PREMIUM: ilimitado · sem restrições
 *
 * Armazenamento: localStorage (apenas no browser do utilizador)
 * Em produção: sincronizar com backend/Google Sheets para validação real
 */

export const STORAGE_KEY     = 'kazola_user_session';
export const TRIAL_DAYS      = 3;  // ALTERADO: 7 → 3 dias
export const TRIAL_MS        = TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const FREE_GENS_DAY   = 1;   // gerações/dia no trial
export const PREMIUM_GENS_DAY = 999; // ilimitado na prática

export interface UserSession {
  email              : string;
  registeredAt       : number;   // timestamp ms
  lastGenerationDate : string | null; // "YYYY-MM-DD"
  generationsToday   : number;
  isPremium          : boolean;
  trialExpires       : number;   // timestamp ms
  
  // ========== NOVOS CAMPOS - SISTEMA DE PAGAMENTOS ==========
  plano              : 'mensal' | 'anual' | 'vitalicio' | null;
  premiumExpiracao   : string | null;   // formato YYYY-MM-DD
  tokenActivacao     : string | null;
  verificadoNoServidor : boolean;
  ultimaVerificacao  : number | null;   // timestamp ms
}

/** Hoje em formato "YYYY-MM-DD" */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Carrega sessão do localStorage (com migração de campos) */
export function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as UserSession;
    
    // Migração: adicionar campos novos se não existirem
    if (session.plano === undefined) session.plano = null;
    if (session.premiumExpiracao === undefined) session.premiumExpiracao = null;
    if (session.tokenActivacao === undefined) session.tokenActivacao = null;
    if (session.verificadoNoServidor === undefined) session.verificadoNoServidor = false;
    if (session.ultimaVerificacao === undefined) session.ultimaVerificacao = null;
    
    return session;
  } catch {
    return null;
  }
}

/** Guarda sessão no localStorage */
export function saveSession(s: UserSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ok */ }
}

/** Cria nova sessão para um email (com campos de pagamento vazios) */
export function createSession(email: string): UserSession {
  const now = Date.now();
  const s: UserSession = {
    email,
    registeredAt       : now,
    lastGenerationDate : null,
    generationsToday   : 0,
    isPremium          : false,
    trialExpires       : now + TRIAL_MS,
    // Novos campos
    plano              : null,
    premiumExpiracao   : null,
    tokenActivacao     : null,
    verificadoNoServidor : false,
    ultimaVerificacao  : null,
  };
  saveSession(s);
  return s;
}

/** Activa Premium numa sessão existente (mantém compatibilidade) */
export function activatePremium(s: UserSession): UserSession {
  const updated = { ...s, isPremium: true };
  saveSession(updated);
  return updated;
}

/** Activa Premium com dados do servidor (nova função) */
export function activatePremiumFromServer(
  s: UserSession, 
  plano: 'mensal' | 'anual' | 'vitalicio', 
  expiracao: string
): UserSession {
  const updated: UserSession = {
    ...s,
    isPremium: true,
    plano,
    premiumExpiracao: expiracao,
    verificadoNoServidor: true,
    ultimaVerificacao: Date.now(),
  };
  saveSession(updated);
  return updated;
}

/** Verifica se o premium é válido (data de expiração) */
export function isPremiumValid(s: UserSession | null | undefined): boolean {
  if (!s) return false;
  if (!s.isPremium) return false;
  
  // Admin vitalício não expira
  if (s.plano === 'vitalicio') return true;
  
  if (s.premiumExpiracao) {
    const expiracao = new Date(s.premiumExpiracao);
    expiracao.setHours(23, 59, 59, 999);
    return Date.now() <= expiracao.getTime();
  }
  
  return s.isPremium;
}

/** Verifica se deve consultar o servidor novamente (a cada 60 min) */
export function shouldVerifyWithServer(s: UserSession | null | undefined): boolean {
  if (!s) return true;
  
  const SIXTY_MINUTES = 60 * 60 * 1000;
  
  if (!s.verificadoNoServidor) return true;
  if (!s.ultimaVerificacao) return true;
  if (Date.now() - s.ultimaVerificacao > SIXTY_MINUTES) return true;
  
  return false;
}

/** Verifica se o trial ainda está activo (aceita null/undefined) */
export function isTrialActive(s: UserSession | null | undefined): boolean {
  if (!s) return false;
  return !s.isPremium && Date.now() < s.trialExpires;
}

/** Dias restantes no trial (0 se expirado) - aceita null/undefined */
export function trialDaysLeft(s: UserSession | null | undefined): number {
  if (!s) return 0;
  if (s.isPremium) return 999;
  const ms = s.trialExpires - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/** Verifica se pode gerar agora - aceita null/undefined */
export function canGenerate(s: UserSession | null | undefined): { ok: boolean; reason?: string } {
  if (!s) return { ok: false, reason: 'trial_expired' };
  if (!s.isPremium && !isTrialActive(s)) {
    return { ok: false, reason: 'trial_expired' };
  }
  if (s.isPremium) return { ok: true };

  const today = todayStr();
  if (s.lastGenerationDate === today && s.generationsToday >= FREE_GENS_DAY) {
    return { ok: false, reason: 'daily_limit' };
  }
  return { ok: true };
}

/** Regista uma geração e actualiza contadores */
export function recordGeneration(s: UserSession | null | undefined): UserSession | null {
  if (!s) return null;
  const today = todayStr();
  const updated: UserSession = {
    ...s,
    lastGenerationDate: today,
    generationsToday  : s.lastGenerationDate === today ? s.generationsToday + 1 : 1,
  };
  saveSession(updated);
  return updated;
}

/** Tenta restaurar sessão por email (login) */
export function loginByEmail(email: string): UserSession | null {
  const s = loadSession();
  if (!s) return null;
  if (s.email.toLowerCase() === email.toLowerCase().trim()) return s;
  return null;
}
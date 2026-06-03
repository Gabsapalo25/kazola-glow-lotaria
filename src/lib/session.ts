/**
 * session.ts — Gestão de sessões freemium
 * =========================================
 * FREE  : trial 7 dias · 1 geração por dia
 * PREMIUM: ilimitado · sem restrições
 *
 * Armazenamento: localStorage (apenas no browser do utilizador)
 * Em produção: sincronizar com backend/Google Sheets para validação real
 */

export const STORAGE_KEY     = 'kazola_user_session';
export const TRIAL_DAYS      = 7;
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
}

/** Hoje em formato "YYYY-MM-DD" */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Carrega sessão do localStorage */
export function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

/** Guarda sessão no localStorage */
export function saveSession(s: UserSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ok */ }
}

/** Cria nova sessão para um email */
export function createSession(email: string): UserSession {
  const now = Date.now();
  const s: UserSession = {
    email,
    registeredAt       : now,
    lastGenerationDate : null,
    generationsToday   : 0,
    isPremium          : false,
    trialExpires       : now + TRIAL_MS,
  };
  saveSession(s);
  return s;
}

/** Activa Premium numa sessão existente */
export function activatePremium(s: UserSession): UserSession {
  const updated = { ...s, isPremium: true };
  saveSession(updated);
  return updated;
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
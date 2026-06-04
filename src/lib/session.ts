/**
 * session.ts — Gestão de sessões freemium + Pagamentos Premium
 * =========================================
 * FREE  : trial 3 dias · 1 geração por dia
 * PREMIUM: ilimitado · sem restrições
 *
 * CORRECÇÃO: isPremium nunca vem do localStorage — é sempre validado no servidor.
 */

export const STORAGE_KEY      = 'kazola_user_session';
export const TRIAL_DAYS       = 3;
export const TRIAL_MS         = TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const FREE_GENS_DAY    = 1;
export const PREMIUM_GENS_DAY = 999;

export interface UserSession {
  email              : string;
  registeredAt       : number;
  lastGenerationDate : string | null;
  generationsToday   : number;
  isPremium          : boolean;
  trialExpires       : number;
  plano              : 'mensal' | 'anual' | 'vitalicio' | null;
  premiumExpiracao   : string | null;
  tokenActivacao     : string | null;
  verificadoNoServidor : boolean;
  ultimaVerificacao  : number | null;
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as UserSession;

    // Migração de campos
    if (session.plano               === undefined) session.plano               = null;
    if (session.premiumExpiracao    === undefined) session.premiumExpiracao    = null;
    if (session.tokenActivacao      === undefined) session.tokenActivacao      = null;
    if (session.verificadoNoServidor=== undefined) session.verificadoNoServidor= false;
    if (session.ultimaVerificacao   === undefined) session.ultimaVerificacao   = null;

    // ─── CORRECÇÃO CRÍTICA ───────────────────────────────────────
    // isPremium do localStorage nunca é fonte de verdade.
    // Se a sessão não foi verificada no servidor recentemente,
    // remove o premium — será re-verificado no servidor.
    if (session.isPremium && session.plano !== 'vitalicio') {
      const VERIFY_INTERVAL = 60 * 60 * 1000; // 1 hora
      const precisaVerificar =
        !session.verificadoNoServidor ||
        !session.ultimaVerificacao ||
        Date.now() - session.ultimaVerificacao > VERIFY_INTERVAL;

      if (precisaVerificar) {
        // Mantém os dados mas marca como não verificado
        // O App.tsx vai chamar checkPremiumStatus e actualizar
        session.isPremium             = false;
        session.verificadoNoServidor  = false;
      }
    }
    // ────────────────────────────────────────────────────────────

    return session;
  } catch {
    return null;
  }
}

export function saveSession(s: UserSession): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ok */ }
}

export function createSession(email: string): UserSession {
  const now = Date.now();
  const s: UserSession = {
    email,
    registeredAt        : now,
    lastGenerationDate  : null,
    generationsToday    : 0,
    isPremium           : false,   // NUNCA true ao criar — só após verificação servidor
    trialExpires        : now + TRIAL_MS,
    plano               : null,
    premiumExpiracao    : null,
    tokenActivacao      : null,
    verificadoNoServidor: false,
    ultimaVerificacao   : null,
  };
  saveSession(s);
  return s;
}

export function activatePremium(s: UserSession): UserSession {
  const updated = { ...s, isPremium: true };
  saveSession(updated);
  return updated;
}

export function activatePremiumFromServer(
  s         : UserSession,
  plano     : 'mensal' | 'anual' | 'vitalicio',
  expiracao : string,
): UserSession {
  const updated: UserSession = {
    ...s,
    isPremium           : true,
    plano,
    premiumExpiracao    : expiracao,
    verificadoNoServidor: true,
    ultimaVerificacao   : Date.now(),
  };
  saveSession(updated);
  return updated;
}

/** Verifica se o premium é válido (data + verificação servidor) */
export function isPremiumValid(s: UserSession | null | undefined): boolean {
  if (!s)           return false;
  if (!s.isPremium) return false;

  // Admin vitalício nunca expira
  if (s.plano === 'vitalicio') return true;

  // Deve ter sido verificado no servidor
  if (!s.verificadoNoServidor) return false;

  // Verifica data de expiração
  if (s.premiumExpiracao) {
    const expiracao = new Date(s.premiumExpiracao);
    expiracao.setHours(23, 59, 59, 999);
    return Date.now() <= expiracao.getTime();
  }

  return false; // sem data de expiração = inválido
}

export function shouldVerifyWithServer(s: UserSession | null | undefined): boolean {
  if (!s) return true;
  const SIXTY_MINUTES = 60 * 60 * 1000;
  if (!s.verificadoNoServidor)  return true;
  if (!s.ultimaVerificacao)     return true;
  if (Date.now() - s.ultimaVerificacao > SIXTY_MINUTES) return true;
  return false;
}

export function isTrialActive(s: UserSession | null | undefined): boolean {
  if (!s) return false;
  return !s.isPremium && Date.now() < s.trialExpires;
}

export function trialDaysLeft(s: UserSession | null | undefined): number {
  if (!s) return 0;
  if (s.isPremium) return 999;
  const ms = s.trialExpires - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

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

export function recordGeneration(s: UserSession | null | undefined): UserSession | null {
  if (!s) return null;
  const today   = todayStr();
  const updated : UserSession = {
    ...s,
    lastGenerationDate: today,
    generationsToday  : s.lastGenerationDate === today ? s.generationsToday + 1 : 1,
  };
  saveSession(updated);
  return updated;
}

/**
 * Login por email — carrega sessão local MAS não confia no isPremium.
 * O App.tsx deve chamar checkPremiumStatus() após o login para verificar no servidor.
 */
export function loginByEmail(email: string): UserSession | null {
  const s = loadSession();
  if (!s) return null;
  if (s.email.toLowerCase() !== email.toLowerCase().trim()) return null;

  // ─── CORRECÇÃO CRÍTICA ───────────────────────────────────────
  // Nunca devolve isPremium=true sem verificação recente do servidor.
  // Excepção: admin vitalício (plano=vitalicio é verificado no servidor 1x/hora).
  if (s.isPremium && s.plano !== 'vitalicio') {
    const VERIFY_INTERVAL = 60 * 60 * 1000;
    const expirou =
      !s.verificadoNoServidor ||
      !s.ultimaVerificacao ||
      Date.now() - s.ultimaVerificacao > VERIFY_INTERVAL;

    if (expirou) {
      // Devolve sessão mas sem premium — App.tsx verifica no servidor
      return {
        ...s,
        isPremium           : false,
        verificadoNoServidor: false,
      };
    }
  }
  // ────────────────────────────────────────────────────────────

  return s;
}
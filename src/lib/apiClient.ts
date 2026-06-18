// src/lib/apiClient.ts v3.1
// v3.0: Adicionadas funções registerWithPassword e loginWithPassword
// v2.8: JSONP abandonado — usa fetch via Netlify Function (/api/gas)
//       Elimina ERR_NETWORK_CHANGED causado pelos redirects do Google
//       Netlify Function gas.js faz o pedido server-side ao GAS
// v3.1: HISTORICO_URL alterado para jsDelivr + cache reduzido para 1 minuto

import { type Draw } from '../data/history';

const HISTORICO_URL = 'https://cdn.jsdelivr.net/gh/Gabsapalo25/kazola-dados@main/historico_completo.json';
const GAS_PROXY_URL = '/api/gas';
const GAS_TIMEOUT_MS = 12000;

let cacheDraws: { draws: Draw[]; hasToday: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minuto

// ==================== HELPERS ====================

function formatarHora(hour: string): string {
  if (!hour) return '--:--';
  let hora = hour.toUpperCase().trim();
  hora = hora.replace('H', ':');
  const partes = hora.split(':');
  if (partes.length === 2) {
    const minutos = partes[1].replace(/[^0-9]/g, '');
    const minutosFormatados = minutos.padEnd(2, '0').slice(0, 2);
    return `${partes[0]}:${minutosFormatados}`;
  }
  if (partes.length === 1 && partes[0].length >= 2) {
    return `${partes[0].slice(0, 2)}:00`;
  }
  return '--:--';
}

function normalizarData(dataStr: string): string {
  if (!dataStr) return '';
  return dataStr.split('T')[0];
}

function isHoraValida(time: string): boolean {
  return time !== '--:--' && /^\d{2}:\d{2}$/.test(time);
}

// ==================== FETCH HISTÓRICO ====================

export async function fetchRealDraws(): Promise<{ draws: Draw[]; hasToday: boolean }> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (cacheDraws && (Date.now() - cacheDraws.timestamp) < CACHE_DURATION) {
    return { draws: cacheDraws.draws, hasToday: cacheDraws.hasToday };
  }

  console.log('🌐 Buscando dados do GitHub via jsDelivr...');

  try {
    const response = await fetch(HISTORICO_URL, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: any[] = await response.json();
    console.log(`📥 Recebidos ${data.length} dias de sorteios`);

    const drawsMap = new Map<string, Draw>();

    for (const daily of data) {
      const dateStr = normalizarData(daily.date);
      if (!dateStr || dateStr > todayStr) continue;

      const results = daily.results || [];

      for (const result of results) {
        const numbers = [
          result.number_1, result.number_2, result.number_3,
          result.number_4, result.number_5
        ];
        if (numbers.some((n: any) => n === undefined || n === null)) continue;

        const time = formatarHora(result.hour);
        let sessionType: 'fezada' | 'kazola' | 'aqueceu' | 'eskebra' = 'fezada';
        const sessionName = (result.name || '').toLowerCase();
        if (sessionName.includes('kazola')) sessionType = 'kazola';
        else if (sessionName.includes('aqueceu')) sessionType = 'aqueceu';
        else if (sessionName.includes('eskebra')) sessionType = 'eskebra';

        const uniqueId = `${dateStr}-${sessionType}-${time}`;
        if (!drawsMap.has(uniqueId)) {
          drawsMap.set(uniqueId, {
            id: uniqueId, date: dateStr, time,
            session: sessionType,
            numbers: numbers.sort((a: number, b: number) => a - b),
          });
        }
      }
    }

    const draws = Array.from(drawsMap.values());
    draws.sort((a, b) => {
      const aV = isHoraValida(a.time), bV = isHoraValida(b.time);
      if (!aV && !bV) return 0;
      if (!aV) return 1;
      if (!bV) return -1;
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });

    const hasToday = draws.length > 0 && draws[0]?.date === todayStr;
    console.log(`✅ ${draws.length} sorteios carregados`);
    if (draws[0]) console.log(`🎯 Último sorteio: ${draws[0].date} ${draws[0].time} - ${draws[0].session}`);

    cacheDraws = { draws, hasToday, timestamp: Date.now() };
    return { draws, hasToday };

  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error);
    if (cacheDraws) {
      const mins = Math.round((Date.now() - cacheDraws.timestamp) / 60000);
      console.warn(`⚠️ Usando cache antigo (${mins} min)`);
      return { draws: cacheDraws.draws, hasToday: cacheDraws.hasToday };
    }
    return { draws: [], hasToday: false };
  }
}

// ==================== GAS TRANSPORT — FETCH via Netlify Function v2.8 ====================
// Antes (v2.7): JSONP com <script> tags → Google faz redirect → ERR_NETWORK_CHANGED
// Agora (v2.8): fetch('/api/gas') → Netlify Function gas.js → GAS (server-side, sem CORS)
// =========================================================================================

async function gasRequest<T>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${GAS_PROXY_URL}?${qs}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return await response.json() as T;

  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      console.error('⏱ GAS timeout via proxy Netlify');
      throw new Error('GAS timeout');
    }
    console.error('❌ gasRequest erro:', error);
    throw new Error('Erro de conexão com o servidor');
  }
}

// ==================== OTP ====================

export async function sendOTP(email: string): Promise<{ ok: boolean; sent?: boolean; skip?: boolean; error?: string }> {
  try {
    return await gasRequest({ action: 'sendOTP', email });
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

export async function verifyOTP(email: string, code: string): Promise<{ ok: boolean; verified?: boolean; error?: string }> {
  try {
    return await gasRequest({ action: 'verifyOTP', email, code });
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== REGISTO COM PASSWORD (v3.0) ====================

export async function registerWithPassword(
  email: string,
  name: string,
  password: string
): Promise<{ ok: boolean; registered?: boolean; updated?: boolean; isAdmin?: boolean; error?: string }> {
  try {
    return await gasRequest({
      action: 'registerWithPassword',
      email,
      name,
      password,
    });
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== LOGIN COM PASSWORD (v3.0) ====================

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  loggedIn?: boolean;
  isAdmin?: boolean;
  isPremium?: boolean;
  expiracao?: string;
  plano?: string;
  name?: string;
  error?: string;
}> {
  try {
    return await gasRequest({
      action: 'loginWithPassword',
      email,
      password,
    });
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== PREMIUM STATUS ====================

export async function checkPremiumStatus(email: string): Promise<{
  ok: boolean; isPremium: boolean; expiracao?: string; plano?: string; isAdmin?: boolean; error?: string;
}> {
  try {
    return await gasRequest({ action: 'checkPremium', email });
  } catch {
    return { ok: false, isPremium: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== REGISTO CLIENTE (premium) ====================

export interface RegisterClientData {
  ref: string; name: string; email: string; plano: 'mensal' | 'anual';
}

export async function registerClient(data: RegisterClientData): Promise<{ ok: boolean; ref: string; error?: string }> {
  try {
    return await gasRequest({ action: 'register', ...data });
  } catch {
    return { ok: false, ref: '', error: 'Erro de conexão com o servidor' };
  }
}

// ==================== TOKEN ====================

export async function activateToken(email: string, token: string): Promise<{
  ok: boolean; isPremium?: boolean; expiracao?: string; plano?: string; error?: string;
}> {
  try {
    return await gasRequest({ action: 'activateToken', email, token });
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== ADMIN ====================

export async function adminCheck(key: string): Promise<{
  ok: boolean; totalClientes?: number; ativos?: number; pendentes?: number;
  expirados?: number; sistema?: string; error?: string;
}> {
  try {
    return await gasRequest({ action: 'adminCheck', key });
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== SINCRONIZAÇÃO CROSS-DEVICE ====================

export interface UserDataRecord {
  data_type: string; record_id: string; data: string; timestamp: number;
}

export async function saveUserData(
  email: string, dataType: string, recordId: string, data: any,
): Promise<{ ok: boolean; saved?: boolean; record_id?: string; data_type?: string; error?: string }> {
  try {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    return await gasRequest({
      action: 'saveUserData', email,
      data_type: dataType, record_id: recordId,
      data: jsonData, timestamp: Date.now().toString(),
    });
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

export async function loadUserData(
  email: string, dataType?: string,
): Promise<{ ok: boolean; records?: UserDataRecord[]; error?: string }> {
  try {
    const params: Record<string, string> = { action: 'loadUserData', email };
    if (dataType) params.data_type = dataType;
    return await gasRequest(params);
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

export async function deleteUserData(
  email: string, recordId: string, dataType?: string,
): Promise<{ ok: boolean; deleted?: boolean; record_id?: string; error?: string }> {
  try {
    const params: Record<string, string> = { action: 'deleteUserData', email, record_id: recordId };
    if (dataType) params.data_type = dataType;
    return await gasRequest(params);
  } catch {
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== COMPATIBILIDADE ====================

export async function registerUser(email: string): Promise<{ ok: boolean; error?: string }> {
  return sendOTP(email);
}
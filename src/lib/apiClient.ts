// src/lib/apiClient.ts
import { type Draw } from '../data/history';
import historicoCompleto from '../data/historico_completo.json';

// ==================== CONSTANTES ====================
const KAZOLA_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBUgEc7KtqbktpQXVxnEPW0t0ZkY5WHjzbptt8lX7EDgt-yMB8RX7sorh2RjLO_uu8xA/exec';

// ==================== HELPER — fetch sem CORS preflight ====================
async function gasPost<T>(payload: object): Promise<T> {
  const response = await fetch(KAZOLA_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function gasGet<T>(params: Record<string, string>): Promise<T> {
  const qs  = new URLSearchParams(params).toString();
  const url = `${KAZOLA_SCRIPT_URL}?${qs}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// ==================== SORTEIOS (APENAS ARQUIVO LOCAL) ====================
export async function fetchRealDraws(): Promise<{ draws: Draw[]; hasToday: boolean }> {
  console.log('📡 A carregar dados do arquivo LOCAL atualizado pelo scheduler...');
  
  if (!historicoCompleto || !Array.isArray(historicoCompleto) || historicoCompleto.length === 0) {
    console.error('❌ Arquivo local vazio. Scheduler ainda não executou?');
    return { draws: [], hasToday: false };
  }

  const drawsMap = new Map<string, Draw>();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  for (const group of historicoCompleto) {
    if (!group.formatedDate || !group.results) continue;
    
    const date = extractDate(group.formatedDate);
    if (!date || new Date(date) > now) continue;

    for (const draw of group.results) {
      if (!draw.number_1 || !draw.number_2 || !draw.number_3 || !draw.number_4 || !draw.number_5) continue;

      const horaStr = draw.hour?.replace('H00', '').replace('h00', '') || '0';
      const horaNum = parseInt(horaStr);
      const dataSorteio = new Date(date);
      dataSorteio.setHours(horaNum, 0, 0);
      if (dataSorteio > now) continue;

      const key = `${date}-${draw.name}`;
      if (!drawsMap.has(key)) {
        let sessionType: 'fezada' | 'kazola' | 'aqueceu' | 'eskebra' = 'fezada';
        const sessionName = draw.name?.toLowerCase() || '';
        if (sessionName.includes('kazola')) sessionType = 'kazola';
        else if (sessionName.includes('aqueceu')) sessionType = 'aqueceu';
        else if (sessionName.includes('eskebra')) sessionType = 'eskebra';

        drawsMap.set(key, {
          id: key,
          date: date,
          time: draw.hour ? draw.hour.replace('H', ':').replace('h', ':') : '--:--',
          session: sessionType,
          numbers: [draw.number_1, draw.number_2, draw.number_3, draw.number_4, draw.number_5].sort((a, b) => a - b),
        });
      }
    }
  }

  const draws = Array.from(drawsMap.values())
    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  console.log(`📊 Total de sorteios carregados: ${draws.length}`);
  if (draws.length > 0) {
    console.log('🎯 Último sorteio:', draws[0]);
  }
  
  const hasToday = draws.length > 0 && draws[0].date === todayStr;
  
  return { draws, hasToday };
}

function extractDate(formatedDate: string): string {
  if (!formatedDate) return '';
  const match = formatedDate.match(/(\d{1,2}) de (\w+) de (\d{4})/);
  if (!match) return '';
  const [, day, month, year] = match;
  const meses: Record<string, string> = {
    'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
    'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
    'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12',
  };
  const monthNumber = meses[month];
  if (!monthNumber) return '';
  return `${year}-${monthNumber}-${day.padStart(2, '0')}`;
}

// ==================== REGISTO DE CLIENTE ====================
export interface RegisterClientData {
  ref: string;
  name: string;
  email: string;
  plano: 'mensal' | 'anual';
}

export async function registerClient(
  data: RegisterClientData,
): Promise<{ ok: boolean; ref: string; error?: string }> {
  try {
    return await gasPost<{ ok: boolean; ref: string; error?: string }>({
      action: 'register',
      ...data,
    });
  } catch (error) {
    console.error('Erro em registerClient:', error);
    return { ok: false, ref: '', error: 'Erro de conexão com o servidor' };
  }
}

// ==================== VERIFICAÇÃO DE STATUS PREMIUM ====================
export async function checkPremiumStatus(email: string): Promise<{
  ok: boolean;
  isPremium: boolean;
  expiracao?: string;
  plano?: string;
  isAdmin?: boolean;
  error?: string;
}> {
  try {
    return await gasGet({ action: 'checkPremium', email });
  } catch (error) {
    console.error('Erro em checkPremiumStatus:', error);
    return { ok: false, isPremium: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== ACTIVAÇÃO DE TOKEN ====================
export async function activateToken(
  email: string,
  token: string,
): Promise<{
  ok: boolean;
  isPremium?: boolean;
  expiracao?: string;
  plano?: string;
  error?: string;
}> {
  try {
    return await gasPost({ action: 'activateToken', email, token });
  } catch (error) {
    console.error('Erro em activateToken:', error);
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== PAINEL ADMIN ====================
export async function adminCheck(key: string): Promise<{
  ok: boolean;
  totalClientes?: number;
  ativos?: number;
  pendentes?: number;
  expirados?: number;
  sistema?: string;
  error?: string;
}> {
  try {
    return await gasPost({ action: 'adminCheck', key });
  } catch (error) {
    console.error('Erro em adminCheck:', error);
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

// ==================== SINCRONIZAÇÃO CROSS-DEVICE ====================

export interface UserDataRecord {
  data_type: string;
  record_id: string;
  data: string;
  timestamp: number;
}

export interface SaveUserDataResult {
  ok: boolean;
  saved?: boolean;
  record_id?: string;
  data_type?: string;
  error?: string;
}

export interface LoadUserDataResult {
  ok: boolean;
  records?: UserDataRecord[];
  error?: string;
}

export interface DeleteUserDataResult {
  ok: boolean;
  deleted?: boolean;
  record_id?: string;
  error?: string;
}

export async function saveUserData(
  email: string,
  dataType: string,
  recordId: string,
  data: any,
): Promise<SaveUserDataResult> {
  try {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    const result = await gasPost<SaveUserDataResult>({
      action: 'saveUserData',
      email,
      data_type: dataType,
      record_id: recordId,
      data: jsonData,
      timestamp: Date.now(),
    });
    return result;
  } catch (error) {
    console.error('Erro em saveUserData:', error);
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

export async function loadUserData(
  email: string,
  dataType?: string,
): Promise<LoadUserDataResult> {
  try {
    const params: Record<string, string> = {
      action: 'loadUserData',
      email,
    };
    if (dataType) {
      params.data_type = dataType;
    }
    const result = await gasGet<LoadUserDataResult>(params);
    return result;
  } catch (error) {
    console.error('Erro em loadUserData:', error);
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}

export async function deleteUserData(
  email: string,
  recordId: string,
  dataType?: string,
): Promise<DeleteUserDataResult> {
  try {
    const payload: any = {
      action: 'deleteUserData',
      email,
      record_id: recordId,
    };
    if (dataType) {
      payload.data_type = dataType;
    }
    const result = await gasPost<DeleteUserDataResult>(payload);
    return result;
  } catch (error) {
    console.error('Erro em deleteUserData:', error);
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}
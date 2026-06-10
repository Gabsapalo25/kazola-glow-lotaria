// src/lib/apiClient.ts
import { type Draw } from '../data/history';

const HISTORICO_URL = 'https://cdn.jsdelivr.net/gh/Gabsapalo25/kazola-dados/historico_completo.json';
const KAZOLA_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxBUgEc7KtqbktpQXVxnEPW0t0ZkY5WHjzbptt8lX7EDgt-yMB8RX7sorh2RjLO_uu8xA/exec';

// Cache persistente (sobrevive a fetches falhados)
let cacheDraws: { draws: Draw[]; hasToday: boolean; timestamp: number } | null = null;
let cachePopulated = false;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

// ==================== FUNÇÕES AUXILIARES ====================

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

function compararDatas(dataStr: string, todayStr: string): boolean {
  // Comparação apenas em string, sem Date() para evitar timezone
  return dataStr <= todayStr;
}

function isHoraValida(time: string): boolean {
  return time !== '--:--' && /^\d{2}:\d{2}$/.test(time);
}

// ==================== FUNÇÃO PRINCIPAL COM FALLBACK SEGURO ====================

export async function fetchRealDraws(): Promise<{ draws: Draw[]; hasToday: boolean }> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Verificar cache fresco
  if (cacheDraws && (Date.now() - cacheDraws.timestamp) < CACHE_DURATION) {
    console.log('📦 Usando cache fresco (válido por 2 min)');
    return { draws: cacheDraws.draws, hasToday: cacheDraws.hasToday };
  }

  console.log('🌐 Buscando dados do GitHub...');
  
  try {
    const response = await fetch(HISTORICO_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data: any[] = await response.json();
    console.log(`📥 Recebidos ${data.length} dias de sorteios da API`);
    
    const drawsMap = new Map<string, Draw>();
    
    for (const daily of data) {
      const dateStr = normalizarData(daily.date);
      if (!dateStr) continue;
      
      // Comparação segura sem timezone
      if (!compararDatas(dateStr, todayStr)) continue;
      
      const results = daily.results || [];
      
      for (const result of results) {
        const numbers = [
          result.number_1,
          result.number_2,
          result.number_3,
          result.number_4,
          result.number_5
        ];
        
        if (numbers.some(n => n === undefined || n === null)) continue;
        
        const time = formatarHora(result.hour);
        
        let sessionType: 'fezada' | 'kazola' | 'aqueceu' | 'eskebra' = 'fezada';
        const sessionName = (result.name || '').toLowerCase();
        if (sessionName.includes('kazola')) sessionType = 'kazola';
        else if (sessionName.includes('aqueceu')) sessionType = 'aqueceu';
        else if (sessionName.includes('eskebra')) sessionType = 'eskebra';
        
        const uniqueId = `${dateStr}-${sessionType}-${time}`;
        
        if (!drawsMap.has(uniqueId)) {
          drawsMap.set(uniqueId, {
            id: uniqueId,
            date: dateStr,
            time: time,
            session: sessionType,
            numbers: numbers.sort((a, b) => a - b),
          });
        }
      }
    }
    
    // Ordenar com tratamento seguro de horas inválidas
    const draws = Array.from(drawsMap.values());
    draws.sort((a, b) => {
      // Se alguma hora for inválida, colocar no final
      const aValida = isHoraValida(a.time);
      const bValida = isHoraValida(b.time);
      
      if (!aValida && !bValida) return 0;
      if (!aValida) return 1;
      if (!bValida) return -1;
      
      // Ambas válidas, ordenar normalmente
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });
    
    const hasToday = draws.length > 0 && draws[0]?.date === todayStr;
    
    console.log(`✅ ${draws.length} sorteios carregados`);
    if (draws[0]) {
      console.log(`🎯 Último sorteio: ${draws[0].date} ${draws[0].time} - ${draws[0].session}`);
      console.log(`   Números: ${draws[0].numbers.join(', ')}`);
    }
    
    // Actualizar cache com sucesso
    cacheDraws = { draws, hasToday, timestamp: Date.now() };
    cachePopulated = true;
    
    return { draws, hasToday };
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do GitHub:', error);
    
    // ==================== FALLBACK SEGURO ====================
    // Se temos cache (mesmo que expirado), usá-lo em vez de mostrar vazio
    if (cacheDraws) {
      const cacheAge = Date.now() - cacheDraws.timestamp;
      const cacheAgeMinutes = Math.round(cacheAge / 60000);
      
      console.warn(`⚠️ Usando cache antigo (${cacheAgeMinutes} min) devido a falha de rede`);
      console.warn(`   Dados podem estar desactualizados, mas são melhores que nada.`);
      
      return { draws: cacheDraws.draws, hasToday: cacheDraws.hasToday };
    }
    
    // Sem cache e sem rede: último recurso
    console.error('❌ Sem cache disponível e falha na rede. Retornando vazio.');
    return { draws: [], hasToday: false };
  }
}

// ==================== FUNÇÕES GAS (mantidas iguais) ====================
async function gasPost<T>(payload: object): Promise<T> {
  const response = await fetch(KAZOLA_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function gasGet<T>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const response = await fetch(`${KAZOLA_SCRIPT_URL}?${qs}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export interface RegisterClientData {
  ref: string;
  name: string;
  email: string;
  plano: 'mensal' | 'anual';
}

export async function registerClient(data: RegisterClientData): Promise<{ ok: boolean; ref: string; error?: string }> {
  try {
    return await gasPost({ action: 'register', ...data });
  } catch (error) {
    console.error('Erro em registerClient:', error);
    return { ok: false, ref: '', error: 'Erro de conexão com o servidor' };
  }
}

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

export async function activateToken(email: string, token: string): Promise<{
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
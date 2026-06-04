// src/lib/apiClient.ts
import historicoCompleto from '../data/historico_completo.json';
import { type Draw } from '../data/history';

// ==================== CONSTANTES ====================
const KAZOLA_SCRIPT_URL = 'INSERIR_URL_DO_WEB_APP_AQUI'; // Substituir após deploy do Code.gs

// ==================== FUNÇÃO EXISTENTE (mantida) ====================
export async function fetchRealDraws(): Promise<Draw[]> {
  try {
    console.log('📡 A carregar dados do ficheiro JSON local...');
    
    const drawsMap = new Map<string, Draw>();
    const now = new Date();

    for (const group of historicoCompleto) {
      const date = extractDate(group.formatedDate);
      
      if (new Date(date) > now) continue;

      if (!group.results || !Array.isArray(group.results)) continue;

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
          else sessionType = 'fezada';
          
          drawsMap.set(key, {
            id: key,
            date: date,
            time: draw.hour ? draw.hour.replace('H', ':').replace('h', ':') : '--:--',
            session: sessionType,
            numbers: [draw.number_1, draw.number_2, draw.number_3, draw.number_4, draw.number_5].sort((a, b) => a - b)
          });
        }
      }
    }

    const draws = Array.from(drawsMap.values());
    draws.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`📊 Total de sorteios ÚNICOS carregados: ${draws.length}`);
    if (draws.length > 0) console.log('🎯 Último sorteio:', draws[0]);

    return draws;

  } catch (error) {
    console.error('❌ Erro ao ler dados do ficheiro JSON:', error);
    return [];
  }
}

function extractDate(formatedDate: string): string {
  if (!formatedDate) return new Date().toISOString().split('T')[0];
  const match = formatedDate.match(/(\d{1,2}) de (\w+) de (\d{4})/);
  if (!match) return new Date().toISOString().split('T')[0];
  const [, day, month, year] = match;
  const meses: Record<string, string> = {
    'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
    'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
    'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
  };
  const monthNumber = meses[month];
  if (!monthNumber) return `${year}-01-01`;
  return `${year}-${monthNumber}-${day.padStart(2, '0')}`;
}

// ==================== FUNÇÕES DE PAGAMENTO ====================

export interface RegisterClientData {
  ref: string;
  name: string;
  email: string;
  plano: 'mensal' | 'anual';
}

export async function registerClient(data: RegisterClientData): Promise<{ ok: boolean; ref: string; error?: string }> {
  try {
    const response = await fetch(KAZOLA_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'register',
        ...data,
      }),
    });
    
    const result = await response.json();
    return result;
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
    const url = `${KAZOLA_SCRIPT_URL}?action=checkPremium&email=${encodeURIComponent(email)}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
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
    const response = await fetch(KAZOLA_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'activateToken',
        email,
        token,
      }),
    });
    
    const result = await response.json();
    return result;
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
    const response = await fetch(KAZOLA_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'adminCheck',
        key,
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erro em adminCheck:', error);
    return { ok: false, error: 'Erro de conexão com o servidor' };
  }
}
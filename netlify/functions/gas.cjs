// netlify/functions/gas.cjs
// v3.2 — adiciona logs de diagnóstico e melhor tratamento de erros
// Nota: extensão .cjs porque package.json tem "type": "module"

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwfTRO1nAX2NUJc9fL2wYDaaxonqyjfbIsWEPLR7mR-b-v9Z839srjhUIQV7AzkUFIILA/exec';

// ==================== MOCK LOCAL ====================
const IS_DEV = process.env.NETLIFY_DEV === 'true';

const MOCK_OTP_STORE = {}; // { email: code }

function mockResponse(params) {
  const { action, email, code, userId, budget, days } = params;

  switch (action) {
    case 'checkPremium':
      return { ok: true, isPremium: false };

    case 'sendOTP': {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      MOCK_OTP_STORE[email] = otp;
      console.log(`\n🔑 [MOCK] OTP para ${email}: ${otp}\n`);
      return { ok: true, sent: true };
    }

    case 'verifyOTP': {
      const expected = MOCK_OTP_STORE[email];
      if (expected && expected === code) {
        delete MOCK_OTP_STORE[email];
        return { ok: true, verified: true };
      }
      return { ok: false, error: 'Código inválido' };
    }

    case 'register':
      return { ok: true, ref: params.ref };

    case 'registerWithPassword':
      return { ok: true, registered: true };

    case 'loginWithPassword':
      return { ok: true, loggedIn: true, name: 'Teste', isPremium: false };

    case 'activateToken':
      return { ok: true, isPremium: true, expiracao: '2099-12-31', plano: 'mensal' };

    case 'adminCheck':
      return { ok: true, totalClientes: 0, ativos: 0, pendentes: 0, expirados: 0, sistema: 'MOCK local' };

    case 'saveUserData':
      return { ok: true, saved: true, record_id: params.record_id, data_type: params.data_type };

    case 'loadUserData':
      return { ok: true, records: [] };

    case 'deleteUserData':
      return { ok: true, deleted: true };

    case 'getMonthlySpent':
      return { ok: true, totalSpent: 0, totalRecovered: 0 };

    case 'getROI':
      return { ok: true, roi: 0, totalSpent: 0, totalRecovered: 0 };

    case 'getTopLosses':
      return { ok: true, losses: [] };

    case 'getHistoricalGaps':
      return { ok: true, gaps: [] };

    case 'getTimeline':
      return { ok: true, data: [] };

    case 'getKazolaScore':
      return { ok: true, score: 0, status: 'N/A', date: null };

    case 'getBehaviorInsights':
      return { ok: true, insights: [] };

    case 'simulatePeriod':
      return { ok: true, totalSpent: 0, totalRecovered: 0, savings: 0, planAdherence: 0, actualSpent: 0, plannedSpent: 0 };

    case 'createPlan':
      return { 
        ok: true, 
        plan: [{ day: 1, bets: 2, amount: 500 }],
        weeklyBudget: 5000,
        dailyBudget: 714,
        totalBets: 10
      };

    case 'logAIQuery':
      return { ok: true, logged: true };

    case 'calculateKazolaScore':
      return { ok: true, score: 75, status: 'CONTROLLED', pillars: { disciplina: 80, planeamento: 70, orcamento: 75, consistencia: 65 } };

    default:
      return { ok: false, error: 'Acção desconhecida: ' + action };
  }
}
// =====================================================

exports.handler = async function (event) {
  const params = event.queryStringParameters || {};

  if (!IS_DEV) {
    return await callRealGAS(params);
  }

  try {
    return await callRealGAS(params);
  } catch (error) {
    console.warn('⚠️ GAS inacessível localmente — usando mock. Erro:', error.message);
    const mockResult = mockResponse(params);
    console.log('📦 [MOCK] Resposta:', JSON.stringify(mockResult));
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Mock': 'true',
      },
      body: JSON.stringify(mockResult),
    };
  }
};

async function callRealGAS(params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${GAS_URL}?${qs}`;

  console.log(`🔍 Chamando GAS: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; KazolaGlow/1.0; +https://kazola-glow.netlify.app)'
      },
      signal: AbortSignal.timeout(12000),
    });

    // ============ LOGS DE DIAGNÓSTICO ============
    console.log(`📡 Status HTTP: ${response.status}`);
    console.log(`📡 URL final: ${response.url}`);
    console.log(`📡 Headers: Content-Type=${response.headers.get('content-type')}`);
    // =============================================

    const text = await response.text();
    
    // Log do início da resposta (para diagnóstico)
    console.log(`📄 Início da resposta: ${text.substring(0, 200)}...`);

    // Tenta parsear JSON
    let json;
    try {
      json = JSON.parse(text);
      console.log('✅ JSON parseado com sucesso');
    } catch (parseError) {
      console.warn('⚠️ Resposta não é JSON válido. Tentando limpar...');

      // Tenta limpar a resposta (remove HTML, procura JSON)
      const cleaned = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
      console.log(`🧹 Texto limpo: ${cleaned.substring(0, 100)}...`);
      
      if (cleaned && (cleaned.startsWith('{') || cleaned.startsWith('['))) {
        try {
          json = JSON.parse(cleaned);
          console.log('✅ JSON parseado após limpeza');
        } catch (secondError) {
          console.error('❌ Falha ao limpar JSON:', secondError.message);
          throw new Error('Resposta do servidor não é JSON válido');
        }
      } else {
        throw new Error('Resposta do servidor não contém JSON');
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(json),
    };

  } catch (error) {
    console.error('❌ Erro ao chamar GAS:', error.message);
    console.error('❌ Stack:', error.stack);

    // Devolve erro como JSON em vez de crash
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        ok: false, 
        error: 'Erro ao comunicar com o servidor: ' + error.message,
        status: 500
      }),
    };
  }
}
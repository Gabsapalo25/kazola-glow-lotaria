// netlify/functions/gas.cjs
// v2.8 — proxy para Google Apps Script
// Nota: extensão .cjs porque package.json tem "type": "module"

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzT_qa_RrCLBxsCnVEXPuAovtAtVdMXfpUTPIYnD6VRuLb5jQ-jkPIx1g-GCGAHBCzm7Q/exec';

// ==================== MOCK LOCAL ====================
// Quando o GAS não é acessível localmente (ENOTFOUND),
// devolve respostas simuladas para testar o fluxo completo.
// Em produção o GAS é sempre contactado — o mock nunca é usado.
const IS_DEV = process.env.NETLIFY_DEV === 'true';

const MOCK_OTP_STORE = {}; // { email: code }

function mockResponse(params) {
  const { action, email, code } = params;

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

    default:
      return { ok: false, error: 'Acção desconhecida: ' + action };
  }
}
// =====================================================

exports.handler = async function (event) {
  const params = event.queryStringParameters || {};

  // Tentar contactar o GAS real primeiro
  if (!IS_DEV) {
    // Em produção: sempre usar o GAS real
    return await callRealGAS(params);
  }

  // Em desenvolvimento: tentar GAS real, fallback para mock se falhar
  try {
    return await callRealGAS(params);
  } catch (error) {
    console.warn('⚠️  GAS inacessível localmente — usando mock. Erro:', error.message);
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

  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const cleaned = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
    json = JSON.parse(cleaned);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(json),
  };
}

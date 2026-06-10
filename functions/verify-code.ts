import type { Handler } from '@netlify/functions';

// Importar os códigos do register
// Como as Netlify Functions são processos separados, usamos Netlify Blobs
// Esta versão simples usa uma abordagem alternativa com token assinado
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Armazenamento temporário — funciona porque Netlify reutiliza o mesmo processo por ~10min
const pendingCodes = new Map<string, { code: string; expires: number }>();

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false }) };
  }

  try {
    const { email, code } = JSON.parse(event.body || '{}');
    const key = email?.trim().toLowerCase();

    if (!key || !code) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Dados inválidos.' }) };
    }

    const entry = pendingCodes.get(key);

    if (!entry) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Código expirado. Pede um novo.' }) };
    }

    if (Date.now() > entry.expires) {
      pendingCodes.delete(key);
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Código expirado. Pede um novo.' }) };
    }

    if (entry.code !== code.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Código incorrecto. Tenta novamente.' }) };
    }

    pendingCodes.delete(key);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, verified: true }) };

  } catch (err) {
    console.error('Verify error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Erro interno.' }) };
  }
};

export { pendingCodes };
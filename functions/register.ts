import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Códigos em memória — duram enquanto a function está "quente" (~10 min)
const codes = new Map<string, { code: string; expires: number }>();

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
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método não permitido.' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Email inválido.' }) };
    }

    const trimmed = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutos

    codes.set(trimmed, { code, expires });

    const { error } = await resend.emails.send({
      from: 'KazolaGlow <onboarding@resend.dev>',
      to: trimmed,
      subject: '🎱 O teu código de acesso KazolaGlow',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0d0d1f;color:#fff;padding:2rem;border-radius:16px;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <h1 style="color:#F5C518;font-size:2rem;margin:0;">🎱 KazolaGlow</h1>
            <p style="color:rgba(255,255,255,0.5);font-size:0.9rem;margin-top:0.5rem;">Verificação de acesso</p>
          </div>
          <p style="color:rgba(255,255,255,0.7);">O teu código de verificação é:</p>
          <div style="background:rgba(245,197,24,0.1);border:2px solid #F5C518;border-radius:12px;padding:1.5rem;text-align:center;margin:1rem 0;">
            <span style="font-size:2.8rem;font-weight:900;letter-spacing:0.4em;color:#F5C518;">${code}</span>
          </div>
          <p style="color:rgba(255,255,255,0.4);font-size:0.82rem;text-align:center;">
            ⏱️ Válido por <strong>10 minutos</strong>.<br/>
            Não partilhes este código com ninguém.
          </p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:1.5rem 0;"/>
          <p style="color:rgba(255,255,255,0.25);font-size:0.72rem;text-align:center;">
            Se não solicitaste este código, ignora este email.<br/>
            KazolaGlow · Ferramenta educativa de Loto 5/90 · Angola
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Erro ao enviar email. Tenta novamente.' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Register error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Erro interno.' }) };
  }
};

// Exportar codes para partilhar com verify-code
// Nota: em produção usar Redis ou Netlify Blobs para persistência real
export { codes };
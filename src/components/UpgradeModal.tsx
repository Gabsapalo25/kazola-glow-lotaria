/**
 * UpgradeModal.tsx — Modal de upgrade Premium
 * Em produção: integrar com Stripe / M-Pesa / referência bancária
 */
import { useState } from 'react';
import { activatePremium, type UserSession } from '../lib/session';

interface Props {
  session   : UserSession;
  onUpgraded: (s: UserSession) => void;
  onClose   : () => void;
}

const PLANS = [
  {
    id    : 'monthly',
    label : 'Mensal',
    price : '2.500 Kz',
    period: '/mês',
    tag   : null,
    perks : ['Gerações ilimitadas/dia', 'Todos os métodos desbloqueados', 'Histórico completo', 'Suporte prioritário'],
  },
  {
    id    : 'annual',
    label : 'Anual',
    price : '20.000 Kz',
    period: '/ano',
    tag   : 'POUPAS 33%',
    perks : ['Tudo do plano mensal', 'Análise avançada de tendências', 'Exportar combinações PDF', 'Acesso antecipado a novas funcionalidades'],
  },
];

export default function UpgradeModal({ session, onUpgraded, onClose }: Props) {
  const [selected, setSelected]   = useState<'monthly' | 'annual'>('monthly');
  const [step, setStep]           = useState<'plans' | 'payment' | 'done'>('plans');
  const [ref, setRef]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function handlePayment() {
    if (!ref.trim()) { setError('Insere a referência de pagamento.'); return; }
    setLoading(true); setError('');

    // Em produção: validar referência via API/backend
    await new Promise(r => setTimeout(r, 1200));

    // Activar Premium localmente (em produção: só após confirmação do backend)
    const upgraded = activatePremium(session);
    setLoading(false);
    setStep('done');
    setTimeout(() => onUpgraded(upgraded), 1800);
  }

  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(0,0,0,0.92)',
      backdropFilter:'blur(12px)',
      zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'1rem',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Russo+One&display=swap');
        .upg-card {
          background: linear-gradient(145deg,#0d0d1f,#121225);
          border: 1px solid rgba(245,197,24,0.22);
          border-radius: 22px;
          padding: 2.5rem 2rem;
          width: 100%; max-width: 520px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.75);
          font-family: 'Barlow Condensed', sans-serif;
          color: #fff;
          animation: gateIn 0.3s cubic-bezier(0.16,1,0.3,1);
          max-height: 90vh; overflow-y: auto;
        }
        @keyframes gateIn {
          from { opacity:0; transform:translateY(20px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .plan-card {
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 1.2rem;
          cursor: pointer; transition: all 0.2s;
          margin-bottom: 0.75rem;
        }
        .plan-card.active {
          border-color: #F5C518;
          background: rgba(245,197,24,0.07);
        }
        .plan-card:hover { border-color: rgba(245,197,24,0.5); }
        .upg-input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1.5px solid rgba(255,255,255,0.14);
          border-radius: 10px; color: #fff;
          padding: 0.8rem 1rem;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 1.05rem; outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box; margin-top: 0.5rem;
        }
        .upg-input:focus { border-color: #F5C518; }
        .upg-btn {
          width: 100%;
          background: linear-gradient(135deg,#F5C518,#d4a800);
          color: #000; border: none; border-radius: 10px;
          padding: 0.95rem;
          font-family: 'Russo One', sans-serif;
          font-size: 1rem; cursor: pointer;
          letter-spacing: 0.08em;
          transition: all 0.2s; margin-top: 1rem;
        }
        .upg-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .upg-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(245,197,24,0.3); }
        .upg-btn-ghost {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.5);
          border-radius: 10px; padding: 0.7rem;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 0.95rem; cursor: pointer;
          transition: all 0.2s; margin-top: 0.5rem;
        }
        .upg-btn-ghost:hover { border-color: rgba(255,255,255,0.35); color: rgba(255,255,255,0.8); }
      `}</style>

      <div className="upg-card">

        {/* Fechar */}
        <button onClick={onClose} style={{
          position:'absolute' as const, top:'1.2rem', right:'1.2rem',
          background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%',
          width:32, height:32, color:'rgba(255,255,255,0.5)',
          cursor:'pointer', fontSize:'1.1rem',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>×</button>

        {/* ── STEP: Planos ────────────────────────────────────────── */}
        {step === 'plans' && (
          <>
            <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>🏆</div>
              <h2 style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.7rem', margin:0 }}>UPGRADE PREMIUM</h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem', marginTop:'0.3rem' }}>
                Gerações ilimitadas · Todos os métodos · Sem restrições diárias
              </p>
            </div>

            {PLANS.map(plan => (
              <div key={plan.id}
                className={`plan-card ${selected === plan.id ? 'active' : ''}`}
                onClick={() => setSelected(plan.id as 'monthly' | 'annual')}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <span style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.1rem' }}>{plan.label}</span>
                      {plan.tag && (
                        <span style={{
                          background:'#F5C518', color:'#000',
                          borderRadius:4, padding:'1px 6px',
                          fontSize:'0.65rem', fontWeight:900, letterSpacing:'0.08em',
                        }}>{plan.tag}</span>
                      )}
                    </div>
                    <ul style={{ margin:'0.5rem 0 0', paddingLeft:'1rem', color:'rgba(255,255,255,0.5)', fontSize:'0.8rem' }}>
                      {plan.perks.map(p => <li key={p}>{p}</li>)}
                    </ul>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, paddingLeft:'1rem' }}>
                    <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.5rem', color:'#F5C518' }}>
                      {plan.price}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)' }}>{plan.period}</div>
                  </div>
                </div>
              </div>
            ))}

            <button className="upg-btn" onClick={() => setStep('payment')}>
              💳 CONTINUAR PARA PAGAMENTO
            </button>
            <button className="upg-btn-ghost" onClick={onClose}>Mais tarde</button>
          </>
        )}

        {/* ── STEP: Pagamento ─────────────────────────────────────── */}
        {step === 'payment' && (
          <>
            <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>💳</div>
              <h2 style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.6rem', margin:0 }}>PAGAMENTO</h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem', marginTop:'0.3rem' }}>
                Plano {selected === 'monthly' ? 'Mensal — 2.500 Kz' : 'Anual — 20.000 Kz'}
              </p>
            </div>

            {/* Instrucções de pagamento — personalizar com dados reais */}
            <div style={{
              background:'rgba(245,197,24,0.07)',
              border:'1px solid rgba(245,197,24,0.2)',
              borderRadius:12, padding:'1.1rem', marginBottom:'1.2rem',
              fontSize:'0.85rem', lineHeight:1.6,
            }}>
              <p style={{ margin:'0 0 0.5rem', fontWeight:700, color:'#F5C518' }}>📱 Pagamento via M-Pesa / Transferência</p>
              <p style={{ margin:'0 0 0.25rem', color:'rgba(255,255,255,0.6)' }}>
                <strong style={{color:'#fff'}}>Número:</strong> +244 9XX XXX XXX
              </p>
              <p style={{ margin:'0 0 0.25rem', color:'rgba(255,255,255,0.6)' }}>
                <strong style={{color:'#fff'}}>IBAN:</strong> AO06.0040.0000.XXXX.XXXX.1X1
              </p>
              <p style={{ margin:'0 0 0.25rem', color:'rgba(255,255,255,0.6)' }}>
                <strong style={{color:'#fff'}}>Referência:</strong> {session.email.split('@')[0].toUpperCase()}-PREMIUM
              </p>
              <p style={{ margin:'0.5rem 0 0', color:'rgba(255,255,255,0.4)', fontSize:'0.78rem' }}>
                ⚠ Após pagamento, insere a referência/comprovativo abaixo. A activação é manual em até 24h.
              </p>
            </div>

            <div>
              <label style={{ fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.5)' }}>
                REFERÊNCIA / COMPROVATIVO DE PAGAMENTO
              </label>
              <input
                className="upg-input"
                type="text"
                placeholder="ex: MP2026XXXXXX ou IBAN REF"
                value={ref}
                onChange={e => setRef(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePayment()}
              />
              {error && (
                <div style={{
                  marginTop:'0.6rem', background:'rgba(198,40,40,0.18)',
                  border:'1px solid rgba(198,40,40,0.35)',
                  borderRadius:8, padding:'0.5rem 0.8rem',
                  fontSize:'0.82rem', color:'#ef9a9a',
                }}>⚠ {error}</div>
              )}
            </div>

            <button className="upg-btn" onClick={handlePayment} disabled={loading}>
              {loading ? '⏳ A VERIFICAR...' : '✅ CONFIRMAR PAGAMENTO'}
            </button>
            <button className="upg-btn-ghost" onClick={() => setStep('plans')}>← Voltar aos planos</button>
          </>
        )}

        {/* ── STEP: Concluído ─────────────────────────────────────── */}
        {step === 'done' && (
          <div style={{ textAlign:'center', padding:'2rem 0' }}>
            <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>🎉</div>
            <h2 style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.8rem', color:'#F5C518', margin:'0 0 0.5rem' }}>
              PREMIUM ACTIVADO!
            </h2>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.95rem' }}>
              Bem-vindo ao Premium, {session.email.split('@')[0]}!<br/>
              Gerações ilimitadas desbloqueadas. 🏆
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
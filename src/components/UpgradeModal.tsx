/**
 * UpgradeModal.tsx — Modal de upgrade Premium com sistema de pagamentos
 * Ecrã 1: Escolha de plano (Mensal / Anual)
 * Ecrã 2: Dados bancários + formulário de registo
 * Ecrã 3: Aguardar activação com token
 */
import { useState } from 'react';
import { type UserSession, activatePremiumFromServer } from '../lib/session';
import { registerClient } from '../lib/apiClient';
import TokenActivation from './TokenActivation';

interface Props {
  session   : UserSession;
  onUpgraded: (s: UserSession) => void;
  onClose   : () => void;
}

type Step = 1 | 2 | 3;

const gerarReferencia = (): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KAZOLA-${num}`;
};

export default function UpgradeModal({ session, onUpgraded, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [planoSeleccionado, setPlanoSeleccionado] = useState<'mensal' | 'anual' | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(session.email);
  const [referencia, setReferencia] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTokenActivation, setShowTokenActivation] = useState(false);

  const valor = planoSeleccionado === 'anual' ? '20.000 Kz' : '2.500 Kz';

  const handlePlanoSelect = (plano: 'mensal' | 'anual') => {
    setPlanoSeleccionado(plano);
    setStep(2);
  };

  const handleRegistoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      setError('Por favor, insere o teu nome completo');
      return;
    }
    
    if (email !== session.email) {
      setError('O email deve corresponder ao email da tua sessão');
      return;
    }
    
    if (!planoSeleccionado) {
      setError('Selecciona um plano primeiro');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const ref = gerarReferencia();
    
    try {
      const result = await registerClient({
        ref,
        name: nome,
        email,
        plano: planoSeleccionado,
      });
      
      if (result.ok) {
        setReferencia(ref);
        setStep(3);
      } else {
        setError(result.error || 'Erro ao registar pagamento. Tenta novamente.');
      }
    } catch (err) {
      setError('Erro de conexão. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTokenActivation = () => {
    setShowTokenActivation(true);
  };

  const handleTokenActivated = (updatedSession: UserSession) => {
    onUpgraded(updatedSession);
    setShowTokenActivation(false);
    onClose();
  };

  return (
    <>
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
          <button onClick={onClose} style={{
            position:'absolute' as const, top:'1.2rem', right:'1.2rem',
            background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'50%',
            width:32, height:32, color:'rgba(255,255,255,0.5)',
            cursor:'pointer', fontSize:'1.1rem',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>×</button>

          {/* ── STEP 1: Escolha de Plano ────────────────────────────── */}
          {step === 1 && (
            <>
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>🏆</div>
                <h2 style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.7rem', margin:0 }}>ESCOLHE O TEU PLANO</h2>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem', marginTop:'0.3rem' }}>
                  Acesso total a todas as funcionalidades premium
                </p>
              </div>

              {/* Plano Mensal */}
              <div className="plan-card" onClick={() => handlePlanoSelect('mensal')}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.1rem' }}>📱 Mensal</div>
                    <ul style={{ margin:'0.5rem 0 0', paddingLeft:'1rem', color:'rgba(255,255,255,0.5)', fontSize:'0.8rem' }}>
                      <li>Acesso total por 30 dias</li>
                      <li>Gerações ilimitadas</li>
                      <li>Todos os métodos desbloqueados</li>
                    </ul>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, paddingLeft:'1rem' }}>
                    <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.5rem', color:'#F5C518' }}>2.500 Kz</div>
                    <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)' }}>/mês</div>
                  </div>
                </div>
              </div>

              {/* Plano Anual */}
              <div className="plan-card" onClick={() => handlePlanoSelect('anual')}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <span style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.1rem' }}>🌟 Anual</span>
                      <span style={{
                        background:'#F5C518', color:'#000',
                        borderRadius:4, padding:'1px 6px',
                        fontSize:'0.65rem', fontWeight:900, letterSpacing:'0.08em',
                      }}>POUPAS 10.000 Kz</span>
                    </div>
                    <ul style={{ margin:'0.5rem 0 0', paddingLeft:'1rem', color:'rgba(255,255,255,0.5)', fontSize:'0.8rem' }}>
                      <li>Acesso total por 365 dias</li>
                      <li>Equivale a 1.667 Kz/mês</li>
                      <li>Todas as vantagens premium</li>
                    </ul>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, paddingLeft:'1rem' }}>
                    <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.5rem', color:'#F5C518' }}>20.000 Kz</div>
                    <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)' }}>/ano</div>
                  </div>
                </div>
              </div>

              <button className="upg-btn-ghost" onClick={onClose}>Mais tarde</button>
            </>
          )}

          {/* ── STEP 2: Dados Bancários + Formulário ────────────────── */}
          {step === 2 && (
            <>
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>🏦</div>
                <h2 style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.6rem', margin:0 }}>INSTRUÇÕES DE PAGAMENTO</h2>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.88rem', marginTop:'0.3rem' }}>
                  Plano {planoSeleccionado === 'anual' ? 'Anual — 20.000 Kz' : 'Mensal — 2.500 Kz'}
                </p>
              </div>

              {/* ── BLOCO DE PAGAMENTO ── */}
              <div style={{
                background:'rgba(245,197,24,0.07)',
                border:'1px solid rgba(245,197,24,0.2)',
                borderRadius:12, padding:'1.1rem', marginBottom:'1.2rem',
                fontSize:'0.85rem', lineHeight:1.6,
              }}>
                <p style={{ margin:'0 0 0.75rem', fontWeight:700, color:'#F5C518' }}>📋 DADOS BANCÁRIOS</p>
                <p style={{ margin:'0 0 0.25rem', color:'rgba(255,255,255,0.6)' }}>
                  <strong style={{color:'#fff'}}>Banco:</strong> BAI
                </p>
                <p style={{ margin:'0 0 0.25rem', color:'rgba(255,255,255,0.6)' }}>
                  <strong style={{color:'#fff'}}>Titular:</strong> Gabriel António Armando Sapalo
                </p>
                <p style={{ margin:'0 0 0.25rem', color:'rgba(255,255,255,0.6)' }}>
                  <strong style={{color:'#fff'}}>IBAN:</strong> <span style={{fontSize:'0.75rem'}}>AO06 0040 0000 1859 5631 1019 4</span>
                </p>
                <p style={{ margin:'0.5rem 0 0.75rem', color:'rgba(255,255,255,0.4)', fontSize:'0.78rem' }}>
                  💰 <strong>Valor a pagar:</strong> {valor}
                </p>

                {/* ── SEPARADOR ── */}
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', margin:'0.75rem 0' }} />

                {/* ── MCX EXPRESS ── */}
                <div style={{
                  display:'flex', alignItems:'center', gap:'10px',
                  background:'rgba(255,140,0,0.1)',
                  border:'1px solid rgba(255,140,0,0.35)',
                  borderRadius:10, padding:'0.75rem',
                }}>
                  <img
                    src="/mcx-express.png"
                    alt="Multicaixa Express"
                    style={{ width:42, height:42, borderRadius:9, flexShrink:0, objectFit:'cover' }}
                  />
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ color:'#FF8C00', fontWeight:700, fontSize:'0.88rem' }}>Multicaixa Express</span>
                      <span style={{
                        background:'#FF8C00', color:'#000',
                        fontSize:'0.6rem', fontWeight:900,
                        padding:'1px 6px', borderRadius:20, letterSpacing:'0.06em',
                      }}>RECOMENDADO</span>
                    </div>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.8rem' }}>
                      🔢 Número: <strong>923 379 486</strong>
                    </div>
                    <div style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.73rem', marginTop:2 }}>
                      ✅ Pagamento imediato · sem esperas bancárias
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRegistoSubmit}>
                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.5)' }}>
                    NOME COMPLETO
                  </label>
                  <input
                    className="upg-input"
                    type="text"
                    placeholder="Ex: João Manuel Silva"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom:'1rem' }}>
                  <label style={{ fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.5)' }}>
                    EMAIL
                  </label>
                  <input
                    className="upg-input"
                    type="email"
                    placeholder="o.teu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <p style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.35)', marginTop:'0.25rem' }}>
                    Deve corresponder ao email da tua conta
                  </p>
                </div>

                {error && (
                  <div style={{
                    marginTop:'0.6rem', background:'rgba(198,40,40,0.18)',
                    border:'1px solid rgba(198,40,40,0.35)',
                    borderRadius:8, padding:'0.5rem 0.8rem',
                    fontSize:'0.82rem', color:'#ef9a9a',
                  }}>⚠ {error}</div>
                )}

                <button className="upg-btn" type="submit" disabled={loading}>
                  {loading ? '⏳ A REGISTAR...' : '💳 CONTINUAR PARA PAGAMENTO'}
                </button>
              </form>

              {/* ── RODAPÉ DE INSTRUÇÃO ── */}
              <div style={{
                marginTop:'1rem',
                background:'rgba(245,197,24,0.05)',
                border:'1px solid rgba(245,197,24,0.15)',
                borderRadius:10, padding:'0.8rem',
                fontSize:'0.75rem', color:'rgba(255,255,255,0.5)',
              }}>
                📧 Após pagamento, envia o comprovativo para <strong style={{color:'#F5C518'}}>glowscalepro@gmail.com</strong><br/>
                com o assunto igual à referência gerada.<br/>
                <span style={{color:'rgba(255,140,0,0.85)'}}>
                  ⚡ O envio por email garante activação automática em menos de 5 minutos.
                </span><br/>
                💬 WhatsApp: +244 923 379 486 (activação manual — pode demorar mais)
              </div>

              <button className="upg-btn-ghost" onClick={() => setStep(1)}>← Voltar aos planos</button>
            </>
          )}

          {/* ── STEP 3: Aguardar Activação ──────────────────────────── */}
          {step === 3 && (
            <>
              <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:'0.4rem' }}>📧</div>
                <h2 style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.6rem', margin:0 }}>PAGAMENTO REGISTADO!</h2>
              </div>

              <div style={{
                background:'rgba(245,197,24,0.1)',
                border:'1px solid rgba(245,197,24,0.3)',
                borderRadius:12, padding:'1rem', marginBottom:'1.2rem',
                textAlign:'center',
              }}>
                <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginBottom:'0.25rem' }}>Tua referência</p>
                <p style={{ fontFamily:"'Russo One',sans-serif", fontSize:'1.4rem', color:'#F5C518', letterSpacing:'0.05em' }}>
                  {referencia}
                </p>
              </div>

              <p style={{ textAlign:'center', color:'rgba(255,255,255,0.6)', fontSize:'0.85rem', marginBottom:'1rem' }}>
                O teu pagamento está a ser verificado.<br/>
                Após confirmação receberás um email com o teu token de activação.
              </p>

              <button className="upg-btn" onClick={handleOpenTokenActivation}>
                🔑 JÁ TENHO O MEU TOKEN
              </button>
              <button className="upg-btn-ghost" onClick={onClose}>
                FECHAR
              </button>
            </>
          )}
        </div>
      </div>

      {/* TokenActivation Modal */}
      {showTokenActivation && (
        <TokenActivation
          session={session}
          onUpgraded={handleTokenActivated}
          onClose={() => setShowTokenActivation(false)}
        />
      )}
    </>
  );
}
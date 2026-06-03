/**
 * PremiumBanner.tsx
 * Barra de estado da sessão + botão de upgrade para Premium
 */
import { trialDaysLeft, type UserSession } from '../lib/session';

interface Props {
  session      : UserSession | null;
  onUpgrade    : () => void;
  onLogout     : () => void;
  gensUsedToday: number;
  gensLimitDay : number;
}

export default function PremiumBanner({ session, onUpgrade, onLogout, gensUsedToday, gensLimitDay }: Props) {
  // 🔴 VERIFICAÇÃO CRÍTICA: se não houver sessão, NÃO RENDERIZA NADA
  if (!session) {
    return null;
  }

  const daysLeft = trialDaysLeft(session);
  const usedAll  = !session.isPremium && gensUsedToday >= gensLimitDay;

  if (session.isPremium) {
    return (
      <div style={{
        background: 'linear-gradient(90deg,#1a2f00,#0d1f00)',
        borderBottom: '1px solid rgba(76,175,80,0.3)',
      }}>
        <div style={{
          maxWidth: 1152, margin: '0 auto', padding: '0.4rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.8rem', color: '#a5d6a7', flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <span>🏆 <strong style={{color:'#69f0ae'}}>Premium</strong> · {session.email} · Gerações ilimitadas</span>
          <button onClick={onLogout} style={{
            background:'none', border:'1px solid rgba(105,240,174,0.3)',
            borderRadius:6, color:'rgba(165,214,167,0.6)',
            padding:'2px 10px', cursor:'pointer', fontSize:'0.75rem',
          }}>Terminar sessão</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: usedAll
        ? 'linear-gradient(90deg,#1a0000,#2d0000)'
        : 'linear-gradient(90deg,#0d0d20,#121230)',
      borderBottom: `1px solid ${usedAll ? 'rgba(198,40,40,0.35)' : 'rgba(245,197,24,0.2)'}`,
    }}>
      <div style={{
        maxWidth: 1152, margin: '0 auto', padding: '0.45rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.5rem',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
          <span style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.55)' }}>
            👤 <strong style={{color:'#F5C518'}}>{session.email}</strong>
          </span>
          <span style={{
            fontSize:'0.78rem',
            color: daysLeft <= 2 ? '#ef9a9a' : 'rgba(255,255,255,0.4)',
          }}>
            ⏰ Trial: <strong>{daysLeft}d restantes</strong>
          </span>
          <span style={{
            fontSize:'0.78rem',
            color: usedAll ? '#ef9a9a' : 'rgba(255,255,255,0.4)',
          }}>
            🎯 Hoje: <strong>{gensUsedToday}/{gensLimitDay}</strong> {usedAll ? '(limite atingido)' : ''}
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <button onClick={onUpgrade} style={{
            background: 'linear-gradient(135deg,#F5C518,#d4a800)',
            color: '#000', border: 'none', borderRadius: 8,
            padding: '0.3rem 0.85rem',
            fontFamily: "'Russo One', sans-serif",
            fontSize: '0.75rem', cursor: 'pointer',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
          }}
            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'none')}
          >
            🚀 UPGRADE PREMIUM
          </button>
          <button onClick={onLogout} style={{
            background:'none', border:'1px solid rgba(255,255,255,0.15)',
            borderRadius:6, color:'rgba(255,255,255,0.35)',
            padding:'3px 10px', cursor:'pointer', fontSize:'0.72rem',
          }}>Sair</button>
        </div>
      </div>
    </div>
  );
}
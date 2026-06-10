{/* ═══════════════════════════════════════════════════════════
    HEADER PREMIUM — KazolaGlow (VERSÃO CORRIGIDA)
    ═══════════════════════════════════════════════════════════ */}

{/* ── BARRA SUPERIOR FINA ── */}
<div style={{
  background: '#060911',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  padding: '5px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '12px',
  color: '#6B7280',
  flexWrap: 'wrap',
  gap: '8px',
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E5E7EB', fontWeight: 700 }}>
      🇦🇴 {APP_NAME}
    </span>
    <span style={{ color: '#374151' }}>·</span>
    <span>Ferramenta educativa · 18+</span>
    {!isOnline && <span style={{ color: '#F59E0B', fontWeight: 600 }}>📶 Offline</span>}
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
    {session ? (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF4500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#fff',
          }}>
            {session.email.charAt(0).toUpperCase()}
          </div>
          <span style={{ color: '#D1D5DB', fontSize: '12px' }}>{session.email}</span>
          {session.isPremium || premium.isActive ? (
            <span style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#0B0F19', borderRadius: '20px', padding: '1px 8px', fontSize: '10px', fontWeight: 800 }}>
              ⭐ PREMIUM
            </span>
          ) : (
            <span style={{ color: '#F59E0B', fontSize: '11px' }}>Trial: {daysLeft}d</span>
          )}
        </div>
        {!session.isPremium && !premium.isActive && (
          <button onClick={() => setShowTokenActivation(true)} style={{ fontSize: '11px', color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer' }}>🔑 Token</button>
        )}
        <button onClick={handleLogout} style={{ fontSize: '11px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
      </>
    ) : (
      <button onClick={() => setShowGate(true)} style={{ background: 'linear-gradient(135deg,#00F5A0,#00C896)', color: '#0B0F19', padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
        REGISTAR GRÁTIS
      </button>
    )}

    <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#9CA3AF' }}>
      {darkMode ? '☀️' : '🌙'}
    </button>

    <select value={fontSize} onChange={e => setFontSize(e.target.value as FontSize)} style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}>
      <option value="normal">A</option>
      <option value="large">A+</option>
      <option value="xlarge">A++</option>
    </select>

    <button onClick={() => setHighContrast(v => !v)} style={{ background: highContrast ? 'rgba(255,255,255,0.15)' : 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: '#9CA3AF', padding: '2px 8px' }}>
      {highContrast ? 'Contraste ON' : 'Contraste'}
    </button>
  </div>
</div>

{/* ── HEADER PRINCIPAL COM overflow: visible ── */}
<header style={{ 
  background: 'rgba(11, 15, 25, 0.92)', 
  backdropFilter: 'blur(16px)', 
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
  position: 'sticky', 
  top: 0, 
  zIndex: 30, 
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  overflow: 'visible',  // ← CRUCIAL: permite o dropdown aparecer
}}>
  <div style={{
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '10px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }}>

    {/* LOGO */}
    <div 
      onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flexShrink: 0 }}
    >
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #FFD700' }}>
        <img src={logoImg} alt={APP_NAME} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div>
        <div style={{ fontWeight: 900, fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', backgroundImage: 'linear-gradient(135deg, #FFD700, #FFA500, #FF4500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {APP_NAME}
        </div>
        <div style={{ fontSize: '10.5px', color: '#4B5563' }}>{APP_SLOGAN}</div>
      </div>
    </div>

    {/* NAVEGAÇÃO DESKTOP - SEMPRE VISÍVEL EM DESKTOP */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {[
        { label: 'Gerador', icon: '🎲', id: 'gerador' },
        { label: 'Estatísticas', icon: '📊', id: 'estatisticas' },
        { label: 'Histórico', icon: '📜', id: 'historico' },
        { label: 'Aprender', icon: '📖', id: 'aprender' },
      ].map(item => (
        <button
          key={item.label}
          onClick={() => {
            setTab('loto');
            setMobileMenuOpen(false);
            const element = document.getElementById(item.id);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          style={{
            padding: '7px 13px',
            borderRadius: '10px',
            background: 'transparent',
            color: '#9CA3AF',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.15)'; e.currentTarget.style.color = '#FFD700'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}

      <button
        onClick={() => { setTab('totobola'); setMobileMenuOpen(false); }}
        style={{ padding: '7px 13px', borderRadius: '10px', background: 'transparent', color: '#9CA3AF', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.15)'; e.currentTarget.style.color = '#FFD700'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
      >
        ⚽ Totobola
        <span style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', borderRadius: '20px', padding: '1px 6px', fontSize: '9px', fontWeight: 800 }}>BREVE</span>
      </button>
    </div>

    {/* BOTÕES DIREITA */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button 
        onClick={() => setShowResponsible(true)} 
        style={{ 
          padding: '8px 14px', 
          borderRadius: '10px', 
          background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,69,0,0.1))',
          border: '1px solid rgba(255,215,0,0.3)', 
          color: '#FFD700', 
          fontWeight: 700, 
          fontSize: '12.5px', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px' 
        }}
      >
        🛡️ Jogo responsável
      </button>

      <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />

      {/* Botão Hambúrguer - SEM className="md:hidden" */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          padding: '8px',
          borderRadius: '10px',
          background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.3)',
          cursor: 'pointer',
          color: '#FFD700',
          display: 'block',
        }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileMenuOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          }
        </svg>
      </button>
    </div>
  </div>

  {/* MENU MOBILE DROPDOWN - SEM className="md:hidden" */}
  {mobileMenuOpen && (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ 
        background: 'rgba(11,15,25,0.98)', 
        backdropFilter: 'blur(20px)', 
        borderTop: '1px solid rgba(255,255,255,0.08)', 
        padding: '12px 16px',
        position: 'relative',
        zIndex: 9999,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => {
            setTab('loto');
            setMobileMenuOpen(false);
            setTimeout(() => {
              const element = document.getElementById('gerador');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
          style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700', textAlign: 'left', fontWeight: 600, fontSize: '16px', cursor: 'pointer', width: '100%' }}
        >
          🎲 Gerador
        </button>
        <button
          onClick={() => {
            setTab('loto');
            setMobileMenuOpen(false);
            setTimeout(() => {
              const element = document.getElementById('estatisticas');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
          style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700', textAlign: 'left', fontWeight: 600, fontSize: '16px', cursor: 'pointer', width: '100%' }}
        >
          📊 Estatísticas
        </button>
        <button
          onClick={() => {
            setTab('loto');
            setMobileMenuOpen(false);
            setTimeout(() => {
              const element = document.getElementById('historico');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
          style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700', textAlign: 'left', fontWeight: 600, fontSize: '16px', cursor: 'pointer', width: '100%' }}
        >
          📜 Histórico
        </button>
        <button
          onClick={() => {
            setTab('loto');
            setMobileMenuOpen(false);
            setTimeout(() => {
              const element = document.getElementById('aprender');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }}
          style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700', textAlign: 'left', fontWeight: 600, fontSize: '16px', cursor: 'pointer', width: '100%' }}
        >
          📖 Aprender
        </button>
        <button
          onClick={() => { setTab('totobola'); setMobileMenuOpen(false); }}
          style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700', textAlign: 'left', fontWeight: 600, fontSize: '16px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ⚽ Totobola
          <span style={{ background: 'rgba(255,215,0,0.2)', color: '#FFD700', borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 800 }}>EM BREVE</span>
        </button>
        <button
          onClick={() => { setShowResponsible(true); setMobileMenuOpen(false); }}
          style={{ padding: '12px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,69,0,0.15))', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700', textAlign: 'left', fontWeight: 700, fontSize: '16px', cursor: 'pointer', width: '100%', marginTop: '4px' }}
        >
          🛡️ Jogo responsável
        </button>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,215,0,0.2)' }}>
          <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
        </div>
      </div>
    </motion.div>
  )}
</header>

{/* WIN RATE BAR */}
{performance.total > 0 && (
  <div style={{
    borderTop: '1px solid rgba(255,215,0,0.2)',
    background: 'linear-gradient(90deg, rgba(255,215,0,0.03), rgba(255,69,0,0.03))',
    padding: '6px 24px',
  }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#6B7280' }}>🎯 Win Rate:</span>
        <span style={{ fontSize: '15px', fontWeight: 900, color: '#FFD700' }}>{performance.winRate}%</span>
        <span style={{ color: '#374151' }}>({performance.hits2Plus}/{performance.total} acertos ≥2)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#6B7280' }}>💰 Total ganho:</span>
        <span style={{ fontSize: '15px', fontWeight: 900, color: '#FFA500' }}>{fmtKz(performance.totalWin)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#6B7280' }}>📊 Linhas jogadas:</span>
        <span style={{ fontSize: '15px', fontWeight: 900, color: '#FF4500' }}>{performance.linesPlayed}</span>
      </div>
    </div>
  </div>
)}
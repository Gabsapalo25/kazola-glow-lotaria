{/* ═══════════════════════════════════════════════════════════
    HEADER PREMIUM — KazolaGlow
    Substitui o bloco <header> completo no App.tsx
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
}}>
  {/* Esquerda — marca + país */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#E5E7EB', fontWeight: 700 }}>
      🇦🇴 {APP_NAME}
    </span>
    <span style={{ color: '#374151' }}>·</span>
    <span>Ferramenta educativa · 18+</span>
    {!isOnline && (
      <span style={{ color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
        📶 Offline
      </span>
    )}
  </div>

  {/* Direita — sessão + controlos */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {session ? (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00F5A0', display: 'inline-block', flexShrink: 0 }}
          />
          <span style={{ color: '#D1D5DB', fontSize: '12px' }}>{session.email}</span>
          {session.isPremium || premium.isActive ? (
            <span style={{ background: 'rgba(0,245,160,0.12)', color: '#00F5A0', border: '1px solid rgba(0,245,160,0.3)', borderRadius: '20px', padding: '1px 8px', fontSize: '10px', fontWeight: 800 }}>
              PREMIUM ✓
            </span>
          ) : (
            <span style={{ color: '#F59E0B', fontSize: '11px' }}>
              Trial: {daysLeft}d
            </span>
          )}
        </div>
        {!session.isPremium && !premium.isActive && (
          <button
            onClick={() => setShowTokenActivation(true)}
            style={{ fontSize: '11px', color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            🔑 Token
          </button>
        )}
        <span style={{ color: '#374151' }}>|</span>
        <button
          onClick={handleLogout}
          style={{ fontSize: '11px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = '#E5E7EB'}
          onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
        >
          Sair
        </button>
      </>
    ) : (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowGate(true)}
        style={{ background: 'linear-gradient(135deg,#00F5A0,#00C896)', color: '#0B0F19', padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
      >
        REGISTAR GRÁTIS
      </motion.button>
    )}

    <span style={{ color: '#374151' }}>|</span>

    {/* Modo escuro */}
    <button
      onClick={() => setDarkMode(!darkMode)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', borderRadius: '6px', color: '#9CA3AF' }}
      title="Alternar modo escuro"
    >
      {darkMode ? '☀️' : '🌙'}
    </button>

    {/* Tamanho de letra */}
    <select
      value={fontSize}
      onChange={e => setFontSize(e.target.value as FontSize)}
      style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
    >
      <option value="normal">A</option>
      <option value="large">A+</option>
      <option value="xlarge">A++</option>
    </select>

    {/* Alto contraste */}
    <button
      onClick={() => setHighContrast(v => !v)}
      style={{ background: highContrast ? 'rgba(255,255,255,0.15)' : 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: '#9CA3AF', padding: '2px 8px' }}
    >
      {highContrast ? 'Contraste ON' : 'Contraste'}
    </button>
  </div>
</div>

{/* ── HEADER PRINCIPAL ── */}
<header style={{
  background: 'rgba(11,15,25,0.96)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  position: 'sticky',
  top: 0,
  zIndex: 30,
  boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
}}>
  <div style={{
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '10px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    justifyContent: 'space-between',
  }}>

    {/* ── LOGO ── */}
    <a href="#inicio" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
      <motion.div
        whileHover={{ scale: 1.05, rotate: 2 }}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid rgba(0,245,160,0.25)',
          boxShadow: '0 0 20px rgba(0,245,160,0.12), 0 4px 12px rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      >
        <img src={logoImg} alt={APP_NAME} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </motion.div>
      <div>
        <div style={{
          fontWeight: 900,
          fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
          backgroundImage: 'linear-gradient(135deg, #ffffff 30%, #00F5A0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}>
          {APP_NAME}
        </div>
        <div style={{ fontSize: '10.5px', color: '#4B5563', marginTop: '2px', fontWeight: 500 }}>
          {APP_SLOGAN}
        </div>
      </div>
    </a>

    {/* ── NAVEGAÇÃO DESKTOP ── */}
    <nav className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, justifyContent: 'center' }}>
      {[
        { label: 'Gerador',      icon: '🎲', action: () => { setTab('loto'); scrollToSection('gerador'); } },
        { label: 'Estatísticas', icon: '📊', action: () => { setTab('loto'); scrollToSection('estatisticas'); } },
        { label: 'Histórico',    icon: '📜', action: () => { setTab('loto'); scrollToSection('historico'); } },
        { label: 'Aprender',     icon: '📖', action: () => { setTab('loto'); scrollToSection('aprender'); } },
      ].map(item => (
        <motion.button
          key={item.label}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={item.action}
          style={{
            padding: '7px 13px',
            borderRadius: '10px',
            background: 'transparent',
            border: '1px solid transparent',
            color: '#9CA3AF',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = '#E5E7EB';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#9CA3AF';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '14px' }}>{item.icon}</span>
          {item.label}
        </motion.button>
      ))}

      {/* Totobola */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        onClick={() => setTab('totobola')}
        style={{
          padding: '7px 13px',
          borderRadius: '10px',
          background: 'transparent',
          border: '1px solid transparent',
          color: '#9CA3AF',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.color = '#E5E7EB';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#9CA3AF';
        }}
      >
        ⚽ Totobola
        <span style={{
          background: 'rgba(255,215,0,0.12)',
          color: '#FFD700',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: '20px',
          padding: '1px 6px',
          fontSize: '9px',
          fontWeight: 800,
          letterSpacing: '0.03em',
        }}>
          EM BREVE
        </span>
      </motion.button>
    </nav>

    {/* ── BOTÕES DIREITA ── */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      {/* Jogo responsável */}
      <motion.button
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowResponsible(true)}
        className="hidden md:flex"
        style={{
          padding: '8px 14px',
          borderRadius: '10px',
          background: 'rgba(0,245,160,0.07)',
          border: '1px solid rgba(0,245,160,0.25)',
          color: '#00F5A0',
          fontWeight: 700,
          fontSize: '12.5px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
        }}
      >
        🛡️ Jogo responsável
      </motion.button>

      {/* Premium */}
      <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />

      {/* Hambúrguer mobile */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden"
        style={{
          padding: '8px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E5E7EB',
        }}
        aria-label="Menu"
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

  {/* ── MENU MOBILE ── */}
  <AnimatePresence>
    {mobileMenuOpen && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="md:hidden"
        style={{
          background: 'rgba(6,9,17,0.98)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { label: '🎲 Gerador',      action: () => { setTab('loto'); scrollToSection('gerador'); setMobileMenuOpen(false); } },
            { label: '📊 Estatísticas', action: () => { setTab('loto'); scrollToSection('estatisticas'); setMobileMenuOpen(false); } },
            { label: '📜 Histórico',    action: () => { setTab('loto'); scrollToSection('historico'); setMobileMenuOpen(false); } },
            { label: '📖 Aprender',     action: () => { setTab('loto'); scrollToSection('aprender'); setMobileMenuOpen(false); } },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{ padding: '11px 12px', borderRadius: '10px', background: 'transparent', border: 'none', color: '#D1D5DB', textAlign: 'left', fontWeight: 600, fontSize: '14px', cursor: 'pointer', width: '100%' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => { setTab('totobola'); setMobileMenuOpen(false); }}
            style={{ padding: '11px 12px', borderRadius: '10px', background: 'transparent', border: 'none', color: '#D1D5DB', textAlign: 'left', fontWeight: 600, fontSize: '14px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ⚽ Totobola
            <span style={{ background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.25)', borderRadius: '20px', padding: '1px 7px', fontSize: '9px', fontWeight: 800 }}>EM BREVE</span>
          </button>
          <button
            onClick={() => { setShowResponsible(true); setMobileMenuOpen(false); }}
            style={{ padding: '11px 12px', borderRadius: '10px', background: 'rgba(0,245,160,0.07)', border: '1px solid rgba(0,245,160,0.2)', color: '#00F5A0', textAlign: 'left', fontWeight: 700, fontSize: '14px', cursor: 'pointer', width: '100%', marginTop: '4px' }}
          >
            🛡️ Jogo responsável
          </button>
          <div style={{ paddingTop: '8px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>

  {/* ── WIN RATE BAR (só aparece se tiver dados) ── */}
  {performance.total > 0 && (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderTop: '1px solid rgba(0,245,160,0.1)',
        background: 'rgba(0,245,160,0.03)',
        padding: '6px 24px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#6B7280' }}>🎯 Win Rate:</span>
          <motion.span
            key={performance.winRate}
            initial={{ scale: 1.2, color: '#FFD700' }}
            animate={{ scale: 1, color: '#00F5A0' }}
            style={{ fontSize: '15px', fontWeight: 900, color: '#00F5A0' }}
          >
            {performance.winRate}%
          </motion.span>
          <span style={{ color: '#374151' }}>({performance.hits2Plus}/{performance.total} acertos ≥2)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#6B7280' }}>💰 Total ganho:</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#FFD700' }}>{fmtKz(performance.totalWin)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#6B7280' }}>📊 Linhas jogadas:</span>
          <span style={{ fontSize: '15px', fontWeight: 900, color: '#60A5FA' }}>{performance.linesPlayed}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00F5A0', display: 'inline-block' }}
          />
          <span style={{ color: '#00F5A0', fontSize: '11px', fontWeight: 700 }}>DADOS AO VIVO</span>
        </div>
      </div>
    </motion.div>
  )}
</header>
{/* ============================================================ */}
{/* BARRA SUPERIOR — RESTYLING */}
{/* ============================================================ */}
<div style={{ background: '#0B0F19', color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
  <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
    <div className="flex items-center gap-2">
      <span aria-hidden>🇦🇴</span>
      <span className="font-semibold">{APP_NAME} · {APP_SLOGAN} · Angola</span>
      <span className="hidden md:inline text-neutral-400">· Ferramenta educativa · 18+</span>
    </div>
    <div className="flex items-center gap-4">
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer' }}
        aria-label="Alternar modo escuro"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
      {session ? (
        <>
          <span className="text-neutral-300" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F5A0', animation: 'pulseGreen 2s infinite', display: 'inline-block' }} />
            👤 {session.email}
            {!session.isPremium && <span className="ml-2 text-amber-400">· Trial: {daysLeft}d</span>}
            {session.isPremium && <span className="ml-2 text-green-400">· PREMIUM ✓</span>}
          </span>
          {session && !session.isPremium && (
            <button 
              onClick={() => setShowTokenActivation(true)}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              🔑 Inserir token
            </button>
          )}
          <button onClick={handleLogout} className="text-neutral-400 hover:text-white text-xs">Sair</button>
        </>
      ) : (
        <button onClick={() => setShowGate(true)} style={{ background: 'linear-gradient(135deg, #00F5A0, #00C896)', color: '#0B0F19', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          REGISTAR GRÁTIS
        </button>
      )}
      <label className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-neutral-300">Letra</span>
        <select aria-label="Tamanho da letra" value={fontSize}
          onChange={e => setFontSize(e.target.value as FontSize)}
          style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <option value="normal">Normal</option>
          <option value="large">Grande</option>
          <option value="xlarge">Muito grande</option>
        </select>
      </label>
      <button onClick={() => setHighContrast(v => !v)}
        style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
        aria-pressed={highContrast}>
        {highContrast ? 'Desligar' : 'Ligar'} alto contraste
      </button>
    </div>
  </div>
</div>

{/* ============================================================ */}
{/* HEADER COM LOGO */}
{/* ============================================================ */}
<header className="bg-white dark:bg-[#16213e] border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-30 bg-white/95 backdrop-blur">
  <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
    <a href="#inicio" className="flex items-center gap-3">
      <div className="w-20 h-20 overflow-hidden">
        <img src={logoImg} alt="KazolaGlow" className="w-full h-full object-cover" />
      </div>
      <div>
        <div className="font-display font-black text-xl md:text-2xl leading-tight dark:text-white">{APP_NAME}</div>
        <div className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400">
          {APP_SLOGAN} · Análise estatística de lotaria
        </div>
      </div>
    </a>

    <nav className="hidden md:flex items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-300">
      <button onClick={() => { setTab('loto'); scrollToSection('gerador'); }}
        className="px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
        Gerador
      </button>
      <button onClick={() => { setTab('loto'); scrollToSection('estatisticas'); }}
        className="px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
        Estatísticas
      </button>
      <button onClick={() => { setTab('loto'); scrollToSection('historico'); }}
        className="px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
        Histórico
      </button>
      <button onClick={() => setTab('totobola')}
        className="px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
        Totobola <span className="ml-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">Em breve</span>
      </button>
      <button onClick={() => { setTab('loto'); scrollToSection('aprender'); }}
        className="px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
        Aprender
      </button>
      <button onClick={() => setShowResponsible(true)}
        className="ml-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
        🛡️ Jogo responsável
      </button>
      <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
    </nav>

    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
      <svg className="w-6 h-6 text-neutral-700 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {mobileMenuOpen ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  </div>

  {mobileMenuOpen && (
    <div className="md:hidden bg-white dark:bg-[#16213e] border-t border-neutral-200 dark:border-neutral-800 py-2 px-4 shadow-lg">
      <div className="flex flex-col gap-1">
        <button onClick={() => { setTab('loto'); scrollToSection('gerador'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left font-semibold">🎲 Gerador</button>
        <button onClick={() => { setTab('loto'); scrollToSection('estatisticas'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left font-semibold">📊 Estatísticas</button>
        <button onClick={() => { setTab('loto'); scrollToSection('historico'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left font-semibold">📜 Histórico</button>
        <button onClick={() => setTab('totobola')} className="px-3 py-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left font-semibold">⚽ Totobola <span className="ml-1 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">Em breve</span></button>
        <button onClick={() => { setTab('loto'); scrollToSection('aprender'); }} className="px-3 py-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left font-semibold">📖 Aprender</button>
        <button onClick={() => setShowResponsible(true)} className="px-3 py-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left font-semibold text-emerald-700 dark:text-emerald-400">🛡️ Jogo responsável</button>
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <PremiumHeaderButton onLoginClick={() => setShowLogin(true)} />
        </div>
      </div>
    </div>
  )}
</header>

{/* ============================================================ */}
{/* AVISO LEGAL — RESTYLING */}
{/* ============================================================ */}
<div style={{ background: 'rgba(255, 215, 0, 0.07)', borderTop: '1px solid rgba(255, 215, 0, 0.2)', borderBottom: '1px solid rgba(255, 215, 0, 0.2)' }}>
  <div className="max-w-6xl mx-auto px-4 py-3 flex items-start gap-3" style={{ color: '#FFD700' }}>
    <span aria-hidden className="text-xl leading-none mt-0.5">⚠️</span>
    <p className="text-sm md:text-base leading-relaxed">
      <strong>Importante:</strong> ferramenta <strong>educativa e de entretenimento</strong>,
      <strong> não afiliada</strong> à {OPERATOR} ({CONCESSIONAIRE}) nem ao {REGULATOR}.
      Os sorteios são <strong>aleatórios e independentes</strong> — nenhum método garante acertos.
      Jogue com responsabilidade. +18.
    </p>
  </div>
</div>

{/* ============================================================ */}
{/* STATUS DA API — Mantido */}
{/* ============================================================ */}
<div className={`${!apiError && draws.length > 0 ? (temDadosHoje ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-amber-50 dark:bg-amber-950') : 'bg-amber-50 dark:bg-amber-950'} border-b border-neutral-200 dark:border-neutral-800`}>
  <div className="max-w-6xl mx-auto px-4 py-2 text-xs md:text-sm flex items-center gap-2 flex-wrap">
    <span aria-hidden>{!apiError && draws.length > 0 ? (temDadosHoje ? '✅' : '⚠️') : '🕐'}</span>
    {loadingApi ? (
      <span>A carregar dados da API oficial…</span>
    ) : !apiError && draws.length > 0 ? (
      temDadosHoje ? (
        <span>✅ Dados reais da API oficial da Lotaria Nacional.</span>
      ) : (
        <span>⚠️ Último sorteio disponível: {activeDraw ? formatDate(activeDraw.date) : 'N/A'} — o sorteio de hoje ainda não foi actualizado.</span>
      )
    ) : (
      <span>🕐 A aguardar actualização dos dados.</span>
    )}
  </div>
</div>

{/* ============================================================ */}
{/* PREMIUM BANNER */}
{/* ============================================================ */}
{session && (
  <PremiumBanner
    session={session}
    onUpgrade={() => setShowUpgrade(true)}
    onLogout={handleLogout}
    gensUsedToday={gensUsedToday}
    gensLimitDay={FREE_GENS_DAY}
  />
)}

{/* ============================================================ */}
{/* HERO COM GRADIENTE POR TAB — RESTYLING */}
{/* ============================================================ */}
<div className="relative overflow-hidden py-8 px-4" style={{ background: header.bg }}>
  <div className="max-w-6xl mx-auto text-center">
    
    {/* Badge animado — NOVO */}
    <div className="fade-in-up" style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '8px', 
      padding: '6px 16px', 
      background: 'rgba(17, 24, 39, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0, 245, 160, 0.3)',
      borderRadius: '999px', 
      marginBottom: '16px' 
    }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F5A0', animation: 'pulseGreen 1.5s infinite', display: 'inline-block' }} />
      <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#00F5A0' }}>
        ⚡ Ecossistema Glow — Inteligência para cada aposta
      </span>
    </div>

    {/* Badge existente da tab */}
    <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: header.accent, color: '#000' }}>
      {header.badge}
    </div>

    {/* Título com gradiente — aumentado */}
    <h1 
      className="font-display font-black mb-3" 
      style={{ 
        background: `linear-gradient(135deg, #fff, ${header.accent})`, 
        WebkitBackgroundClip: 'text', 
        WebkitTextFillColor: 'transparent',
        fontSize: 'clamp(2.5rem, 6vw, 4rem)',
        textShadow: '0 0 40px rgba(255,255,255,0.1)'
      }}
    >
      {header.title}
    </h1>

    {/* Badge Premium condicional */}
    {(session?.isPremium || premium.isActive) && (
      <div className="fade-in-up" style={{ animationDelay: '200ms', marginTop: '12px', marginBottom: '12px', display: 'inline-block' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05))',
          border: '1px solid rgba(255, 215, 0, 0.4)',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#FFD700'
        }}>
          ⭐ PREMIUM ACTIVO
        </span>
      </div>
    )}

    {/* Subtítulo */}
    <p className="text-neutral-300 text-lg max-w-2xl mx-auto">{header.subtitle}</p>
  </div>
</div>

{/* ============================================================ */}
{/* TABS — RESTYLING */}
{/* ============================================================ */}
<div className="flex gap-3 justify-center pb-0 mt-6">
  <button
    onClick={() => setTab('loto')}
    style={{
      padding: '12px 24px',
      borderRadius: '40px',
      fontWeight: 700,
      fontSize: '0.875rem',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      ...(tab === 'loto'
        ? {
            background: 'linear-gradient(135deg, #00F5A0, #00C896)',
            color: '#0B0F19',
            border: 'none',
            boxShadow: '0 0 15px rgba(0, 245, 160, 0.3)',
          }
        : {
            background: 'rgba(17, 24, 39, 0.7)',
            backdropFilter: 'blur(12px)',
            color: '#9CA3AF',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          })
    }}
  >
    🎲 LOTO 5/90
  </button>
  <button
    onClick={() => setTab('totobola')}
    style={{
      padding: '12px 24px',
      borderRadius: '40px',
      fontWeight: 700,
      fontSize: '0.875rem',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      ...(tab === 'totobola'
        ? {
            background: 'linear-gradient(135deg, #FFD700, #d4a800)',
            color: '#0B0F19',
            border: 'none',
            boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)',
          }
        : {
            background: 'rgba(17, 24, 39, 0.7)',
            backdropFilter: 'blur(12px)',
            color: '#9CA3AF',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          })
    }}
  >
    ⚽ TOTOBOLA
  </button>
  <button
    onClick={() => setTab('premios')}
    style={{
      padding: '12px 24px',
      borderRadius: '40px',
      fontWeight: 700,
      fontSize: '0.875rem',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      ...(tab === 'premios'
        ? {
            background: 'linear-gradient(135deg, #FF4B4B, #cc0000)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 0 15px rgba(255, 75, 75, 0.3)',
          }
        : {
            background: 'rgba(17, 24, 39, 0.7)',
            backdropFilter: 'blur(12px)',
            color: '#9CA3AF',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          })
    }}
  >
    💰 PRÉMIOS
  </button>
</div>
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ChromeBall from './ChromeBall';
import Card from './Card';
import Modal from './Modal';
import { UserSession, shouldSync, updateLastSync } from '../lib/session';
import { saveUserData, loadUserData, deleteUserData } from '../lib/apiClient';
import { savePerformanceDetalhada } from '../lib/validation';

// ============================================================
// MULTIPLICADORES POR MODALIDADE (conforme regras oficiais)
// ============================================================
const MULTIPLIERS: Record<string, Record<number, number>> = {
  chance2: { 1: 4, 2: 80 },
  chance3: { 1: 1, 2: 30, 3: 3000 },
  chance4: { 1: 1, 2: 20, 3: 300, 4: 15000 },
  chance5: { 1: 1, 2: 10, 3: 120, 4: 5000, 5: 100000 },
};

const NUMBERS_PER_CHANCE: Record<string, number> = {
  chance2: 2,
  chance3: 3,
  chance4: 4,
  chance5: 5,
};

interface RegistoAposta {
  id: string;
  data: string;
  hora: string;
  combinacao: number[];
  valorApostado: number;
  sessao: 'Fezada' | 'Aqueceu' | 'Kazola' | 'Eskebra';
  modalidade: 'chance2' | 'chance3' | 'chance4' | 'chance5';
  resultado: 'pendente' | 'verificado';
  acertos: number | null;
  premioRecebido: number;
  notas: string;
}

interface Draw {
  id: string;
  date: string;
  time?: string;
  numbers: number[];
  session?: string;
}

interface DiarioApostasProps {
  session: UserSession;
  onSessionUpdate?: (session: UserSession) => void;
  draws?: Draw[];
}

const getStorageKey = (email: string) => `kazola_diario_${email}`;

const fmtKz = (value: number) =>
  value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });

// Estilo fixo para todas as <option> — resolve o bug de texto invisível
const optionStyle: React.CSSProperties = {
  background: '#1a1a2e',
  color: '#E5E7EB',
};

const DiarioApostas: React.FC<DiarioApostasProps> = ({ session, onSessionUpdate, draws = [] }) => {
  const [registos, setRegistos] = useState<RegistoAposta[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    combinacao: ['', '', '', '', ''],
    valorApostado: 100,
    sessao: 'Fezada' as const,
    modalidade: 'chance5' as const,
    notas: '',
  });
  const [verificandoId, setVerificandoId] = useState<string | null>(null);
  const [acertosTemp, setAcertosTemp] = useState<number>(0);
  const [premioTemp, setPremioTemp] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conferindoAuto, setConferindoAuto] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Sincronização com servidor ──────────────────────────────────────────
  const loadFromServer = async () => {
    if (!shouldSync(session)) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await loadUserData(session.email, 'diario');
      if (result.ok && result.records) {
        const serverRegistos: RegistoAposta[] = [];
        for (const record of result.records) {
          try {
            const parsed = JSON.parse(record.data);
            if (parsed.id && parsed.combinacao) serverRegistos.push(parsed as RegistoAposta);
          } catch { /* ignore */ }
        }

        const localKey = getStorageKey(session.email);
        const localStored = localStorage.getItem(localKey);
        let localRegistos: RegistoAposta[] = [];
        if (localStored) {
          try { localRegistos = JSON.parse(localStored); } catch { /* ignore */ }
        }

        const mergedMap = new Map<string, RegistoAposta>();
        serverRegistos.forEach(r => mergedMap.set(r.id, r));
        localRegistos.forEach(r => { if (!mergedMap.has(r.id)) mergedMap.set(r.id, r); });

        const merged = Array.from(mergedMap.values())
          .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(b.hora));

        setRegistos(merged);
        localStorage.setItem(localKey, JSON.stringify(merged));
        if (onSessionUpdate) onSessionUpdate(updateLastSync(session));
      }
    } catch {
      setSyncError('Erro ao sincronizar com o servidor');
    } finally {
      setSyncing(false);
    }
  };

  const saveRegistos = async (newRegistos: RegistoAposta[]) => {
    localStorage.setItem(getStorageKey(session.email), JSON.stringify(newRegistos));
    setRegistos(newRegistos);
    if (shouldSync(session)) {
      for (const registo of newRegistos) {
        try {
          await saveUserData(session.email, 'diario', registo.id, JSON.stringify(registo));
        } catch {
          setSyncError('Erro ao sincronizar. Os dados estão guardados localmente.');
        }
      }
      if (onSessionUpdate) onSessionUpdate(updateLastSync(session));
    }
  };

  const deleteRegisto = async (id: string) => {
    const filtered = registos.filter(r => r.id !== id);
    localStorage.setItem(getStorageKey(session.email), JSON.stringify(filtered));
    setRegistos(filtered);
    if (shouldSync(session)) {
      try {
        await deleteUserData(session.email, id, 'diario');
      } catch {
        setSyncError('Erro ao eliminar do servidor. O registo foi removido localmente.');
      }
    }
  };

  useEffect(() => {
    const key = getStorageKey(session.email);
    const stored = localStorage.getItem(key);
    if (stored) {
      try { setRegistos(JSON.parse(stored)); } catch { /* ignore */ }
    }
    loadFromServer();
  }, [session.email]);

  useEffect(() => {
    const handleApostasAtualizadas = (e: CustomEvent) => {
      if (e.detail?.email === session.email) {
        const stored = localStorage.getItem(getStorageKey(session.email));
        if (stored) {
          try { setRegistos(JSON.parse(stored)); } catch { /* ignore */ }
        }
      }
    };
    window.addEventListener('apostas-atualizadas', handleApostasAtualizadas as EventListener);
    return () => window.removeEventListener('apostas-atualizadas', handleApostasAtualizadas as EventListener);
  }, [session.email]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const calcularPremio = (modalidade: string, acertos: number, valorApostado: number): number => {
    const multipliers = MULTIPLIERS[modalidade];
    if (!multipliers || acertos === 0) return 0;
    const m = multipliers[acertos];
    return m ? valorApostado * m : 0;
  };

  const handleNumberInput = (index: number, value: string) => {
    const only = value.replace(/[^0-9]/g, '');
    const newCombinacao = [...formData.combinacao];
    newCombinacao[index] = only;
    setFormData({ ...formData, combinacao: newCombinacao });
    if (only.length === 2) {
      const num = parseInt(only);
      if (!isNaN(num) && num >= 1 && num <= 90 && index + 1 < camposVisiveis) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncError(null);

    const numerosNecessarios = NUMBERS_PER_CHANCE[formData.modalidade];
    const numeros = formData.combinacao.slice(0, numerosNecessarios).map(n => parseInt(n));

    if (!formData.combinacao.slice(0, numerosNecessarios).every(n => n !== ''))
      return setError(`Preencha os ${numerosNecessarios} números da combinação`);
    if (numeros.some(isNaN))
      return setError('Preencha todos os números da combinação');
    if (numeros.some(n => n < 1 || n > 90))
      return setError('Os números devem estar entre 1 e 90');
    if (new Set(numeros).size !== numerosNecessarios)
      return setError('Os números não podem repetir-se');
    if (formData.valorApostado < 50 || formData.valorApostado > 1000)
      return setError('O valor apostado deve estar entre 50 e 1000 Kz');

    const novoRegisto: RegistoAposta = {
      id: generateId(),
      data: formData.data,
      hora: formData.hora,
      combinacao: numeros,
      valorApostado: formData.valorApostado,
      sessao: formData.sessao,
      modalidade: formData.modalidade,
      resultado: 'pendente',
      acertos: null,
      premioRecebido: 0,
      notas: formData.notas,
    };

    await saveRegistos([novoRegisto, ...registos]);

    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      combinacao: ['', '', '', '', ''],
      valorApostado: 100,
      sessao: 'Fezada',
      modalidade: 'chance5',
      notas: '',
    });
    inputRefs.current = [];
  };

  const handleVerificar = (id: string) => {
    const registo = registos.find(r => r.id === id);
    if (registo) {
      setAcertosTemp(registo.acertos ?? 0);
      setPremioTemp(registo.premioRecebido);
      setVerificandoId(id);
    }
  };

  const confirmarVerificacao = async () => {
    if (!verificandoId) return;
    const updated = registos.map(r =>
      r.id === verificandoId
        ? { ...r, resultado: 'verificado' as const, acertos: acertosTemp, premioRecebido: premioTemp }
        : r
    );
    await saveRegistos(updated);
    setVerificandoId(null);
    setAcertosTemp(0);
    setPremioTemp(0);
  };

  const conferirAutomaticamente = async (registo: RegistoAposta) => {
    if (draws.length === 0) {
      alert('⚠️ Sem dados de sorteios para conferir. Aguarde a actualização da API.');
      return;
    }
    setConferindoAuto(registo.id);
    try {
      const sorteio = draws.find(d => {
        const mesmaData = d.date === registo.data;
        const s1 = registo.sessao.toLowerCase();
        const s2 = d.session?.toLowerCase() || '';
        const mesmaSessao = s1 === s2;
        return mesmaData && mesmaSessao;
      });

      if (!sorteio) {
        alert(`⚠️ Nenhum sorteio encontrado para ${registo.data} (${registo.sessao}).`);
        return;
      }

      const acertos = registo.combinacao.filter(n => sorteio.numbers.includes(n)).length;
      const premio = calcularPremio(registo.modalidade, acertos, registo.valorApostado);
      const multipliers = MULTIPLIERS[registo.modalidade];
      const mult = multipliers[acertos] || 0;
      const numerosApostados = registo.combinacao.join(', ');
      const numerosSorteados = sorteio.numbers.join(', ');
      const numerosAcertados = registo.combinacao.filter(n => sorteio.numbers.includes(n)).join(', ');

      let mensagem = '';
      if (acertos === 5) {
        mensagem = `🎉🎉🎉 JACKPOT! 🎉🎉🎉\n\n5 ACERTOS! PRÉMIO MÁXIMO!\n\n🎯 Apostados: ${numerosApostados}\n🎲 Sorteados: ${numerosSorteados}\n✅ Acertos: 5 ×${mult}\n💰 PRÉMIO: ${fmtKz(premio)}`;
      } else if (acertos === 4) {
        mensagem = `🎉 QUASE JACKPOT!\n\n4 ACERTOS!\n\n🎯 Apostados: ${numerosApostados}\n🎲 Sorteados: ${numerosSorteados}\n✅ Acertos: 4 ×${mult}\n💰 PRÉMIO: ${fmtKz(premio)}`;
      } else if (acertos >= 2) {
        mensagem = `🎉 ${acertos} acertos!\n\n🎯 Apostados: ${numerosApostados}\n🎲 Sorteados: ${numerosSorteados}\n✅ Acertos: ${acertos} ×${mult}${numerosAcertados ? `\n   Acertou: ${numerosAcertados}` : ''}\n💰 PRÉMIO: ${fmtKz(premio)}`;
      } else {
        mensagem = `📊 Resultado:\n\n🎯 Apostados: ${numerosApostados}\n🎲 Sorteados: ${numerosSorteados}\n✅ Acertos: ${acertos}\n💡 Boa sorte na próxima!`;
      }

      const confirmar = window.confirm(`${mensagem}\n\nDeseja registar este resultado?`);
      if (confirmar) {
        savePerformanceDetalhada(registo.modalidade, acertos, 1, sorteio.numbers, registo.valorApostado);
        const updated = registos.map(r =>
          r.id === registo.id
            ? { ...r, resultado: 'verificado' as const, acertos, premioRecebido: premio }
            : r
        );
        await saveRegistos(updated);

        const perfKey = 'kazola_performance';
        const perfHistory = JSON.parse(localStorage.getItem(perfKey) || '[]');
        perfHistory.unshift({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          strategy: registo.modalidade,
          hits: acertos,
          lines: 1,
          drawnNumbers: sorteio.numbers,
          stakePerLine: registo.valorApostado,
          winAmount: premio,
        });
        localStorage.setItem(perfKey, JSON.stringify(perfHistory.slice(0, 200)));
        window.dispatchEvent(new CustomEvent('performance-atualizada', { detail: { email: session.email, hits: acertos, winAmount: premio } }));

        if (acertos === 5)      alert(`🏆🏆🏆 JACKPOT!\n5 ACERTOS!\nPRÉMIO: ${fmtKz(premio)}`);
        else if (acertos === 4) alert(`🎉🎉 QUASE JACKPOT!\n4 ACERTOS!\nPRÉMIO: ${fmtKz(premio)}`);
        else if (acertos >= 2)  alert(`✅ ${acertos} acerto${acertos !== 1 ? 's' : ''} — Prémio: ${fmtKz(premio)}`);
        else                    alert(`✅ Aposta registada com ${acertos} acerto${acertos !== 1 ? 's' : ''}!`);
      }
    } catch {
      alert('❌ Erro ao conferir automaticamente. Tente a verificação manual.');
    } finally {
      setConferindoAuto(null);
    }
  };

  const handleEliminar = async (id: string) => {
    if (window.confirm('Tens a certeza que queres eliminar este registo?')) {
      await deleteRegisto(id);
    }
  };

  const estatisticas = useMemo(() => {
    const now = new Date();
    const mesActual = now.getMonth();
    const anoActual = now.getFullYear();
    const registosMes = registos.filter(r => {
      const [ano, mes] = r.data.split('-').map(Number);
      return ano === anoActual && (mes - 1) === mesActual;
    });
    return {
      totalGasto:      registosMes.reduce((s, r) => s + r.valorApostado,  0),
      totalRecuperado: registosMes.reduce((s, r) => s + r.premioRecebido, 0),
      saldo:           registosMes.reduce((s, r) => s + r.premioRecebido - r.valorApostado, 0),
      pendentes:       registosMes.filter(r => r.resultado === 'pendente').length,
    };
  }, [registos]);

  const camposVisiveis = NUMBERS_PER_CHANCE[formData.modalidade];

  // ── Estilos ─────────────────────────────────────────────────────────────
  const glassCardStyle: React.CSSProperties = {
    background: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 245, 160, 0.3)',
    borderRadius: '16px',
    padding: '16px',
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.4)',
    color: '#E5E7EB',
    border: '1px solid rgba(0, 245, 160, 0.4)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  };

  const numberInputStyle: React.CSSProperties = {
    width: '70px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '18px',
    padding: '10px 0',
    borderRadius: '12px',
    border: '1px solid rgba(0, 245, 160, 0.5)',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#00F5A0',
    outline: 'none',
    transition: 'all 0.2s ease',
    appearance: 'textfield',
    MozAppearance: 'textfield',
  };

  const sessaoConfig: Record<string, { color: string; icon: string; horario: string }> = {
    Fezada:  { color: '#FF6B6B', icon: '☀️', horario: '10:00' },
    Aqueceu: { color: '#FF9F4A', icon: '🔥', horario: '13:00' },
    Kazola:  { color: '#00F5A0', icon: '🌙', horario: '16:00' },
    Eskebra: { color: '#A855F7', icon: '⚡', horario: '19:00' },
  };

  const sessoesOrdenadas: Array<'Fezada' | 'Aqueceu' | 'Kazola' | 'Eskebra'> = ['Fezada', 'Aqueceu', 'Kazola', 'Eskebra'];

  const modalidades = [
    { value: 'chance2', label: 'Chance 2', numeros: 2, premioMax: 'x80' },
    { value: 'chance3', label: 'Chance 3', numeros: 3, premioMax: 'x3.000' },
    { value: 'chance4', label: 'Chance 4', numeros: 4, premioMax: 'x15.000' },
    { value: 'chance5', label: 'Chance 5', numeros: 5, premioMax: 'x100.000' },
  ];

  const btnConferirStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '8px',
    background: 'rgba(96, 165, 250, 0.15)',
    border: '1px solid rgba(96, 165, 250, 0.4)',
    color: '#60A5FA',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  };

  const btnApagarStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '8px',
    background: 'rgba(255, 75, 75, 0.1)',
    border: '1px solid rgba(255, 75, 75, 0.3)',
    color: '#FF4B4B',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; appearance: textfield; }
        .btn-conferir:hover { background: rgba(96,165,250,0.3) !important; border-color: #60A5FA !important; }
        .btn-apagar:hover   { background: rgba(255,75,75,0.25) !important; border-color: #FF4B4B !important; }
        .kazola-select option { background: #1a1a2e !important; color: #E5E7EB !important; }
      `}</style>

      {/* Banners de estado */}
      {syncing && (
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: '#60A5FA', fontSize: '14px' }}>
          🔄 A sincronizar com o servidor...
        </div>
      )}
      {syncError && (
        <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: '#FFD700', fontSize: '14px' }}>
          ⚠️ {syncError}
        </div>
      )}
      {shouldSync(session) && !syncing && (
        <div style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.2)', borderRadius: '12px', padding: '8px', textAlign: 'center', color: '#00F5A0', fontSize: '12px' }}>
          ☁️ Dados sincronizados na nuvem — disponíveis em todos os dispositivos
        </div>
      )}

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total gasto este mês',  value: fmtKz(estatisticas.totalGasto),      color: '#FF4B4B' },
          { label: 'Total recuperado',       value: fmtKz(estatisticas.totalRecuperado), color: '#00F5A0' },
          { label: 'Saldo do mês',           value: fmtKz(estatisticas.saldo),           color: estatisticas.saldo >= 0 ? '#00F5A0' : '#FF4B4B' },
          { label: 'Aguardam verificação',   value: String(estatisticas.pendentes),       color: '#FFD700' },
        ].map(({ label, value, color }) => (
          <div key={label} style={glassCardStyle}>
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Formulário nova aposta */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>📝</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Nova Aposta</h3>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,75,75,0.1)', border: '1px solid rgba(255,75,75,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '16px', color: '#FF4B4B', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '2px', display: 'block', color: '#9CA3AF' }}>Data</label>
              <input
                type="date"
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '2px', display: 'block', color: '#9CA3AF' }}>Hora</label>
              <input
                type="time"
                value={formData.hora}
                onChange={e => setFormData({ ...formData, hora: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '2px', display: 'block', color: '#9CA3AF' }}>Valor (Kz)</label>
              <input
                type="number"
                min="50"
                max="1000"
                step="50"
                value={formData.valorApostado}
                onChange={e => setFormData({ ...formData, valorApostado: parseInt(e.target.value) || 0 })}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '2px', display: 'block', color: '#9CA3AF' }}>Sessão</label>
              {/* ── SELECT SESSÃO — className kazola-select resolve o bug das options ── */}
              <select
                className="kazola-select"
                value={formData.sessao}
                onChange={e => setFormData({ ...formData, sessao: e.target.value as any })}
                style={inputStyle}
              >
                {sessoesOrdenadas.map(s => (
                  <option key={s} value={s} style={optionStyle}>
                    {sessaoConfig[s].icon} {s} ({sessaoConfig[s].horario})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '2px', display: 'block', color: '#9CA3AF' }}>Modalidade</label>
            {/* ── SELECT MODALIDADE — className kazola-select resolve o bug das options ── */}
            <select
              className="kazola-select"
              value={formData.modalidade}
              onChange={e => setFormData({ ...formData, modalidade: e.target.value as any, combinacao: ['', '', '', '', ''] })}
              style={{ ...inputStyle, width: '100%' }}
            >
              {modalidades.map(m => (
                <option key={m.value} value={m.value} style={optionStyle}>
                  🎯 {m.label} ({m.numeros} números, máx {m.premioMax})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', display: 'block', color: '#9CA3AF' }}>
              🎯 {camposVisiveis} números de 1 a 90
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {Array.from({ length: camposVisiveis }).map((_, idx) => (
                <input
                  key={idx}
                  ref={el => inputRefs.current[idx] = el}
                  type="number"
                  min="1"
                  max="90"
                  placeholder="00"
                  value={formData.combinacao[idx] || ''}
                  onChange={e => handleNumberInput(idx, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && idx + 1 < camposVisiveis) {
                      e.preventDefault();
                      inputRefs.current[idx + 1]?.focus();
                    }
                  }}
                  style={numberInputStyle}
                  required
                />
              ))}
            </div>
            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '8px' }}>
              💡 Digite 2 números por campo (ex: 33) e avança automaticamente
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, marginBottom: '2px', display: 'block', color: '#9CA3AF' }}>Notas (opcional)</label>
            <textarea
              value={formData.notas}
              onChange={e => setFormData({ ...formData, notas: e.target.value })}
              style={{ ...inputStyle, width: '100%', minHeight: '50px' }}
              rows={2}
              placeholder="Observações sobre esta aposta..."
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00F5A0, #00C896)', color: '#0B0F19', fontWeight: 800, fontSize: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer' }}
          >
            REGISTAR APOSTA
          </button>
        </form>
      </div>

      {/* Histórico */}
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Histórico de Apostas</h3>
        </div>

        {registos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#6B7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📓</div>
            <p>Nenhuma aposta registada ainda.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Começa a registar as tuas apostas acima!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Data', 'Chance', 'Números', 'Sessão', 'Valor', 'Acertos', 'Prémio', 'Acções'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Acções' ? 'center' : 'left', fontWeight: 700, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registos.slice(0, 10).map(registo => {
                  const sc = sessaoConfig[registo.sessao] ?? { color: '#9CA3AF', icon: '🎲', horario: '' };
                  const modalidadeLabel = { chance2: 'C2', chance3: 'C3', chance4: 'C4', chance5: 'C5' }[registo.modalidade];

                  let corAcerto = '#FF4B4B';
                  if (registo.acertos === 5)      corAcerto = '#FFD700';
                  else if (registo.acertos === 4) corAcerto = '#FFA500';
                  else if (registo.acertos === 3) corAcerto = '#00F5A0';
                  else if (registo.acertos === 2) corAcerto = '#FFD700';
                  else if (registo.acertos === 1) corAcerto = '#60A5FA';

                  return (
                    <tr key={registo.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#E5E7EB' }}>{registo.data}</div>
                        <div style={{ fontSize: '10px', color: '#6B7280' }}>{registo.hora}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '12px', background: 'rgba(0,245,160,0.15)', color: '#00F5A0' }}>
                          {modalidadeLabel}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {registo.combinacao.map((num, idx) => (
                            <span key={idx} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#00F5A0' }}>
                              {num}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '12px', background: `${sc.color}18`, color: sc.color }}>
                          {sc.icon} {registo.sessao}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px', color: '#E5E7EB', whiteSpace: 'nowrap' }}>
                        {fmtKz(registo.valorApostado)}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 800, fontSize: '16px', color: corAcerto }}>
                        {registo.acertos !== null ? registo.acertos : '—'}
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {registo.premioRecebido > 0
                          ? <span style={{ color: '#00F5A0', fontWeight: 700 }}>{fmtKz(registo.premioRecebido)}</span>
                          : <span style={{ color: '#6B7280' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          {registo.resultado === 'pendente' && (
                            <button
                              className="btn-conferir"
                              onClick={() => conferirAutomaticamente(registo)}
                              disabled={conferindoAuto === registo.id}
                              title="Conferir resultado com o sorteio"
                              style={{
                                ...btnConferirStyle,
                                opacity: conferindoAuto === registo.id ? 0.5 : 1,
                                cursor: conferindoAuto === registo.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {conferindoAuto === registo.id ? '⏳' : '🔍'} Conferir
                            </button>
                          )}
                          {registo.resultado === 'verificado' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.2)', color: '#00F5A0', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              ✅ Verificado
                            </span>
                          )}
                          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                          <button
                            className="btn-apagar"
                            onClick={() => handleEliminar(registo.id)}
                            title="Eliminar este registo"
                            style={btnApagarStyle}
                          >
                            🗑️ Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {registos.length > 10 && (
              <div style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: '#6B7280' }}>
                + {registos.length - 10} apostas anteriores
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal verificação manual */}
      <Modal open={verificandoId !== null} onClose={() => setVerificandoId(null)} title="✅ Verificar Resultado">
        <div className="space-y-4">
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Número de acertos (0–5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={acertosTemp}
              onChange={e => setAcertosTemp(parseInt(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Prémio recebido (Kz)</label>
            <input
              type="number"
              min="0"
              value={premioTemp}
              onChange={e => setPremioTemp(parseInt(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>
          <button
            onClick={confirmarVerificacao}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00F5A0, #00C896)', color: '#0B0F19', fontWeight: 700, borderRadius: '16px', border: 'none', cursor: 'pointer' }}
          >
            CONFIRMAR
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DiarioApostas;
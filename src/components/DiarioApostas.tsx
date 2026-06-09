import React, { useState, useEffect, useMemo } from 'react';
import ChromeBall from './ChromeBall';
import Card from './Card';
import Modal from './Modal';
import { UserSession, shouldSync, updateLastSync } from '../lib/session';
import { saveUserData, loadUserData, deleteUserData } from '../lib/apiClient';
import { savePerformanceDetalhada } from '../lib/validation';

interface RegistoAposta {
  id: string;
  data: string;
  hora: string;
  combinacao: number[];
  valorApostado: number;
  sessao: 'Fezada' | 'Kazola' | 'Eskebra' | 'Aqueceu';
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

const DiarioApostas: React.FC<DiarioApostasProps> = ({ session, onSessionUpdate, draws = [] }) => {
  const [registos, setRegistos] = useState<RegistoAposta[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
    combinacao: ['', '', '', '', ''],
    valorApostado: 100,
    sessao: 'Fezada' as const,
    notas: '',
  });
  const [verificandoId, setVerificandoId] = useState<string | null>(null);
  const [acertosTemp, setAcertosTemp] = useState<number>(0);
  const [premioTemp, setPremioTemp] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conferindoAuto, setConferindoAuto] = useState<string | null>(null);

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
            const parsedData = JSON.parse(record.data);
            if (parsedData.id && parsedData.combinacao) {
              serverRegistos.push(parsedData as RegistoAposta);
            }
          } catch (e) {
            console.error('Erro ao fazer parse de registo do servidor:', e);
          }
        }

        const localKey = getStorageKey(session.email);
        const localStored = localStorage.getItem(localKey);
        let localRegistos: RegistoAposta[] = [];
        if (localStored) {
          try {
            localRegistos = JSON.parse(localStored);
          } catch { /* ignore */ }
        }

        const mergedMap = new Map<string, RegistoAposta>();
        for (const r of serverRegistos) mergedMap.set(r.id, r);
        for (const r of localRegistos) {
          if (!mergedMap.has(r.id)) mergedMap.set(r.id, r);
        }

        const mergedRegistos = Array.from(mergedMap.values())
          .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));

        setRegistos(mergedRegistos);
        localStorage.setItem(localKey, JSON.stringify(mergedRegistos));

        if (onSessionUpdate) onSessionUpdate(updateLastSync(session));
      }
    } catch (error) {
      console.error('Erro ao carregar do servidor:', error);
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
        } catch (error) {
          console.error('Erro ao sincronizar registo:', registo.id, error);
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
      } catch (error) {
        console.error('Erro ao eliminar do servidor:', error);
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

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncError(null);

    const numeros = formData.combinacao.map(n => parseInt(n));

    if (numeros.some(isNaN)) return setError('Preencha os 5 números da combinação');
    if (numeros.some(n => n < 1 || n > 90)) return setError('Os números devem estar entre 1 e 90');
    if (new Set(numeros).size !== 5) return setError('Os números não podem repetir-se');
    if (formData.valorApostado < 50 || formData.valorApostado > 1000)
      return setError('O valor apostado deve estar entre 50 e 1000 Kz');

    const novoRegisto: RegistoAposta = {
      id: generateId(),
      data: formData.data,
      hora: formData.hora,
      combinacao: numeros,
      valorApostado: formData.valorApostado,
      sessao: formData.sessao,
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
      notas: '',
    });
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

    const updatedRegistos = registos.map(r =>
      r.id === verificandoId
        ? { ...r, resultado: 'verificado' as const, acertos: acertosTemp, premioRecebido: premioTemp }
        : r
    );

    await saveRegistos(updatedRegistos);
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
      const dataAposta = new Date(registo.data).toLocaleDateString('pt-AO');

      const sorteioCorrespondente = draws.find(draw => {
        const dataDraw = new Date(draw.date).toLocaleDateString('pt-AO');
        const mesmaData = dataAposta === dataDraw;
        const sessaoAposta = registo.sessao.toLowerCase();
        const sessaoDraw = draw.session?.toLowerCase() || '';
        const mesmaSessao =
          sessaoAposta === sessaoDraw ||
          (sessaoAposta === 'fezada'  && sessaoDraw === 'fezada')  ||
          (sessaoAposta === 'kazola'  && sessaoDraw === 'kazola')  ||
          (sessaoAposta === 'eskebra' && sessaoDraw === 'eskebra') ||
          (sessaoAposta === 'aqueceu' && sessaoDraw === 'aqueceu');
        return mesmaData && mesmaSessao;
      });

      if (!sorteioCorrespondente) {
        alert(`⚠️ Nenhum sorteio encontrado para ${registo.data} (${registo.sessao}).\nVerifique se o resultado já foi divulgado ou tente conferir manualmente.`);
        setConferindoAuto(null);
        return;
      }

      const acertos = registo.combinacao.filter(n => sorteioCorrespondente.numbers.includes(n)).length;
      const multipliers: Record<number, number> = { 2: 10, 3: 120, 4: 5000, 5: 100000 };
      const premio = acertos >= 2 ? registo.valorApostado * (multipliers[acertos as keyof typeof multipliers] || 0) : 0;
      const numerosSorteados = sorteioCorrespondente.numbers.join(', ');

      if (acertos >= 2) {
        alert(`🎉 PARABÉNS! ${acertos} acerto${acertos > 1 ? 's' : ''}!\n\n📊 Números sorteados: ${numerosSorteados}\n💰 Prémio estimado: ${fmtKz(premio)}\n\n✅ Deseja confirmar esta verificação?`);
      } else {
        alert(`📊 Resultado da conferência:\n• ${acertos} acerto${acertos !== 1 ? 's' : ''}\n• Números sorteados: ${numerosSorteados}\n\n💡 Boa sorte na próxima!`);
      }

      if (acertos >= 2) {
        const confirmar = window.confirm(`Deseja registar automaticamente ${acertos} acerto${acertos > 1 ? 's' : ''} e prémio de ${fmtKz(premio)}?`);
        if (confirmar) {
          savePerformanceDetalhada('kazola', acertos, 1, sorteioCorrespondente.numbers, registo.valorApostado);
          const updatedRegistos = registos.map(r =>
            r.id === registo.id
              ? { ...r, resultado: 'verificado' as const, acertos, premioRecebido: premio }
              : r
          );
          await saveRegistos(updatedRegistos);
          alert('✅ Aposta verificada automaticamente com sucesso!');
        } else {
          setAcertosTemp(acertos);
          setPremioTemp(premio);
          setVerificandoId(registo.id);
        }
      } else {
        setAcertosTemp(acertos);
        setPremioTemp(premio);
        setVerificandoId(registo.id);
      }
    } catch (error) {
      console.error('Erro na conferência automática:', error);
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
      totalGasto:      registosMes.reduce((sum, r) => sum + r.valorApostado, 0),
      totalRecuperado: registosMes.reduce((sum, r) => sum + r.premioRecebido, 0),
      saldo:           registosMes.reduce((sum, r) => sum + r.premioRecebido - r.valorApostado, 0),
      pendentes:       registosMes.filter(r => r.resultado === 'pendente').length,
    };
  }, [registos]);

  const updateCombinacao = (index: number, value: string) => {
    const newCombinacao = [...formData.combinacao];
    newCombinacao[index] = value;
    setFormData({ ...formData, combinacao: newCombinacao });
  };

  /* ── Estilos reutilizáveis ── */
  const glassCardStyle: React.CSSProperties = {
    background: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '16px',
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#F3F4F6',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  };

  /* ── Badge de sessão ── */
  const sessaoConfig: Record<string, { color: string; icon: string }> = {
    Fezada:  { color: '#FF6B6B', icon: '☀️' },
    Aqueceu: { color: '#FF9F4A', icon: '🔥' },
    Kazola:  { color: '#00F5A0', icon: '🌙' },
    Eskebra: { color: '#A855F7', icon: '⚡' },
  };

  return (
    <div className="space-y-6">

      {/* ── Banners de estado ── */}
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

      {/* ── Cards de estatísticas ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total gasto este mês',   value: fmtKz(estatisticas.totalGasto),      color: '#FF4B4B' },
          { label: 'Total recuperado',        value: fmtKz(estatisticas.totalRecuperado), color: '#00F5A0' },
          { label: 'Saldo do mês',            value: fmtKz(estatisticas.saldo),           color: estatisticas.saldo >= 0 ? '#00F5A0' : '#FF4B4B' },
          { label: 'Aguardam verificação',    value: String(estatisticas.pendentes),       color: '#FFD700' },
        ].map(({ label, value, color }) => (
          <div key={label} style={glassCardStyle}>
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Formulário nova aposta ── */}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Data</label>
              <input type="date" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Hora</label>
              <input type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Valor (Kz)</label>
              <input type="number" min="50" max="1000" step="50" value={formData.valorApostado} onChange={e => setFormData({ ...formData, valorApostado: parseInt(e.target.value) || 0 })} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Sessão</label>
              <select value={formData.sessao} onChange={e => setFormData({ ...formData, sessao: e.target.value as any })} style={inputStyle}>
                <option value="Fezada">☀️ Fezada</option>
                <option value="Kazola">🌙 Kazola</option>
                <option value="Eskebra">⚡ Eskebra</option>
                <option value="Aqueceu">🔥 Aqueceu</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#9CA3AF' }}>Combinação (5 números de 1 a 90)</label>
            <div className="flex gap-2 flex-wrap">
              {formData.combinacao.map((num, idx) => (
                <input
                  key={idx}
                  type="number"
                  min="1"
                  max="90"
                  value={num}
                  onChange={e => updateCombinacao(idx, e.target.value)}
                  style={{ ...inputStyle, width: '64px', textAlign: 'center', fontWeight: 700 }}
                  required
                />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Notas (opcional)</label>
            <textarea
              value={formData.notas}
              onChange={e => setFormData({ ...formData, notas: e.target.value })}
              style={{ ...inputStyle, width: '100%', minHeight: '60px' }}
              rows={2}
              placeholder="Observações sobre esta aposta..."
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #00F5A0, #00C896)', color: '#0B0F19', fontWeight: 800, fontSize: '18px', borderRadius: '16px', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,245,160,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            REGISTAR APOSTA
          </button>
        </form>
      </div>

      {/* ── Histórico de apostas ── */}
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
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {['Data/Hora', 'Combinação', 'Sessão', 'Valor', 'Acertos', 'Prémio', 'Estado', 'Acções'].map(h => (
                    <th key={h} style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registos.map(registo => {
                  const sc = sessaoConfig[registo.sessao] ?? { color: '#9CA3AF', icon: '🎲' };
                  return (
                    <tr key={registo.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

                      {/* Data/Hora */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#E5E7EB' }}>{registo.data}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{registo.hora}</div>
                      </td>

                      {/* ✅ Combinação — ChromeBall em vez de Ball */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {registo.combinacao.map((num, idx) => (
                            <ChromeBall
                              key={idx}
                              n={num}
                              size="sm"
                              variant="normal"
                              animated={false}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Sessão */}
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: `${sc.color}18`,
                          border: `1px solid ${sc.color}40`,
                          color: sc.color,
                        }}>
                          {sc.icon} {registo.sessao}
                        </span>
                      </td>

                      {/* Valor */}
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#E5E7EB' }}>
                        {fmtKz(registo.valorApostado)}
                      </td>

                      {/* Acertos */}
                      <td style={{ padding: '12px' }}>
                        {registo.acertos !== null ? (
                          <span style={{
                            fontWeight: 800,
                            fontSize: '16px',
                            color: registo.acertos >= 3 ? '#00F5A0' : registo.acertos >= 2 ? '#FFD700' : '#FF4B4B',
                          }}>
                            {registo.acertos}
                          </span>
                        ) : (
                          <span style={{ color: '#6B7280' }}>—</span>
                        )}
                      </td>

                      {/* Prémio */}
                      <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                        {registo.premioRecebido > 0 ? (
                          <span style={{ color: '#00F5A0', fontWeight: 700 }}>{fmtKz(registo.premioRecebido)}</span>
                        ) : (
                          <span style={{ color: '#6B7280' }}>—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: registo.resultado === 'verificado'
                            ? 'rgba(0,245,160,0.15)'
                            : 'rgba(255,215,0,0.15)',
                          border: registo.resultado === 'verificado'
                            ? '1px solid rgba(0,245,160,0.3)'
                            : '1px solid rgba(255,215,0,0.3)',
                          color: registo.resultado === 'verificado' ? '#00F5A0' : '#FFD700',
                        }}>
                          {registo.resultado === 'verificado' ? '✅ Verificado' : '⏳ Pendente'}
                        </span>
                      </td>

                      {/* Acções */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {registo.resultado === 'pendente' && (
                            <>
                              <button
                                onClick={() => handleVerificar(registo.id)}
                                style={{ color: '#00F5A0', fontSize: '11px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                Manual
                              </button>
                              <button
                                onClick={() => conferirAutomaticamente(registo)}
                                disabled={conferindoAuto === registo.id}
                                style={{
                                  color: '#60A5FA',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: 'none',
                                  border: 'none',
                                  cursor: conferindoAuto === registo.id ? 'wait' : 'pointer',
                                  opacity: conferindoAuto === registo.id ? 0.5 : 1,
                                }}
                              >
                                {conferindoAuto === registo.id ? '⏳ A conferir...' : 'Auto'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEliminar(registo.id)}
                            style={{ color: '#FF4B4B', fontSize: '11px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de verificação manual ── */}
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
import React, { useState, useEffect, useMemo } from 'react';
import { UserSession, shouldSync, updateLastSync } from '../lib/session';
import { saveUserData, loadUserData } from '../lib/apiClient';
import { generateLine } from '../lib/generator';
import { runAgents, AgentResult } from '../lib/agents';

interface PlanoAposta {
  id: string;
  data: string;
  sessao: 'Fezada' | 'Aqueceu' | 'Kazola' | 'Eskebra';
  numeros: number[];
  stake: number;
  modalidade?: 'chance2' | 'chance3' | 'chance4' | 'chance5';
  executado: boolean;
  agentResult?: AgentResult; // 🔥 resultado dos 10 filtros para esta combinação
}

interface PlanoSemanalProps {
  session: UserSession;
  weights: number[];
  onSessionUpdate?: (session: UserSession) => void;
}

const SESSOES = [
  { id: 'Fezada', icon: '☀️', hora: '10h00', cor: '#FF6B6B' },
  { id: 'Aqueceu', icon: '🔥', hora: '13h00', cor: '#FF9F4A' },
  { id: 'Kazola', icon: '🌙', hora: '16h00', cor: '#00F5A0' },
  { id: 'Eskebra', icon: '⚡', hora: '19h00', cor: '#A855F7' },
] as const;

type SessaoId = typeof SESSOES[number]['id'];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const MODALIDADES = [
  { value: 'chance2', label: 'Chance 2', numeros: 2 },
  { value: 'chance3', label: 'Chance 3', numeros: 3 },
  { value: 'chance4', label: 'Chance 4', numeros: 4 },
  { value: 'chance5', label: 'Chance 5', numeros: 5 },
] as const;

type ModalidadeId = typeof MODALIDADES[number]['value'];

const getStorageKey = (email: string) => `kazola_plano_v2_${email}`;
const fmtKz = (v: number) => v.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });

const getSessaoHora = (sessaoId: SessaoId): number => {
  const map: Record<SessaoId, number> = { Fezada: 10, Aqueceu: 13, Kazola: 16, Eskebra: 19 };
  return map[sessaoId];
};

// Formata a data em fuso horário LOCAL (evita o bug do toISOString(), que
// converte para UTC e pode "saltar" o dia perto da meia-noite em Angola/UTC+1).
const fmtDateLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ============================================================
// 🔥 GERAÇÃO VALIDADA — cada combinação passa pelos 10 agentes
// (substitui o antigo gerarNumeros() que usava Math.random() puro
// e ignorava completamente os `weights` e o sistema de filtros).
// ============================================================
function gerarNumerosValidados(
  weights: number[],
  modalidade: ModalidadeId,
  orcamento: number,
  stakeVal: number,
  maxTentativas = 15,
): { numeros: number[]; agentResult: AgentResult } {
  let melhor: { numeros: number[]; agentResult: AgentResult } | null = null;

  for (let i = 0; i < maxTentativas; i++) {
    const linha = generateLine(weights, 'kazola', {
      exclude: [],
      parityBias: 'equilibrado',
      modalidade,
    });

    if (!linha) continue;

    const agentResult = runAgents({
      nums: linha.numbers,
      modalidade,
      stakePerLine: stakeVal,
      orcamento,
    });

    if (agentResult.approved) {
      return { numeros: linha.numbers, agentResult };
    }

    if (!melhor || agentResult.totalScore > melhor.agentResult.totalScore) {
      melhor = { numeros: linha.numbers, agentResult };
    }
  }

  // Nenhuma combinação atingiu o threshold nas tentativas disponíveis.
  // Devolvemos a melhor encontrada SEM forjar aprovação — o agentResult.approved
  // continua a refletir a verdade (false), para não enganar o utilizador.
  if (melhor) return melhor;

  // Fallback de segurança absoluto: gera uma linha simples e corre os agentes
  // mesmo assim, para nunca devolver uma combinação sem auditoria.
  const fallbackNums: number[] = [];
  const usados = new Set<number>();
  const pickSize = MODALIDADES.find(m => m.value === modalidade)!.numeros;
  while (fallbackNums.length < pickSize) {
    const n = Math.floor(Math.random() * 90) + 1;
    if (!usados.has(n)) {
      usados.add(n);
      fallbackNums.push(n);
    }
  }
  fallbackNums.sort((a, b) => a - b);
  const agentResult = runAgents({
    nums: fallbackNums,
    modalidade,
    stakePerLine: stakeVal,
    orcamento,
  });
  return { numeros: fallbackNums, agentResult };
}

function getInicioSemana(): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dia = hoje.getDay();
  const diff = dia === 0 ? 0 : dia;
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - diff);
  return inicio;
}

// Remove do plano qualquer entrada cujo DIA já passou por completo
// (mantém o dia de hoje, mesmo que algumas sessões já tenham ocorrido,
// para o utilizador ainda ver/marcar as apostas feitas hoje).
function removerDiasPassados(lista: PlanoAposta[]): PlanoAposta[] {
  const hojeStr = fmtDateLocal(new Date());
  return lista.filter(p => p.data >= hojeStr);
}

const PremiumBall: React.FC<{ n: number; executado?: boolean }> = ({ n, executado = false }) => (
  <div style={{
    width: 46,
    height: 46,
    borderRadius: '50%',
    background: executado
      ? 'radial-gradient(circle at 32% 32%, #86EFAC, #22C55E 45%, #15803D)'
      : 'radial-gradient(circle at 32% 32%, #FFF9C4, #FFD700 45%, #B8860B)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '1.05rem',
    color: executado ? '#0F172A' : '#1a1000',
    boxShadow: executado
      ? '0 0 12px rgba(134, 239, 172, 0.6), inset 0 3px 8px rgba(255,255,255,0.9), inset 0 -3px 6px rgba(0,0,0,0.4)'
      : '0 0 14px rgba(255, 215, 0, 0.7), inset 0 3px 8px rgba(255,255,255,0.85), inset 0 -4px 8px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.5)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: '12%', left: '22%', width: '38%', height: '28%', borderRadius: '50%', background: 'rgba(255,255,255,0.75)' }} />
    <span style={{ position: 'relative', zIndex: 2 }}>{String(n).padStart(2, '0')}</span>
  </div>
);

export default function PlanoSemanal({ session, weights, onSessionUpdate }: PlanoSemanalProps) {
  const [orcamento, setOrcamento] = useState(3500);
  const [stakeVal, setStakeVal] = useState(100);
  const [modalidade, setModalidade] = useState<ModalidadeId>('chance5');
  const [sessoesAtivas, setSessoesAtivas] = useState<Set<SessaoId>>(new Set(['Fezada', 'Aqueceu', 'Kazola', 'Eskebra']));
  const [diasAtivos, setDiasAtivos] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));

  const [plano, setPlano] = useState<PlanoAposta[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNums, setEditNums] = useState<number[]>([]);

  const numerosPorModalidade = MODALIDADES.find(m => m.value === modalidade)!.numeros;

  const combinacoesPorSemana = useMemo(() => {
    const slots = diasAtivos.size * sessoesAtivas.size;
    return Math.min(slots, Math.floor(orcamento / stakeVal));
  }, [orcamento, stakeVal, diasAtivos.size, sessoesAtivas.size]);

  const custoReal = combinacoesPorSemana * stakeVal;
  const sobra = orcamento - custoReal;

  useEffect(() => {
    const key = getStorageKey(session.email);
    const local = localStorage.getItem(key);
    if (local) {
      try {
        let loaded = JSON.parse(local);
        if (Array.isArray(loaded)) {
          loaded = loaded.map((p: any) => ({ ...p, modalidade: p.modalidade || 'chance5' }));
          loaded = removerDiasPassados(loaded);
        }
        setPlano(loaded);
      } catch {}
    }

    if (!shouldSync(session)) return;

    setSyncing(true);
    loadUserData(session.email, 'plano_v2').then(result => {
      if (result.ok && result.records?.length) {
        const record = result.records.find((r: any) => r.record_id === 'plano_atual');
        if (record) {
          try {
            let data = JSON.parse(record.data);
            if (Array.isArray(data)) {
              data = data.map((p: any) => ({ ...p, modalidade: p.modalidade || 'chance5' }));
              data = removerDiasPassados(data);
              setPlano(data);
              localStorage.setItem(key, JSON.stringify(data));
            }
          } catch {}
        }
      }
    }).catch(() => setSyncError('Erro ao carregar do servidor'))
      .finally(() => setSyncing(false));
  }, [session.email]);

  const guardar = async (novo: PlanoAposta[]) => {
    const key = getStorageKey(session.email);
    localStorage.setItem(key, JSON.stringify(novo));
    setPlano(novo);

    if (shouldSync(session)) {
      try {
        await saveUserData(session.email, 'plano_v2', 'plano_atual', JSON.stringify(novo));
        if (onSessionUpdate) onSessionUpdate(updateLastSync(session));
      } catch {
        setSyncError('Guardado localmente. Erro ao sincronizar.');
      }
    }
  };

  const gerarPlano = async () => {
    setGerando(true);
    try {
      const agora = new Date();
      const hoje0h = new Date(agora);
      hoje0h.setHours(0, 0, 0, 0);
      const horaAtual = agora.getHours();

      const inicio = getInicioSemana();
      const slots: { data: string; sessao: SessaoId }[] = [];

      for (let d = 0; d < 7; d++) {
        if (!diasAtivos.has(d)) continue;

        const dt = new Date(inicio);
        dt.setDate(inicio.getDate() + d);
        dt.setHours(0, 0, 0, 0);

        // Ignora o DIA INTEIRO se já passou — antes só se filtrava "hoje",
        // o que deixava entrar Domingo..Quinta já decorridos numa semana
        // gerada a meio (ex.: hoje sexta-feira).
        if (dt.getTime() < hoje0h.getTime()) continue;

        const dataStr = fmtDateLocal(dt);
        const ehHoje = dt.getTime() === hoje0h.getTime();

        for (const s of SESSOES) {
          if (!sessoesAtivas.has(s.id)) continue;

          if (ehHoje) {
            const horaSessao = getSessaoHora(s.id);
            if (horaSessao <= horaAtual) continue; // Ignora sessões de hoje já passadas/atuais
          }
          slots.push({ data: dataStr, sessao: s.id });
        }
      }

      const totalSlots = Math.min(slots.length, Math.floor(orcamento / stakeVal));
      const slotsAGerar = slots.slice(0, totalSlots);

      // 🔥 Cada combinação é gerada com o motor 'kazola' (generator.ts) e
      // validada pelos 10 agentes (agents.ts) antes de entrar no plano.
      const novosPlano: PlanoAposta[] = slotsAGerar.map((slot, i) => {
        const { numeros, agentResult } = gerarNumerosValidados(
          weights,
          modalidade,
          orcamento,
          stakeVal,
        );

        return {
          id: `p-${Date.now()}-${i}`,
          data: slot.data,
          sessao: slot.sessao,
          numeros,
          stake: stakeVal,
          modalidade,
          executado: false,
          agentResult,
        };
      });

      await guardar(novosPlano);
    } finally {
      setGerando(false);
    }
  };

  const toggleSessao = (s: SessaoId) => {
    setSessoesAtivas(prev => {
      const next = new Set(prev);
      if (next.has(s) && next.size === 1) return prev;
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const toggleDia = (d: number) => {
    setDiasAtivos(prev => {
      const next = new Set(prev);
      if (next.has(d) && next.size === 1) return prev;
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const marcarExecutado = (id: string) => guardar(plano.map(p => p.id === id ? { ...p, executado: true } : p));
  const eliminar = (id: string) => window.confirm('Eliminar esta aposta?') && guardar(plano.filter(p => p.id !== id));
  const limparTudo = () => window.confirm('Limpar todo o plano?') && guardar([]);

  const iniciarEdicao = (p: PlanoAposta) => {
    setEditandoId(p.id);
    setEditNums([...p.numeros]);
  };

  // 🔥 Re-validar manualmente uma combinação editada à mão pelo utilizador
  const guardarEdicao = () => {
    if (!editandoId) return;
    const uniq = [...new Set(editNums.filter(n => n >= 1 && n <= 90))];
    if (uniq.length !== numerosPorModalidade) {
      alert(`Deve ter exatamente ${numerosPorModalidade} números únicos`);
      return;
    }
    const sorted = uniq.sort((a, b) => a - b);
    const apostaAtual = plano.find(p => p.id === editandoId);
    const modalidadeAposta = (apostaAtual?.modalidade || modalidade) as ModalidadeId;
    const agentResult = runAgents({
      nums: sorted,
      modalidade: modalidadeAposta,
      stakePerLine: apostaAtual?.stake ?? stakeVal,
      orcamento,
    });
    guardar(plano.map(p => p.id === editandoId ? { ...p, numeros: sorted, agentResult } : p));
    setEditandoId(null);
  };

  const porData = useMemo(() => {
    const map = new Map<string, PlanoAposta[]>();
    plano.forEach(p => {
      if (!map.has(p.data)) map.set(p.data, []);
      map.get(p.data)!.push(p);
    });

    map.forEach(apostas => {
      apostas.sort((a, b) => {
        const order: Record<string, number> = { Fezada: 0, Aqueceu: 1, Kazola: 2, Eskebra: 3 };
        return (order[a.sessao] ?? 0) - (order[b.sessao] ?? 0);
      });
    });

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [plano]);

  const executadas = plano.filter(p => p.executado).length;
  const pendentes = plano.length - executadas;

  const card: React.CSSProperties = {
    background: 'rgba(17,24,39,0.75)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0,245,160,0.25)',
    borderRadius: 16,
    padding: 20,
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.45)',
    color: '#E5E7EB',
    border: '1px solid rgba(0,245,160,0.4)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 15,
    outline: 'none',
    width: '100%',
  };

  return (
    <div className="space-y-6">
      <style>{`
        .ps-toggle { transition: all .18s; }
        .ps-toggle.active { border-color: var(--c) !important; background: color-mix(in srgb, var(--c) 18%, transparent) !important; color: var(--c) !important; }
        .ps-toggle:not(.active) { opacity: .45; }
        .ps-row:hover { background: rgba(255,255,255,.04) !important; }
      `}</style>

      {syncing && <div style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.25)', borderRadius: 12, padding: '10px 16px', color: '#60A5FA', textAlign: 'center' }}>🔄 A sincronizar…</div>}
      {syncError && <div style={{ background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.25)', borderRadius: 12, padding: '10px 16px', color: '#FFD700', textAlign: 'center' }}>⚠️ {syncError}</div>}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>📅</span>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#00F5A0' }}>Plano Semanal de Apostas</h3>
        </div>
        <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 24 }}>
          Apenas sessões futuras a partir de agora. Cada combinação é validada pelos 10 filtros de auditoria.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 10 }}>MODALIDADE</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODALIDADES.map(m => (
              <button
                key={m.value}
                onClick={() => setModalidade(m.value)}
                className={`ps-toggle${modalidade === m.value ? ' active' : ''}`}
                style={{ '--c': '#00F5A0', padding: '8px 16px', borderRadius: 24, border: '1px solid rgba(0,245,160,0.5)', background: modalidade === m.value ? 'rgba(0,245,160,0.15)' : 'transparent', color: '#E5E7EB', fontSize: 13, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties}
              >
                {m.label} ({m.numeros} números)
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>ORÇAMENTO SEMANAL (Kz)</label>
            <input type="number" min={100} max={50000} step={100} value={orcamento} onChange={e => setOrcamento(Math.max(100, parseInt(e.target.value) || 100))} style={inputStyle} />
            <input type="range" min={100} max={10000} step={100} value={Math.min(orcamento, 10000)} onChange={e => setOrcamento(parseInt(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>VALOR POR APOSTA (Kz)</label>
            <select value={stakeVal} onChange={e => setStakeVal(parseInt(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
              {[50, 100, 150, 200, 250, 300, 400, 500, 750, 1000].map(v => (
                <option key={v} value={v}>{v} Kz</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 10 }}>SESSÕES A INCLUIR</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SESSOES.map(s => (
              <button key={s.id} className={`ps-toggle${sessoesAtivas.has(s.id) ? ' active' : ''}`} style={{ '--c': s.cor, padding: '8px 14px', borderRadius: 24, border: `1px solid ${s.cor}55`, background: 'transparent', color: '#9CA3AF', fontSize: 13, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties} onClick={() => toggleSessao(s.id)}>
                {s.icon} {s.id} <span style={{ fontWeight: 400, fontSize: 11, opacity: .7 }}>({s.hora})</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'block', marginBottom: 10 }}>DIAS DA SEMANA</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {DIAS_SEMANA.map((d, i) => (
              <button key={i} className={`ps-toggle${diasAtivos.has(i) ? ' active' : ''}`} style={{ '--c': '#00F5A0', flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid rgba(0,245,160,.3)', background: 'transparent', color: '#9CA3AF', fontSize: 12, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties} onClick={() => toggleDia(i)}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={gerarPlano}
            disabled={gerando}
            style={{
              flex: 1,
              padding: '13px',
              background: gerando ? 'rgba(0,245,160,.35)' : 'linear-gradient(135deg,#00F5A0,#00C896)',
              color: '#0B0F19',
              fontWeight: 800,
              fontSize: 15,
              borderRadius: 14,
              border: 'none',
              cursor: gerando ? 'not-allowed' : 'pointer',
            }}
          >
            {gerando ? '🧠 A validar combinações…' : `🎯 GERAR PLANO SEMANAL (${modalidade.toUpperCase()})`}
          </button>
          {plano.length > 0 && (
            <button onClick={limparTudo} style={{ padding: '13px 18px', background: 'rgba(255,75,75,.1)', border: '1px solid rgba(255,75,75,.3)', color: '#FF4B4B', fontWeight: 700, fontSize: 14, borderRadius: 14, cursor: 'pointer' }}>
              🗑️ Limpar
            </button>
          )}
        </div>
      </div>

      {plano.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr) repeat(2,1fr)', gap: 10 }}>
          {[
            { label: 'Total apostas', value: plano.length, color: '#E5E7EB' },
            { label: 'Custo real', value: fmtKz(plano.reduce((s, p) => s + p.stake, 0)), color: '#FF4B4B' },
            { label: 'Executadas', value: `${executadas}/${plano.length}`, color: '#00F5A0' },
            { label: 'Pendentes', value: pendentes, color: '#FFD700' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...card, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {porData.map(([data, apostas]) => {
        const dt = new Date(data + 'T12:00:00');
        const diaNome = DIAS_SEMANA_FULL[dt.getDay()];
        const dataFmt = dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' });
        const execDia = apostas.filter(a => a.executado).length;

        return (
          <div key={data} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(0,245,160,.15)', border: '1px solid rgba(0,245,160,.3)', borderRadius: 10, padding: '6px 12px', textAlign: 'center', minWidth: 52 }}>
                  <div style={{ fontSize: 10, color: '#00F5A0', fontWeight: 700 }}>{DIAS_SEMANA[dt.getDay()]}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#E5E7EB' }}>{dt.getDate()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#E5E7EB' }}>{diaNome}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{dataFmt}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', background: 'rgba(255,255,255,.05)', padding: '4px 10px', borderRadius: 20 }}>
                {execDia}/{apostas.length} feitas
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {apostas.map(aposta => {
                const sessaoInfo = SESSOES.find(s => s.id === aposta.sessao)!;
                const mod = aposta.modalidade || 'chance5';
                const result = aposta.agentResult;
                const isEditing = editandoId === aposta.id;

                return (
                  <div key={aposta.id} className="ps-row" style={{
                    background: aposta.executado ? 'rgba(0,245,160,.05)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${aposta.executado ? 'rgba(0,245,160,.25)' : 'rgba(255,255,255,.07)'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ color: sessaoInfo.cor, fontWeight: 700 }}>{sessaoInfo.icon} {aposta.sessao}</span>
                        <span style={{ color: '#6B7280' }}>{sessaoInfo.hora}</span>
                        <span style={{ fontSize: 12, background: 'rgba(0,245,160,.15)', color: '#00F5A0', padding: '2px 8px', borderRadius: 20 }}>{mod.toUpperCase()}</span>
                        {result && (
                          <span
                            title={result.summary}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              background: result.approved ? 'rgba(0,245,160,.15)' : 'rgba(255,75,75,.12)',
                              color: result.approved ? '#00F5A0' : '#FF4B4B',
                              padding: '2px 8px',
                              borderRadius: 20,
                            }}
                          >
                            {result.approved ? '✅' : '⚠️'} {result.totalScore}/100
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!aposta.executado && !isEditing && (
                          <button onClick={() => marcarExecutado(aposta.id)} style={{ fontSize: 11, fontWeight: 700, color: '#00F5A0', background: 'rgba(0,245,160,.1)', border: '1px solid rgba(0,245,160,.3)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>✅ Feita</button>
                        )}
                        {!isEditing && (
                          <button onClick={() => iniciarEdicao(aposta)} style={{ fontSize: 11, fontWeight: 700, color: '#F5C518', background: 'rgba(245,197,24,.08)', border: '1px solid rgba(245,197,24,.25)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>✏️</button>
                        )}
                        <button onClick={() => eliminar(aposta.id)} style={{ fontSize: 11, fontWeight: 700, color: '#FF4B4B', background: 'rgba(255,75,75,.08)', border: '1px solid rgba(255,75,75,.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>

                    {!isEditing && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {aposta.numeros.map((n, i) => (
                          <PremiumBall key={i} n={n} executado={aposta.executado} />
                        ))}
                      </div>
                    )}

                    {isEditing && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {editNums.map((n, i) => (
                            <input
                              key={i}
                              type="number"
                              min={1}
                              max={90}
                              value={n}
                              onChange={e => {
                                const v = Math.min(90, Math.max(1, parseInt(e.target.value) || 1));
                                setEditNums(prev => prev.map((x, idx) => idx === i ? v : x));
                              }}
                              style={{ ...inputStyle, width: 64, textAlign: 'center' }}
                            />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={guardarEdicao} style={{ fontSize: 12, fontWeight: 700, color: '#0B0F19', background: '#00F5A0', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                            💾 Guardar e revalidar
                          </button>
                          <button onClick={() => setEditandoId(null)} style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', background: 'transparent', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {result && !result.approved && !isEditing && (
                      <p style={{ marginTop: 8, fontSize: 12, color: '#FF9F4A' }}>
                        ⚠️ {result.summary}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {plano.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 60 }}>📅</div>
          <p style={{ color: '#E5E7EB', fontWeight: 600 }}>Nenhum plano gerado</p>
          <p style={{ color: '#6B7280', fontSize: 13 }}>Clique em Gerar Plano Semanal</p>
        </div>
      )}
    </div>
  );
}

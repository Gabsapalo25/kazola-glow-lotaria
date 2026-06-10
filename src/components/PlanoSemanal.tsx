import React, { useState, useEffect, useMemo } from 'react';
import Card from './Card';
import Ball from './Ball';
import { UserSession, shouldSync, updateLastSync } from '../lib/session';
import { saveUserData, loadUserData, deleteUserData } from '../lib/apiClient';

interface PlanoAposta {
  id: string;
  data: string;
  estrategia: string;
  numeros: number[];
  stake: number;
  tipo: 'main' | 'backup';
  executado: boolean;
}

interface Draw {
  id: string;
  date: string;
  numbers: number[];
}

interface PlanoSemanalProps {
  session: UserSession;
  weights: number[];
  hotCold?: { hot: number[]; cold: number[] };
  gaps?: { n: number; gap: number }[];
  draws?: Draw[];
  onSessionUpdate?: (session: UserSession) => void;
}

const getStorageKey = (email: string) => `kazola_plano_semanal_${email}`;

const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// Função para gerar números aleatórios baseados em pesos
const gerarCombinacaoPonderada = (weights: number[]): number[] => {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) {
    const nums: number[] = [];
    while (nums.length < 5) {
      const n = Math.floor(Math.random() * 90) + 1;
      if (!nums.includes(n)) nums.push(n);
    }
    return nums.sort((a, b) => a - b);
  }
  
  const nums: number[] = [];
  while (nums.length < 5) {
    let r = Math.random() * total;
    let idx = 1;
    while (r > weights[idx]) {
      r -= weights[idx];
      idx++;
    }
    if (!nums.includes(idx)) nums.push(idx);
  }
  return nums.sort((a, b) => a - b);
};

const PlanoSemanal: React.FC<PlanoSemanalProps> = ({ 
  session, 
  weights, 
  hotCold = { hot: [], cold: [] }, 
  gaps = [], 
  draws = [],
  onSessionUpdate 
}) => {
  const [plano, setPlano] = useState<PlanoAposta[]>([]);
  const [apostasMain, setApostasMain] = useState<number>(7);
  const [apostasBackup, setApostasBackup] = useState<number>(2);
  const [stake, setStake] = useState<number>(100);
  const [sincronizando, setSincronizando] = useState(false);
  const [erroSync, setErroSync] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNumeros, setEditandoNumeros] = useState<number[]>([]);

  // Carregar plano do localStorage e sincronizar com servidor
  useEffect(() => {
    const carregarPlano = async () => {
      const storageKey = getStorageKey(session.email);
      const localData = localStorage.getItem(storageKey);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setPlano(parsed);
        } catch (e) {
          console.error('Erro ao carregar plano local:', e);
        }
      }

      if (shouldSync(session)) {
        setSincronizando(true);
        try {
          const result = await loadUserData(session.email, 'plano_semanal');
          if (result.ok && result.records) {
            const serverData: PlanoAposta[] = [];
            for (const record of result.records) {
              try {
                const parsed = JSON.parse(record.data);
                if (parsed.id && parsed.numeros) {
                  serverData.push(parsed);
                }
              } catch (e) {
                console.error('Erro ao fazer parse:', e);
              }
            }
            if (serverData.length > 0) {
              setPlano(serverData);
              localStorage.setItem(storageKey, JSON.stringify(serverData));
            }
          }
        } catch (error) {
          console.error('Erro ao sincronizar plano:', error);
          setErroSync('Erro ao sincronizar com o servidor');
        } finally {
          setSincronizando(false);
        }
      }
    };

    carregarPlano();
  }, [session.email, session]);

  // Salvar plano no localStorage e sincronizar
  const salvarPlano = async (novoPlano: PlanoAposta[]) => {
    const storageKey = getStorageKey(session.email);
    localStorage.setItem(storageKey, JSON.stringify(novoPlano));
    setPlano(novoPlano);

    if (shouldSync(session)) {
      for (const aposta of novoPlano) {
        try {
          await saveUserData(
            session.email,
            'plano_semanal',
            aposta.id,
            JSON.stringify(aposta)
          );
        } catch (error) {
          console.error('Erro ao sincronizar aposta:', error);
          setErroSync('Erro ao sincronizar. Os dados estão guardados localmente.');
        }
      }
      
      if (onSessionUpdate) {
        onSessionUpdate(updateLastSync(session));
      }
    }
  };

  // Gerar plano semanal
  const gerarPlano = () => {
    if (apostasMain + apostasBackup > 21) {
      alert('Máximo de 21 apostas por semana (14 principais + 7 reservas)');
      return;
    }

    const novoPlano: PlanoAposta[] = [];
    const hoje = new Date();
    const diaSemanaAtual = hoje.getDay();
    const diasAteSegunda = diaSemanaAtual === 0 ? 6 : diaSemanaAtual - 1;
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - diasAteSegunda);

    // Gerar apostas principais
    for (let i = 0; i < apostasMain; i++) {
      const dataAposta = new Date(inicioSemana);
      dataAposta.setDate(inicioSemana.getDate() + i);
      
      let estrategia = 'equilibrada';
      if (i % 3 === 0 && hotCold.hot.length > 0) estrategia = 'hot';
      else if (i % 3 === 1 && hotCold.cold.length > 0) estrategia = 'cold';
      else if (i % 3 === 2 && gaps.length > 0) estrategia = 'gap';
      
      const numeros = gerarCombinacaoPonderada(weights);
      
      novoPlano.push({
        id: `main-${i}-${Date.now()}`,
        data: dataAposta.toISOString().split('T')[0],
        estrategia,
        numeros,
        stake,
        tipo: 'main',
        executado: false,
      });
    }

    // Gerar apostas de reserva
    for (let i = 0; i < apostasBackup; i++) {
      const dataAposta = new Date(inicioSemana);
      dataAposta.setDate(inicioSemana.getDate() + apostasMain + i);
      
      const numeros = gerarCombinacaoPonderada(weights);
      
      novoPlano.push({
        id: `backup-${i}-${Date.now()}`,
        data: dataAposta.toISOString().split('T')[0],
        estrategia: 'backup',
        numeros,
        stake,
        tipo: 'backup',
        executado: false,
      });
    }

    salvarPlano(novoPlano);
  };

  // Marcar como executado
  const marcarExecutado = async (id: string) => {
    const novoPlano = plano.map(aposta =>
      aposta.id === id ? { ...aposta, executado: true } : aposta
    );
    await salvarPlano(novoPlano);
  };

  // Eliminar aposta
  const eliminarAposta = async (id: string) => {
    if (window.confirm('Tens a certeza que queres eliminar esta aposta?')) {
      const novoPlano = plano.filter(aposta => aposta.id !== id);
      await salvarPlano(novoPlano);
      
      if (shouldSync(session)) {
        try {
          await deleteUserData(session.email, id, 'plano_semanal');
        } catch (error) {
          console.error('Erro ao eliminar do servidor:', error);
        }
      }
    }
  };

  // Editar aposta
  const iniciarEdicao = (aposta: PlanoAposta) => {
    setEditandoId(aposta.id);
    setEditandoNumeros([...aposta.numeros]);
  };

  const salvarEdicao = async () => {
    if (editandoId && editandoNumeros.length === 5 && new Set(editandoNumeros).size === 5) {
      const novoPlano = plano.map(aposta =>
        aposta.id === editandoId ? { ...aposta, numeros: [...editandoNumeros] } : aposta
      );
      await salvarPlano(novoPlano);
      setEditandoId(null);
      setEditandoNumeros([]);
    } else {
      alert('Insere 5 números válidos sem repetições');
    }
  };

  const atualizarNumeroEdicao = (idx: number, valor: string) => {
    const num = parseInt(valor);
    if (!isNaN(num) && num >= 1 && num <= 90) {
      const novos = [...editandoNumeros];
      novos[idx] = num;
      setEditandoNumeros(novos);
    }
  };

  // Limpar plano
  const limparPlano = async () => {
    if (window.confirm('Tens a certeza que queres limpar todo o plano semanal?')) {
      await salvarPlano([]);
      if (shouldSync(session)) {
        for (const aposta of plano) {
          try {
            await deleteUserData(session.email, aposta.id, 'plano_semanal');
          } catch (error) {
            console.error('Erro ao eliminar do servidor:', error);
          }
        }
      }
    }
  };

  // Agrupar apostas por dia
  const apostasPorDia = useMemo(() => {
    const agrupadas: Record<string, PlanoAposta[]> = {};
    
    for (let i = 0; i < 7; i++) {
      const hoje = new Date();
      const diaSemanaAtual = hoje.getDay();
      const diasAteSegunda = diaSemanaAtual === 0 ? 6 : diaSemanaAtual - 1;
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - diasAteSegunda);
      
      const data = new Date(inicioSemana);
      data.setDate(inicioSemana.getDate() + i);
      const dataStr = data.toISOString().split('T')[0];
      agrupadas[dataStr] = [];
    }
    
    plano.forEach(aposta => {
      if (agrupadas[aposta.data]) {
        agrupadas[aposta.data].push(aposta);
      }
    });
    
    return agrupadas;
  }, [plano]);

  const custoTotal = plano.reduce((sum, aposta) => sum + aposta.stake, 0);
  const executadas = plano.filter(aposta => aposta.executado).length;
  const principais = plano.filter(aposta => aposta.tipo === 'main').length;
  const reservas = plano.filter(aposta => aposta.tipo === 'backup').length;

  // Estilos com bordas verdes
  const glassCardStyle: React.CSSProperties = {
    background: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 245, 160, 0.4)',
    borderRadius: '16px',
    padding: '20px',
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.4)',
    color: '#E5E7EB',
    border: '1px solid rgba(0, 245, 160, 0.4)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  };

  const numberInputStyle: React.CSSProperties = {
    width: '60px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '16px',
    padding: '8px 4px',
    borderRadius: '10px',
    border: '1px solid rgba(0, 245, 160, 0.5)',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#00F5A0',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  const buttonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #00F5A0, #00C896)',
    color: '#0B0F19',
    fontWeight: 800,
    fontSize: '16px',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: '14px 20px',
  };

  const buttonCancelStyle: React.CSSProperties = {
    background: 'rgba(17, 24, 39, 0.7)',
    border: '1px solid rgba(0, 245, 160, 0.4)',
    color: '#F3F4F6',
    fontWeight: 700,
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    padding: '14px 20px',
  };

  return (
    <div className="space-y-6">
      {sincronizando && (
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(0, 245, 160, 0.3)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: '#60a5fa', fontSize: '14px' }}>
          🔄 A sincronizar com o servidor...
        </div>
      )}
      {erroSync && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(0, 245, 160, 0.3)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: '#fbbf24', fontSize: '14px' }}>
          ⚠️ {erroSync}
        </div>
      )}
      {shouldSync(session) && !sincronizando && (
        <div style={{ background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.3)', borderRadius: '12px', padding: '8px', textAlign: 'center', color: '#00F5A0', fontSize: '12px' }}>
          ☁️ Plano sincronizado na nuvem — disponível em todos os dispositivos
        </div>
      )}

      <div style={glassCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#00F5A0' }}>Plano Semanal de Apostas</h3>
        </div>
        <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '14px' }}>
          Gera um plano de apostas para a semana com base nas tuas estatísticas. 
          Podes editar, marcar como executado ou eliminar cada aposta.
        </p>

        {/* Configuração do plano */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Apostas principais</label>
            <input
              type="number"
              min={1}
              max={14}
              value={apostasMain}
              onChange={(e) => setApostasMain(Math.min(14, Math.max(1, parseInt(e.target.value) || 1)))}
              style={inputStyle}
            />
            <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>🎯 Máx 14 (uma por dia)</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Apostas reserva</label>
            <input
              type="number"
              min={0}
              max={7}
              value={apostasBackup}
              onChange={(e) => setApostasBackup(Math.min(7, Math.max(0, parseInt(e.target.value) || 0)))}
              style={inputStyle}
            />
            <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>📌 Máx 7</p>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px', display: 'block', color: '#9CA3AF' }}>Valor por aposta (Kz)</label>
            <input
              type="number"
              min={50}
              max={1000}
              step={50}
              value={stake}
              onChange={(e) => setStake(Math.min(1000, Math.max(50, parseInt(e.target.value) || 50)))}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={gerarPlano}
            style={buttonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,245,160,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            className="flex-1"
          >
            🎯 GERAR PLANO SEMANAL
          </button>
          {plano.length > 0 && (
            <button
              onClick={limparPlano}
              style={buttonCancelStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 245, 160, 0.1)'; e.currentTarget.style.borderColor = '#00F5A0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(17, 24, 39, 0.7)'; e.currentTarget.style.borderColor = 'rgba(0, 245, 160, 0.4)'; }}
            >
              🗑️ Limpar Plano
            </button>
          )}
        </div>
      </div>

      {/* Resumo do plano */}
      {plano.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(0, 245, 160, 0.4)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Total de apostas</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6' }}>{plano.length}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{principais} principais · {reservas} reserva</div>
          </div>
          <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(0, 245, 160, 0.4)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Custo total</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#FF4B4B' }}>
              {custoTotal.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
            </div>
          </div>
          <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(0, 245, 160, 0.4)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Executadas</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#00F5A0' }}>{executadas}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{((executadas / plano.length) * 100).toFixed(0)}% concluído</div>
          </div>
          <div style={{ background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(0, 245, 160, 0.4)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Prémio potencial</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFD700' }}>
              {(stake * 100000).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>se 5 acertos</div>
          </div>
        </div>
      )}

      {/* Plano por dia */}
      {Object.entries(apostasPorDia).map(([data, apostas]) => {
        const dataObj = new Date(data);
        const diaSemana = diasSemana[dataObj.getDay()];
        const dataFormatada = dataObj.toLocaleDateString('pt-PT');
        
        if (apostas.length === 0) return null;
        
        return (
          <div key={data} style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>📆</span>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#00F5A0' }}>{diaSemana}, {dataFormatada}</h3>
            </div>
            <div className="space-y-3">
              {apostas.map((aposta) => (
                <div key={aposta.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0, 245, 160, 0.3)', borderRadius: '12px', padding: '12px' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span style={aposta.tipo === 'main' 
                        ? { background: 'rgba(59,130,246,0.2)', color: '#60a5fa', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(96,165,250,0.3)' }
                        : { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: '999px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, border: '1px solid rgba(251,191,36,0.3)' }
                      }>
                        {aposta.tipo === 'main' ? '🎯 Principal' : '📌 Reserva'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>{aposta.estrategia}</span>
                      <span style={{ fontSize: '11px', color: '#00F5A0' }}>{aposta.stake} Kz</span>
                    </div>
                    <div className="flex gap-2">
                      {!aposta.executado && (
                        <button
                          onClick={() => marcarExecutado(aposta.id)}
                          style={{ color: '#00F5A0', fontSize: '11px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          ✅ Marcar feito
                        </button>
                      )}
                      <button
                        onClick={() => iniciarEdicao(aposta)}
                        style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => eliminarAposta(aposta.id)}
                        style={{ color: '#FF4B4B', fontSize: '11px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                  
                  {editandoId === aposta.id ? (
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editandoNumeros.map((num, i) => (
                          <input
                            key={i}
                            type="number"
                            min={1}
                            max={90}
                            value={num || ''}
                            onChange={(e) => atualizarNumeroEdicao(i, e.target.value)}
                            style={numberInputStyle}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={salvarEdicao}
                          style={{ background: '#00F5A0', color: '#0B0F19', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                        >
                          💾 Salvar
                        </button>
                        <button
                          onClick={() => { setEditandoId(null); setEditandoNumeros([]); }}
                          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(0,245,160,0.3)', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {aposta.numeros.map((num, i) => (
                        <Ball key={i} n={num} size="sm" />
                      ))}
                      {aposta.executado && (
                        <span style={{ color: '#00F5A0', fontSize: '11px', fontWeight: 700, marginLeft: '8px' }}>✓ Executado</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {plano.length === 0 && (
        <div style={glassCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#00F5A0' }}>Plano Semanal</h3>
          </div>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
            <p style={{ color: '#F3F4F6', fontWeight: 600, marginBottom: '4px' }}>Nenhum plano gerado</p>
            <p style={{ color: '#6B7280', fontSize: '14px' }}>Configura as opções acima e gera o teu plano semanal</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanoSemanal;
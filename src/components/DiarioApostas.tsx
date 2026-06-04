// src/components/DiarioApostas.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Ball from './Ball';
import Card from './Card';
import Modal from './Modal';
import { UserSession, shouldSync, updateLastSync } from '../lib/session';
import { saveUserData, loadUserData, deleteUserData } from '../lib/apiClient';

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

interface DiarioApostasProps {
  session: UserSession;
  onSessionUpdate?: (session: UserSession) => void;
}

const getStorageKey = (email: string) => `kazola_diario_${email}`;

const fmtKz = (value: number) =>
  value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });

const DiarioApostas: React.FC<DiarioApostasProps> = ({ session, onSessionUpdate }) => {
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

  // ==================== SINCRONIZAÇÃO COM O SERVIDOR ====================

  // Carregar registos do servidor (cross-device) + localStorage (cache)
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
            // Verifica se tem a estrutura de RegistoAposta
            if (parsedData.id && parsedData.combinacao) {
              serverRegistos.push(parsedData as RegistoAposta);
            }
          } catch (e) {
            console.error('Erro ao fazer parse de registo do servidor:', e);
          }
        }
        
        // Carrega registos locais
        const localKey = getStorageKey(session.email);
        const localStored = localStorage.getItem(localKey);
        let localRegistos: RegistoAposta[] = [];
        if (localStored) {
          try {
            localRegistos = JSON.parse(localStored);
          } catch { /* ignore */ }
        }
        
        // MERGE: servidor prevalece (timestamp mais recente)
        // Cria um mapa de registos por id
        const mergedMap = new Map<string, RegistoAposta>();
        
        // Primeiro adiciona os do servidor
        for (const r of serverRegistos) {
          mergedMap.set(r.id, r);
        }
        
        // Depois adiciona os locais (se não existirem no servidor)
        for (const r of localRegistos) {
          if (!mergedMap.has(r.id)) {
            mergedMap.set(r.id, r);
          }
        }
        
        const mergedRegistos = Array.from(mergedMap.values())
          .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
        
        setRegistos(mergedRegistos);
        
        // Guarda merge no localStorage
        localStorage.setItem(localKey, JSON.stringify(mergedRegistos));
        
        // Actualiza timestamp de sync
        if (onSessionUpdate) {
          onSessionUpdate(updateLastSync(session));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar do servidor:', error);
      setSyncError('Erro ao sincronizar com o servidor');
    } finally {
      setSyncing(false);
    }
  };

  // Guardar registos no localStorage + servidor (se sync activo)
  const saveRegistos = async (newRegistos: RegistoAposta[]) => {
    // 1. Guarda no localStorage (cache)
    localStorage.setItem(getStorageKey(session.email), JSON.stringify(newRegistos));
    setRegistos(newRegistos);
    
    // 2. Sincroniza com o servidor (se activo)
    if (shouldSync(session)) {
      for (const registo of newRegistos) {
        try {
          await saveUserData(
            session.email,
            'diario',
            registo.id,
            JSON.stringify(registo)
          );
        } catch (error) {
          console.error('Erro ao sincronizar registo:', registo.id, error);
          setSyncError('Erro ao sincronizar. Os dados estão guardados localmente.');
        }
      }
      
      // Actualiza timestamp de sync
      if (onSessionUpdate) {
        onSessionUpdate(updateLastSync(session));
      }
    }
  };

  // Eliminar registo (local + servidor)
  const deleteRegisto = async (id: string) => {
    const filtered = registos.filter(r => r.id !== id);
    
    // 1. Actualiza localStorage
    localStorage.setItem(getStorageKey(session.email), JSON.stringify(filtered));
    setRegistos(filtered);
    
    // 2. Elimina do servidor (se sync activo)
    if (shouldSync(session)) {
      try {
        await deleteUserData(session.email, id, 'diario');
      } catch (error) {
        console.error('Erro ao eliminar do servidor:', error);
        setSyncError('Erro ao eliminar do servidor. O registo foi removido localmente.');
      }
    }
  };

  // Carregar registos do localStorage (fallback rápido)
  useEffect(() => {
    const key = getStorageKey(session.email);
    const stored = localStorage.getItem(key);
    if (stored) {
      try { 
        setRegistos(JSON.parse(stored)); 
      } catch { 
        /* ignore */ 
      }
    }
    
    // Carrega do servidor em background (cross-device)
    loadFromServer();
  }, [session.email]);

  // Gerar ID único
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Submeter novo registo
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
    
    // Reset form
    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      combinacao: ['', '', '', '', ''],
      valorApostado: 100,
      sessao: 'Fezada',
      notas: '',
    });
  };

  // Verificar aposta
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
        ? { 
            ...r, 
            resultado: 'verificado' as const, 
            acertos: acertosTemp, 
            premioRecebido: premioTemp 
          }
        : r
    );
    
    await saveRegistos(updatedRegistos);
    
    setVerificandoId(null);
    setAcertosTemp(0);
    setPremioTemp(0);
  };

  // Eliminar aposta
  const handleEliminar = async (id: string) => {
    if (window.confirm('Tens a certeza que queres eliminar este registo?')) {
      await deleteRegisto(id);
    }
  };

  // Estatísticas do mês actual
  const estatisticas = useMemo(() => {
    const now = new Date();
    const mesActual = now.getMonth(); // 0-11
    const anoActual = now.getFullYear();

    const registosMes = registos.filter(r => {
      const [ano, mes] = r.data.split('-').map(Number); // mes vem 1-12
      return ano === anoActual && (mes - 1) === mesActual;
    });

    return {
      totalGasto: registosMes.reduce((sum, r) => sum + r.valorApostado, 0),
      totalRecuperado: registosMes.reduce((sum, r) => sum + r.premioRecebido, 0),
      saldo: registosMes.reduce((sum, r) => sum + r.premioRecebido - r.valorApostado, 0),
      pendentes: registosMes.filter(r => r.resultado === 'pendente').length,
    };
  }, [registos]);

  // Atualizar campo da combinação
  const updateCombinacao = (index: number, value: string) => {
    const newCombinacao = [...formData.combinacao];
    newCombinacao[index] = value;
    setFormData({ ...formData, combinacao: newCombinacao });
  };

  return (
    <div className="space-y-6">
      {/* Banner de sincronização */}
      {syncing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center text-blue-700 text-sm">
          🔄 A sincronizar com o servidor...
        </div>
      )}
      {syncError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center text-amber-700 text-sm">
          ⚠️ {syncError}
        </div>
      )}
      {shouldSync(session) && !syncing && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-2 text-center text-green-700 text-xs">
          ☁️ Dados sincronizados na nuvem — disponíveis em todos os dispositivos
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total gasto este mês</div>
          <div className="text-2xl font-display font-black text-red-600">{fmtKz(estatisticas.totalGasto)}</div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total recuperado</div>
          <div className="text-2xl font-display font-black text-green-600">{fmtKz(estatisticas.totalRecuperado)}</div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Saldo do mês</div>
          <div className={`text-2xl font-display font-black ${estatisticas.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtKz(estatisticas.saldo)}
          </div>
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-neutral-200 p-4 text-center">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Aguardam verificação</div>
          <div className="text-2xl font-display font-black text-amber-600">{estatisticas.pendentes}</div>
        </div>
      </div>

      {/* Formulário de novo registo */}
      <Card title="📝 Nova Aposta" icon={<span>📝</span>}>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Data</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Hora</label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Valor (Kz)</label>
              <input
                type="number"
                min="50"
                max="1000"
                step="50"
                value={formData.valorApostado}
                onChange={(e) => setFormData({ ...formData, valorApostado: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Sessão</label>
              <select
                value={formData.sessao}
                onChange={(e) => setFormData({ ...formData, sessao: e.target.value as any })}
                className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2 text-sm"
              >
                <option value="Fezada">🌅 Fezada</option>
                <option value="Kazola">☀️ Kazola</option>
                <option value="Eskebra">🌙 Eskebra</option>
                <option value="Aqueceu">🔥 Aqueceu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Combinação (5 números de 1 a 90)</label>
            <div className="flex gap-2 flex-wrap">
              {formData.combinacao.map((num, idx) => (
                <input
                  key={idx}
                  type="number"
                  min="1"
                  max="90"
                  value={num}
                  onChange={(e) => updateCombinacao(idx, e.target.value)}
                  className="w-16 rounded-xl ring-1 ring-neutral-200 px-2 py-2 text-sm text-center font-bold"
                  required
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Notas (opcional)</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Observações sobre esta aposta..."
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[52px] bg-red-600 hover:bg-red-700 text-white font-display font-black text-lg rounded-2xl transition"
          >
            REGISTAR APOSTA
          </button>
        </form>
      </Card>

      {/* Lista de apostas */}
      <Card title="📋 Histórico de Apostas" icon={<span>📋</span>}>
        {registos.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <div className="text-4xl mb-2">📓</div>
            <p>Nenhuma aposta registada ainda.</p>
            <p className="text-xs mt-1">Começa a registar as tuas apostas acima!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100">
                <tr className="text-left text-neutral-600">
                  <th className="px-3 py-2 font-bold">Data/Hora</th>
                  <th className="px-3 py-2 font-bold">Combinação</th>
                  <th className="px-3 py-2 font-bold">Sessão</th>
                  <th className="px-3 py-2 font-bold">Valor</th>
                  <th className="px-3 py-2 font-bold">Acertos</th>
                  <th className="px-3 py-2 font-bold">Prémio</th>
                  <th className="px-3 py-2 font-bold">Estado</th>
                  <th className="px-3 py-2 font-bold">Acções</th>
                </tr>
              </thead>
              <tbody>
                {registos.map((registo) => (
                  <tr key={registo.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">{registo.data}</div>
                      <div className="text-xs text-neutral-400">{registo.hora}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {registo.combinacao.map((num, idx) => (
                          <Ball key={idx} n={num} size="sm" />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm">{registo.sessao}</td>
                    <td className="px-3 py-2 font-mono text-sm">{fmtKz(registo.valorApostado)}</td>
                    <td className="px-3 py-2">
                      {registo.acertos !== null ? (
                        <span className={`font-bold ${registo.acertos >= 3 ? 'text-green-600' : 'text-amber-600'}`}>
                          {registo.acertos}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm">
                      {registo.premioRecebido > 0 ? (
                        <span className="text-green-600 font-bold">{fmtKz(registo.premioRecebido)}</span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        registo.resultado === 'verificado' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {registo.resultado === 'verificado' ? 'Verificado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        {registo.resultado === 'pendente' && (
                          <button
                            onClick={() => handleVerificar(registo.id)}
                            className="text-green-600 hover:underline text-xs font-bold"
                          >
                            Verificar
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminar(registo.id)}
                          className="text-red-600 hover:underline text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de verificação */}
      <Modal
        open={verificandoId !== null}
        onClose={() => setVerificandoId(null)}
        title="✅ Verificar Resultado"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Número de acertos (0–5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={acertosTemp}
              onChange={(e) => setAcertosTemp(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Prémio recebido (Kz)</label>
            <input
              type="number"
              min="0"
              value={premioTemp}
              onChange={(e) => setPremioTemp(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl ring-1 ring-neutral-200 px-3 py-2"
            />
          </div>
          <button
            onClick={confirmarVerificacao}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition"
          >
            CONFIRMAR
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DiarioApostas;
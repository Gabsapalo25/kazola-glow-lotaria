// src/components/DiarioApostas.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Ball from './Ball';
import Card from './Card';
import Modal from './Modal';
import { UserSession } from '../lib/session';

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
}

const getStorageKey = (email: string) => `kazola_diario_${email}`;

const fmtKz = (value: number) =>
  value.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });

const DiarioApostas: React.FC<DiarioApostasProps> = ({ session }) => {
  const [registos, setRegistos] = useState<RegistoAposta[]>([]);
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

  // Carregar registos do localStorage
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
  }, [session.email]);

  // Guardar registos no localStorage
  const saveRegistos = (newRegistos: RegistoAposta[]) => {
    localStorage.setItem(getStorageKey(session.email), JSON.stringify(newRegistos));
    setRegistos(newRegistos);
  };

  // Gerar ID único
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Submeter novo registo
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
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

    saveRegistos([novoRegisto, ...registos]);
    
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

  const confirmarVerificacao = () => {
    if (!verificandoId) return;
    
    saveRegistos(registos.map(r =>
      r.id === verificandoId
        ? { 
            ...r, 
            resultado: 'verificado' as const, 
            acertos: acertosTemp, 
            premioRecebido: premioTemp 
          }
        : r
    ));
    setVerificandoId(null);
    setAcertosTemp(0);
    setPremioTemp(0);
  };

  // Eliminar aposta
  const handleEliminar = (id: string) => {
    if (window.confirm('Tens a certeza que queres eliminar este registo?')) {
      saveRegistos(registos.filter(r => r.id !== id));
    }
  };

  // Estatísticas do mês actual
  // CORREÇÃO: getMonth() devolve 0-11, a data tem mês 1-12
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
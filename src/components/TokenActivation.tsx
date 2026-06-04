// src/components/TokenActivation.tsx
import React, { useState } from 'react';
import Modal from './Modal';
import { UserSession, saveSession, isPremiumValid } from '../lib/session';
import { activateToken } from '../lib/apiClient';

interface TokenActivationProps {
  session: UserSession;
  onUpgraded: (session: UserSession) => void;
  onClose: () => void;
}

const TokenActivation: React.FC<TokenActivationProps> = ({ session, onUpgraded, onClose }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expiracao, setExpiracao] = useState<string | null>(null);
  const [plano, setPlano] = useState<string | null>(null);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    setToken(value);
    setError(null);
  };

  const handleActivate = async () => {
    if (token.length !== 16) {
      setError('O token deve ter 16 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await activateToken(session.email, token);

      if (result.ok && result.isPremium) {
        // Actualizar sessão
        const updatedSession: UserSession = {
          ...session,
          isPremium: true,
          plano: (result.plano as 'mensal' | 'anual') || null,
          premiumExpiracao: result.expiracao || null,
          verificadoNoServidor: true,
          ultimaVerificacao: Date.now(),
        };
        
        saveSession(updatedSession);
        setSuccess(true);
        setExpiracao(result.expiracao || null);
        setPlano(result.plano || null);
        
        // Notificar App.tsx
        setTimeout(() => {
          onUpgraded(updatedSession);
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Token inválido ou já utilizado');
      }
    } catch (err) {
      setError('Erro ao verificar token. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Modal isOpen={true} onClose={onClose} title="✅ ACTIVAÇÃO CONCLUÍDA">
        <div className="text-center py-6">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold mb-2">Premium Activado!</h3>
          <p className="text-gray-400 mb-2">
            O teu acesso foi activado com sucesso.
          </p>
          {plano && expiracao && (
            <div className="bg-gray-800 rounded-lg p-3 mt-4">
              <p className="text-sm">
                Plano: <strong className="text-green-400">{plano === 'anual' ? 'Anual' : 'Mensal'}</strong>
              </p>
              <p className="text-sm">
                Expira em: <strong>{expiracao.split('-').reverse().join('/')}</strong>
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-4">A fechar...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="🔑 ACTIVAR PREMIUM">
      <div className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 text-sm">
          <p className="text-blue-400">
            📧 Um token de 16 caracteres foi enviado para o teu email após a confirmação do pagamento.
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Token de activação</label>
          <input
            type="text"
            value={token}
            onChange={handleTokenChange}
            placeholder="Ex: A3F9B2C1D4E5F6G7"
            className="w-full px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-red-500 focus:outline-none uppercase text-center text-lg tracking-wider"
            autoComplete="off"
            maxLength={16}
          />
          <p className="text-xs text-gray-500 mt-1">16 caracteres • Maiúsculas e números</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleActivate}
          disabled={loading || token.length !== 16}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
        >
          {loading ? 'A VERIFICAR...' : 'ACTIVAR PREMIUM'}
        </button>

        <p className="text-center text-xs text-gray-500">
          Não tens token? Verifica o teu email ou contacta o suporte.
        </p>
      </div>
    </Modal>
  );
};

export default TokenActivation;
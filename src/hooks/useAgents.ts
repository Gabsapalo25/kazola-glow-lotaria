// src/hooks/useAgents.ts
// ============================================================
// HOOK PERSONALIZADO — GESTÃO DOS AGENTES
// ============================================================

import { useState, useCallback } from 'react';
import { runAgents, AgentResult, RunAgentsParams, UserHistory } from '../lib/agents';
import { Modalidade } from '../data/history';

interface UseAgentsReturn {
  result: AgentResult | null;
  isLoading: boolean;
  error: string | null;
  evaluateCombination: (params: {
    nums: number[];
    modalidade: Modalidade;
    stakePerLine?: number;
    bankroll?: number;
    userHistory?: UserHistory | null;
    orcamento?: number;
  }) => Promise<AgentResult | null>;
  reset: () => void;
}

export function useAgents(): UseAgentsReturn {
  const [result, setResult] = useState<AgentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateCombination = useCallback(async (params: {
    nums: number[];
    modalidade: Modalidade;
    stakePerLine?: number;
    bankroll?: number;
    userHistory?: UserHistory | null;
    orcamento?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simula um pequeno delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 100));

      const agentResult = runAgents({
        nums: params.nums,
        modalidade: params.modalidade,
        stakePerLine: params.stakePerLine || 200,
        bankroll: params.bankroll || 5000,
        userHistory: params.userHistory || null,
        orcamento: params.orcamento || 1000,
      });

      setResult(agentResult);
      return agentResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao executar agentes';
      setError(errorMessage);
      console.error('[useAgents] Erro:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    result,
    isLoading,
    error,
    evaluateCombination,
    reset,
  };
}
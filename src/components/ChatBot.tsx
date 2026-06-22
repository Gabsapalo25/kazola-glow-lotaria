/**
 * ChatBot.tsx — Assistente KazolaGlow v3.7
 * Professor · Diplomata · Empático · Vendedor
 *
 * v3.7 — NOVIDADES:
 * - Mensagem proactiva de boas-vindas ("o balcão") — aparece 6s após entrada
 * - Botão "🧠 Onde erro?" adicionado ao menu Premium
 * - Segmentação por perfil (visitante, trial, premium, trial a expirar)
 * - Limite de 1 exibição por dia (localStorage)
 * 
 * v3.6 — CORREÇÕES CRÍTICAS (ver changelog no fim do ficheiro):
 * - Os 10 blocos do AI Advisor (F1→C1) movidos para o TOPO do getAnswer(),
 *   antes dos 21 blocos antigos — corrige colisões de palavra-chave que
 *   tornavam "quanto gastei", "atrasos" e "onde erro" inalcançáveis.
 * - logAIQuery corrigido em todos os blocos para a assinatura real do
 *   apiClient.ts: logAIQuery(email, question, intent, responseCategory, topic)
 * - helper logQuery (antes morto/nunca usado) agora é o único ponto de logging
 * v3.5 — Boas-vindas com orientação personalizada para o Advisor (funcional)
 */

import { useState, useRef, useEffect } from 'react';
import avatarBot from '../assets/avatar-bot.webp';
import { UserSession, trialDaysLeft } from '../lib/session';
import {
  getMonthlySpent,
  getROI,
  getKazolaScore,
  getBehaviorInsights,
  getTimeline,
  getTopLosses,
  createPlan,
  logAIQuery,
  simulatePeriod,
  getHistoricalGaps
} from '../lib/apiClient';

interface Message {
  id: number;
  from: 'bot' | 'user';
  text: string;
  html?: string;
  btns?: { label: string; action: string }[];
}

interface Props {
  session: UserSession | null;
  onUpgrade: () => void;
  onLogin?: () => void;
  onOpenModal?: (modal: 'terms' | 'privacy' | 'responsible') => void;
  onScrollTo?: (sectionId: string) => void;
}

// ─────────────────────────────────────────────────────────────
// HELPERS ADICIONAIS
// ─────────────────────────────────────────────────────────────
function formatKz(amount: number): string {
  if (amount === 0) return '0 Kz';
  const abs = Math.abs(amount);
  let formatted = abs.toLocaleString('pt-PT');
  if (amount < 0) formatted = `-${formatted}`;
  return `${formatted} Kz`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getStatusEmoji(score: number): string {
  if (score >= 80) return '🌟';
  if (score >= 60) return '✅';
  if (score >= 40) return '⚠️';
  return '🚨';
}

function getStatusLabel(score: number): string {
  if (score >= 80) return 'EXCELENTE';
  if (score >= 60) return 'CONTROLADO';
  if (score >= 40) return 'INSTÁVEL';
  return 'CRÍTICO';
}

// Categorias amplas de intenção (seção 2.7 do Sumário Executivo:
// FINANCE │ BEHAVIOR │ HISTORY │ SIMULATION │ COACHING)
type Intent = 'FINANCE' | 'BEHAVIOR' | 'HISTORY' | 'SIMULATION' | 'COACHING';
type ResponseCategory = 'FREE' | 'PREMIUM' | 'UPSELL' | 'SUPPORT';

// ─────────────────────────────────────────────────────────────
// RESPOSTAS — professor + empático + vendedor natural
// ─────────────────────────────────────────────────────────────
async function getAnswer(
  input: string,
  session: UserSession | null
): Promise<{ answer: string; html?: string; btns: { label: string; action: string }[] }> {
  const raw = input.toLowerCase().trim();
  const lower = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isPremium = session?.isPremium || false;
  const dias = session ? trialDaysLeft(session) : 0;
  const nome = session ? session.email.split('@')[0] : '';
  const VAGAS = 11;

  // ── helpers ──────────────────────────────────────────────
  const upgradeCTA = { label: '🏆 Ativar Premium', action: 'upgrade' };
  const menuCTA    = { label: '🏠 Menu', action: 'menu' };
  const trialCTA   = { label: '📝 Criar conta grátis', action: 'login' };

  const urgencia = (): string => {
    if (isPremium) return '';
    if (dias > 0 && dias <= 3) return `\n\n🚨 Atenção: faltam só ${dias} dias de trial. Não percas o acesso.`;
    if (dias <= 0 && session) return `\n\n🚨 O teu trial terminou. Ativa Premium para continuar.`;
    return '';
  };

  // ── log automático corrigido (v3.6) ──────────────────────
  // Assinatura real do apiClient.ts: (email, question, intent, responseCategory, topic)
  const logQuery = (intent: Intent, topic: string, responseCategory: ResponseCategory) => {
    if (session?.email) {
      logAIQuery(session.email, input, intent, responseCategory, topic)
        .catch(err => console.error('❌ Erro ao logar query:', err));
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // BLOCOS DO AI ADVISOR — MOVIDOS PARA O TOPO (v3.6)
  // ─────────────────────────────────────────────────────────────────
  // Estes 10 blocos têm de ser avaliados ANTES dos blocos genéricos
  // antigos (seções 1–21 mais abaixo), porque palavras-chave largas
  // como 'quanto', 'atraso' e 'erro' nesses blocos antigos interceptavam
  // as perguntas do Advisor antes de chegarem aqui. Regra do documento
  // (seção 4.4): "condição mais específica deve vir SEMPRE antes da
  // mais genérica".
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════
  // F1 — Quanto gastei este mês? (Gratuito)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('gastei') || lower.includes('gasto') || lower.includes('quanto gastei') ||
      lower.includes('gastos este mes') || (lower.includes('gastos') && lower.includes('mes')) ||
      (lower.includes('despesa') && lower.includes('mes'))) {

    logQuery('FINANCE', 'FINANCE.MONTHLY_SPENT', session ? 'FREE' : 'UPSELL');

    if (!session) {
      return {
        answer: `📝 Para veres os teus gastos, precisas de ter uma conta.\n\nO registo é gratuito e leva 30 segundos.`,
        btns: [trialCTA, menuCTA],
      };
    }

    try {
      const userId = session.userId || session.email;
      const result = await getMonthlySpent(userId);

      if (!result || result.error) {
        return {
          answer: `📊 **Os teus gastos este mês**\n\nAinda não tenho dados registados das tuas apostas.\n\n📝 **Como começar:**\n1. Regista as tuas apostas no Diário\n2. Os dados aparecem automaticamente aqui\n\nSe já registaste apostas, aguarda alguns segundos — o sistema pode estar a processar.`,
          btns: [
            { label: '📓 Abrir Diário', action: 'nav_diario' },
            { label: '🎲 Gerar combinações', action: 'nav_gerador' },
            menuCTA,
          ],
        };
      }

      const spent = result.totalSpent || 0;
      const recovered = result.totalRecovered || 0;
      const net = recovered - spent;

      return {
        answer: `📊 **Os teus gastos este mês**\n\n💰 **Total gasto:** ${formatKz(spent)}\n💰 **Total recuperado:** ${formatKz(recovered)}\n📊 **Saldo líquido:** ${formatKz(net)}\n\n${net < 0 ? '📉 Estás com saldo negativo. O Diário de Apostas pode ajudar-te a perceber onde podes ajustar.' : '✅ Estás com saldo positivo! Mantém a disciplina.'}\n\n💡 Sabias que podes ver o teu ROI detalhado e análise mensal completa no Premium?`,
        btns: [
          { label: '📓 Abrir Diário', action: 'nav_diario' },
          { label: '📊 Ver ROI', action: 'roi' },
          ...(!isPremium ? [upgradeCTA] : []),
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao buscar gastos mensais:', error);
      return {
        answer: `📊 **Os teus gastos este mês**\n\nDesculpa, tive um problema ao buscar os teus dados. Tenta novamente em alguns segundos.\n\nSe o problema persistir, contacta o suporte.`,
        btns: [
          { label: '📧 Suporte', action: 'suporte' },
          menuCTA,
        ],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // F2 — Qual o meu ROI? (Gratuito)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('roi') || lower.includes('retorno') || lower.includes('rendibilidade') ||
      lower.includes('lucro') || lower.includes('prejuizo') || lower.includes('taxa de retorno') ||
      lower.includes('quanto recuperei')) {

    logQuery('FINANCE', 'FINANCE.ROI', session ? 'FREE' : 'UPSELL');

    if (!session) {
      return {
        answer: `📝 Para veres o teu ROI, precisas de ter uma conta.\n\nO registo é gratuito e leva 30 segundos.`,
        btns: [trialCTA, menuCTA],
      };
    }

    try {
      const userId = session.userId || session.email;
      const result = await getROI(userId);

      if (!result || result.error) {
        return {
          answer: `📊 **O teu ROI**\n\nAinda não tenho dados suficientes para calcular o teu ROI.\n\n📝 Regista as tuas apostas no Diário para começares a ver esta métrica.\n\n💡 O ROI mostra a relação entre o que gastas e o que recuperas em prémios.`,
          btns: [
            { label: '📓 Abrir Diário', action: 'nav_diario' },
            menuCTA,
          ],
        };
      }

      const roi = result.roi || 0;
      const totalSpent = result.totalSpent || 0;
      const totalRecovered = result.totalRecovered || 0;
      const isPositive = roi > 0;

      return {
        answer: `📊 **O teu ROI**\n\n📈 **Retorno sobre investimento:** ${formatPercent(roi)}\n💰 **Total gasto:** ${formatKz(totalSpent)}\n💰 **Total recuperado:** ${formatKz(totalRecovered)}\n\n${isPositive ? '✅ Excelente! Estás a recuperar mais do que gastas.' : '⚠️ Estás a recuperar menos do que gastas. O importante é manter o controlo e o jogo como entretenimento.'}\n\n💡 O ROI é um indicador financeiro. O **Score Kazola** mede a tua disciplina — independentemente do resultado financeiro.`,
        btns: [
          { label: '📊 Ver Score Kazola', action: 'score' },
          { label: '📓 Abrir Diário', action: 'nav_diario' },
          ...(!isPremium ? [upgradeCTA] : []),
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao buscar ROI:', error);
      return {
        answer: `📊 **O teu ROI**\n\nDesculpa, tive um problema ao buscar os teus dados. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // H1 — Onde perco mais dinheiro? (Gratuito)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('onde perco') || lower.includes('mais perco') || lower.includes('maior perda') ||
      lower.includes('pior modalidade') || lower.includes('onde gasto mais') ||
      lower.includes('qual a modalidade') || lower.includes('perdas por')) {

    logQuery('BEHAVIOR', 'BEHAVIOR.TOP_LOSSES', session ? 'FREE' : 'UPSELL');

    if (!session) {
      return {
        answer: `📝 Para analisares onde perdes mais, precisas de ter uma conta.\n\nO registo é gratuito e leva 30 segundos.`,
        btns: [trialCTA, menuCTA],
      };
    }

    try {
      const userId = session.userId || session.email;
      const result = await getTopLosses(userId);

      if (!result || result.error || !result.losses || result.losses.length === 0) {
        return {
          answer: `📊 **Onde perco mais dinheiro?**\n\nAinda não tenho dados suficientes para esta análise.\n\n📝 Regista as tuas apostas no Diário com a sessão e modalidade para eu poder identificar padrões.`,
          btns: [
            { label: '📓 Abrir Diário', action: 'nav_diario' },
            menuCTA,
          ],
        };
      }

      let lossText = '📊 **Onde perco mais dinheiro?**\n\n';
      result.losses.forEach((loss: any, index: number) => {
        lossText += `${index + 1}. **${loss.modalidade}** — ${formatKz(loss.amount)} (${loss.session || 'todas as sessões'})\n`;
      });

      lossText += `\n💡 **Dica:** Se quiseres reduzir perdas, considera:\n`;
      lossText += `• Reduzir o valor por aposta na modalidade com maior perda\n`;
      lossText += `• Usar o Plano Semanal para distribuir melhor o orçamento\n`;
      lossText += `• O Score Kazola mostra a tua disciplina global`;

      return {
        answer: lossText,
        btns: [
          { label: '📊 Ver Score Kazola', action: 'score' },
          { label: '📅 Plano Semanal', action: 'plano' },
          ...(!isPremium ? [upgradeCTA] : []),
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao buscar perdas:', error);
      return {
        answer: `📊 **Onde perco mais dinheiro?**\n\nDesculpa, tive um problema ao buscar os teus dados. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // H2 — Maiores atrasos históricos (Gratuito)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('atrasos') || lower.includes('atrasados') || lower.includes('gaps') ||
      lower.includes('números que não saem') || lower.includes('maiores atrasos') ||
      lower.includes('há quanto tempo') || lower.includes('nao sai')) {

    logQuery('HISTORY', 'HISTORY.GAPS', 'FREE');

    try {
      const result = await getHistoricalGaps();

      if (!result || result.error || !result.gaps || result.gaps.length === 0) {
        return {
          answer: `📊 **Maiores atrasos históricos**\n\nDesculpa, não consegui buscar os dados dos sorteios. Tenta novamente em alguns segundos.\n\nSe o problema persistir, contacta o suporte.`,
          btns: [menuCTA],
        };
      }

      let gapText = '⏳ **Maiores atrasos históricos**\n\n';
      gapText += `Estes são os números que estão há mais sorteios sem serem sorteados:\n\n`;

      result.gaps.slice(0, 10).forEach((gap: any, index: number) => {
        const emoji = gap.days >= 30 ? '🔴' : gap.days >= 15 ? '🟡' : '⚪';
        gapText += `${emoji} **${gap.number}** — ${gap.days} sorteios sem sair\n`;
      });

      gapText += `\n💡 **O que significa?**\n`;
      gapText += `• 🔴 ≥30 sorteios sem sair — "número frio" extremo\n`;
      gapText += `• 🟡 15-29 sorteios — "número frio"\n`;
      gapText += `• ⚪ 0-14 sorteios — frequência normal\n\n`;
      gapText += `⚠️ **Importante:** Números atrasados NÃO têm maior probabilidade de sair. Cada sorteio é independente. Use esta informação apenas como referência histórica.`;

      return {
        answer: gapText,
        btns: [
          { label: '📊 Ver Estatísticas', action: 'nav_estatisticas' },
          { label: '🎲 Usar no Gerador', action: 'gerador' },
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao buscar gaps:', error);
      return {
        answer: `⏳ **Maiores atrasos históricos**\n\nDesculpa, tive um problema ao buscar os dados dos sorteios. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // H3 — Analisa últimos sorteios (Gratuito)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('ultimos sorteios') || lower.includes('sorteios recentes') ||
      lower.includes('tendencias recentes') || lower.includes('analisa ultimos') ||
      lower.includes('resultados recentes')) {

    logQuery('HISTORY', 'HISTORY.RECENT', 'FREE');

    try {
      const userId = session?.userId || session?.email || 'guest';
      const result = await getTimeline(userId, 30);

      if (!result || result.error || !result.data || result.data.length === 0) {
        return {
          answer: `📊 **Análise dos últimos sorteios**\n\nAinda não tenho dados históricos suficientes para esta análise.\n\nTenta novamente mais tarde ou regista as tuas apostas no Diário para começar a ver o teu padrão.`,
          btns: [
            { label: '📜 Ver Histórico', action: 'nav_historico' },
            menuCTA,
          ],
        };
      }

      const recentData = result.data.slice(-10);
      let analysis = '📊 **Análise dos últimos sorteios**\n\n';
      analysis += `📅 Período: ${recentData[0]?.date || 'N/A'} a ${recentData[recentData.length - 1]?.date || 'N/A'}\n`;
      analysis += `📊 Total de sorteios analisados: ${recentData.length}\n\n`;

      analysis += `📈 **Tendências observadas:**\n`;
      const spent = recentData.reduce((sum: number, d: any) => sum + (d.total_spent || 0), 0);
      const recovered = recentData.reduce((sum: number, d: any) => sum + (d.total_recovered || 0), 0);
      const avgSpent = spent / recentData.length;
      const avgRecovered = recovered / recentData.length;

      analysis += `• Média de gastos: ${formatKz(avgSpent)}/dia\n`;
      analysis += `• Média de recuperação: ${formatKz(avgRecovered)}/dia\n`;
      analysis += `• ROI médio: ${avgSpent > 0 ? formatPercent((avgRecovered / avgSpent) * 100) : 'N/A'}\n`;

      return {
        answer: analysis,
        btns: [
          { label: '📜 Ver Histórico', action: 'nav_historico' },
          { label: '📊 Ver Score Kazola', action: 'score' },
          ...(!isPremium ? [upgradeCTA] : []),
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao analisar sorteios:', error);
      return {
        answer: `📊 **Análise dos últimos sorteios**\n\nDesculpa, tive um problema ao buscar os dados. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // S1 — Quanto teria poupado se seguisse o plano? (Premium)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('poupado') || lower.includes('teria poupado') || (lower.includes('plano') && lower.includes('poupar')) ||
      (lower.includes('se seguisse') && lower.includes('plano')) || (lower.includes('poupança') && lower.includes('plano'))) {

    logQuery('SIMULATION', 'SIMULATION.SAVINGS', isPremium ? 'PREMIUM' : 'UPSELL');

    if (!isPremium) {
      return {
        answer: `🔒 **Quanto terias poupado se seguisses o plano?**\n\nEsta é uma funcionalidade **Premium** que simula o impacto financeiro de seguir um plano estruturado.\n\n**O que mostraria:**\n• O teu gasto real vs. o gasto planeado\n• Quanto terias poupado no período\n• Análise do impacto de cada decisão\n\n🏆 Activa o Premium para veres esta simulação personalizada.${urgencia()}`,
        btns: [upgradeCTA, menuCTA],
      };
    }

    try {
      const userId = session!.userId || session!.email;
      const result = await simulatePeriod(userId, 90);

      if (!result || result.error) {
        return {
          answer: `📊 **Quanto terias poupado?**\n\nAinda não tenho dados suficientes para esta simulação.\n\n📝 Regista as tuas apostas no Diário para obteres análises precisas.`,
          btns: [
            { label: '📓 Abrir Diário', action: 'nav_diario' },
            menuCTA,
          ],
        };
      }

      if ((result as any).noPlanData) {
        return {
          answer: `📊 **Quanto terias poupado?**\n\nAinda não criaste nenhum Plano Semanal neste período — sem um plano definido não há base de comparação real.\n\n📅 Cria o teu primeiro plano para começares a ver esta simulação com dados reais (não estimativas).`,
          btns: [
            { label: '📅 Criar plano agora', action: 'criar_plano' },
            menuCTA,
          ],
        };
      }

      const savings = result.savings || 0;
      const actualSpent = result.actualSpent || 0;
      const plannedSpent = result.plannedSpent || 0;

      return {
        answer: `📊 **Quanto terias poupado com o plano?**\n\n💰 **Gasto real:** ${formatKz(actualSpent)}\n📋 **Orçamento planeado:** ${formatKz(plannedSpent)}\n💚 **Poupança estimada:** ${formatKz(savings)}\n\n${savings > 0 ? `✅ Seguindo o teu plano com disciplina, terias poupado ${formatKz(savings)}.` : '⚠️ Já estás a gastar dentro (ou perto) do teu plano. Bom trabalho!'}`,
        btns: [
          { label: '📅 Plano Semanal', action: 'plano' },
          { label: '📊 Ver Score Kazola', action: 'score' },
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao simular poupança:', error);
      return {
        answer: `📊 **Quanto terias poupado?**\n\nDesculpa, tive um problema ao calcular a simulação. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // B1 — Qual o meu Score Kazola? (Premium)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('score kazola') || lower.includes('kazola score') || (lower.includes('score') && lower.includes('kazola')) ||
      lower.includes('pontuacao') || lower.includes('classificacao') || lower.includes('disciplina') ||
      lower.includes('meu score') || lower.includes('qual o meu score')) {

    logQuery('BEHAVIOR', 'BEHAVIOR.KAZOLA_SCORE', isPremium ? 'PREMIUM' : 'UPSELL');

    if (!isPremium) {
      return {
        answer: `🔒 **O Score Kazola**\n\nO Score Kazola é a métrica principal do KazolaGlow — mede a **disciplina** e **consistência** nas tuas apostas.\n\n**O que mede:**\n📊 Disciplina (35%) — segues o plano ou apostas impulsivamente?\n📊 Planeamento (25%) — crias planos antes de apostar?\n📊 Controlo de orçamento (25%) — ficas dentro do limite?\n📊 Consistência (15%) — usas o sistema regularmente?\n\n🏆 **Funcionalidade Premium** — activa para veres o teu score e receberes recomendações personalizadas.${urgencia()}`,
        btns: [upgradeCTA, menuCTA],
      };
    }

    try {
      const userId = session!.userId || session!.email;
      const result = await getKazolaScore(userId);

      if (!result || result.error || result.score === undefined) {
        return {
          answer: `📊 **Score Kazola**\n\nAinda não tenho dados suficientes para calcular o teu Score Kazola.\n\n📝 Regista as tuas apostas no Diário e usa a plataforma regularmente para o score começar a ser calculado.\n\n💡 O score é calculado com base em:\n• Planos criados\n• Apostas registadas\n• Consistência de uso\n• Controlo de orçamento`,
          btns: [
            { label: '📓 Abrir Diário', action: 'nav_diario' },
            { label: '📅 Plano Semanal', action: 'plano' },
            menuCTA,
          ],
        };
      }

      const score = result.score || 0;
      const status = result.status || getStatusLabel(score);
      const emoji = getStatusEmoji(score);

      return {
        answer: `📊 **O teu Score Kazola**\n\n${emoji} **Score:** ${score}/100\n📊 **Status:** ${status}\n\n**Como é calculado:**\n📊 Disciplina (35%) — segues o plano vs apostas impulsivas\n📊 Planeamento (25%) — crias planos antes de apostar\n📊 Controlo de orçamento (25%) — ficas dentro do limite\n📊 Consistência (15%) — usas o sistema regularmente\n\n${score >= 80 ? '🌟 Excelente! Estás a jogar com muita disciplina. Mantém o trabalho!' :
          score >= 60 ? '✅ Bom trabalho. Estás no caminho certo, com espaço para melhorar a consistência.' :
          score >= 40 ? '⚠️ Estás instável. O Plano Semanal pode ajudar-te a ganhar mais disciplina.' :
          '🚨 Atenção! O teu padrão de apostas precisa de atenção. Usa as ferramentas de Jogo Responsável.'}`,
        btns: [
          { label: '📊 Ver detalhes', action: 'score_detalhes' },
          { label: '📅 Plano Semanal', action: 'plano' },
          { label: '🛡️ Jogo Responsável', action: 'responsavel' },
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao buscar Score Kazola:', error);
      return {
        answer: `📊 **Score Kazola**\n\nDesculpa, tive um problema ao buscar o teu score. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // B2 — Onde estou a cometer erros? (Premium)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('onde erro') || lower.includes('onde estou a errar') || lower.includes('onde estou a cometer erros') ||
      lower.includes('cometer erros') || lower.includes('onde posso melhorar') || lower.includes('como melhorar')) {

    logQuery('BEHAVIOR', 'BEHAVIOR.INSIGHTS', isPremium ? 'PREMIUM' : 'UPSELL');

    if (!isPremium) {
      return {
        answer: `🔒 **Onde estás a cometer erros?**\n\nEsta análise comportamental detalhada é uma funcionalidade **Premium**.\n\n**O que inclui:**\n• Análise dos teus padrões de aposta\n• Identificação de hábitos prejudiciais\n• Recomendações personalizadas\n• Comparação com utilizadores disciplinados\n\n🏆 Activa o Premium para receberes estas recomendações.${urgencia()}`,
        btns: [upgradeCTA, menuCTA],
      };
    }

    try {
      const userId = session!.userId || session!.email;
      const result = await getBehaviorInsights(userId);

      if (!result || result.error || !result.insights || result.insights.length === 0) {
        return {
          answer: `📊 **Onde estás a cometer erros?**\n\nAinda não tenho dados suficientes para uma análise comportamental detalhada.\n\n📝 Regista mais apostas no Diário e usa a plataforma com regularidade para eu poder identificar padrões.`,
          btns: [
            { label: '📓 Abrir Diário', action: 'nav_diario' },
            menuCTA,
          ],
        };
      }

      let insightText = '📊 **Onde estás a cometer erros?**\n\n';
      insightText += `**Análise comportamental:**\n\n`;

      result.insights.forEach((insight: any) => {
        const emoji = insight.type === 'RISK_ALERT' ? '🚨' :
                      insight.type === 'DISCIPLINE_IMPROVEMENT' ? '📈' :
                      insight.type === 'BUDGET_WARNING' ? '⚠️' :
                      insight.type === 'BEHAVIOR_PATTERN' ? '🔄' : '💡';
        insightText += `${emoji} ${insight.message}\n\n`;
      });

      insightText += `💡 **Recomendações:**\n`;
      insightText += `• Usa o Plano Semanal para estruturar as apostas\n`;
      insightText += `• Regista todas as apostas no Diário\n`;
      insightText += `• Define um orçamento mensal e cumpre-o\n`;
      insightText += `• Consulta o Score Kazola para acompanhar a evolução`;

      return {
        answer: insightText,
        btns: [
          { label: '📊 Ver Score Kazola', action: 'score' },
          { label: '📅 Plano Semanal', action: 'plano' },
          { label: '🛡️ Jogo Responsável', action: 'responsavel' },
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao buscar insights:', error);
      return {
        answer: `📊 **Onde estás a cometer erros?**\n\nDesculpa, tive um problema ao analisar os teus dados. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // S2 — Simula os últimos 90 dias (Premium)
  // ═══════════════════════════════════════════════════════
  if ((lower.includes('simula') && lower.includes('90 dias')) || (lower.includes('simular') && lower.includes('90')) ||
      (lower.includes('simulacao') && lower.includes('90')) || lower.includes('simulacao historica') ||
      lower.includes('simular historico') || lower.includes('simulacao completa')) {

    logQuery('SIMULATION', 'SIMULATION.HISTORICAL', isPremium ? 'PREMIUM' : 'UPSELL');

    if (!isPremium) {
      return {
        answer: `🔒 **Simulação dos últimos 90 dias**\n\nEsta simulação histórica detalhada é uma funcionalidade **Premium**.\n\n**O que inclui:**\n• Análise dia-a-dia do teu desempenho\n• Comparação entre o teu comportamento real e o plano ideal\n• Identificação de padrões de gasto\n• Projecção de impacto futuro\n\n🏆 Activa o Premium para veres esta simulação.${urgencia()}`,
        btns: [upgradeCTA, menuCTA],
      };
    }

    try {
      const userId = session!.userId || session!.email;
      const result = await simulatePeriod(userId, 90);

      if (!result || result.error) {
        return {
          answer: `📊 **Simulação dos últimos 90 dias**\n\nAinda não tenho dados suficientes para esta simulação.\n\n📝 Regista as tuas apostas no Diário para obteres análises precisas.`,
          btns: [
            { label: '📓 Abrir Diário', action: 'nav_diario' },
            menuCTA,
          ],
        };
      }

      if ((result as any).noPlanData) {
        return {
          answer: `📊 **Simulação dos últimos 90 dias**\n\nNão encontrei nenhum Plano Semanal criado nos últimos 90 dias — sem isso não há uma "meta" real para comparar com o que gastaste.\n\n📅 Cria um plano agora para começar a acumular dados reais para esta simulação.`,
          btns: [
            { label: '📅 Criar plano agora', action: 'criar_plano' },
            menuCTA,
          ],
        };
      }

      const { totalSpent, totalRecovered, savings, planAdherence } = result;

      return {
        answer: `📊 **Simulação dos últimos 90 dias**\n\n💰 **Total gasto:** ${formatKz(totalSpent || 0)}\n💰 **Total recuperado:** ${formatKz(totalRecovered || 0)}\n📊 **Saldo líquido:** ${formatKz((totalRecovered || 0) - (totalSpent || 0))}\n\n📋 **Análise do plano:**\n• Adesão ao plano: ${planAdherence != null ? formatPercent(planAdherence) : 'N/A'}\n• Poupança estimada com plano: ${formatKz(savings || 0)}\n\n${(savings || 0) > 0 ? `✅ Seguindo o teu plano com disciplina, terias poupado ${formatKz(savings || 0)} nos últimos 90 dias.` : '⚠️ Já estás a gastar dentro (ou perto) do teu plano nos últimos 90 dias.'}\n\n💡 **O que isto significa:**\nA disciplina no jogo não é sobre ganhar ou perder — é sobre controlar o que gastas. O Score Kazola mede exactamente isso.`,
        btns: [
          { label: '📊 Ver Score Kazola', action: 'score' },
          { label: '📅 Plano Semanal', action: 'plano' },
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro na simulação:', error);
      return {
        answer: `📊 **Simulação dos últimos 90 dias**\n\nDesculpa, tive um problema ao calcular a simulação. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // C1 — Cria um plano personalizado (Premium)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('plano personalizado') || lower.includes('cria plano') || lower.includes('criar plano') ||
      (lower.includes('plano') && (lower.includes('apostas') || lower.includes('semanal'))) ||
      lower.includes('plano de apostas') || lower.includes('criar plano personalizado')) {

    logQuery('COACHING', 'PLAN.CREATE', isPremium ? 'PREMIUM' : 'UPSELL');

    if (!isPremium) {
      return {
        answer: `🔒 **Cria um plano personalizado**\n\nPlanos de apostas personalizados são uma funcionalidade **Premium**.\n\n**O que o plano inclui:**\n• Orçamento semanal recomendado\n• Distribuição de apostas por dia\n• Sugestões de modalidades e sessões\n• Controlo de progresso\n\n🏆 Activa o Premium para criares o teu plano.${urgencia()}`,
        btns: [upgradeCTA, menuCTA],
      };
    }

    try {
      let budgetMatch = input.match(/\b(\d+)\s*(?:kz|kzs?)\b/i);
      let budget = budgetMatch ? parseInt(budgetMatch[1]) : 5000;

      if (budget < 100) budget = 100;
      if (budget > 10000) budget = 10000;

      const userId = session!.userId || session!.email;
      const result = await createPlan(userId, budget);

      if (!result || result.error) {
        return {
          answer: `📅 **Plano personalizado**\n\nDesculpa, não consegui criar o plano neste momento. Tenta novamente em alguns segundos.\n\nSe o problema persistir, contacta o suporte.`,
          btns: [
            { label: '📧 Suporte', action: 'suporte' },
            menuCTA,
          ],
        };
      }

      const { plan, weeklyBudget, dailyBudget, totalBets } = result;

      return {
        answer: `📅 **Plano personalizado de apostas**\n\n📊 **Orçamento semanal:** ${formatKz(weeklyBudget || budget)}\n📊 **Orçamento diário:** ${formatKz(dailyBudget || Math.round(budget / 7))}\n🎯 **Total de apostas sugeridas:** ${totalBets || Math.round(budget / 500)}\n\n**Distribuição sugerida:**\n${plan ? plan.map((p: any, i: number) => `📆 Dia ${i+1}: ${p.bets} apostas (${formatKz(p.amount)})`).join('\n') : '• Distribuição equilibrada ao longo da semana'}\n\n**Recomendações:**\n• Usa o Gerador para cada aposta\n• Regista no Diário o que realmente jogaste\n• Ajusta o plano semanalmente conforme necessário\n\n⚠️ Lembra-te: este é um plano de GESTÃO, não de previsão. O objectivo é controlo, não acertos.\n\n✅ Este plano foi registado — vai contar para o teu Score Kazola (pilar Planeamento).`,
        btns: [
          { label: '🎲 Gerar agora', action: 'nav_gerador' },
          { label: '📓 Abrir Diário', action: 'nav_diario' },
          { label: '📊 Ver Score Kazola', action: 'score' },
          menuCTA,
        ],
      };
    } catch (error) {
      console.error('❌ Erro ao criar plano:', error);
      return {
        answer: `📅 **Plano personalizado**\n\nDesculpa, tive um problema ao criar o teu plano. Tenta novamente em alguns segundos.`,
        btns: [menuCTA],
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // SCORE_DETALHES (sub-pergunta do B1)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('score detalhes') || lower.includes('score detalhado') ||
      (lower.includes('score') && lower.includes('detalhado'))) {

    logQuery('BEHAVIOR', 'BEHAVIOR.KAZOLA_SCORE_DETAILS', isPremium ? 'PREMIUM' : 'UPSELL');

    if (!isPremium) {
      return {
        answer: `🔒 O Score Kazola detalhado é Premium. Activa para veres a análise completa.`,
        btns: [upgradeCTA, menuCTA],
      };
    }

    return {
      answer: `📊 **Score Kazola — Detalhado**\n\n**Os 4 pilares do teu score:**\n\n📊 **Disciplina (35%)** — Segues o plano vs apostas impulsivas\n• ✅ Bom: registas planos antes de apostar\n• ⚠️ A melhorar: tenta criar planos mais consistentes\n\n📊 **Planeamento (25%)** — Criaste planos antes de apostar\n• ✅ Bom: usas o Plano Semanal\n• ⚠️ A melhorar: planeia com mais antecedência\n\n📊 **Controlo de orçamento (25%)** — Ficas dentro do limite\n• ✅ Bom: manténs o orçamento\n• ⚠️ A melhorar: define limites mais realistas\n\n📊 **Consistência (15%)** — Regularidade de uso\n• ✅ Bom: usas a plataforma regularmente\n• ⚠️ A melhorar: tenta usar todos os dias\n\n💡 **Dica:** O ROI é separado do Score. O Score mede disciplina, não sorte.`,
      btns: [
        { label: '📊 Ver Score', action: 'score' },
        { label: '📅 Plano Semanal', action: 'plano' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // FIM DOS BLOCOS DO AI ADVISOR
  // A partir daqui seguem os 21 blocos originais do ChatBot (intactos,
  // só renumerados na leitura — nenhum texto de conteúdo foi alterado).
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════
  // 1 · MENU / BOAS-VINDAS COM ORIENTAÇÃO (v3.5 + botão Onde erro?)
  // ═══════════════════════════════════════════════════════
  if (lower === 'menu' || lower === '' || lower.includes('olá') || lower.includes('oi') || lower.includes('bom dia') || lower.includes('boa tarde') || lower.includes('boa noite')) {
    if (isPremium) {
      return {
        answer: `Olá ${nome}! 🏆 Tudo pronto para ti.\n\n🔍 **O que o Advisor pode fazer por ti hoje?**\n\n📊 **Análise Financeira**\n• Quanto gastei este mês?\n• Qual o meu ROI?\n• Onde perco mais dinheiro?\n\n🧠 **Comportamento**\n• Qual o meu Score Kazola?\n• Onde estou a cometer erros?\n• Cria um plano personalizado\n\n📈 **Simulações**\n• Quanto teria poupado com plano?\n• Simula os últimos 90 dias\n\nO que precisas?`,
        btns: [
          { label: '📊 Quanto gastei?', action: 'gastei' },
          { label: '📈 Qual o meu ROI?', action: 'roi' },
          { label: '🧠 Score Kazola', action: 'score' },
          { label: '🧠 Onde erro?', action: 'erros' },
          { label: '📅 Plano personalizado', action: 'criar_plano' },
          { label: '🎲 Gerador', action: 'gerador' },
          { label: '📓 Diário', action: 'diario' },
          { label: '📊 Relatório', action: 'relatorio' },
          { label: '❓ FAQ', action: 'faq' },
        ],
      };
    }
    if (session) {
      return {
        answer: `Olá ${nome}! 👋\n\n🔍 **Bem-vindo ao Assistente KazolaGlow!**\n\nPosso ajudar-te com:\n\n📊 **Análise Financeira** (gratuito)\n• Quanto gastei este mês?\n• Qual o meu ROI?\n• Onde perco mais dinheiro?\n\n📈 **Estatísticas e histórico**\n• Análise de números\n• Histórico de sorteios\n\n🏆 **Funcionalidades Premium**\n• Score Kazola (disciplina)\n• Plano personalizado\n• Simulações históricas\n\nO que queres explorar hoje?`,
        btns: [
          { label: '📊 Quanto gastei?', action: 'gastei' },
          { label: '📈 Qual o meu ROI?', action: 'roi' },
          { label: '📊 Estatísticas', action: 'estatisticas' },
          { label: '🎲 Gerador', action: 'gerador' },
          { label: '🏆 Ver Premium', action: 'premium' },
          { label: '❓ FAQ', action: 'faq' },
        ],
      };
    }
    return {
      answer: `Olá! 👋 Bem-vindo ao KazolaGlow.\n\n🔍 **Sou o teu Assistente Inteligente!**\n\nPosso ajudar-te a:\n\n📊 **Analisar os teus gastos** — quanto gastaste este mês? Qual o teu ROI?\n\n📈 **Estudar estatísticas** — números quentes, frios, gaps e tendências\n\n🎲 **Gerar combinações** — com métodos inteligentes\n\n🏆 **Descobrir o Premium** — Score Kazola, planos personalizados e mais\n\nPara começar, regista-te gratuitamente ou explora as ferramentas abaixo.`,
      btns: [
        { label: '📝 Criar conta grátis', action: 'login' },
        { label: '📊 Estatísticas', action: 'estatisticas' },
        { label: '🎲 Gerador', action: 'gerador' },
        { label: '🏆 Premium', action: 'premium' },
        { label: '❓ FAQ', action: 'faq' },
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 2 · LOTO 5/90 — REGRAS E COMO FUNCIONA
  // ═══════════════════════════════════════════════════════
  if (lower.includes('como funciona') || lower.includes('o que e o loto') || lower.includes('regras') || lower.includes('loto 5') || lower.includes('jogo')) {
    return {
      answer: `🎱 **O Loto 5/90 em termos simples:**\n\nEscolhes entre 2 e 5 números de 1 a 90. São sorteados 5 números. Quantos mais acertares, maior é o prémio.\n\n📅 **Quando acontecem os sorteios?**\nAté 4 vezes por dia, 7 dias por semana:\n• ☀️ Fezada — 10h00\n• 🔥 Aqueceu — 13h00\n• 🌙 Kazola — 16h00\n• ⚡ Eskebra — 19h00\n\n💰 **Quanto custa apostar?**\nEntre 50 Kz e 1.000 Kz por linha.\n\n🏆 **Quanto se pode ganhar?**\n• 2 acertos → ×4 da aposta\n• 3 acertos → ×25\n• 4 acertos → ×120\n• 5 acertos → ×2.500\n\nO KazolaGlow ajuda-te a estudar os padrões históricos para fazeres escolhas mais informadas. Os sorteios são aleatórios — nenhuma ferramenta garante acertos.`,
      btns: [
        { label: '💰 Ver simulador de prémios', action: 'premios' },
        { label: '📊 Ver estatísticas', action: 'estatisticas' },
        { label: '🎲 Experimentar o gerador', action: 'gerador' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 3 · GERADOR
  // ═══════════════════════════════════════════════════════
  if (lower.includes('gerador') || lower.includes('gerar') || lower.includes('combinacao') || lower.includes('numeros') || lower.includes('metodo')) {
    return {
      answer: `🎲 **O Gerador de Combinações**\n\nA ferramenta principal do KazolaGlow. Gera combinações de 5 números (1–90) com 4 métodos:\n\n⚖️ **Equilibrado** — distribui pelos 90 números de forma balanceada. Recomendado para a maioria.\n\n🎲 **Aleatório puro** — matematicamente igual ao sorteio real. Boa opção para quem quer total imparcialidade.\n\n📊 **Frequência histórica** 🔒 Premium — usa os números mais sorteados como base. Útil para estudo de tendências.\n\n🎰 **Monte Carlo** 🔒 Premium — combina pesos históricos com variação aleatória controlada. O método mais sofisticado.\n\n**Configurações disponíveis:**\n• Número de linhas (1 a 10)\n• Filtro par/ímpar\n• Excluir números específicos\n• Guardar favoritos com ♡\n\n${isPremium ? '✅ Tens acesso completo a todos os métodos.' : `Com a conta gratuita tens 1 geração por dia com os métodos básicos.${urgencia()}`}`,
      btns: isPremium
        ? [{ label: '🎲 Ir ao Gerador', action: 'nav_gerador' }, menuCTA]
        : [{ label: '🎲 Experimentar agora', action: 'nav_gerador' }, upgradeCTA, menuCTA],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 4 · ESTATÍSTICAS
  // ═══════════════════════════════════════════════════════
  if (lower.includes('estatistica') || lower.includes('frequencia') || lower.includes('quentes') || lower.includes('frios') || lower.includes('gap') || lower.includes('atraso') || lower.includes('analise')) {
    return {
      answer: `📊 **Estatísticas do Loto 5/90**\n\nO KazolaGlow analisa todos os sorteios reais da Lotaria Nacional e mostra-te:\n\n📈 **Frequência dos números** — quantas vezes cada número de 1 a 90 foi sorteado nos últimos N sorteios. Útil para perceber tendências.\n\n🔥 **Números quentes** — os 8 mais frequentes recentemente.\n\n❄️ **Números frios** — os 8 menos frequentes. Alguns apostadores preferem números "atrasados".\n\n⏳ **Gap analysis** — há quantos sorteios cada número não aparece:\n• 🔴 ≥30 sorteios sem sair\n• 🟡 15 a 29\n• ⚪ 0 a 14\n\n📉 **Distribuição por dezena** — 1-10, 11-20, etc. Ajuda a ver se alguma faixa está sub-representada.\n\n⚖️ **Par vs Ímpar** — proporção histórica observada.\n\n⚠️ **Importante:** estas estatísticas são para ESTUDO. Cada sorteio é um evento independente — o passado não prevê o futuro.`,
      btns: [
        { label: '📊 Ver Estatísticas', action: 'nav_estatisticas' },
        { label: '🎲 Usar no Gerador', action: 'gerador' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 5 · HISTÓRICO
  // ═══════════════════════════════════════════════════════
  if (lower.includes('historico') || lower.includes('sorteios passados') || lower.includes('resultados anteriores') || lower.includes('concurso')) {
    return {
      answer: `📜 **Histórico de Sorteios**\n\nLista completa de todos os sorteios reais da Lotaria Nacional, do mais recente ao mais antigo.\n\n**O que podes ver em cada entrada:**\n• Data e hora do sorteio\n• Nome da sessão (Fezada, Aqueceu, Kazola, Eskebra)\n• Os 5 números sorteados\n• Número do concurso\n• Soma dos 5 números\n\n**Como usar:**\nClica em qualquer linha para seleccioná-la — fica destacada e o "Último sorteio" no topo atualiza.\n\nUsa "Anterior" e "Próxima" para navegar pelos sorteios mais antigos.\n\nTodos os dados vêm directamente da API oficial da Lotaria Nacional.`,
      btns: [
        { label: '📜 Ver Histórico', action: 'nav_historico' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 6 · PRÉMIOS E SIMULADOR
  // ═══════════════════════════════════════════════════════
  if (lower.includes('premio') || lower.includes('ganhar') || lower.includes('simulador') || lower.includes('multiplicador') || lower.includes('imposto') || lower.includes('quanto custa') || lower.includes('quanto se pode ganhar') || lower.includes('quanto posso ganhar')) {
    return {
      answer: `💰 **Prémios e Simulador**\n\n**Multiplicadores oficiais (Decreto 695/25):**\n• Apostar em 2 e acertar os 2 → ×4\n• Apostar en 3 e acertar os 3 → ×25\n• Apostar em 4 e acertar os 4 → ×120\n• Apostar em 5 e acertar os 5 → ×2.500\n\n**Exemplo prático:**\nApostas 500 Kz em 3 números e acertas os 3 → recebes 12.500 Kz.\n\n**Imposto (Art. 26 do Decreto 695/25):**\n• Prémios até 280.000 Kz → isentos de imposto\n• Acima de 280.000 Kz → pagas 15% sobre o excedente\n\n**Prémio máximo possível:**\n1.000 Kz × 2.500 = 2.500.000 Kz\n\nUsa o Simulador de Prémios na tab "💰 PRÉMIOS" para calcular o teu prémio líquido exacto com qualquer valor de aposta.`,
      btns: [
        { label: '💰 Abrir Simulador', action: 'nav_premios' },
        { label: '🎲 Gerar combinações', action: 'nav_gerador' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 7 · TOTOBOLA
  // ═══════════════════════════════════════════════════════
  if (lower.includes('totobola') || lower.includes('futebol') || lower.includes('prognostico') || lower.includes('girabola')) {
    return {
      answer: `⚽ **Totobola — Em Desenvolvimento**\n\nO Totobola é o jogo de prognósticos desportivos onde prevês o resultado de 13 jogos de futebol: 1 (vitória da casa), X (empate), 2 (vitória dos visitantes).\n\n**O que está a ser preparado:**\n✓ Grelha semanal oficial com jogos do Girabola\n✓ Gerador de prognósticos inteligente\n✓ Contagem automática de acertos\n✓ Histórico de boletins e desempenho\n✓ Estatísticas de prognósticos\n\n**Parcerias oficiais:** ISJ + FAF\n\n⚠️ O Totobola só será lançado com dados oficiais verificados. Sem dados fictícios.\n\nEnquanto isso, o Loto 5/90 já está a funcionar com dados reais. 🎲`,
      btns: [
        { label: '🎲 Ir para o Loto 5/90', action: 'nav_gerador' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 8 · JOGO RESPONSÁVEL
  // ═══════════════════════════════════════════════════════
  if (lower.includes('responsavel') || lower.includes('autoavaliacao') || lower.includes('vicio') || lower.includes('dependencia') || lower.includes('parar') || lower.includes('isj') || (lower.includes('ajuda') && lower.includes('jogo'))) {
    return {
      answer: `🛡️ **Jogo Responsável**\n\nO KazolaGlow tem ferramentas gratuitas para te ajudar a jogar com saúde:\n\n📋 **Autoavaliação** — 5 perguntas que avaliam os teus hábitos. Recebes feedback personalizado e honesto.\n\n⏱️ **Temporizador de sessão** — define 15, 30, 45 ou 60 minutos. O sistema avisa quando o tempo acabar.\n\n🚪 **Período de reflexão** — afasta-te voluntariamente por 24h, 7 dias ou 30 dias. Sem pressão.\n\n**Lembra-te sempre:**\n• O jogo é entretenimento, não fonte de rendimento\n• Define um orçamento e cumpre-o\n• Nunca jogues para recuperar perdas\n• Se sentires que perdeste o controlo, pede ajuda\n\n📞 **Apoio profissional:** Contacta o ISJ — Instituto de Supervisão de Jogos de Angola.`,
      btns: [
        { label: '🛡️ Abrir ferramentas', action: 'modal_responsible' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 9 · DIÁRIO DE APOSTAS
  // ═══════════════════════════════════════════════════════
  if (lower.includes('diario') || lower.includes('registar aposta') || lower.includes('historico pessoal') || lower.includes('acompanhar')) {
    return {
      answer: `📓 **Diário de Apostas**\n\nUma ferramenta essencial para quem aposta regularmente.\n\n**O que podes registar:**\n• Data e hora da aposta\n• Os 5 números jogados\n• Valor apostado (50–1.000 Kz)\n• Sessão (Fezada, Aqueceu, Kazola, Eskebra)\n• Notas pessoais\n\n**Depois de jogar:**\n• Marca quantos acertos tiveste\n• Regista o prémio recebido\n• Vê o teu saldo real do mês\n\n**Porquê isto importa?**\nSem registo, não sabes se estás a ganhar ou a perder. O Diário torna isso visível e honesto.\n\n${isPremium ? '✅ Já tens acesso. Encontras o Diário na aba principal.' : '🔒 Disponível para utilizadores Premium.\n\nSe já apostas regularmente, este registo paga-se sozinho em organização e controlo.'}`,
      btns: isPremium
        ? [{ label: '📓 Abrir Diário', action: 'nav_diario' }, menuCTA]
        : [upgradeCTA, { label: '🤔 O que mais tem o Premium?', action: 'premium' }, menuCTA],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 10 · PLANO SEMANAL
  // ═══════════════════════════════════════════════════════
  if (lower.includes('plano semanal') || lower.includes('plano da semana') || lower.includes('organizar apostas') || lower.includes('orcamento semanal')) {
    return {
      answer: `📅 **Plano Semanal de Apostas**\n\nAjuda-te a organizar as apostas de toda a semana de forma estruturada.\n\n**Como funciona:**\n1. Defines o teu orçamento semanal (100–10.000 Kz)\n2. Escolhes o valor por aposta (50–1.000 Kz)\n3. Clicas em "GERAR PLANO"\n\n**O sistema calcula automaticamente:**\n• Total de apostas que cabem no orçamento\n• Distribuição pelos 7 dias\n• Combinações sugeridas para cada dia\n• Sessão recomendada (Fezada, Kazola, etc.)\n\n**O valor real desta ferramenta:**\nEvita que gastes mais do que planeias. A maioria das perdas acontece por falta de estrutura, não por má sorte.\n\n${isPremium ? '✅ Disponível para ti. Encontras na aba principal.' : '🔒 Exclusivo Premium.\n\nSe já apostas mais de 2 vezes por semana, esta ferramenta é especialmente útil para ti.'}`,
      btns: isPremium
        ? [{ label: '📅 Abrir Plano', action: 'nav_plano' }, menuCTA]
        : [upgradeCTA, menuCTA],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 11 · RELATÓRIO MENSAL
  // ═══════════════════════════════════════════════════════
  if (lower.includes('relatorio') || lower.includes('desempenho') || lower.includes('analise mensal') || lower.includes('saldo')) {
    return {
      answer: `📊 **Relatório Mensal**\n\nA radiografia completa das tuas apostas num mês.\n\n**O que mostra:**\n💰 Total gasto no mês\n💰 Total recuperado em prémios\n📊 Saldo líquido real (lucro ou prejuízo)\n📈 Taxa de retorno (%)\n🎯 Distribuição de acertos (0, 1, 2, 3, 4, 5)\n📅 Gasto por semana (gráfico de barras)\n📉 Comparação com o mês anterior\n💡 Observações personalizadas\n\n**Porquê é importante?**\nA maioria das pessoas não sabe quanto realmente gasta em apostas por mês. O Relatório torna isso impossível de ignorar — e isso é útil independentemente do resultado.\n\n${isPremium ? '✅ Disponível para ti na aba principal.' : '🔒 Exclusivo Premium.\n\nSe queres perceber o teu padrão real de apostas, este é o sítio certo.'}`,
      btns: isPremium
        ? [{ label: '📊 Ver Relatório', action: 'nav_relatorio' }, menuCTA]
        : [upgradeCTA, menuCTA],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 12 · FAVORITOS
  // ═══════════════════════════════════════════════════════
  if (lower.includes('favorito') || lower.includes('guardar') || lower.includes('salvar combinacao')) {
    return {
      answer: `💾 **Favoritos**\n\nDepois de gerares uma combinação, toca no **♡** ao lado de cada linha para a guardar.\n\nOs favoritos ficam na secção "Os seus favoritos", mesmo abaixo do gerador.\n\n**Características:**\n✅ Guardas quantas combinações quiseres\n✅ Funciona offline (guardado localmente)\n✅ Removes a qualquer momento\n✅ Persiste entre sessões no mesmo dispositivo\n\nÉ útil para guardar combinações que consideras interessantes sem as perder entre gerações.`,
      btns: [
        { label: '🎲 Ir ao Gerador', action: 'nav_gerador' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 13 · REGISTO / CONTA / TRIAL (trial 3 dias)
  // ═══════════════════════════════════════════════════════
  if (lower.includes('registar') || lower.includes('criar conta') || lower.includes('trial') || lower.includes('gratis') || lower.includes('account')) {
    if (session) {
      return {
        answer: `👤 **A tua conta**\n\n📧 Email: ${session.email}\n📅 Status: ${isPremium ? '🏆 Premium activo' : `Trial — ${dias} dias restantes`}\n🎲 Gerações hoje: ${session.generationsToday}/1\n\n${!isPremium ? `Com o trial tens acesso ao gerador básico (1 geração/dia), estatísticas e histórico.\n\nO Premium desbloqueia tudo sem limites.${urgencia()}` : 'Tens acesso completo a todas as funcionalidades.'}`,
        btns: isPremium
          ? [{ label: '🎲 Gerar', action: 'nav_gerador' }, menuCTA]
          : [upgradeCTA, menuCTA],
      };
    }
    return {
      answer: `📝 **Registo Gratuito — Trial de 3 dias**\n\nO registo é gratuito e leva menos de 30 segundos.\n\n**O que inclui o trial:**\n✅ 1 geração por dia\n✅ Métodos Equilibrado e Aleatório\n✅ Estatísticas completas\n✅ Histórico de sorteios\n✅ Simulador de prémios\n\n**Sem cartão de crédito. Sem compromisso.**\n\nDepois do trial, se quiseres continuar a gerar, podes activar o Premium (2.500 Kz/mês) ou ficares com acesso às estatísticas e histórico gratuitamente.`,
      btns: [trialCTA, { label: '🏆 Ver Premium', action: 'premium' }, menuCTA],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 14 · PREMIUM — APRESENTAÇÃO COMPLETA
  // ═══════════════════════════════════════════════════════
  if (lower.includes('premium') || lower.includes('upgrade') || lower.includes('beneficio') || (lower.includes('plano') && lower.includes('pago'))) {
    const urg = urgencia();
    return {
      answer: `🏆 **Premium KazolaGlow**\n\n**O que desbloqueia:**\n✅ Gerações ilimitadas por dia\n✅ Método Frequência Histórica\n✅ Método Monte Carlo\n✅ Até 10 linhas por geração\n✅ Diário de Apostas completo\n✅ Plano Semanal profissional\n✅ Relatório Mensal detalhado\n✅ Score Kazola e análise comportamental\n✅ Simulações históricas\n✅ Planos personalizados\n✅ Sincronização cross-device\n\n**Planos:**\n📅 Mensal — **2.500 Kz** (~83 Kz/dia)\n📆 Anual — **20.000 Kz** (poupas 10.000 Kz)\n\n**Como activar:**\n1. Transferência BAI para:\n   👤 Gabriel António Armando Sapalo\n   🔢 IBAN: AO06 0040 0000 1859 5631 1019 4\n2. Envia comprovativo para glowscalepro@gmail.com\n3. Recebes o token em minutos\n4. Inseres o token no topo da página (🔑 Inserir token)\n\n⚡ Activação em menos de 5 minutos.${urg}\n\n⚠️ Restam apenas ${VAGAS} vagas promocionais este mês.`,
      btns: [
        upgradeCTA,
        { label: '💳 Como pagar?', action: 'pagamento' },
        { label: '🤔 Vale a pena?', action: 'vale_a_pena' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 15 · PAGAMENTO — DETALHES COM HTML
  // ═══════════════════════════════════════════════════════
  if (lower.includes('pagar') || lower.includes('pagamento') || lower.includes('transferencia') || lower.includes('iban') || lower.includes('bai') || lower.includes('mpesa') || lower.includes('token') || lower.includes('ativar')) {
    return {
      answer: ``,
      html: `
<p>💳 <strong>Como activar o Premium</strong></p>
<p><strong>Passo 1 — Escolhe o plano:</strong><br/>
- Mensal: 2.500 Kz<br/>
- Anual: 20.000 Kz (poupas 10.000 Kz)</p>

<p><strong>Passo 2 — Escolhe como pagar:</strong></p>

<p>🏦 <strong>Transferência BAI</strong><br/>
👤 Gabriel António Armando Sapalo<br/>
🔢 IBAN: AO06 0040 0000 1859 5631 1019 4</p>

<div style="display:flex;align-items:center;gap:8px;background:rgba(255,140,0,0.12);border:1px solid rgba(255,140,0,0.4);border-radius:12px;padding:10px 14px;margin:8px 0;">
  <img src="/mcx-express.png" alt="MCX Express" style="width:38px;height:38px;border-radius:8px;flex-shrink:0;" />
  <div>
    <div style="color:#FF8C00;font-weight:700;font-size:0.85rem;">Multicaixa Express <span style="background:#FF8C00;color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:20px;margin-left:4px;">RECOMENDADO</span></div>
    <div style="color:#ccc;font-size:0.78rem;">🔢 Número: 923 379 486</div>
    <div style="color:#aaa;font-size:0.75rem;">✅ Pagamento imediato, sem esperas bancárias</div>
  </div>
</div>

<p><strong>Passo 3 — Envia o comprovativo:</strong><br/>
📧 glowscalepro@gmail.com <em style="color:#F5C518;">← obrigatório para activação automática</em><br/>
💬 WhatsApp: +244 923 379 486 (opcional)</p>

<div style="background:rgba(245,197,24,0.08);border-left:3px solid #F5C518;padding:8px 12px;border-radius:6px;font-size:0.78rem;color:#ccc;">
⚠️ O envio por <strong style="color:#F5C518;">email</strong> activa o teu acesso automaticamente em menos de 5 minutos. Sem email, a activação pode demorar por requerer confirmação manual.
</div>

<p style="margin-top:10px;"><strong>Passo 4 — Activa:</strong><br/>
Recebes um token de 16 caracteres por email. Inseres em "🔑 Inserir token" no topo da página.</p>

<p>⚡ <strong>Activação automática em menos de 5 minutos</strong> — via email.</p>
`,
      btns: [
        upgradeCTA,
        { label: '📧 Contactar suporte', action: 'suporte' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 16 · VALE A PENA?
  // ═══════════════════════════════════════════════════════
  if (lower.includes('vale a pena') || lower.includes('compensa') || lower.includes('funciona mesmo') || lower.includes('garantia') || lower.includes('resultados')) {
    return {
      answer: `🤔 **Vale a pena o Premium?**\n\nVamos ser honestos:\n\nO Premium **não garante que vais ganhar** no Loto — isso seria irresponsável dizer. Os sorteios são aleatórios.\n\n**O que o Premium faz de verdade:**\n\n📊 Dá-te mais dados e ferramentas para estudares padrões históricos.\n\n📓 Registas as tuas apostas e vês o teu saldo real — muitos ficam surpreendidos com o que descobrem.\n\n📅 Planeias a semana com orçamento definido, o que reduz gastos impulsivos.\n\n📈 Tens métodos de geração mais sofisticados para explorar.\n\n📊 **Score Kazola** — vês a tua disciplina e consistência medida objectivamente.\n\n**Para quem faz sentido:**\nSe já apostas regularmente e queres fazê-lo de forma mais organizada e consciente — o Premium paga-se com a organização que dá.\n\n**Para quem não faz sentido:**\nSe apostas raramente ou já tens toda a organização que precisas.`,
      btns: [
        upgradeCTA,
        { label: '💳 Como pagar?', action: 'pagamento' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 17 · OBJEÇÕES
  // ═══════════════════════════════════════════════════════
  if (lower.includes('caro') || lower.includes('muito dinheiro') || lower.includes('nao tenho') || lower.includes('sem dinheiro')) {
    return {
      answer: `💬 Entendo a preocupação.\n\nVamos por partes:\n\n2.500 Kz/mês = **83 Kz por dia**.\n\nSe já apostas regularmente, é provável que gastes mais do que isso por semana em apostas.\n\nA questão não é se o Premium é caro — é se vale mais do que 83 Kz/dia em organização, dados, Score Kazola e controlo.\n\nSe a resposta for sim, faz sentido.\nSe a resposta for não, o trial gratuito já te dá estatísticas e histórico sem custo.\n\nNão há pressão — a decisão é tua e deve fazer sentido para a tua situação.`,
      btns: [
        upgradeCTA,
        { label: '📝 Ficar no trial', action: 'login' },
        menuCTA,
      ],
    };
  }

  if (lower.includes('vou pensar') || lower.includes('depois') || lower.includes('mais tarde') || lower.includes('nao sei')) {
    return {
      answer: `Claro, sem problema. 🙂\n\nNão há urgência real — a plataforma está aqui quando precisares.\n\nO trial dura 3 dias e dá-te acesso às funcionalidades básicas. Aproveita para explorar as estatísticas e o histórico sem qualquer compromisso.\n\nSe surgir alguma dúvida entretanto, estou aqui.`,
      btns: [
        { label: '📊 Ver Estatísticas', action: 'nav_estatisticas' },
        { label: '📜 Ver Histórico', action: 'nav_historico' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 18 · SUPORTE / CONTACTO
  // ═══════════════════════════════════════════════════════
  if (lower.includes('suporte') || lower.includes('contacto') || lower.includes('email') || lower.includes('whatsapp') || lower.includes('problema') || lower.includes('bug')) {
    return {
      answer: `📧 **Suporte KazolaGlow**\n\n**Email:** glowscalepro@gmail.com\n**WhatsApp:** +244 923 379 486\n\n**Horário:** Dias úteis, 9h–18h\n**Resposta:** normalmente em menos de 24 horas\n\n**Para problemas técnicos**, descreve:\n• O que tentaste fazer\n• O que aconteceu\n• O teu sistema operativo/browser\n\n**Para questões de pagamento**, anexa sempre o comprovativo de transferência.`,
      btns: [
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 19 · TERMOS / PRIVACIDADE / LEGAL
  // ═══════════════════════════════════════════════════════
  if (lower.includes('termos') || lower.includes('privacidade') || lower.includes('legal') || lower.includes('dados') || lower.includes('rgpd') || lower.includes('afiliada') || lower.includes('lotaria nacional')) {
    return {
      answer: `⚖️ **Legal e Privacidade**\n\n**O KazolaGlow é:**\n✅ Uma ferramenta educativa e de entretenimento\n✅ Independente — não afiliada à Mota & Tavares Jogos\n✅ Não afiliada à Lotaria Nacional de Angola nem ao ISJ\n\n**Os dados:**\n• Os teus favoritos e preferências ficam guardados localmente (localStorage)\n• Nenhum dado pessoal é transmitido a terceiros\n• Em conformidade com a Lei 22/11 de Protecção de Dados de Angola\n\n**Regulamentação do jogo:**\nLei n.º 17/24 · Decreto Executivo n.º 695/25\n\n**Importante:** os sorteios são aleatórios e independentes. Nenhuma ferramenta garante acertos. Joga com responsabilidade. +18.`,
      btns: [
        { label: '📄 Ver Termos', action: 'modal_terms' },
        { label: '🔒 Ver Privacidade', action: 'modal_privacy' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 20 · FAQ GERAL
  // ═══════════════════════════════════════════════════════
  if (lower.includes('faq') || lower.includes('duvidas') || lower.includes('perguntas frequentes') || lower.includes('ajuda')) {
    return {
      answer: `❓ **Perguntas Frequentes**\n\nEscolhe um tema:`,
      btns: [
        { label: '🎱 Como funciona o Loto?', action: 'como funciona' },
        { label: '🎲 O que é o gerador?', action: 'gerador' },
        { label: '📊 Para que servem as estatísticas?', action: 'estatisticas' },
        { label: '📊 Quanto gastei?', action: 'gastei' },
        { label: '📊 Qual o meu ROI?', action: 'roi' },
        { label: '🏆 O que é o Premium?', action: 'premium' },
        { label: '💳 Como pagar o Premium?', action: 'pagamento' },
        { label: '🛡️ Jogo responsável?', action: 'responsavel' },
        { label: '📧 Preciso de suporte', action: 'suporte' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 21 · QUALIFICAÇÃO
  // ═══════════════════════════════════════════════════════
  if (lower.includes('como escolher') || lower.includes('que numeros') || lower.includes('estrategia')) {
    return {
      answer: `Boa pergunta. 🎯\n\nA verdade é que não existe estratégia que garanta acertos — o Loto é um jogo de probabilidade pura.\n\nO que o KazolaGlow faz é ajudar-te a:\n\n1. **Estudar padrões históricos** — não para prever o futuro, mas para fazeres escolhas informadas.\n\n2. **Gerar combinações estruturadas** — em vez de escolheres ao acaso, tens métodos baseados em análise estatística.\n\n3. **Controlar o orçamento** — para que o jogo se mantenha como entretenimento e não vire problema.\n\nQuer que te explique cada método do gerador em detalhe?`,
      btns: [
        { label: '🎲 Explicar o Gerador', action: 'gerador' },
        { label: '📊 Ver Estatísticas', action: 'estatisticas' },
        menuCTA,
      ],
    };
  }

  // ═══════════════════════════════════════════════════════
  // FALLBACK
  // ═══════════════════════════════════════════════════════
  return {
    answer: `Não tenho a certeza se percebi bem a tua pergunta. 😊\n\nPosso ajudar-te com qualquer um destes temas:`,
    btns: [
      { label: '🎱 Como funciona o Loto?', action: 'como funciona' },
      { label: '🎲 Gerador de combinações', action: 'gerador' },
      { label: '📊 Estatísticas', action: 'estatisticas' },
      { label: '💰 Prémios e simulador', action: 'premios' },
      { label: '📊 Quanto gastei?', action: 'gastei' },
      { label: '📊 Qual o meu ROI?', action: 'roi' },
      { label: '🧠 Score Kazola', action: 'score' },
      { label: '🏆 Premium', action: 'premium' },
      { label: '🛡️ Jogo responsável', action: 'responsavel' },
      { label: '❓ FAQ completo', action: 'faq' },
      menuCTA,
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL — v3.7 (com mensagem proactiva)
// ─────────────────────────────────────────────────────────────
export default function ChatBot({ session, onUpgrade, onLogin, onOpenModal, onScrollTo }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ultimoTopico, setUltimoTopico] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const getAnswerAsync = async (query: string): Promise<{ answer: string; html?: string; btns: { label: string; action: string }[] }> => {
    return await getAnswer(query, session);
  };

  // ─────────────────────────────────────────────────────────────
  // MENSAGEM PROACTIVA — O "BALCÃO" DO ADVISOR (v3.7)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const key = `kg_proactive_${hoje}`;

    // Se já mostrou hoje, não mostra novamente
    if (localStorage.getItem(key)) return;

    // Não mostra se o chat já está aberto
    if (open) return;

    // Aguarda 6 segundos para não ser intrusivo
    const timer = setTimeout(() => {
      // Abre o chat automaticamente
      setOpen(true);

      // Determina a mensagem baseada no perfil
      let mensagem = '';
      let botoes: { label: string; action: string }[] = [];

      if (!session) {
        // Visitante (sem conta)
        mensagem = '🎯 Já sabes quanto gastas por mês no Loto?';
        botoes = [{ label: '📝 Descobrir grátis', action: 'login' }];
      } else if (session.isPremium) {
        // Utilizador Premium
        mensagem = `📈 O teu Score Kazola está pronto — vê como estás a evoluir.`;
        botoes = [{ label: '🧠 Ver Score', action: 'score' }];
      } else {
        const dias = trialDaysLeft(session);
        if (dias <= 0) {
          // Trial expirado
          mensagem = '🔒 O teu trial terminou. As tuas estatísticas continuam aqui.';
          botoes = [{ label: '🏆 Reactivar', action: 'upgrade' }];
        } else if (dias <= 1) {
          // Trial a expirar
          mensagem = `⏰ O teu trial acaba amanhã — não percas o acesso.`;
          botoes = [{ label: '🏆 Ativar Premium', action: 'upgrade' }];
        } else {
          // Trial activo
          mensagem = `🎲 Já tens ${dias} dias grátis. Já experimentaste o gerador?`;
          botoes = [{ label: '🎲 Experimentar', action: 'nav_gerador' }];
        }
      }

      // Adiciona a mensagem proactiva
      setTimeout(() => {
        // Adiciona a mensagem
        const newMsg: Message = {
          id: idRef.current++,
          from: 'bot',
          text: mensagem,
          btns: botoes
        };
        setMsgs(prev => [...prev, newMsg]);

        // Rola para a mensagem
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

      }, 500);

      // Marca como mostrado hoje
      localStorage.setItem(key, 'true');

    }, 6000);

    return () => clearTimeout(timer);
  }, [session, open]);

  useEffect(() => {
    if (open && msgs.length === 0) {
      getAnswerAsync('menu').then(({ answer, html, btns }) => {
        setMsgs([{ id: idRef.current++, from: 'bot', text: answer, html, btns }]);
      });
    }
  }, [open, session, msgs.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const push = (from: 'bot' | 'user', text: string, html?: string, btns?: { label: string; action: string }[]) =>
    setMsgs(prev => [...prev, { id: idRef.current++, from, text, html, btns }]);

  const respond = (query: string) => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      getAnswerAsync(query).then(({ answer, html, btns }) => {
        push('bot', answer, html, btns);
        setBusy(false);
      });
    }, 320);
  };

  const handleSend = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    push('user', q);
    setInput('');
    respond(q);
  };

  const handleBtn = (action: string, label: string) => {
    if (busy) return;
    push('user', label);

    // ======== AÇÕES PRINCIPAIS ========
    if (action === 'upgrade') { respond('premium'); setTimeout(() => onUpgrade?.(), 800); return; }
    if (action === 'login') { respond('registar'); setTimeout(() => onLogin?.(), 800); return; }
    if (action === 'menu') {
      setBusy(true);
      setTimeout(() => {
        getAnswerAsync('menu').then(({ answer, html, btns }) => {
          push('bot', answer, html, btns);
          setBusy(false);
        });
      }, 300);
      return;
    }

    // ======== NAVEGAÇÃO ========
    if (action === 'nav_gerador') { push('bot', '🎲 A abrir o Gerador…'); setTimeout(() => onScrollTo?.('gerador'), 600); return; }
    if (action === 'nav_estatisticas') { push('bot', '📊 A abrir as Estatísticas…'); setTimeout(() => onScrollTo?.('estatisticas'), 600); return; }
    if (action === 'nav_historico') { push('bot', '📜 A abrir o Histórico…'); setTimeout(() => onScrollTo?.('historico'), 600); return; }
    if (action === 'nav_premios') { push('bot', '💰 A abrir o Simulador…'); setTimeout(() => onScrollTo?.('premios'), 600); return; }
    if (action === 'nav_diario') { push('bot', '📓 A abrir o Diário…'); setTimeout(() => onScrollTo?.('diario'), 600); return; }
    if (action === 'nav_plano') { push('bot', '📅 A abrir o Plano Semanal…'); setTimeout(() => onScrollTo?.('plano_semanal'), 600); return; }
    if (action === 'nav_relatorio') { push('bot', '📊 A abrir o Relatório…'); setTimeout(() => onScrollTo?.('relatorio'), 600); return; }

    // ======== MODAIS ========
    if (action === 'modal_responsible') { push('bot', '🛡️ A abrir Jogo Responsável…'); setTimeout(() => onOpenModal?.('responsible'), 600); return; }
    if (action === 'modal_terms') { push('bot', '📄 A abrir Termos…'); setTimeout(() => onOpenModal?.('terms'), 600); return; }
    if (action === 'modal_privacy') { push('bot', '🔒 A abrir Privacidade…'); setTimeout(() => onOpenModal?.('privacy'), 600); return; }

    // ======== AÇÕES DO AI ADVISOR ========
    if (action === 'score') { respond('score kazola'); return; }
    if (action === 'score_detalhes') { respond('score detalhado'); return; }
    if (action === 'gastei') { respond('quanto gastei'); return; }
    if (action === 'roi') { respond('qual o meu roi'); return; }
    if (action === 'simular') { respond('simula os ultimos 90 dias'); return; }
    if (action === 'criar_plano') { respond('cria um plano personalizado'); return; }
    if (action === 'onde_perco') { respond('onde perco mais dinheiro'); return; }
    if (action === 'atrasos') { respond('maiores atrasos historicos'); return; }
    if (action === 'analisa_sorteios') { respond('analisa os ultimos sorteios'); return; }
    if (action === 'poupado') { respond('quanto teria poupado se seguisse o plano'); return; }
    if (action === 'erros') { respond('onde estou a cometer erros'); return; }

    // ======== FALLBACK ========
    respond(action);
  };

  // ─────────────────────────────────────────────────────────────
  // JSX — IDÊNTICO AO ORIGINAL (MANTIDO)
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          left: 'calc(16px + env(safe-area-inset-left))',
          zIndex: 9000,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg,#CC0000,#F0C040)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(204,0,0,0.45)',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(204,0,0,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(204,0,0,0.45)'; }}
      >
        {open ? (
          <div style={{
            width: 60,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            fontWeight: 700,
            color: '#fff',
            background: 'linear-gradient(135deg,#CC0000,#F0C040)',
            borderRadius: '50%',
          }}>
            ✕
          </div>
        ) : (
          <div style={{ position: 'relative', width: 60, height: 60 }}>
            <img
              src={avatarBot}
              alt="Assistente KazolaGlow"
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                objectFit: 'cover',
                objectPosition: '50% 50%',
                border: '2px solid rgba(245,197,24,0.5)',
              }}
              onError={(e) => {
                console.error('❌ Avatar não carregado:', e);
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="pulse-green" style={{
              position: 'absolute',
              bottom:-4,
              right: -4,
              zIndex: 9999,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #0d0d1f',
              animation: 'pulse-green 2s ease-in-out infinite',
            }} />
          </div>
        )}
      </button>

      {/* Janela do chat */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistente KazolaGlow"
          style={{
            position: 'fixed',
            bottom: 90,
            left: 20,
            zIndex: 9000,
            width: 'min(400px, calc(100vw - 40px))',
            height: 'min(580px, calc(100vh - 120px))',
            background: '#0d0d1f',
            border: '1px solid rgba(245,197,24,0.3)',
            borderRadius: 22,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            animation: 'kgChatPop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <style>{`
            @keyframes kgChatPop {
              from { opacity:0; transform:scale(0.8) translateY(40px); }
              to   { opacity:1; transform:scale(1) translateY(0); }
            }
            @keyframes pulse-green {
              0%   { transform: scale(1);   opacity: 1; }
              50%  { transform: scale(1.5); opacity: 0.5; }
              100% { transform: scale(1);   opacity: 1; }
              }
            .kg-bot {
              background: rgba(255,255,255,0.09);
              border-radius: 16px 16px 16px 6px;
              color: #ddd;
              padding: 0.75rem 1rem;
              max-width: 86%;
              font-size: 0.84rem;
              line-height: 1.55;
              white-space: pre-line;
              align-self: flex-start;
            }
            .kg-user {
              background: linear-gradient(135deg,#CC0000,#990000);
              border-radius: 16px 16px 6px 16px;
              color: #fff;
              padding: 0.75rem 1rem;
              max-width: 80%;
              font-size: 0.84rem;
              line-height: 1.55;
              align-self: flex-end;
            }
            .kg-btn {
              background: rgba(245,197,24,0.11);
              border: 1px solid rgba(245,197,24,0.4);
              border-radius: 9999px;
              color: #F5C518;
              padding: 0.5rem 1rem;
              font-size: 0.78rem;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
              white-space: nowrap;
              line-height: 1.3;
            }
            .kg-btn:hover {
              background: rgba(245,197,24,0.28);
              transform: translateY(-1px);
              box-shadow: 0 4px 14px rgba(245,197,24,0.2);
            }
            .kg-btn:active { transform: translateY(0); }
            .kg-input:focus { outline: none; border-color: rgba(245,197,24,0.5) !important; }
            .kg-scroll::-webkit-scrollbar { width: 4px; }
            .kg-scroll::-webkit-scrollbar-track { background: transparent; }
            .kg-scroll::-webkit-scrollbar-thumb { background: rgba(245,197,24,0.2); border-radius: 4px; }
          `}</style>

          {/* Header com avatar */}
          <div style={{
            background: 'linear-gradient(135deg,#0f0f25,#151530)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(245,197,24,0.15)',
            flexShrink: 0,
          }}>
            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
              <img
                src={avatarBot}
                alt="Assistente KazolaGlow"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  objectPosition: '50% 50%',
                  border: '2px solid rgba(245,197,24,0.6)',
                  boxShadow: '0 0 12px rgba(204,0,0,0.5)',
                  animation: 'pulse-green 2s ease-in-out infinite',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: '#22c55e',
                border: '2px solid #0f0f25',
              }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.92rem', letterSpacing: '0.01em' }}>
                Assistente KazolaGlow
              </div>
              <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 2 }}>
                ● Online · Loto 5/90 Angola
              </div>
            </div>

            <button
              className="kg-btn"
              onClick={() => {
                setBusy(true);
                setTimeout(() => {
                  getAnswerAsync('menu').then(({ answer, html, btns }) => {
                    setMsgs([{ id: idRef.current++, from: 'bot', text: answer, html, btns }]);
                    setBusy(false);
                  });
                }, 200);
              }}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem' }}
            >
              🏠 Menu
            </button>
          </div>

          {/* Mensagens com avatar ao lado de cada mensagem do bot */}
          <div
            className="kg-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            {msgs.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.from === 'bot' ? 'flex-start' : 'flex-end',
                  gap: '0.45rem',
                }}
              >
                {m.from === 'bot' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <img
                      src={avatarBot}
                      alt=""
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        objectPosition: '50% 50%',
                        border: '1.5px solid rgba(245,197,24,0.5)',
                        flexShrink: 0,
                        marginTop: '0.2rem',
                      }}
                    />
                    <div className="kg-bot">
                      {m.html ? (
                        <div dangerouslySetInnerHTML={{ __html: m.html }} />
                      ) : (
                        m.text.split('\n').map((line, i) => (
                          <p key={i} style={{ margin: '0 0 0.25rem 0' }}>{line}</p>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {m.from === 'user' && (
                  <div className="kg-user">
                    {m.text.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: '0 0 0.25rem 0' }}>{line}</p>
                    ))}
                  </div>
                )}

                {m.btns && m.from === 'bot' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', maxWidth: '92%', marginLeft: 40 }}>
                    {m.btns.map(b => (
                      <button key={b.action} className="kg-btn" onClick={() => handleBtn(b.action, b.label)}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <img
                  src={avatarBot}
                  alt=""
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: '50% 20%',
                    border: '1.5px solid rgba(245,197,24,0.5)',
                    flexShrink: 0,
                    opacity: 0.6,
                  }}
                />
                <div className="kg-bot" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                  ⏳ A pensar…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '0.8rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: '#09091a',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: '0.55rem' }}>
              <input
                className="kg-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escreve a tua pergunta…"
                disabled={busy}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 28,
                  color: '#fff',
                  padding: '0.7rem 1.1rem',
                  fontSize: '0.88rem',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={busy}
                style={{
                  background: busy
                    ? 'rgba(204,0,0,0.4)'
                    : 'linear-gradient(135deg,#CC0000,#990000)',
                  border: 'none',
                  borderRadius: 28,
                  color: '#fff',
                  width: 46,
                  height: 46,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontSize: '1.1rem',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== CHANGELOG v3.7 ====================
// 1. NOVIDADE: Mensagem proactiva de boas-vindas ("o balcão") — aparece 6s após entrada
// 2. NOVIDADE: Botão "🧠 Onde erro?" adicionado ao menu Premium
// 3. Segmentação por perfil: visitante, trial, premium, trial a expirar
// 4. Limite de 1 exibição por dia (localStorage)
// 5. O chat abre automaticamente com a mensagem adequada ao perfil do utilizador

// ==================== CHANGELOG v3.6 ====================
// 1. REORDENAÇÃO CRÍTICA: os 10 blocos do AI Advisor (F1, F2, H1, H2, H3, S1,
//    B1, B2, S2, C1 + score_detalhes) foram movidos para o TOPO do getAnswer(),
//    antes dos 21 blocos antigos. Antes desta versão:
//      • "quanto gastei"  → era capturado pela seção 6 (PRÉMIOS) por causa de
//        'quanto' isolado → F1 nunca executava.
//      • "maiores atrasos historicos" → era capturado pela seção 4
//        (Estatísticas) por causa de 'atraso' ⊂ 'atrasos' → H2 nunca executava.
//      • "onde estou a cometer erros" → era capturado pela seção 18 (Suporte)
//        por causa de 'erro' ⊂ 'erros' → B2 nunca executava.
//    Em vez de reescrever as seções antigas (proibido pelo documento), a
//    estratégia foi mover os blocos do Advisor para antes delas — aditivo,
//    sem alterar nenhum texto das 21 seções originais.
// 2. Seção 6 (PRÉMIOS) teve o gatilho genérico 'quanto' substituído por
//    frases mais específicas ('quanto custa', 'quanto se pode ganhar',
//    'quanto posso ganhar') — o gatilho antigo era largo demais e continuaria
//    a colidir com qualquer pergunta futura que comece por "quanto".
// 3. Seção 11 (Relatório) e seção 18 (Suporte) tiveram os gatilhos
//    'quanto gastei'/'quanto ganhei' e 'erro' removidos, já que essas
//    perguntas agora são respondidas pelos blocos F1/B2 com dados reais.
// 4. logAIQuery corrigido em TODOS os blocos do Advisor para a assinatura
//    real do apiClient.ts: logAIQuery(email, question, intent,
//    responseCategory, topic). Antes, os blocos chamavam com 4 argumentos
//    incorretos (topic no lugar de intent, boolean no lugar de
//    responseCategory), quebrando a métrica de conversão da seção 2.7 do
//    documento.
// 5. helper logQuery (definido mas nunca usado na v3.5) passou a ser o único
//    ponto de chamada a logAIQuery, com tratamento de erro via .catch.
// 6. S1 e S2 agora tratam explicitamente o caso noPlanData (devolvido pelo
//    Code.gs corrigido) em vez de mostrar uma poupança calculada a partir de
//    uma fórmula fixa.
// 7. C1 (criar plano) agora informa o utilizador de que o plano foi
//    registado e conta para o pilar Planeamento do Score Kazola — alinhado
//    com o facto de createPlan_ no backend passar a gravar PLAN_CREATED.
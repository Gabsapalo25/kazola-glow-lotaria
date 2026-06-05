/**
 * ChatBot.tsx — Assistente KazolaGlow
 * Professor · Diplomata · Empático · Vendedor
 * Conhece todos os tópicos da página
 * Resolve problemas primeiro — as vendas vêm por si
 */

import { useState, useRef, useEffect } from 'react';
import avatarBot from '../assets/avatar-bot.webp';
import { UserSession, trialDaysLeft } from '../lib/session';

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
// RESPOSTAS — professor + empático + vendedor natural
// ─────────────────────────────────────────────────────────────
function getAnswer(
  input: string,
  session: UserSession | null
): { answer: string; html?: string; btns: { label: string; action: string }[] } {
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

  // ═══════════════════════════════════════════════════════
  // 1 · MENU / BOAS-VINDAS
  // ═══════════════════════════════════════════════════════
  if (lower === 'menu' || lower === '' || lower.includes('olá') || lower.includes('oi') || lower.includes('bom dia') || lower.includes('boa tarde') || lower.includes('boa noite')) {
    if (isPremium) {
      return {
        answer: `Olá ${nome}! 🏆 Tudo pronto para ti.\n\nO que precisas hoje?`,
        btns: [
          { label: '🎲 Gerador', action: 'gerador' },
          { label: '📓 Diário', action: 'diario' },
          { label: '📅 Plano Semanal', action: 'plano' },
          { label: '📊 Relatório', action: 'relatorio' },
          { label: '📈 Estatísticas', action: 'estatisticas' },
          { label: '❓ FAQ', action: 'faq' },
        ],
      };
    }
    if (session) {
      return {
        answer: `Olá ${nome}! 👋\n\nEstou aqui para te ajudar a perceber tudo sobre o Loto 5/90 e tirar o máximo da plataforma.\n\nO que te traz aqui hoje?`,
        btns: [
          { label: '🎲 Como funciona o gerador?', action: 'gerador' },
          { label: '📊 O que são as estatísticas?', action: 'estatisticas' },
          { label: '💰 Quanto posso ganhar?', action: 'premios' },
          { label: '🏆 O que é o Premium?', action: 'premium' },
          { label: '❓ FAQ', action: 'faq' },
        ],
      };
    }
    return {
      answer: `Olá! 👋 Bem-vindo ao KazolaGlow.\n\nSou o teu assistente. Conheço tudo sobre o Loto 5/90, as estatísticas, os prémios e as ferramentas desta plataforma.\n\nComo posso ajudar-te hoje?`,
      btns: [
        { label: '🎲 Como funciona o gerador?', action: 'gerador' },
        { label: '📊 O que são as estatísticas?', action: 'estatisticas' },
        { label: '💰 Quanto posso ganhar?', action: 'premios' },
        { label: '🏆 O que é o Premium?', action: 'premium' },
        { label: '📝 Criar conta grátis', action: 'login' },
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
  if (lower.includes('premio') || lower.includes('ganhar') || lower.includes('simulador') || lower.includes('multiplicador') || lower.includes('imposto') || lower.includes('quanto') ) {
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
  if (lower.includes('relatorio') || lower.includes('desempenho') || lower.includes('analise mensal') || lower.includes('saldo') || lower.includes('quanto gastei') || lower.includes('quanto ganhei')) {
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
  // 13 · REGISTO / CONTA / TRIAL
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
      answer: `📝 **Registo Gratuito — Trial de 7 dias**\n\nO registo é gratuito e leva menos de 30 segundos.\n\n**O que inclui o trial:**\n✅ 1 geração por dia\n✅ Métodos Equilibrado e Aleatório\n✅ Estatísticas completas\n✅ Histórico de sorteios\n✅ Simulador de prémios\n\n**Sem cartão de crédito. Sem compromisso.**\n\nDepois do trial, se quiseres continuar a gerar, podes activar o Premium (2.500 Kz/mês) ou ficares com acesso às estatísticas e histórico gratuitamente.`,
      btns: [trialCTA, { label: '🏆 Ver Premium', action: 'premium' }, menuCTA],
    };
  }

  // ═══════════════════════════════════════════════════════
  // 14 · PREMIUM — APRESENTAÇÃO COMPLETA
  // ═══════════════════════════════════════════════════════
  if (lower.includes('premium') || lower.includes('upgrade') || lower.includes('beneficio') || (lower.includes('plano') && lower.includes('pago'))) {
    const urg = urgencia();
    return {
      answer: `🏆 **Premium KazolaGlow**\n\n**O que desbloqueia:**\n✅ Gerações ilimitadas por dia\n✅ Método Frequência Histórica\n✅ Método Monte Carlo\n✅ Até 10 linhas por geração\n✅ Diário de Apostas completo\n✅ Plano Semanal profissional\n✅ Relatório Mensal detalhado\n✅ Sincronização cross-device\n\n**Planos:**\n📅 Mensal — **2.500 Kz** (~84 Kz/dia)\n📆 Anual — **20.000 Kz** (poupas 10.000 Kz)\n\n**Como activar:**\n1. Transferência BAI para:\n   👤 Gabriel António Armando Sapalo\n   🔢 IBAN: AO06 0040 0000 1859 5631 1019 4\n2. Envia comprovativo para glowscalepro@gmail.com\n3. Recebes o token em minutos\n4. Inseres o token no topo da página (🔑 Inserir token)\n\n⚡ Activação em menos de 5 minutos.${urg}\n\n⚠️ Restam apenas ${VAGAS} vagas promocionais este mês.`,
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
      answer: `🤔 **Vale a pena o Premium?**\n\nVamos ser honestos:\n\nO Premium **não garante que vais ganhar** no Loto — isso seria irresponsável dizer. Os sorteios são aleatórios.\n\n**O que o Premium faz de verdade:**\n\n📊 Dá-te mais dados e ferramentas para estudares padrões históricos.\n\n📓 Registas as tuas apostas e vês o teu saldo real — muitos ficam surpreendidos com o que descobrem.\n\n📅 Planeias a semana com orçamento definido, o que reduz gastos impulsivos.\n\n📈 Tens métodos de geração mais sofisticados para explorar.\n\n**Para quem faz sentido:**\nSe já apostas regularmente e queres fazê-lo de forma mais organizada e consciente — o Premium paga-se com a organização que dá.\n\n**Para quem não faz sentido:**\nSe apostas raramente ou já tens toda a organização que precisas.`,
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
      answer: `💬 Entendo a preocupação.\n\nVamos por partes:\n\n2.500 Kz/mês = **83 Kz por dia**.\n\nSe já apostas regularmente, é provável que gastes mais do que isso por semana em apostas.\n\nA questão não é se o Premium é caro — é se vale mais do que 83 Kz/dia em organização, dados e controlo.\n\nSe a resposta for sim, faz sentido.\nSe a resposta for não, o trial gratuito já te dá estatísticas e histórico sem custo.\n\nNão há pressão — a decisão é tua e deve fazer sentido para a tua situação.`,
      btns: [
        upgradeCTA,
        { label: '📝 Ficar no trial', action: 'login' },
        menuCTA,
      ],
    };
  }

  if (lower.includes('vou pensar') || lower.includes('depois') || lower.includes('mais tarde') || lower.includes('nao sei')) {
    return {
      answer: `Claro, sem problema. 🙂\n\nNão há urgência real — a plataforma está aqui quando precisares.\n\nO trial dura 7 dias e dá-te acesso às funcionalidades básicas. Aproveita para explorar as estatísticas e o histórico sem qualquer compromisso.\n\nSe surgir alguma dúvida entretanto, estou aqui.`,
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
  if (lower.includes('suporte') || lower.includes('contacto') || lower.includes('email') || lower.includes('whatsapp') || lower.includes('problema') || lower.includes('erro') || lower.includes('bug')) {
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
  if (lower.includes('nao sei') || lower.includes('como escolher') || lower.includes('que numeros') || lower.includes('estrategia')) {
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
      { label: '🏆 Premium', action: 'premium' },
      { label: '🛡️ Jogo responsável', action: 'responsavel' },
      { label: '❓ FAQ completo', action: 'faq' },
      menuCTA,
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function ChatBot({ session, onUpgrade, onLogin, onOpenModal, onScrollTo }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (open && msgs.length === 0) {
      const { answer, html, btns } = getAnswer('menu', session);
      setMsgs([{ id: idRef.current++, from: 'bot', text: answer, html, btns }]);
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
      const { answer, html, btns } = getAnswer(query, session);
      push('bot', answer, html, btns);
      setBusy(false);
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

    if (action === 'upgrade') { respond('premium'); setTimeout(() => onUpgrade?.(), 800); return; }
    if (action === 'login') { respond('registar'); setTimeout(() => onLogin?.(), 800); return; }
    if (action === 'menu') {
      setBusy(true);
      setTimeout(() => {
        const { answer, html, btns } = getAnswer('menu', session);
        push('bot', answer, html, btns);
        setBusy(false);
      }, 300);
      return;
    }

    if (action === 'nav_gerador') { push('bot', '🎲 A abrir o Gerador…'); setTimeout(() => onScrollTo?.('gerador'), 600); return; }
    if (action === 'nav_estatisticas') { push('bot', '📊 A abrir as Estatísticas…'); setTimeout(() => onScrollTo?.('estatisticas'), 600); return; }
    if (action === 'nav_historico') { push('bot', '📜 A abrir o Histórico…'); setTimeout(() => onScrollTo?.('historico'), 600); return; }
    if (action === 'nav_premios') { push('bot', '💰 A abrir o Simulador…'); setTimeout(() => onScrollTo?.('premios'), 600); return; }
    if (action === 'nav_diario') { push('bot', '📓 A abrir o Diário…'); setTimeout(() => onScrollTo?.('diario'), 600); return; }
    if (action === 'nav_plano') { push('bot', '📅 A abrir o Plano Semanal…'); setTimeout(() => onScrollTo?.('plano_semanal'), 600); return; }
    if (action === 'nav_relatorio') { push('bot', '📊 A abrir o Relatório…'); setTimeout(() => onScrollTo?.('relatorio'), 600); return; }

    if (action === 'modal_responsible') { push('bot', '🛡️ A abrir Jogo Responsável…'); setTimeout(() => onOpenModal?.('responsible'), 600); return; }
    if (action === 'modal_terms') { push('bot', '📄 A abrir Termos…'); setTimeout(() => onOpenModal?.('terms'), 600); return; }
    if (action === 'modal_privacy') { push('bot', '🔒 A abrir Privacidade…'); setTimeout(() => onOpenModal?.('privacy'), 600); return; }

    respond(action);
  };

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
                  const { answer, html, btns } = getAnswer('menu', session);
                  setMsgs([{ id: idRef.current++, from: 'bot', text: answer, html, btns }]);
                  setBusy(false);
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
/**
 * totobola.ts — Totobola / Prognósticos de Futebol
 * ==================================================
 * O Totobola é um jogo de prognósticos desportivos regulamentado
 * pelo Instituto de Supervisão de Jogos (ISJ) de Angola.
 *
 * O apostador prevê o resultado de cada jogo:
 *   1 = vitória da equipa da casa
 *   X = empate
 *   2 = vitória da equipa visitante
 *
 * Probabilidade de acertar todos os N jogos por acaso: (1/3)^N
 *
 * NOTA: A grelha abaixo é ILUSTRATIVA. Substituir pelos jogos
 * oficiais da semana quando disponíveis.
 */

export const TOTOBOLA_DATA_IS_SIMULATED = true;

export type Prognostico = '1' | 'X' | '2';

export interface JogoTotobola {
  id    : number;
  casa  : string;
  fora  : string;
  liga  : string;
}

export interface ApostaTotobola {
  jogoId  : number;
  palpite : Prognostico;
}

export interface BoletimTotobola {
  id      : string;
  apostas : ApostaTotobola[];
}

/**
 * Grelha ilustrativa — jogos reais do Girabola 2025/26 e Liga Europa
 * Fonte: soccerway.com / ISJ (substituir pela grelha oficial semanal)
 */
export const GRELHA_EXEMPLO: JogoTotobola[] = [
  { id:  1, casa: 'Petro de Luanda',     fora: 'Primeiro de Agosto', liga: 'Girabola' },
  { id:  2, casa: 'Sagrada Esperança',   fora: 'Kabuscorp SC',       liga: 'Girabola' },
  { id:  3, casa: '1º de Agosto',        fora: 'Recreativo do Libolo', liga: 'Girabola' },
  { id:  4, casa: 'Desportivo da Huíla', fora: 'Petro de Luanda',    liga: 'Girabola' },
  { id:  5, casa: 'FC Bravos do Maquis', fora: 'Sagrada Esperança',  liga: 'Girabola' },
  { id:  6, casa: 'Atlético Petroleos',  fora: 'Cuando Cubango FC',  liga: 'Girabola' },
  { id:  7, casa: 'Interclube',          fora: 'CD Lunda Sul',       liga: 'Girabola' },
  { id:  8, casa: 'ASA Luanda',          fora: 'Wiliete Benguela',   liga: 'Girabola' },
  { id:  9, casa: 'CD Lunda Sul',        fora: 'FC Bravos do Maquis', liga: 'Girabola' },
  { id: 10, casa: 'Recreativo do Libolo', fora: 'Interclube',        liga: 'Girabola' },
  { id: 11, casa: 'Kabuscorp SC',        fora: 'Desportivo da Huíla', liga: 'Girabola' },
  { id: 12, casa: 'Cuando Cubango FC',   fora: 'ASA Luanda',         liga: 'Girabola' },
  { id: 13, casa: 'Wiliete Benguela',    fora: 'Atlético Petroleos', liga: 'Girabola' },
];

/** Gera boletim aleatório (para demonstração) */
export function gerarBoletimAleatorio(jogos: JogoTotobola[]): BoletimTotobola {
  const opcoes: Prognostico[] = ['1', 'X', '2'];
  return {
    id     : `tb-${Date.now()}`,
    apostas: jogos.map(j => ({
      jogoId : j.id,
      palpite: opcoes[Math.floor(Math.random() * 3)],
    })),
  };
}

/**
 * Probabilidade teórica de acertar todos os N jogos por puro acaso.
 * Cada jogo tem 3 resultados possíveis igualmente prováveis.
 * Total combinações: 3^N
 */
export function totobolaOddsAllCorrect(n: number): number {
  return Math.round(Math.pow(3, n));
}

/** Conta quantos jogos o boletim acertou face a resultados reais */
export function contarAcertos(
  boletim : BoletimTotobola,
  reais   : Record<number, Prognostico>,
): number {
  return boletim.apostas.filter(a => reais[a.jogoId] === a.palpite).length;
}
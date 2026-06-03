/**
 * officialApi.ts — Integração com a Lotaria Nacional de Angola
 * =============================================================
 * Este ficheiro é o único lugar onde configurar a fonte oficial de dados.
 *
 * ESTADO ACTUAL: API pública não disponível (Junho 2026).
 * A aplicação funciona com dados simulados em history.ts até esta
 * integração ser activada.
 *
 * COMO ACTIVAR (quando a API estiver disponível):
 * 1. Defina HAS_OFFICIAL_API = true
 * 2. Implemente fetchOfficialDraws() para chamar o endpoint real
 * 3. Mapeie a resposta para o tipo Draw de history.ts
 *
 * Fontes a monitorizar:
 *   https://www.lotarianacional.co.ao/resultados
 *   https://www.facebook.com/lotarianacional
 */

import type { Draw } from '../data/history';

/**
 * Mude para true quando a integração estiver pronta.
 * Enquanto for false, o App usa os dados simulados de history.ts
 * e mostra o banner amarelo de "dados simulados".
 */
export const HAS_OFFICIAL_API = false;

/**
 * Tenta obter os sorteios mais recentes da fonte oficial.
 * Retorna null em silêncio se falhar — o App faz fallback automático.
 *
 * Exemplo de implementação futura:
 *
 * const res = await fetch('https://api.lotarianacional.co.ao/v1/draws?limit=100');
 * const json = await res.json();
 * return json.data.map((item: any): Draw => ({
 *   id      : item.draw_id,
 *   date    : item.draw_date,        // "YYYY-MM-DD"
 *   time    : item.draw_time,        // "10:00" | "18:00"
 *   session : item.session,          // "fezada" | "kazola"
 *   numbers : item.numbers.sort((a: number, b: number) => a - b),
 * }));
 */
export async function fetchOfficialDraws(): Promise<Draw[] | null> {
  if (!HAS_OFFICIAL_API) return null;

  try {
    // TODO: substituir pelo endpoint real quando disponível
    const res = await fetch('https://api.lotarianacional.co.ao/v1/draws?limit=200', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();

    // Mapear resposta para o tipo Draw — ajustar conforme o schema real
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data as any[]).map((item): Draw => ({
      id     : String(item.draw_id),
      date   : item.draw_date,
      time   : item.draw_time ?? undefined,
      session: item.session   ?? undefined,
      numbers: (item.numbers as number[]).sort((a, b) => a - b),
    }));
  } catch {
    return null; // fallback silencioso
  }
}
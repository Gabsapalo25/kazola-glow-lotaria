import { useState } from 'react';
import { MIN_STAKE_KZ, MAX_STAKE_KZ, TAX_FREE_KZ, TAX_RATE } from '../data/history';

function fmtKz(n: number) {
  return n.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 });
}

// Multiplicadores corretos para Chance 5
const MULTIPLIERS: Record<number, number> = {
  1: 1,
  2: 10,
  3: 120,
  4: 5000,
  5: 100000,
};

// Bolinhas para representar os acertos
const getDots = (hits: number) => {
  const filled = '●';
  const empty = '○';
  return filled.repeat(hits) + empty.repeat(5 - hits);
};

export default function PrizeCalculator() {
  const [bet, setBet] = useState<number>(50);
  const [hits, setHits] = useState<1 | 2 | 3 | 4 | 5>(5);

  const multiplier = MULTIPLIERS[hits];
  const gross = bet * multiplier;
  const tax = gross > TAX_FREE_KZ ? (gross - TAX_FREE_KZ) * TAX_RATE : 0;
  const net = gross - tax;

  return (
    <div className="space-y-5">
      {/* Valor da aposta */}
      <div>
        <label className="block text-sm font-bold mb-1.5">Valor apostado (Kz)</label>
        <div className="flex items-center gap-3">
          <input 
            type="range" 
            min={MIN_STAKE_KZ} 
            max={MAX_STAKE_KZ} 
            step={50} 
            value={bet}
            onChange={e => setBet(Number(e.target.value))}
            className="flex-1 accent-[#CC0000]"
          />
          <span className="w-24 text-center font-display font-black text-xl bg-neutral-100 rounded-xl py-2">
            {fmtKz(bet)}
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-1">Mín: {fmtKz(MIN_STAKE_KZ)} · Máx: {fmtKz(MAX_STAKE_KZ)}</p>
      </div>

      {/* Chance 5 fixo */}
      <div className="bg-neutral-100 rounded-2xl p-4 text-center">
        <div className="text-sm uppercase text-neutral-500">Escolha a sua chance</div>
        <div className="font-display font-black text-3xl text-[#CC0000]">Chance 5</div>
        <div className="text-xs text-neutral-500 mt-1">Apostar em 5 números</div>
      </div>

      {/* Tabela de resultados igual à imagem oficial */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="px-3 py-2 text-left">Valor da aposta</th>
              <th className="px-3 py-2 text-left">Acertos</th>
              <th className="px-3 py-2 text-left">Multiplicador</th>
              <th className="px-3 py-2 text-right">Prémio</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(h => {
              const mult = MULTIPLIERS[h];
              const isSelected = hits === h;
              return (
                <tr 
                  key={h}
                  onClick={() => setHits(h as 1|2|3|4|5)}
                  className={`border-b border-neutral-100 cursor-pointer transition ${isSelected ? 'bg-amber-50' : 'hover:bg-neutral-50'}`}
                >
                  <td className="px-3 py-2 font-mono">{fmtKz(bet)}</td>
                  <td className="px-3 py-2">
                    <span className="text-lg tracking-wide font-mono">{getDots(h)}</span>
                    <span className="ml-2 text-xs text-neutral-500">{h} {h === 1 ? 'ponto' : 'pontos'}</span>
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-[#CC0000]">×{mult.toLocaleString('pt-AO')}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{fmtKz(bet * mult)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumo do prémio selecionado */}
      <div className="rounded-2xl bg-neutral-900 text-white p-5 grid sm:grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs uppercase text-neutral-400 mb-1">Prémio bruto</div>
          <div className="font-display font-black text-2xl text-[#F0C040]">{fmtKz(gross)}</div>
          <div className="text-xs text-neutral-500 mt-1">×{multiplier.toLocaleString('pt-AO')}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-neutral-400 mb-1">Imposto (15%)</div>
          <div className={`font-display font-black text-xl ${tax > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {tax > 0 ? `− ${fmtKz(tax)}` : 'Isento'}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {tax > 0 ? `Sobre excedente > ${fmtKz(TAX_FREE_KZ)}` : `≤ ${fmtKz(TAX_FREE_KZ)}`}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-neutral-400 mb-1">Prémio líquido</div>
          <div className="font-display font-black text-2xl text-white">{fmtKz(net)}</div>
          <div className="text-xs text-neutral-500 mt-1">Valor a receber</div>
        </div>
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed text-center">
        Simulador para <strong>Chance 5</strong> (aposta em 5 números).<br />
        Base no Decreto Executivo n.º 695/25 · Isenção: ≤ {fmtKz(TAX_FREE_KZ)} · Taxa: 15% sobre excedente.
      </p>
    </div>
  );
}
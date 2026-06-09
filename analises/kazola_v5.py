"""
MÉTODO KAZOLA v5.1 — ESPECIALISTA EM FEZADA (10h)
COM ORDENAÇÃO CRONOLÓGICA CORRETA
"""

import json
import random
import math
from collections import Counter
from itertools import combinations
from datetime import datetime

TOTAL_NUMEROS = 90
PICK_SIZE = 5
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

def parse_sessao(name):
    if not name:
        return 'desconhecido'
    n = name.lower()
    if 'fezada' in n:
        return 'fezada'
    if 'aqueceu' in n:
        return 'aqueceu'
    if 'kazola' in n:
        return 'kazola'
    if 'eskebra' in n:
        return 'eskebra'
    return 'outro'

def extrair_data_ordenavel(data_str):
    """Converte 'Terça-feira, 3 de Junho de 2026' para '2026-06-03'"""
    if not data_str:
        return None
    
    meses = {
        'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
        'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
        'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
    }
    
    try:
        # Remove o dia da semana (ex: "Terça-feira, ")
        if ',' in data_str:
            data_str = data_str.split(',', 1)[1].strip()
        
        parts = data_str.split(' de ')
        if len(parts) == 3:
            dia, mes, ano = parts
            mes_num = meses.get(mes.strip(), '01')
            return f"{ano.strip()}-{mes_num}-{dia.strip().zfill(2)}"
    except:
        pass
    return None

def processar_sorteios(raw_data):
    sorteios = []
    for grupo in raw_data:
        if not grupo.get('results'):
            continue
        
        data_str = grupo.get('formatedDate', '')
        data_key = extrair_data_ordenavel(data_str)
        
        for draw in grupo['results']:
            nums = []
            for i in range(1, 6):
                v = draw.get(f'number_{i}')
                if v and isinstance(v, int) and 1 <= v <= 90:
                    nums.append(v)
            
            if len(nums) == 5:
                hora_raw = draw.get('hour', '')
                hora = hora_raw.replace('H00', ':00') if hora_raw else '00:00'
                
                sorteios.append({
                    'sessao': parse_sessao(draw.get('name', '')),
                    'numeros': sorted(nums),
                    'data_str': data_str,
                    'data_key': data_key,
                    'hora': hora
                })
    
    # Ordena por data e hora
    sorteios.sort(key=lambda x: (x['data_key'] or '0000-00-00', x['hora']))
    return sorteios


class KazolaV51:
    def __init__(self, sorteios):
        self.sorteios = sorteios
    
    def calcular_gaps(self, sorteios_ate_data):
        """Calcula gaps APENAS com dados anteriores à data"""
        ultima = {}
        for idx, s in enumerate(sorteios_ate_data):
            for n in s['numeros']:
                ultima[n] = idx
        total = len(sorteios_ate_data)
        gaps = {}
        for n in range(1, TOTAL_NUMEROS + 1):
            if n in ultima:
                gaps[n] = total - 1 - ultima[n]
            else:
                gaps[n] = total
        return gaps, total
    
    def calcular_gap_score(self, gaps, n):
        """Números muito atrasados ganham bónus"""
        g = gaps.get(n, 0)
        if g > 60:
            return 1.0
        if g > 40:
            return 0.8
        if g > 25:
            return 0.5
        if g > 15:
            return 0.3
        return 0
    
    def validar_fezada(self):
        """Valida o método apenas nos sorteios da FEZADA com ordenação correta"""
        
        # Filtra apenas FEZADAS e mantém ordem cronológica
        fezadas = [s for s in self.sorteios if s['sessao'] == 'fezada']
        
        print(f"\n   Período: {fezadas[0]['data_str']} → {fezadas[-1]['data_str']}")
        print(f"   Total de FEZADAS: {len(fezadas)}")
        
        if len(fezadas) < 200:
            print(f"⚠️ Apenas {len(fezadas)} sorteios da FEZADA")
            return None
        
        resultados = []
        
        # Testa cada sorteio da FEZADA a partir do 100º
        for idx in range(100, len(fezadas)):
            sorteio_alvo = fezadas[idx]
            dados_anteriores = fezadas[:idx]
            
            # Calcula gaps APENAS com dados anteriores
            gaps, _ = self.calcular_gaps(dados_anteriores)
            
            # Score baseado apenas em gaps
            scores = {}
            for n in range(1, TOTAL_NUMEROS + 1):
                gap_score = self.calcular_gap_score(gaps, n)
                scores[n] = gap_score * 100
            
            # Top 25 candidatos por gap
            candidatos = sorted(scores.items(), key=lambda x: -x[1])[:25]
            candidatos_nums = [n for n, _ in candidatos if scores[n] > 0]
            
            if len(candidatos_nums) < 5:
                continue
            
            # Gera combinações
            linhas = []
            for comb in combinations(candidatos_nums, 5):
                soma = sum(comb)
                if not (180 <= soma <= 320):
                    continue
                pares = sum(1 for x in comb if x % 2 == 0)
                if not (1 <= pares <= 4):
                    continue
                
                linhas.append(comb)
                if len(linhas) >= 5:
                    break
            
            if linhas:
                numeros_reais = set(sorteio_alvo['numeros'])
                max_acertos = 0
                melhor_comb = None
                for comb in linhas:
                    acertos = len(set(comb) & numeros_reais)
                    if acertos > max_acertos:
                        max_acertos = acertos
                        melhor_comb = comb
                
                resultados.append({
                    'idx': idx,
                    'data': sorteio_alvo['data_str'],
                    'data_key': sorteio_alvo['data_key'],
                    'numeros_reais': sorteio_alvo['numeros'],
                    'max_acertos': max_acertos,
                    'acertou_2': max_acertos >= 2,
                    'melhor_comb': melhor_comb
                })
        
        return resultados
    
    def sugerir_para_proxima_fezada(self):
        """Gera sugestões para a próxima FEZADA com base nos dados mais recentes"""
        
        fezadas = [s for s in self.sorteios if s['sessao'] == 'fezada']
        
        if len(fezadas) < 50:
            return None
        
        # Usa TODAS as FEZADAS anteriores à última
        ultima_fezada = fezadas[-1]
        dados_anteriores = fezadas[:-1]
        
        gaps, total = self.calcular_gaps(dados_anteriores)
        
        print(f"\n   Base: {len(dados_anteriores)} FEZADAS anteriores")
        print(f"   Última FEZADA: {ultima_fezada['data_str']} - {ultima_fezada['numeros']}")
        
        # Mostra números com maiores gaps
        print("\n   📊 NÚMEROS MAIS ATRASADOS NA FEZADA:")
        gaps_sorted = sorted(gaps.items(), key=lambda x: -x[1])[:15]
        for n, g in gaps_sorted:
            nivel = "🔴" if g > 40 else ("🟡" if g > 25 else "⚪")
            print(f"      {nivel} Nº {n:02d}: gap de {g} sorteios")
        
        # Score para cada número
        scores = {}
        for n in range(1, TOTAL_NUMEROS + 1):
            gap_score = self.calcular_gap_score(gaps, n)
            scores[n] = round(gap_score * 100, 1)
        
        # Top 25 candidatos
        candidatos = sorted(scores.items(), key=lambda x: -x[1])[:25]
        candidatos_nums = [n for n, _ in candidatos if scores[n] > 0]
        
        # Gera combinações
        linhas = []
        for comb in combinations(candidatos_nums, 5):
            soma = sum(comb)
            if not (180 <= soma <= 320):
                continue
            pares = sum(1 for x in comb if x % 2 == 0)
            if not (1 <= pares <= 4):
                continue
            
            score_medio = sum(scores.get(n, 0) for n in comb) / 5
            linhas.append((comb, round(score_medio, 1)))
            
            if len(linhas) >= 5:
                break
        
        return linhas, gaps, ultima_fezada


def main():
    print("\n🔬 MÉTODO KAZOLA v5.1 — ESPECIALISTA EM FEZADA (10h)")
    print("   Com ordenação cronológica correta")
    print("=" * 70)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados e ordenados")
    print(f"   Período: {sorteios[0]['data_str']} → {sorteios[-1]['data_str']}")
    
    kazola = KazolaV51(sorteios)
    
    # Validação da FEZADA
    print("\n📊 VALIDAÇÃO DA FEZADA (backtesting com ordenação correta)")
    resultados = kazola.validar_fezada()
    
    if resultados:
        total = len(resultados)
        acertos_2 = sum(1 for r in resultados if r['acertou_2'])
        acertos_3 = sum(1 for r in resultados if r['max_acertos'] >= 3)
        
        print(f"\n   📈 RESULTADOS DO BACKTESTING:")
        print(f"   Total de testes: {total}")
        print(f"   Acertos ≥2 números: {acertos_2} ({acertos_2/total*100:.1f}%)")
        print(f"   Acertos ≥3 números: {acertos_3} ({acertos_3/total*100:.1f}%)")
        
        # Últimas 50 FEZADAS
        ultimas_50 = resultados[-50:] if len(resultados) >= 50 else resultados
        acertos_50 = sum(1 for r in ultimas_50 if r['acertou_2'])
        print(f"\n   📊 ÚLTIMAS 50 FEZADAS: {acertos_50}/50 = {acertos_50/50*100:.1f}%")
        
        # Mostra acertos recentes
        print(f"\n   📋 ÚLTIMOS 10 TESTES:")
        for r in resultados[-10:]:
            status = "✅" if r['acertou_2'] else "❌"
            print(f"      {status} {r['data']}: real={r['numeros_reais']} | melhor combinação={r['melhor_comb']} | acertos={r['max_acertos']}")
    
    # Sugestões para a próxima FEZADA
    print("\n" + "=" * 70)
    print("🎯 SUGESTÕES PARA A PRÓXIMA FEZADA")
    print("=" * 70)
    
    sugestoes = kazola.sugerir_para_proxima_fezada()
    
    if sugestoes:
        linhas, gaps, ultima = sugestoes
        
        print(f"\n   🔥 COMBINAÇÕES KAZOLA (apostar na próxima FEZADA):")
        for i, (comb, score) in enumerate(linhas):
            gaps_str = " ".join([f"{n}({gaps.get(n,0)})" for n in comb])
            print(f"\n      🎲 Linha {i+1}: {comb}")
            print(f"         Gaps: {gaps_str}")
            print(f"         Score: {score}")
    
    print("\n" + "=" * 70)
    print("  ESTRATÉGIA KAZOLA v5.1:")
    print("  1. Focar APENAS na FEZADA (10h)")
    print("  2. Selecionar números com maior gap (atraso)")
    print("  3. Cada linha deve ter soma entre 180-320")
    print("  4. Cada linha deve ter 1-4 números pares")
    print("=" * 70)


if __name__ == "__main__":
    main()
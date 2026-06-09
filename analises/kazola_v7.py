"""
MÉTODO KAZOLA v7.0 — SESSÃO MAIS QUENTE
Identifica qual sessão está com melhor momento e sugere apostas
"""

import json
import random
from collections import Counter
from itertools import combinations

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
    if not data_str:
        return None
    
    meses = {
        'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
        'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
        'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
    }
    
    try:
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
    
    sorteios.sort(key=lambda x: (x['data_key'] or '0000-00-00', x['hora']))
    return sorteios


class KazolaV7:
    def __init__(self, sorteios):
        self.sorteios = sorteios
    
    def calcular_gaps(self, sorteios_ate_data):
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
    
    def validar_sessao(self, sessao_alvo, janela_minima=100):
        """Valida o método para uma sessão específica"""
        
        dados_sessao = [s for s in self.sorteios if s['sessao'] == sessao_alvo]
        
        if len(dados_sessao) < janela_minima + 50:
            return None
        
        resultados = []
        
        for idx in range(janela_minima, len(dados_sessao)):
            sorteio_alvo = dados_sessao[idx]
            dados_anteriores = dados_sessao[:idx]
            
            gaps, _ = self.calcular_gaps(dados_anteriores)
            
            scores = {}
            for n in range(1, TOTAL_NUMEROS + 1):
                scores[n] = self.calcular_gap_score(gaps, n) * 100
            
            candidatos = sorted(scores.items(), key=lambda x: -x[1])[:30]
            candidatos_nums = [n for n, _ in candidatos if scores[n] > 0]
            
            if len(candidatos_nums) < 5:
                continue
            
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
                for comb in linhas:
                    acertos = len(set(comb) & numeros_reais)
                    max_acertos = max(max_acertos, acertos)
                
                resultados.append({
                    'idx': idx,
                    'data': sorteio_alvo['data_str'],
                    'max_acertos': max_acertos,
                    'acertou_2': max_acertos >= 2,
                    'acertou_3': max_acertos >= 3
                })
        
        return resultados
    
    def analisar_momento_sessoes(self, ultimas_n=50):
        """Analisa qual sessão está com melhor momento"""
        
        sessoes = ['fezada', 'aqueceu', 'kazola', 'eskebra']
        momento = {}
        
        for sessao in sessoes:
            dados_sessao = [s for s in self.sorteios if s['sessao'] == sessao]
            
            if len(dados_sessao) < ultimas_n + 100:
                momento[sessao] = {'taxa': 0, 'total': 0}
                continue
            
            # Pega as últimas N
            ultimas = dados_sessao[-ultimas_n:]
            
            # Testa cada uma usando dados anteriores
            acertos = 0
            for i, sorteio in enumerate(ultimas):
                idx_global = self.sorteios.index(sorteio)
                dados_anteriores = [s for s in dados_sessao if self.sorteios.index(s) < idx_global]
                
                if len(dados_anteriores) < 50:
                    continue
                
                gaps, _ = self.calcular_gaps(dados_anteriores)
                
                scores = {}
                for n in range(1, TOTAL_NUMEROS + 1):
                    scores[n] = self.calcular_gap_score(gaps, n) * 100
                
                candidatos = sorted(scores.items(), key=lambda x: -x[1])[:30]
                candidatos_nums = [n for n, _ in candidatos if scores[n] > 0]
                
                if len(candidatos_nums) < 5:
                    continue
                
                max_acertos = 0
                for comb in combinations(candidatos_nums, 5):
                    soma = sum(comb)
                    if not (180 <= soma <= 320):
                        continue
                    pares = sum(1 for x in comb if x % 2 == 0)
                    if not (1 <= pares <= 4):
                        continue
                    
                    acertos_comb = len(set(comb) & set(sorteio['numeros']))
                    if acertos_comb > max_acertos:
                        max_acertos = acertos_comb
                        if max_acertos >= 2:
                            break
                
                if max_acertos >= 2:
                    acertos += 1
            
            momento[sessao] = {
                'taxa': acertos / ultimas_n * 100 if ultimas_n > 0 else 0,
                'acertos': acertos,
                'total': ultimas_n
            }
        
        return momento
    
    def sugerir_para_sessao(self, sessao_alvo):
        """Gera sugestões para uma sessão específica"""
        
        dados_sessao = [s for s in self.sorteios if s['sessao'] == sessao_alvo]
        
        if len(dados_sessao) < 50:
            return None, None, None
        
        ultimo_sorteio = dados_sessao[-1]
        dados_anteriores = dados_sessao[:-1]
        
        gaps, _ = self.calcular_gaps(dados_anteriores)
        
        scores = {}
        for n in range(1, TOTAL_NUMEROS + 1):
            scores[n] = self.calcular_gap_score(gaps, n) * 100
        
        candidatos = sorted(scores.items(), key=lambda x: -x[1])[:30]
        candidatos_nums = [n for n, _ in candidatos if scores[n] > 0]
        
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
        
        return linhas, gaps, ultimo_sorteio


def main():
    print("\n🔬 MÉTODO KAZOLA v7.0 — SESSÃO MAIS QUENTE")
    print("   Identifica qual sessão está com melhor momento")
    print("=" * 70)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados e ordenados")
    print(f"   Período: {sorteios[0]['data_str']} → {sorteios[-1]['data_str']}")
    
    kazola = KazolaV7(sorteios)
    
    # Análise de momento
    print("\n📊 MOMENTO DAS SESSÕES (últimas 50)")
    print("-" * 70)
    
    momento = kazola.analisar_momento_sessoes(ultimas_n=50)
    
    for sessao, dados in sorted(momento.items(), key=lambda x: -x[1]['taxa']):
        barra = "█" * int(dados['taxa'] / 2)
        print(f"   {sessao.upper():12s}: {dados['taxa']:5.1f}% ({dados['acertos']}/{dados['total']}) {barra}")
    
    # Melhor sessão
    melhor_sessao = max(momento.items(), key=lambda x: x[1]['taxa'])[0]
    melhor_taxa = momento[melhor_sessao]['taxa']
    
    print("\n" + "=" * 70)
    print(f"🏆 MELHOR MOMENTO: {melhor_sessao.upper()} com {melhor_taxa:.1f}% nas últimas 50")
    print("=" * 70)
    
    # Sugestões
    print(f"\n🎯 SUGESTÕES PARA A PRÓXIMA {melhor_sessao.upper()}")
    
    linhas, gaps, ultimo = kazola.sugerir_para_sessao(melhor_sessao)
    
    if linhas:
        print(f"\n   Último sorteio: {ultimo['data_str']}")
        print(f"   Números sorteados: {ultimo['numeros']}")
        
        print(f"\n   🔥 COMBINAÇÕES KAZOLA:")
        for i, (comb, score) in enumerate(linhas):
            gaps_str = " ".join([f"{n}({gaps.get(n,0)})" for n in comb])
            print(f"\n      🎲 Linha {i+1}: {comb}")
            print(f"         Gaps: {gaps_str}")
            print(f"         Score: {score}")
    
    print("\n" + "=" * 70)
    print("  ESTRATÉGIA KAZOLA v7.0:")
    print("  1. Monitoriza as últimas 50 sessões de cada horário")
    print("  2. Identifica qual sessão está com melhor momento")
    print("  3. Gera combinações baseadas nos números mais atrasados")
    print("  4. Aposta apenas na sessão que está 'quente'")
    print("=" * 70)


if __name__ == "__main__":
    main()
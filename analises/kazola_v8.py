"""
MÉTODO KAZOLA v8.0 — MOMENTO FAVORÁVEL
Só aposta quando a sessão está com taxa > 40%
"""

import json
import random
from collections import Counter
from itertools import combinations

TOTAL_NUMEROS = 90
PICK_SIZE = 5
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

# Limiar para considerar uma sessão "quente"
LIMIAR_MOMENTO = 40  # só aposta se taxa > 40%

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


class KazolaV8:
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
    
    def analisar_momento_sessoes(self, ultimas_n=50):
        """Analisa qual sessão está com melhor momento"""
        
        sessoes = ['fezada', 'aqueceu', 'kazola', 'eskebra']
        momento = {}
        
        for sessao in sessoes:
            dados_sessao = [s for s in self.sorteios if s['sessao'] == sessao]
            
            if len(dados_sessao) < ultimas_n + 50:
                momento[sessao] = {'taxa': 0, 'acertos': 0, 'total': 0}
                continue
            
            ultimas = dados_sessao[-ultimas_n:]
            
            acertos = 0
            for i, sorteio in enumerate(ultimas):
                # Encontra índice no array original
                idx_global = None
                for idx, s in enumerate(self.sorteios):
                    if s is sorteio:
                        idx_global = idx
                        break
                
                if idx_global is None or idx_global < 50:
                    continue
                
                dados_anteriores = [s for s in self.sorteios[:idx_global] if s['sessao'] == sessao]
                
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
    print("\n🔬 MÉTODO KAZOLA v8.0 — MOMENTO FAVORÁVEL")
    print(f"   Só aposta quando a sessão está com taxa > {LIMIAR_MOMENTO}%")
    print("=" * 70)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados e ordenados")
    print(f"   Período: {sorteios[0]['data_str']} → {sorteios[-1]['data_str']}")
    
    kazola = KazolaV8(sorteios)
    
    # Análise de momento
    print("\n📊 MOMENTO DAS SESSÕES (últimas 50)")
    print("-" * 70)
    
    momento = kazola.analisar_momento_sessoes(ultimas_n=50)
    
    sessoes_quentes = []
    for sessao, dados in sorted(momento.items(), key=lambda x: -x[1]['taxa']):
        barra = "█" * int(dados['taxa'] / 2)
        status = "🔥" if dados['taxa'] > LIMIAR_MOMENTO else "❄️"
        print(f"   {status} {sessao.upper():12s}: {dados['taxa']:5.1f}% ({dados['acertos']}/{dados['total']}) {barra}")
        
        if dados['taxa'] > LIMIAR_MOMENTO:
            sessoes_quentes.append((sessao, dados['taxa']))
    
    print("\n" + "=" * 70)
    
    if sessoes_quentes:
        print(f"✅ SESSÕES QUENTES (acima de {LIMIAR_MOMENTO}%):")
        for sessao, taxa in sessoes_quentes:
            print(f"   🎯 {sessao.upper()}: {taxa:.1f}%")
        
        # Sugestões para a melhor sessão quente
        melhor_sessao = max(sessoes_quentes, key=lambda x: x[1])[0]
        
        print(f"\n🎯 SUGESTÕES PARA A PRÓXIMA {melhor_sessao.upper()} (MOMENTO FAVORÁVEL)")
        
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
    else:
        print(f"❌ NENHUMA SESSÃO QUENTE (todas abaixo de {LIMIAR_MOMENTO}%)")
        print("   Recomendação: NÃO APOSTAR até o momento melhorar")
    
    print("\n" + "=" * 70)
    print("  ESTRATÉGIA KAZOLA v8.0:")
    print(f"  1. Só aposta quando a sessão está com taxa > {LIMIAR_MOMENTO}%")
    print("  2. Monitoriza as últimas 50 sessões de cada horário")
    print("  3. Gera combinações baseadas nos números mais atrasados")
    print("  4. Se nenhuma sessão está quente, NÃO APOSTAR")
    print("=" * 70)


if __name__ == "__main__":
    main()
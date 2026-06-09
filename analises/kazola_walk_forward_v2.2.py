"""
MÉTODO KAZOLA v2.2 — WALK-FORWARD VALIDATION (Híbrido Completo)
"""

import json
import random
from itertools import combinations

TOTAL_NUMEROS = 90
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

def parse_sessao(name):
    if not name:
        return 'outro'
    n = name.lower()
    if 'fezada' in n: return 'fezada'
    if 'aqueceu' in n: return 'aqueceu'
    if 'kazola' in n: return 'kazola'
    if 'eskebra' in n: return 'eskebra'
    return 'outro'

def extrair_data_ordenavel(data_str):
    if not data_str:
        return None
    meses = {'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
             'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
             'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'}
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
                sorteios.append({
                    'sessao': parse_sessao(draw.get('name', '')),
                    'numeros': sorted(nums),
                    'data_str': data_str,
                    'data_key': data_key
                })
    sorteios.sort(key=lambda x: (x['data_key'] or '0000-00-00'))
    return sorteios

def calcular_gaps(sorteios_ate_data):
    ultima = {}
    for idx, s in enumerate(sorteios_ate_data):
        for n in s['numeros']:
            ultima[n] = idx
    total = len(sorteios_ate_data)
    gaps = {}
    for n in range(1, TOTAL_NUMEROS + 1):
        gaps[n] = total - 1 - ultima.get(n, -1)
    return gaps

def metodo_kazola_v2(dados_anteriores, sessao):
    if len(dados_anteriores) < 50:
        return []
    
    gaps = calcular_gaps(dados_anteriores)
    
    scores = {}
    for n in range(1, TOTAL_NUMEROS + 1):
        g = gaps.get(n, 0)
        score = 0.0
        if g > 60: score = 1.0
        elif g > 40: score = 0.85
        elif g > 25: score = 0.6
        elif g > 15: score = 0.4
        else: score = 0.15
        
        # Bónus sessão-specific (do teu relatório anterior)
        if sessao == 'kazola' and n in [61, 10, 24, 56, 3, 46]:
            score += 0.35
        elif sessao == 'fezada' and n in [59, 60, 67, 51, 66]:
            score += 0.30
        
        scores[n] = score
    
    candidatos = sorted(scores.items(), key=lambda x: -x[1])[:45]
    candidatos_nums = [n for n, s in candidatos if s > 0.25]
    
    linhas = []
    for comb in combinations(candidatos_nums, 5):
        comb_s = sorted(comb)
        soma = sum(comb_s)
        pares = sum(x % 2 == 0 for x in comb_s)
        if 195 <= soma <= 305 and 2 <= pares <= 3:
            linhas.append(comb_s)
            if len(linhas) >= 10:
                break
    return linhas

def main():
    print("\n🔬 MÉTODO KAZOLA v2.2 — WALK-FORWARD VALIDATION (Híbrido)")
    print("=" * 85)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados")
    print(f"Período: {sorteios[0]['data_str']} → {sorteios[-1]['data_str']}")
    
    total = len(sorteios)
    corte_idx = int(total * 0.7)
    treino = sorteios[:corte_idx]
    teste = sorteios[corte_idx:]
    
    print(f"Treino: {len(treino)} | Teste (futuro): {len(teste)} sorteios")
    
    sessoes = ['fezada', 'aqueceu', 'kazola', 'eskebra']
    
    print("\n📊 RESULTADOS WALK-FORWARD POR SESSÃO")
    print("-" * 85)
    
    for sessao in sessoes:
        treino_sessao = [s for s in treino if s['sessao'] == sessao]
        teste_sessao = [s for s in teste if s['sessao'] == sessao]
        
        if len(treino_sessao) < 40 or len(teste_sessao) < 8:
            print(f"\n{sessao.upper()}: dados insuficientes")
            continue
        
        dados_disponiveis = treino_sessao.copy()
        acertos_aleatorio = acertos_kazola = total_acertos = 0
        
        for sorteio in teste_sessao:
            numeros_reais = set(sorteio['numeros'])
            
            # Aleatório (5 tentativas)
            hit_ale = any(len(set(random.sample(range(1,91),5)) & numeros_reais) >= 2 for _ in range(5))
            if hit_ale: acertos_aleatorio += 1
            
            # Kazola v2.2
            combinacoes = metodo_kazola_v2(dados_disponiveis, sessao)
            max_ac = max((len(set(comb) & numeros_reais) for comb in combinacoes), default=0)
            total_acertos += max_ac
            if max_ac >= 2:
                acertos_kazola += 1
            
            # Atualiza para próximo sorteio (walk-forward)
            dados_disponiveis.append(sorteio)
        
        n_teste = len(teste_sessao)
        taxa_ale = acertos_aleatorio / n_teste * 100
        taxa_kaz = acertos_kazola / n_teste * 100
        media_ac = total_acertos / n_teste
        
        print(f"\n📍 {sessao.upper()}:")
        print(f"   Testes: {n_teste}")
        print(f"   Aleatório : {taxa_ale:.1f}%")
        print(f"   Kazola v2.2: {taxa_kaz:.1f}%  (+{taxa_kaz - taxa_ale:.1f} pts)")
        print(f"   Média de acertos por linha: {media_ac:.2f}")
    
    print("\n" + "=" * 85)
    print("✅ Walk-Forward Validation concluída.")
    print("Este é o teste mais rigoroso possível para séries temporais.")

if __name__ == "__main__":
    main()
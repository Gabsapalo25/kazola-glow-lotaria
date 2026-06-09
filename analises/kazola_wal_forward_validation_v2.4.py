"""
MÉTODO KAZOLA v2.4 — WALK-FORWARD VALIDATION (MÉTRICA REAL: ≥3 ACERTOS)
Correção de SciPy + Cálculo Exato de Probabilidade + Foco em Prémios Reais
"""

import json
import random
import math
from itertools import combinations

try:
    from scipy import stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False
    print("⚠️ SciPy não encontrado. O teste de significância (p-value) será ignorado.")

TOTAL_NUMEROS = 90
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

def parse_sessao(name):
    if not name: return 'outro'
    n = name.lower()
    if 'fezada' in n: return 'fezada'
    if 'aqueceu' in n: return 'aqueceu'
    if 'kazola' in n: return 'kazola'
    if 'eskebra' in n: return 'eskebra'
    return 'outro'

def extrair_data_ordenavel(data_str):
    if not data_str: return None
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
        if not grupo.get('results'): continue
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

def metodo_kazola_v24(dados_anteriores):
    if len(dados_anteriores) < 50:
        return []
    
    gaps = calcular_gaps(dados_anteriores)
    scores = {}
    for n in range(1, TOTAL_NUMEROS + 1):
        g = gaps.get(n, 0)
        if g > 60: score = 1.0
        elif g > 40: score = 0.85
        elif g > 25: score = 0.6
        elif g > 15: score = 0.4
        else: score = 0.15
        scores[n] = score
    
    candidatos = sorted(scores.items(), key=lambda x: -x[1])[:45]
    candidatos_nums = [n for n, s in candidatos if s > 0.25]
    
    linhas = []
    for comb in combinations(candidatos_nums, 5):
        comb_s = sorted(comb)
        soma = sum(comb_s)
        pares = sum(x % 2 == 0 for x in comb_s)
        if 180 <= soma <= 320 and 1 <= pares <= 3:
            linhas.append(comb_s)
            if len(linhas) >= 30:
                break
    return linhas

def calcular_baseline_exato(n_combinacoes, alvo_acertos):
    """Calcula a probabilidade exata de acertar >= alvo_acertos em n_combinacoes"""
    total_comb = math.comb(90, 5)
    
    # Probabilidade de 0 e 1 acerto numa aposta única
    p0 = math.comb(85, 5) / total_comb
    p1 = (math.comb(5, 1) * math.comb(85, 4)) / total_comb
    
    if alvo_acertos == 2:
        p_ge_alvo = 1 - (p0 + p1)
    elif alvo_acertos == 3:
        p2 = (math.comb(5, 2) * math.comb(85, 3)) / total_comb
        p_ge_alvo = 1 - (p0 + p1 + p2)
    else:
        p_ge_alvo = 0.0 # Simplificação para >=4
        
    # Probabilidade de acertar >= alvo em pelo menos 1 das N combinações
    return (1 - (1 - p_ge_alvo) ** n_combinacoes) * 100

def main():
    print("\n🔬 MÉTODO KAZOLA v2.4 — WALK-FORWARD (MÉTRICA: ≥3 ACERTOS)")
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
    
    # Baselines exatos para 30 combinações
    baseline_2 = calcular_baseline_exato(30, 2)
    baseline_3 = calcular_baseline_exato(30, 3)
    print(f"\n📊 Baseline teórico EXATO (30 combinações aleatórias):")
    print(f"   Prob. de ≥2 acertos: {baseline_2:.1f}%")
    print(f"   Prob. de ≥3 acertos: {baseline_3:.1f}%  <-- FOCO COMERCIAL")
    
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
        acertos_ale_3 = acertos_kaz_3 = 0
        
        for sorteio in teste_sessao:
            numeros_reais = set(sorteio['numeros'])
            
            # Aleatório (30 tentativas)
            hit_ale_3 = False
            for _ in range(30):
                comb = set(random.sample(range(1, 91), 5))
                if len(comb & numeros_reais) >= 3:
                    hit_ale_3 = True
                    break
            if hit_ale_3: acertos_ale_3 += 1
            
            # Kazola v2.4
            combinacoes = metodo_kazola_v24(dados_disponiveis)
            max_ac = max((len(set(comb) & numeros_reais) for comb in combinacoes), default=0)
            if max_ac >= 3:
                acertos_kaz_3 += 1
            
            dados_disponiveis.append(sorteio)
        
        n_teste = len(teste_sessao)
        taxa_ale_3 = acertos_ale_3 / n_teste * 100
        taxa_kaz_3 = acertos_kaz_3 / n_teste * 100
        
        # Teste de significância (se scipy estiver disponível)
        if HAS_SCIPY and n_teste > 0:
            p_value = stats.binomtest(acertos_kaz_3, n_teste, p=taxa_ale_3 / 100, alternative='greater').pvalue
            sig_str = "✅ Significativo" if p_value < 0.05 else "❌ Não significativo"
        else:
            p_value = None
            sig_str = "N/A"
        
        print(f"\n📍 {sessao.upper()}:")
        print(f"   Testes: {n_teste} sorteios")
        print(f"   Aleatório (≥3):  {taxa_ale_3:.1f}%")
        print(f"   Kazola v2.4 (≥3): {taxa_kaz_3:.1f}%  ({'+' if taxa_kaz_3 > taxa_ale_3 else ''}{taxa_kaz_3 - taxa_ale_3:.1f} pts)")
        if p_value is not None:
            print(f"   p-value: {p_value:.4f} ({sig_str})")
    
    print("\n" + "=" * 85)
    print("✅ Walk-Forward Validation v2.4 concluída.")
    print("Nota: O verdadeiro valor comercial está em superar o baseline de ≥3 acertos.")

if __name__ == "__main__":
    main()
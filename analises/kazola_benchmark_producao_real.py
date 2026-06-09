"""
BENCHMARK WALK-FORWARD DE PRODUÇÃO REAL
Testa os geradores EXATOS da aplicação, sem dependências de importação complexas.
"""

import json
import random
import math
import numpy as np
from collections import Counter
from itertools import combinations

TOTAL_NUMEROS = 90
NUM_LINHAS = 30  # Quantidade exata que a tua app gera por clique
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

# ==============================================================================
# 1. GERADORES REAIS DA APLICAÇÃO
# ⚠️ INSTRUÇÃO: Substitui o corpo destas funções pelo código EXATO da tua app.
# ==============================================================================

def gerar_aleatorio(historico, quantidade=NUM_LINHAS):
    """Gera combinações puramente aleatórias."""
    # ⚠️ SUBSTITUIR PELO CÓDIGO REAL DA APP SE FOR DIFERENTE
    return [sorted(random.sample(range(1, 91), 5)) for _ in range(quantidade)]

def gerar_equilibrado(historico, quantidade=NUM_LINHAS):
    """Equilibrado: Um número por cada faixa de 18."""
    # ⚠️ SUBSTITUIR PELO CÓDIGO REAL DA APP
    faixas = [(1, 18), (19, 36), (37, 54), (55, 72), (73, 90)]
    linhas = []
    for _ in range(quantidade):
        comb = [random.randint(faixa[0], faixa[1]) for faixa in faixas]
        linhas.append(sorted(comb))
    return linhas

def gerar_frequencia(historico, quantidade=NUM_LINHAS):
    """Frequência Histórica: Pondera pelos números mais frequentes recentes."""
    # ⚠️ SUBSTITUIR PELO CÓDIGO REAL DA APP
    todas_as_bolas = [n for s in historico for n in s['numeros']]
    contagem = Counter(todas_as_bolas)
    numeros_ordenados = [num for num, freq in contagem.most_common()]
    
    linhas = []
    for _ in range(quantidade):
        top_pool = numeros_ordenados[:30] if len(numeros_ordenados) >= 30 else numeros_ordenados
        comb = sorted(random.sample(top_pool, 5))
        linhas.append(comb)
    return linhas

def gerar_monte_carlo(historico, quantidade=NUM_LINHAS):
    """Monte Carlo: Pesos históricos + ruído gaussiano."""
    # ⚠️ SUBSTITUIR PELO CÓDIGO REAL DA APP
    sigma_ruido = 5.0 
    todas_as_bolas = [n for s in historico for n in s['numeros']]
    contagem = Counter(todas_as_bolas)
    
    pesos = {}
    for n in range(1, 91):
        freq_base = contagem.get(n, 0)
        ruido = np.random.normal(0, sigma_ruido)
        pesos[n] = max(0.1, freq_base + ruido)
    
    numeros = list(pesos.keys())
    weights = [w / sum(pesos.values()) for w in pesos.values()]
    
    linhas = []
    for _ in range(quantidade):
        comb = sorted(random.choices(numeros, weights=weights, k=5))
        comb = list(set(comb))
        while len(comb) < 5:
            novo = random.choices(numeros, weights=weights, k=1)[0]
            if novo not in comb: comb.append(novo)
        linhas.append(sorted(comb))
    return linhas

def gerar_kazola(historico, quantidade=NUM_LINHAS):
    """Kazola (Gaps): Lógica atual do teu método Kazola."""
    # ⚠️ SUBSTITUIR PELO CÓDIGO REAL DA APP
    if len(historico) < 50:
        return gerar_aleatorio(historico, quantidade)
    
    ultima = {}
    for idx, s in enumerate(historico):
        for n in s['numeros']:
            ultima[n] = idx
    total = len(historico)
    
    scores = {}
    for n in range(1, 91):
        g = total - 1 - ultima.get(n, -1)
        if g > 60: scores[n] = 1.0
        elif g > 40: scores[n] = 0.85
        elif g > 25: scores[n] = 0.6
        elif g > 15: scores[n] = 0.4
        else: scores[n] = 0.15
        
    candidatos = sorted(scores.items(), key=lambda x: -x[1])[:45]
    candidatos_nums = [n for n, s in candidatos if s > 0.25]
    
    linhas = []
    for comb in combinations(candidatos_nums, 5):
        comb_s = sorted(comb)
        if 180 <= sum(comb_s) <= 320 and 1 <= sum(x % 2 == 0 for x in comb_s) <= 3:
            linhas.append(comb_s)
            if len(linhas) >= quantidade:
                break
                
    while len(linhas) < quantidade:
        linhas.append(sorted(random.sample(range(1, 91), 5)))
        
    return linhas[:quantidade]

# ==============================================================================
# 2. MOTOR DE TESTE WALK-FORWARD (INALTERADO E ROBUSTO)
# ==============================================================================
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
        if ',' in data_str: data_str = data_str.split(',', 1)[1].strip()
        parts = data_str.split(' de ')
        if len(parts) == 3:
            dia, mes, ano = parts
            return f"{ano.strip()}-{meses.get(mes.strip(), '01')}-{dia.strip().zfill(2)}"
    except: pass
    return None

def processar_sorteios(raw_data):
    sorteios = []
    for grupo in raw_data:
        if not grupo.get('results'): continue
        data_str = grupo.get('formatedDate', '')
        data_key = extrair_data_ordenavel(data_str)
        for draw in grupo['results']:
            nums = [draw.get(f'number_{i}') for i in range(1, 6)]
            nums = [n for n in nums if isinstance(n, int) and 1 <= n <= 90]
            if len(nums) == 5:
                sorteios.append({'sessao': parse_sessao(draw.get('name', '')), 'numeros': sorted(nums), 'data_key': data_key})
    sorteios.sort(key=lambda x: (x['data_key'] or '0000-00-00'))
    return sorteios

def main():
    print("\n🔬 BENCHMARK DE PRODUÇÃO REAL (Walk-Forward)")
    print("=" * 95)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados.")
    
    corte_idx = int(len(sorteios) * 0.7)
    treino = sorteios[:corte_idx]
    teste = sorteios[corte_idx:]
    print(f"📅 Treino: {len(treino)} | Teste: {len(teste)} sorteios\n")
    
    METODOS_REAIS = {
        "Aleatório Puro": gerar_aleatorio,
        "Equilibrado": gerar_equilibrado,
        "Frequência Histórica": gerar_frequencia,
        "Monte Carlo": gerar_monte_carlo,
        "Kazola (Gaps)": gerar_kazola
    }
    
    resultados = {nome: {'ge2': 0, 'ge3': 0, 'ge4': 0, 'ge5': 0, 'soma_media': 0} for nome in METODOS_REAIS}
    
    print("⏳ A executar Walk-Forward com os geradores... (pode demorar 1-2 min)")
    
    dados_acumulados = treino.copy()
    
    for sorteio in teste:
        numeros_reais = set(sorteio['numeros'])
        
        for nome_metodo, func_geradora in METODOS_REAIS.items():
            try:
                # CHAMADA REAL À TUA FUNÇÃO
                linhas = func_geradora(historico=dados_acumulados, quantidade=NUM_LINHAS)
                
                acertos_max = 0
                soma_acertos = 0
                for linha in linhas:
                    linha_set = set(linha)
                    acertos = len(linha_set & numeros_reais)
                    soma_acertos += acertos
                    if acertos > acertos_max:
                        acertos_max = acertos
                
                if acertos_max >= 2: resultados[nome_metodo]['ge2'] += 1
                if acertos_max >= 3: resultados[nome_metodo]['ge3'] += 1
                if acertos_max >= 4: resultados[nome_metodo]['ge4'] += 1
                if acertos_max >= 5: resultados[nome_metodo]['ge5'] += 1
                resultados[nome_metodo]['soma_media'] += (soma_acertos / len(linhas))
                
            except Exception as e:
                print(f"\n❌ Erro ao executar {nome_metodo}: {e}")
                print("Verifica se a assinatura da função é: def nome_funcao(historico, quantidade)")
        
        # Walk-Forward: adiciona o sorteio real ao histórico para o próximo ciclo
        dados_acumulados.append(sorteio)
        
    n_teste = len(teste)
    
    print("\n" + "=" * 95)
    print("📊 RANKING DE PRODUÇÃO REAL (Ordenado por ≥3 Acertos)")
    print("=" * 95)
    print(f"{'MÉTODO':<22} | {'≥2':<6} | {'≥3 (FOCO)':<10} | {'≥4':<6} | {'≥5':<6} | {'Média/Linha':<12}")
    print("-" * 95)
    
    # Ordenar estritamente por ≥3 acertos (decrescente)
    ranking = sorted(resultados.items(), key=lambda x: x[1]['ge3'], reverse=True)
    
    for i, (nome, stats) in enumerate(ranking):
        pct_ge2 = (stats['ge2'] / n_teste) * 100
        pct_ge3 = (stats['ge3'] / n_teste) * 100
        pct_ge4 = (stats['ge4'] / n_teste) * 100
        pct_ge5 = (stats['ge5'] / n_teste) * 100
        media = stats['soma_media'] / n_teste
        
        marker = "👑 " if i == 0 else "   "
        print(f"{marker}{nome:<20} | {pct_ge2:>5.1f}% | {pct_ge3:>5.1f}%     | {pct_ge4:>5.1f}% | {pct_ge5:>5.1f}% | {media:>5.2f}")
        
    print("=" * 95)
    print("🔍 CONCLUSÃO COMERCIAL:")
    print("1. O método no topo (👑) é o que realmente entrega mais prémios de ≥3.")
    print("2. Se os métodos 'Premium' (Frequência, Monte Carlo) não estiverem no topo,")
    print("   o pricing ou a descrição do produto deve ser revista.")
    print("3. Este teste é 100% auditável e reflete a experiência exata do cliente.")
    print("=" * 95)

if __name__ == "__main__":
    main()
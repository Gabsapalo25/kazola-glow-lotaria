"""
MÉTODO KAZOLA — BENCHMARK WALK-FORWARD MULTI-MÉTODOS
Compara todos os métodos do aplicativo nas mesmas condições.
"""

import json
import random
import math
import numpy as np
from collections import Counter

TOTAL_NUMEROS = 90
NUM_LINHAS = 30  # Número de combinações geradas por método por sorteio
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

# ==============================================================================
# 1. PREPARAÇÃO DE DADOS (Inalterado e Robusto)
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

# ==============================================================================
# 2. DEFINIÇÃO DOS MÉTODOS (⚠️ ADAPTAR À LÓGICA REAL DO TEU APP)
# ==============================================================================

def metodo_aleatorio(dados_treino):
    """Gera 30 combinações puramente aleatórias."""
    return [sorted(random.sample(range(1, 91), 5)) for _ in range(NUM_LINHAS)]

def metodo_equilibrado(dados_treino):
    """1 número por faixa de 18 (1-18, 19-36, 37-54, 55-72, 73-90)."""
    # ⚠️ SUBSTITUIR: Se o teu app tiver lógica diferente, coloca aqui.
    linhas = []
    faixas = [(1, 18), (19, 36), (37, 54), (55, 72), (73, 90)]
    for _ in range(NUM_LINHAS):
        comb = [random.randint(faixa[0], faixa[1]) for faixa in faixas]
        linhas.append(sorted(comb))
    return linhas

def metodo_frequencia(dados_treino):
    """Pondera pelos números mais frequentes nos dados de treino."""
    # ⚠️ SUBSTITUIR: Usa a tua lógica exata de janela temporal e geração.
    todas_as_bolas = [n for s in dados_treino for n in s['numeros']]
    contagem = Counter(todas_as_bolas)
    # Ordena do mais frequente para o menos frequente
    numeros_ordenados = [num for num, freq in contagem.most_common()]
    
    linhas = []
    for _ in range(NUM_LINHAS):
        # Pega os top 30 números e escolhe 5 aleatoriamente entre eles para gerar diversidade
        top_pool = numeros_ordenados[:30] if len(numeros_ordenados) >= 30 else numeros_ordenados
        comb = sorted(random.sample(top_pool, 5))
        linhas.append(comb)
    return linhas

def metodo_monte_carlo(dados_treino):
    """Pesos históricos + ruído gaussiano."""
    # ⚠️ SUBSTITUIR: Ajusta o sigma (desvio padrão) para o valor real do teu app.
    sigma_ruido = 5.0 
    
    todas_as_bolas = [n for s in dados_treino for n in s['numeros']]
    contagem = Counter(todas_as_bolas)
    
    # Cria pesos baseados na frequência + ruído
    pesos = {}
    for n in range(1, 91):
        freq_base = contagem.get(n, 0)
        ruido = np.random.normal(0, sigma_ruido)
        pesos[n] = max(0.1, freq_base + ruido) # Garante peso > 0
    
    numeros = list(pesos.keys())
    weights = list(pesos.values())
    # Normaliza para somar 1
    weights = [w / sum(weights) for w in weights]
    
    linhas = []
    for _ in range(NUM_LINHAS):
        comb = sorted(random.choices(numeros, weights=weights, k=5))
        # Remove duplicatas caso o random.choices repita (transforma em set e completa se necessário)
        comb = list(set(comb))
        while len(comb) < 5:
            novo = random.choices(numeros, weights=weights, k=1)[0]
            if novo not in comb: comb.append(novo)
        linhas.append(sorted(comb))
    return linhas

def metodo_kazola_gaps(dados_treino):
    """Lógica v2.4: Gaps + Filtros de Soma/Paridade."""
    if len(dados_treino) < 50: return metodo_aleatorio(dados_treino)
    
    ultima = {}
    for idx, s in enumerate(dados_treino):
        for n in s['numeros']: ultima[n] = idx
    total = len(dados_treino)
    
    scores = {}
    for n in range(1, 91):
        g = total - 1 - ultima.get(n, -1)
        if g > 60: scores[n] = 1.0
        elif g > 40: scores[n] = 0.85
        elif g > 25: scores[n] = 0.6
        elif g > 15: scores[n] = 0.4
        else: scores[n] = 0.15
        
    from itertools import combinations
    candidatos = sorted(scores.items(), key=lambda x: -x[1])[:45]
    candidatos_nums = [n for n, s in candidatos if s > 0.25]
    
    linhas = []
    for comb in combinations(candidatos_nums, 5):
        comb_s = sorted(comb)
        if 180 <= sum(comb_s) <= 320 and 1 <= sum(x % 2 == 0 for x in comb_s) <= 3:
            linhas.append(comb_s)
            if len(linhas) >= NUM_LINHAS: break
            
    # Se não gerar 30 linhas válidas, completa com aleatório
    while len(linhas) < NUM_LINHAS:
        linhas.append(sorted(random.sample(range(1, 91), 5)))
        
    return linhas[:NUM_LINHAS]

# ==============================================================================
# 3. MOTOR DE WALK-FORWARD E AVALIAÇÃO
# ==============================================================================
def avaliar_metodo(linhas, numeros_reais):
    """Retorna o máximo de acertos e a média de acertos das N linhas."""
    acertos_max = 0
    soma_acertos = 0
    for linha in linhas:
        acertos = len(set(linha) & numeros_reais)
        soma_acertos += acertos
        if acertos > acertos_max:
            acertos_max = acertos
    return acertos_max, (soma_acertos / len(linhas))

def main():
    print("\n🔬 BENCHMARK WALK-FORWARD MULTI-MÉTODOS")
    print("=" * 85)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados.")
    
    # 70% Treino, 30% Teste
    corte_idx = int(len(sorteios) * 0.7)
    treino = sorteios[:corte_idx]
    teste = sorteios[corte_idx:]
    print(f"📅 Treino: {len(treino)} | Teste: {len(teste)} sorteios\n")
    
    # Dicionário para acumular resultados
    resultados = {
        'Aleatório': {'ge2': 0, 'ge3': 0, 'ge4': 0, 'soma_media': 0},
        'Equilibrado': {'ge2': 0, 'ge3': 0, 'ge4': 0, 'soma_media': 0},
        'Frequência': {'ge2': 0, 'ge3': 0, 'ge4': 0, 'soma_media': 0},
        'Monte Carlo': {'ge2': 0, 'ge3': 0, 'ge4': 0, 'soma_media': 0},
        'Kazola (Gaps)': {'ge2': 0, 'ge3': 0, 'ge4': 0, 'soma_media': 0}
    }
    
    metodos = {
        'Aleatório': metodo_aleatorio,
        'Equilibrado': metodo_equilibrado,
        'Frequência': metodo_frequencia,
        'Monte Carlo': metodo_monte_carlo,
        'Kazola (Gaps)': metodo_kazola_gaps
    }
    
    print("⏳ A executar Walk-Forward (isto pode demorar alguns minutos)...")
    
    # WALK-FORWARD LOOP
    dados_acumulados = treino.copy()
    for sorteio in teste:
        numeros_reais = set(sorteio['numeros'])
        
        for nome_metodo, func_metodo in metodos.items():
            # 1. Gera 30 linhas baseadas APENAS nos dados até ao momento
            linhas = func_metodo(dados_acumulados)
            
            # 2. Avalia contra o sorteio real
            max_ac, media_ac = avaliar_metodo(linhas, numeros_reais)
            
            # 3. Acumula estatísticas
            if max_ac >= 2: resultados[nome_metodo]['ge2'] += 1
            if max_ac >= 3: resultados[nome_metodo]['ge3'] += 1
            if max_ac >= 4: resultados[nome_metodo]['ge4'] += 1
            resultados[nome_metodo]['soma_media'] += media_ac
            
        # 4. Adiciona o sorteio atual aos dados para o próximo passo (Walk-Forward)
        dados_acumulados.append(sorteio)
        
    # ==============================================================================
    # 4. APRESENTAÇÃO DOS RESULTADOS
    # ==============================================================================
    n_teste = len(teste)
    
    print("\n" + "=" * 85)
    print("📊 RANKING FINAL DE PERFORMANCE (Média por sorteio, N=" + str(n_teste) + ")")
    print("=" * 85)
    print(f"{'MÉTODO':<18} | {'≥2 Acertos':<10} | {'≥3 Acertos':<10} | {'≥4 Acertos':<10} | {'Média Acertos/Linha':<20}")
    print("-" * 85)
    
    # Ordenar por ≥3 acertos (decrescente)
    ranking = sorted(resultados.items(), key=lambda x: x[1]['ge3'], reverse=True)
    
    for nome, stats in ranking:
        pct_ge2 = (stats['ge2'] / n_teste) * 100
        pct_ge3 = (stats['ge3'] / n_teste) * 100
        pct_ge4 = (stats['ge4'] / n_teste) * 100
        media_total = stats['soma_media'] / n_teste
        
        # Destaque visual para o melhor em ≥3
        marker = "👑 " if nome == ranking[0][0] else "   "
        
        print(f"{marker}{nome:<16} | {pct_ge2:>5.1f}%     | {pct_ge3:>5.1f}%     | {pct_ge4:>5.1f}%     | {media_total:>5.2f}")
        
    print("=" * 85)
    print("🔍 INTERPRETAÇÃO:")
    print("1. Se todos os métodos estiverem entre 2.5% e 4.0% em '≥3 Acertos',")
    print("   não há poder preditivo real, apenas reorganização combinatória.")
    print("2. O método 'Equilibrado' costuma ter média de acertos por linha mais alta")
    print("   porque evita desperdício de números na mesma faixa.")
    print("3. Se o 'Kazola (Gaps)' estiver no fundo da tabela, a estratégia de gaps")
    print("   deve ser descontinuada ou radicalmente reformulada.")
    print("=" * 85)

if __name__ == "__main__":
    main()
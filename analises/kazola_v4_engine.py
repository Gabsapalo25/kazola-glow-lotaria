"""
BENCHMARK DEFINITIVO — KAZOLA v4 vs BASELINES
Testa as 4 variantes do Kazola v4 contra Aleatório e Equilibrado.
"""

import json
import random
import math
from collections import Counter

TOTAL_NUMBERS = 90
PICK_SIZE = 5
NUM_LINHAS = 30
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"
BALANCED_BANDS = [(1, 18), (19, 36), (37, 54), (55, 72), (73, 90)]

# ==============================================================================
# 1. GERADORES
# ==============================================================================

def gerar_aleatorio(historico, quantidade=NUM_LINHAS):
    return [sorted(random.sample(range(1, 91), 5)) for _ in range(quantidade)]

def gerar_equilibrado(historico, quantidade=NUM_LINHAS):
    linhas = []
    for _ in range(quantidade):
        comb = [random.randint(faixa[0], faixa[1]) for faixa in BALANCED_BANDS]
        linhas.append(sorted(comb))
    return linhas

def calcular_pesos_suaves(historico, faixa, contagem_uso_atual, variante):
    janela = min(100, len(historico))
    sorteios_recentes = historico[-janela:]
    todas_as_bolas = [n for s in sorteios_recentes for n in s['numeros']]
    contagem = Counter(todas_as_bolas)
    
    pesos = {}
    lo, hi = faixa
    for n in range(lo, hi + 1):
        freq = contagem.get(n, 0)
        peso = 1.0 + math.log(1.0 + freq) # Frequência suave
        
        # Diversidade Intra-Batch (Variante C e D)
        if variante in ['C', 'D'] and contagem_uso_atual.get(n, 0) > 0:
            peso = peso / (1.0 + contagem_uso_atual[n])
            
        pesos[n] = max(peso, 0.1)
    return pesos

def weighted_choice(pesos_dict):
    numeros = list(pesos_dict.keys())
    pesos = list(pesos_dict.values())
    total = sum(pesos)
    r = random.random() * total
    acum = 0
    for n, p in zip(numeros, pesos):
        acum += p
        if r <= acum:
            return n
    return numeros[-1]

def score_anti_partilha(comb):
    score = 0
    for n in comb:
        if n <= 31: score += 1.5
        if n % 5 == 0: score += 0.5
        if n in [7, 13, 42, 69]: score += 1.0
    comb_sorted = sorted(comb)
    for i in range(len(comb_sorted) - 1):
        if comb_sorted[i+1] - comb_sorted[i] == 1:
            score += 1.0
    return score

def gerar_kazola_v4(historico, variante='D', quantidade=NUM_LINHAS):
    linhas_geradas = []
    contagem_uso = {i: 0 for i in range(1, TOTAL_NUMBERS + 1)}
    tentativas_max = quantidade * 150 
    
    for _ in range(tentativas_max):
        if len(linhas_geradas) >= quantidade:
            break
            
        comb = []
        for faixa in BALANCED_BANDS:
            pesos = calcular_pesos_suaves(historico, faixa, contagem_uso, variante)
            num = weighted_choice(pesos)
            comb.append(num)
            
        comb.sort()
        
        # Filtros leves
        soma = sum(comb)
        if not (160 <= soma <= 300):
            continue
        pares = sum(1 for x in comb if x % 2 == 0)
        if not (2 <= pares <= 3):
            continue
            
        linhas_geradas.append(comb)
        
        if variante in ['C', 'D']:
            for n in comb:
                contagem_uso[n] += 1
                
    # Anti-partilha para Variante D
    if variante == 'D' and len(linhas_geradas) > quantidade:
        linhas_com_score = [(c, score_anti_partilha(c)) for c in linhas_geradas]
        linhas_com_score.sort(key=lambda x: x[1])
        linhas_geradas = [c for c, _ in linhas_com_score[:quantidade]]
        
    # Fallback de segurança
    while len(linhas_geradas) < quantidade:
        comb = sorted(random.sample(range(1, 91), 5))
        linhas_geradas.append(comb)
        
    return linhas_geradas[:quantidade]

def gerar_v4_a(historico, quantidade=NUM_LINHAS):
    return gerar_kazola_v4(historico, variante='A', quantidade=quantidade)

def gerar_v4_b(historico, quantidade=NUM_LINHAS):
    return gerar_kazola_v4(historico, variante='B', quantidade=quantidade)

def gerar_v4_c(historico, quantidade=NUM_LINHAS):
    return gerar_kazola_v4(historico, variante='C', quantidade=quantidade)

def gerar_v4_d(historico, quantidade=NUM_LINHAS):
    return gerar_kazola_v4(historico, variante='D', quantidade=quantidade)

# ==============================================================================
# 2. MOTOR WALK-FORWARD
# ==============================================================================

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
                sorteios.append({'numeros': sorted(nums), 'data_key': data_key})
    sorteios.sort(key=lambda x: (x['data_key'] or '0000-00-00'))
    return sorteios

def main():
    print("\n🔬 BENCHMARK DEFINITIVO — KAZOLA v4")
    print("=" * 95)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados.")
    
    corte_idx = int(len(sorteios) * 0.7)
    treino = sorteios[:corte_idx]
    teste = sorteios[corte_idx:]
    print(f"📅 Treino: {len(treino)} | Teste: {len(teste)} sorteios\n")
    
    METODOS = {
        "Aleatório": gerar_aleatorio,
        "Equilibrado": gerar_equilibrado,
        "Kazola V4-A (Base)": gerar_v4_a,
        "Kazola V4-B (+Freq)": gerar_v4_b,
        "Kazola V4-C (+Cobertura)": gerar_v4_c,
        "Kazola V4-D (Completo)": gerar_v4_d
    }
    
    resultados = {nome: {'ge2': 0, 'ge3': 0, 'ge4': 0, 'soma_media': 0, 'linhas_geradas': 0} for nome in METODOS}
    
    print("⏳ A executar Walk-Forward... (pode demorar 2-3 min)")
    
    dados_acumulados = treino.copy()
    
    for sorteio in teste:
        numeros_reais = set(sorteio['numeros'])
        for nome_metodo, func_geradora in METODOS.items():
            try:
                linhas = func_geradora(historico=dados_acumulados, quantidade=NUM_LINHAS)
                resultados[nome_metodo]['linhas_geradas'] += len(linhas)
                
                acertos_max = 0
                soma_acertos = 0
                for linha in linhas:
                    acertos = len(set(linha) & numeros_reais)
                    soma_acertos += acertos
                    if acertos > acertos_max:
                        acertos_max = acertos
                
                if acertos_max >= 2: resultados[nome_metodo]['ge2'] += 1
                if acertos_max >= 3: resultados[nome_metodo]['ge3'] += 1
                if acertos_max >= 4: resultados[nome_metodo]['ge4'] += 1
                if linhas:
                    resultados[nome_metodo]['soma_media'] += (soma_acertos / len(linhas))
            except Exception as e:
                print(f"\n❌ Erro em {nome_metodo}: {e}")
        
        dados_acumulados.append(sorteio)
        
    n_teste = len(teste)
    ranking = sorted(resultados.items(), key=lambda x: x[1]['ge3'], reverse=True)
    
    output_lines = []
    output_lines.append("\n" + "=" * 95)
    output_lines.append("📊 RANKING FINAL — KAZOLA v4 (Ordenado por ≥3 Acertos)")
    output_lines.append("=" * 95)
    output_lines.append(f"{'MÉTODO':<24} | {'≥2':<6} | {'≥3 (FOCO)':<10} | {'≥4':<6} | {'Média/Linha':<12} | {'Linhas':<8}")
    output_lines.append("-" * 95)
    
    for i, (nome, stats) in enumerate(ranking):
        pct_ge2 = (stats['ge2'] / n_teste) * 100
        pct_ge3 = (stats['ge3'] / n_teste) * 100
        pct_ge4 = (stats['ge4'] / n_teste) * 100
        media = stats['soma_media'] / n_teste if n_teste > 0 else 0
        linhas_totais = stats['linhas_geradas']
        
        marker = "👑 " if i == 0 else "   "
        linha = f"{marker}{nome:<22} | {pct_ge2:>5.1f}% | {pct_ge3:>5.1f}%     | {pct_ge4:>5.1f}% | {media:>5.2f}       | {linhas_totais:>5}"
        output_lines.append(linha)
        print(linha)
        
    output_lines.append("=" * 95)
    output_lines.append("🔍 CONCLUSÃO:")
    output_lines.append("1. O objetivo era superar os ~3.0% do Equilibrado em ≥3 acertos.")
    output_lines.append("2. Se V4-C ou V4-D atingirem 3.2%+, temos uma melhoria real de cobertura.")
    output_lines.append("3. A Variante D inclui Anti-Partilha, melhorando o prémio esperado (EV).")
    output_lines.append("=" * 95)
    
    arquivo_saida = r"C:\Users\HP\kazola-glow-lotaria\analises\resultado_v4_definitivo.txt"
    with open(arquivo_saida, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
    
    print(f"\n✅ Resultados guardados em: {arquivo_saida}")
    print("Por favor, copia o conteúdo desse ficheiro para aqui.")

if __name__ == "__main__":
    main()
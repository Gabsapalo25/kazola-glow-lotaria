"""
MÉTODO KAZOLA V5 — UNIFIED (Dual Spectrum)
Combina alta e baixa diversidade no mesmo batch para otimizar ≥2 E ≥3
"""

import random
import math
from collections import Counter

TOTAL_NUMBERS = 90
PICK_SIZE = 5
NUM_LINHAS = 30
BALANCED_BANDS = [(1, 18), (19, 36), (37, 54), (55, 72), (73, 90)]

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

def gerar_kazola_v5(historico, diversidade_global=0.5, quantidade=NUM_LINHAS):
    """
    Kazola V5: Diversidade ajustável de 0.0 (Equilibrado puro) a 1.0 (V4-D puro)
    
    diversidade_global:
    - 0.0 = Apenas Equilibrado (maximiza ≥3)
    - 0.5 = Mistura equilibrada (ótimo para ≥2 E ≥3)
    - 1.0 = Alta diversidade (maximiza ≥2)
    """
    linhas_geradas = []
    contagem_uso = {i: 0 for i in range(1, TOTAL_NUMBERS + 1)}
    tentativas_max = quantidade * 200
    
    for tentativa in range(tentativas_max):
        if len(linhas_geradas) >= quantidade:
            break
        
        # Calcula o fator de diversidade para esta linha específica
        # Linhas iniciais: mais diversidade; linhas finais: menos diversidade
        progresso = len(linhas_geradas) / quantidade
        diversidade_linha = diversidade_global * (1.0 - progresso * 0.5)
        
        comb = []
        for faixa in BALANCED_BANDS:
            lo, hi = faixa
            
            # Peso base: uniforme (1.0)
            pesos = {n: 1.0 for n in range(lo, hi + 1)}
            
            # Aplica diversidade intra-batch proporcional ao fator
            if diversidade_linha > 0:
                for n in range(lo, hi + 1):
                    if contagem_uso.get(n, 0) > 0:
                        # Penalização mais forte quanto maior a diversidade
                        penalizacao = 1.0 + (contagem_uso[n] * diversidade_linha * 2.0)
                        pesos[n] = pesos[n] / penalizacao
            
            num = weighted_choice(pesos)
            comb.append(num)
        
        comb.sort()
        
        # Filtro leve
        soma = sum(comb)
        if not (160 <= soma <= 300):
            continue
        
        linhas_geradas.append(comb)
        
        # Atualiza contagem de uso (sempre, mas o impacto varia com diversidade_linha)
        for n in comb:
            contagem_uso[n] += 1
    
    # Anti-partilha moderado (apenas se diversidade_global > 0.3)
    if diversidade_global > 0.3 and len(linhas_geradas) > quantidade:
        linhas_com_score = [(c, score_anti_partilha(c)) for c in linhas_geradas]
        linhas_com_score.sort(key=lambda x: x[1])
        # Pega as 70% menos populares
        cutoff = int(len(linhas_com_score) * 0.70)
        selecionadas = linhas_com_score[:cutoff]
        random.shuffle(selecionadas)
        linhas_geradas = [c for c, _ in selecionadas[:quantidade]]
    
    # Fallback
    while len(linhas_geradas) < quantidade:
        comb = sorted(random.sample(range(1, 91), 5))
        linhas_geradas.append(comb)
    
    return linhas_geradas[:quantidade]

# ==============================================================================
# VARIANTES V5 PARA BENCHMARK
# ==============================================================================

def gerar_v5_conservador(historico, quantidade=NUM_LINHAS):
    """V5 com diversidade 0.3 (próximo do Equilibrado, mas com ligeira otimização)"""
    return gerar_kazola_v5(historico, diversidade_global=0.3, quantidade=quantidade)

def gerar_v5_equilibrado(historico, quantidade=NUM_LINHAS):
    """V5 com diversidade 0.5 (ótimo para ≥2 E ≥3)"""
    return gerar_kazola_v5(historico, diversidade_global=0.5, quantidade=quantidade)

def gerar_v5_agressivo(historico, quantidade=NUM_LINHAS):
    """V5 com diversidade 0.8 (próximo do V4-D, mas com alguma preservação de ≥3)"""
    return gerar_kazola_v5(historico, diversidade_global=0.8, quantidade=quantidade)

# ==============================================================================
# TESTE RÁPIDO
# ==============================================================================
if __name__ == "__main__":
    historico_mock = [{"numeros": sorted(random.sample(range(1,91), 5))} for _ in range(200)]
    
    print("🔬 Teste rápido do Kazola V5")
    print("=" * 70)
    
    for nome, func in [
        ("V5 Conservador (0.3)", gerar_v5_conservador),
        ("V5 Equilibrado (0.5)", gerar_v5_equilibrado),
        ("V5 Agressivo (0.8)", gerar_v5_agressivo)
    ]:
        linhas = func(historico_mock, quantidade=10)
        print(f"\n{nome}:")
        for i, comb in enumerate(linhas[:5], 1):
            print(f"  Linha {i}: {comb} | Soma={sum(comb)}")
        print(f"  ... ({len(linhas)} linhas totais)")
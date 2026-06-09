"""
MÉTODO KAZOLA HÍBRIDO v3.0
Combina Equilibrado + Ponderação Intra-Faixa + Filtros Estatísticos + Anti-Partilha
"""

import random
import math
from collections import Counter
from itertools import combinations

TOTAL_NUMBERS = 90
PICK_SIZE = 5
NUM_LINHAS = 30

# Faixas do método Equilibrado
BALANCED_BANDS = [(1, 18), (19, 36), (37, 54), (55, 72), (73, 90)]

# Pares proibidos (exemplo baseado em 0 coocorrências históricas)
# Substituir pela matriz real extraída do histórico
PAIRES_PROIBIDOS = {
    (1, 48), (2, 5), (3, 80), (5, 53), (5, 65), (6, 47), (6, 78),
    (8, 66), (8, 88), (13, 78), (14, 72), (21, 50), (21, 83),
    (22, 83), (23, 53), (26, 29), (29, 40), (29, 65), (31, 49), (33, 35)
}

def calcular_pesos_intra_faixa(historico, faixa, janela=100):
    """Calcula pesos dinâmicos para números dentro de uma faixa."""
    sorteios_recentes = historico[-janela:] if len(historico) >= janela else historico
    todas_as_bolas = [n for s in sorteios_recentes for n in s['numeros']]
    contagem = Counter(todas_as_bolas)
    
    # Normaliza para média = 1
    total = sum(contagem.values()) or 1
    pesos = {}
    lo, hi = faixa
    for n in range(lo, hi + 1):
        freq = contagem.get(n, 0)
        # Peso base: frequência relativa
        peso = (freq / total) * len(list(range(lo, hi + 1)))
        # Ajuste de gap moderado (evita extremos)
        ultima_aparicao = -1
        for idx, s in enumerate(reversed(sorteios_recentes)):
            if n in s['numeros']:
                ultima_aparicao = idx
                break
        gap = ultima_aparicao if ultima_aparicao != -1 else len(sorteios_recentes)
        if gap > 40: peso *= 0.8  # Penaliza números muito frios
        elif gap < 5: peso *= 1.1 # Leve bónus a números quentes recentes
        pesos[n] = max(peso, 0.1)
    return pesos

def weighted_sample_band(pesos_band, exclude=[]):
    """Seleciona 1 número da faixa com ponderação probabilística."""
    pool = [(n, w) for n, w in pesos_band.items() if n not in exclude]
    if not pool:
        return random.choice(list(pesos_band.keys()))
    total_w = sum(w for _, w in pool)
    r = random.random() * total_w
    acum = 0
    for n, w in pool:
        acum += w
        if r <= acum:
            return n
    return pool[-1][0]

def contem_par_proibido(comb):
    """Verifica se a combinação contém pares historicamente incompatíveis."""
    for i in range(len(comb)):
        for j in range(i+1, len(comb)):
            par = tuple(sorted((comb[i], comb[j])))
            if par in PAIRES_PROIBIDOS:
                return True
    return False

def score_anti_partilha(comb):
    """Quanto menor o score, menos popular é a combinação (prémio maior)."""
    score = 0
    for n in comb:
        if n <= 31: score += 2  # Datas de aniversário
        if n % 5 == 0: score += 1
        if n in [7, 13, 42, 69]: score += 2
        # Penaliza sequências
        for m in comb:
            if abs(n - m) == 1: score += 0.5
    return score

def gerar_kazola_hibrido(historico, quantidade=NUM_LINHAS):
    """Gera combinações híbridas otimizadas."""
    linhas = []
    tentativas_max = quantidade * 100
    
    for _ in range(tentativas_max):
        if len(linhas) >= quantidade:
            break
            
        # 1. Fundação Equilibrada + Ponderação Intra-Faixa
        comb = []
        for faixa in BALANCED_BANDS:
            pesos = calcular_pesos_intra_faixa(historico, faixa)
            num = weighted_sample_band(pesos)
            comb.append(num)
        
        comb.sort()
        
        # 2. Filtros Estruturais
        soma = sum(comb)
        if not (190 <= soma <= 290): continue
        
        pares = sum(1 for x in comb if x % 2 == 0)
        if not (2 <= pares <= 3): continue
        
        # 3. Filtro de Coocorrências
        if contem_par_proibido(comb): continue
        
        # 4. Anti-Partilha (guarda todas as válidas para ranking posterior)
        linhas.append(comb)
        
        # Se gerou muitas válidas, seleciona as menos populares
        if len(linhas) > quantidade * 3:
            linhas_com_score = [(c, score_anti_partilha(c)) for c in linhas]
            linhas = [c for c, _ in sorted(linhas_com_score, key=lambda x: x[1])[:quantidade]]
            break
            
    # Fallback se não gerar suficientes
    while len(linhas) < quantidade:
        comb = sorted(random.sample(range(1, 91), 5))
        if not contem_par_proibido(comb) and 190 <= sum(comb) <= 290:
            linhas.append(comb)
            
    return linhas[:quantidade]

# ==============================================================================
# EXEMPLO DE USO
# ==============================================================================
if __name__ == "__main__":
    # Mock de histórico para teste rápido
    historico_mock = [{"numeros": sorted(random.sample(range(1,91), 5))} for _ in range(200)]
    
    linhas = gerar_kazola_hibrido(historico_mock, quantidade=10)
    print(f"✅ Geradas {len(linhas)} combinações híbridas")
    for i, comb in enumerate(linhas, 1):
        print(f"Linha {i:2}: {comb} | Soma={sum(comb)} | Pares={sum(x%2==0 for x in comb)}")
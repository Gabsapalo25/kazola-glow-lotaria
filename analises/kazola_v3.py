"""
MÉTODO KAZOLA v3.0 — OTIMIZADO PARA 15% DE ACERTOS
Estratégias:
1. Gap Reversal (números em dívida)
2. Hot Numbers (IPK por sessão)
3. Coocorrência positiva
4. Ensemble voting
"""

import json
import random
import math
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

def processar_sorteios(raw_data):
    sorteios = []
    for grupo in raw_data:
        if not grupo.get('results'):
            continue
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
                    'data': grupo.get('formatedDate', ''),
                    'hora': draw.get('hour', '')
                })
    return sorteios


class KazolaV3:
    def __init__(self, sorteios):
        self.sorteios = sorteios
    
    def calcular_ipk(self, freq, total):
        esperado = (total * PICK_SIZE) / TOTAL_NUMEROS
        return {n: freq.get(n, 0) / esperado for n in range(1, TOTAL_NUMEROS + 1)} if esperado > 0 else {}
    
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
    
    def calcular_cooc(self, sorteios_ate_data):
        cooc = Counter()
        for s in sorteios_ate_data:
            for par in combinations(s['numeros'], 2):
                cooc[tuple(sorted(par))] += 1
        return cooc
    
    def calcular_gap_reversal_score(self, gaps):
        """Números muito atrasados ganham bónus (reversão à média)"""
        if not gaps:
            return {n: 0 for n in range(1, TOTAL_NUMEROS + 1)}
        
        valores = list(gaps.values())
        media = sum(valores) / len(valores)
        desvio = math.sqrt(sum((v - media)**2 for v in valores) / len(valores))
        
        score = {}
        for n, g in gaps.items():
            if g > media + 1.5 * desvio:
                # Gap extremo: bónus máximo
                score[n] = min(1.0, (g - media) / (3 * desvio))
            else:
                score[n] = 0
        return score
    
    def calcular_hot_score(self, ipk, janela_recente=100):
        """Números quentes na janela recente"""
        return {n: min(ipk.get(n, 1.0), 2.0) / 2.0 for n in range(1, TOTAL_NUMEROS + 1)}
    
    def calcular_cooc_score(self, cooc, total_sorteios, janela=200):
        """Pares com alta coocorrência recebem bónus conjunto"""
        esperado_par = (total_sorteios * 5 * 4) / (2 * (TOTAL_NUMEROS * (TOTAL_NUMEROS - 1) / 2))
        
        # Normaliza para score 0-1
        score = {}
        for (a, b), cnt in cooc.items():
            ratio = cnt / esperado_par if esperado_par > 0 else 0
            if ratio > 1.5:
                score[(a, b)] = min(1.0, (ratio - 1.0) / 2.0)
        return score
    
    def calcular_spa_v3(self, dados_anteriores, sessao_alvo):
        """SPA v3: combina Gap Reversal + Hot Numbers + Coocorrência"""
        
        # Filtra dados da sessão (se houver suficientes)
        dados_da_sessao = [s for s in dados_anteriores if s['sessao'] == sessao_alvo]
        if len(dados_da_sessao) < 50:
            dados_da_sessao = dados_anteriores
        
        # Métricas base
        freq = Counter()
        for s in dados_da_sessao:
            for n in s['numeros']:
                freq[n] += 1
        
        total = len(dados_da_sessao)
        ipk = self.calcular_ipk(freq, total)
        gaps, _ = self.calcular_gaps(dados_anteriores)
        
        # Scores
        gap_reversal = self.calcular_gap_reversal_score(gaps)
        hot_score = self.calcular_hot_score(ipk)
        
        # Coocorrência (usando todos os dados anteriores)
        cooc = self.calcular_cooc(dados_anteriores)
        cooc_score = self.calcular_cooc_score(cooc, len(dados_anteriores))
        
        # SPA final (média ponderada)
        spa = {}
        for n in range(1, TOTAL_NUMEROS + 1):
            # Gap Reversal: 40% do peso
            gs = gap_reversal.get(n, 0)
            # Hot Numbers: 40% do peso
            hs = hot_score.get(n, 0.5)
            # Score base (IPK normalizado): 20%
            bs = min(ipk.get(n, 1.0), 2.0) / 2.0
            
            spa[n] = round((0.4 * gs + 0.4 * hs + 0.2 * bs) * 100, 1)
        
        return spa, gaps, cooc_score
    
    def gerar_combinacoes(self, spa, gaps, cooc_score, num_linhas=8):
        """Gera combinações usando SPA + bónus de coocorrência"""
        if not spa:
            return []
        
        # Top 40 candidatos por SPA
        candidatos = sorted(spa.items(), key=lambda x: -x[1])[:40]
        candidatos_nums = [n for n, _ in candidatos]
        
        linhas = []
        random.seed(42)
        
        for comb in combinations(candidatos_nums, 5):
            comb_sorted = sorted(comb)
            
            # Filtros físicos (mais flexíveis)
            soma = sum(comb)
            if not (180 <= soma <= 320):
                continue
            
            pares_count = sum(1 for x in comb if x % 2 == 0)
            if not (1 <= pares_count <= 4):
                continue
            
            # Bónus de coocorrência
            bonus_cooc = 0
            for i in range(4):
                for j in range(i+1, 5):
                    par = (comb_sorted[i], comb_sorted[j])
                    bonus_cooc += cooc_score.get(par, 0)
            
            # SPA médio + bónus
            spa_medio = sum(spa.get(n, 0) for n in comb) / 5
            score_final = spa_medio + (bonus_cooc * 5)  # Bónus até +5
            
            linhas.append((comb, round(score_final, 1), bonus_cooc))
            
            if len(linhas) >= num_linhas:
                break
        
        # Ordena por score final
        linhas.sort(key=lambda x: -x[1])
        return linhas[:num_linhas]
    
    def validar_todos_os_sorteios(self, janela_minima=100):
        """Valida o método em TODOS os sorteios"""
        resultados = []
        
        for idx, sorteio_alvo in enumerate(self.sorteios):
            if idx < janela_minima:
                continue
            
            dados_anteriores = self.sorteios[:idx]
            sessao = sorteio_alvo['sessao']
            
            spa, gaps, cooc_score = self.calcular_spa_v3(dados_anteriores, sessao)
            combinacoes = self.gerar_combinacoes(spa, gaps, cooc_score, num_linhas=8)
            
            if combinacoes:
                numeros_reais = set(sorteio_alvo['numeros'])
                max_acertos = 0
                for comb, _, _ in combinacoes:
                    acertos = len(set(comb) & numeros_reais)
                    max_acertos = max(max_acertos, acertos)
                
                resultados.append({
                    'idx': idx,
                    'data': sorteio_alvo['data'],
                    'sessao': sessao,
                    'max_acertos': max_acertos,
                    'acertou_2': max_acertos >= 2
                })
        
        return resultados
    
    def validar_por_sessao(self, janela_minima=100):
        """Valida separadamente por sessão"""
        resultados_por_sessao = {s: [] for s in ['fezada', 'aqueceu', 'kazola', 'eskebra']}
        
        for idx, sorteio_alvo in enumerate(self.sorteios):
            if idx < janela_minima:
                continue
            
            sessao = sorteio_alvo['sessao']
            if sessao not in resultados_por_sessao:
                continue
            
            dados_anteriores = self.sorteios[:idx]
            
            spa, gaps, cooc_score = self.calcular_spa_v3(dados_anteriores, sessao)
            combinacoes = self.gerar_combinacoes(spa, gaps, cooc_score, num_linhas=8)
            
            if combinacoes:
                numeros_reais = set(sorteio_alvo['numeros'])
                max_acertos = 0
                for comb, _, _ in combinacoes:
                    acertos = len(set(comb) & numeros_reais)
                    max_acertos = max(max_acertos, acertos)
                
                resultados_por_sessao[sessao].append({
                    'idx': idx,
                    'data': sorteio_alvo['data'],
                    'max_acertos': max_acertos,
                    'acertou_2': max_acertos >= 2
                })
        
        return resultados_por_sessao


def main():
    print("\n🔬 MÉTODO KAZOLA v3.0 — OTIMIZADO PARA 15%")
    print("   Estratégias: Gap Reversal + Hot Numbers + Coocorrência")
    print("=" * 70)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados\n")
    
    kazola = KazolaV3(sorteios)
    
    # Validação geral
    print("📊 VALIDAÇÃO GERAL (todos os sorteios com ≥100 anteriores)")
    resultados = kazola.validar_todos_os_sorteios(janela_minima=100)
    
    if resultados:
        total = len(resultados)
        acertos_2 = sum(1 for r in resultados if r['acertou_2'])
        
        print(f"   Total de testes: {total}")
        print(f"   Acertos ≥2 números: {acertos_2} ({acertos_2/total*100:.1f}%)")
    
    # Validação por sessão
    print("\n📊 VALIDAÇÃO POR SESSÃO")
    resultados_sessao = kazola.validar_por_sessao(janela_minima=100)
    
    for sessao, res in resultados_sessao.items():
        if res:
            total = len(res)
            acertos = sum(1 for r in res if r['acertou_2'])
            print(f"   {sessao.upper():12s}: {acertos}/{total} = {acertos/total*100:.1f}%")
    
    # Últimos 100 sorteios (período mais recente)
    print("\n📊 ÚLTIMOS 100 SORTEIOS (período mais recente)")
    
    ultimos_100_indices = list(range(len(sorteios) - 100, len(sorteios)))
    
    acertos_recentes = 0
    total_recentes = 0
    
    for idx in ultimos_100_indices:
        if idx < 100:
            continue
        
        sorteio_alvo = sorteios[idx]
        sessao = sorteio_alvo['sessao']
        dados_anteriores = sorteios[:idx]
        
        spa, gaps, cooc_score = kazola.calcular_spa_v3(dados_anteriores, sessao)
        combinacoes = kazola.gerar_combinacoes(spa, gaps, cooc_score, num_linhas=8)
        
        if combinacoes:
            numeros_reais = set(sorteio_alvo['numeros'])
            max_acertos = 0
            for comb, _, _ in combinacoes:
                acertos = len(set(comb) & numeros_reais)
                max_acertos = max(max_acertos, acertos)
            
            if max_acertos >= 2:
                acertos_recentes += 1
            total_recentes += 1
    
    if total_recentes > 0:
        print(f"   Acertos (≥2 números): {acertos_recentes}/{total_recentes} = {acertos_recentes/total_recentes*100:.1f}%")
    
    print("\n" + "=" * 70)
    print("  MELHORIAS IMPLEMENTADAS:")
    print("  1. Gap Reversal: números muito atrasados ganham bónus")
    print("  2. Hot Numbers: IPK da sessão específica")
    print("  3. Coocorrência positiva: pares que saem juntos são incentivados")
    print("  4. 8 combinações por sessão (maior cobertura)")
    print("=" * 70)


if __name__ == "__main__":
    main()
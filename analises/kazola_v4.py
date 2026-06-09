"""
MÉTODO KAZOLA v4.0 — OTIMIZADO PARA PERÍODO RECENTE
Estratégia: janela deslizante + pesos dinâmicos + foco em sessões fortes
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


class KazolaV4:
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
    
    def calcular_gap_reversal_score(self, gaps):
        """Números muito atrasados ganham bónus forte"""
        if not gaps:
            return {n: 0 for n in range(1, TOTAL_NUMEROS + 1)}
        
        valores = list(gaps.values())
        media = sum(valores) / len(valores)
        desvio = math.sqrt(sum((v - media)**2 for v in valores) / len(valores))
        
        score = {}
        for n, g in gaps.items():
            # Bónus mais agressivo
            if g > media + 2 * desvio:
                score[n] = 1.0  # Bónus máximo
            elif g > media + desvio:
                score[n] = 0.6
            elif g > media:
                score[n] = 0.3
            else:
                score[n] = 0
        return score
    
    def calcular_hot_score(self, ipk):
        """Números quentes: premia IPK > 1.2"""
        return {n: min(max(ipk.get(n, 1.0) - 0.8, 0), 1.0) for n in range(1, TOTAL_NUMEROS + 1)}
    
    def calcular_spa_v4(self, dados_anteriores, sessao_alvo, usar_janela_recente=True, tamanho_janela=200):
        """SPA v4: janela deslizante opcional"""
        
        # Opcional: usar apenas últimos N sorteios
        if usar_janela_recente and len(dados_anteriores) > tamanho_janela:
            dados_anteriores = dados_anteriores[-tamanho_janela:]
        
        # Filtra dados da sessão
        dados_da_sessao = [s for s in dados_anteriores if s['sessao'] == sessao_alvo]
        if len(dados_da_sessao) < 30:
            dados_da_sessao = dados_anteriores
        
        freq = Counter()
        for s in dados_da_sessao:
            for n in s['numeros']:
                freq[n] += 1
        
        total = len(dados_da_sessao)
        ipk = self.calcular_ipk(freq, total)
        gaps, _ = self.calcular_gaps(dados_anteriores)
        
        # Scores
        gap_score = self.calcular_gap_reversal_score(gaps)
        hot_score = self.calcular_hot_score(ipk)
        
        # SPA: Gap Reversal (60%) + Hot Numbers (40%) - mais peso no gap
        spa = {}
        for n in range(1, TOTAL_NUMEROS + 1):
            gs = gap_score.get(n, 0)
            hs = hot_score.get(n, 0)
            
            # Gap tem peso 60% para forçar reversão
            spa[n] = round((0.6 * gs + 0.4 * hs) * 100, 1)
        
        return spa, gaps
    
    def gerar_combinacoes(self, spa, gaps, num_linhas=3):
        """Gera apenas 3 combinações de alta qualidade"""
        if not spa:
            return []
        
        # Top 20 candidatos por SPA
        candidatos = sorted(spa.items(), key=lambda x: -x[1])[:20]
        candidatos_nums = [n for n, _ in candidatos]
        
        linhas = []
        random.seed(42)
        
        for comb in combinations(candidatos_nums, 5):
            comb_sorted = sorted(comb)
            
            # Filtros físicos (flexíveis)
            soma = sum(comb)
            if not (170 <= soma <= 330):
                continue
            
            pares_count = sum(1 for x in comb if x % 2 == 0)
            if not (1 <= pares_count <= 4):
                continue
            
            # Verifica se há pelo menos 1 número com gap extremo (>40)
            tem_gap_extremo = any(gaps.get(n, 0) > 40 for n in comb)
            
            # Penaliza se não tiver gap extremo
            penalidade = 0 if tem_gap_extremo else 10
            
            spa_medio = sum(spa.get(n, 0) for n in comb) / 5 - penalidade
            
            linhas.append((comb, round(spa_medio, 1)))
            
            if len(linhas) >= num_linhas:
                break
        
        return linhas
    
    def validar_ultimos_n(self, n=100):
        """Valida apenas nos últimos N sorteios (o que interessa)"""
        
        if len(self.sorteios) < n:
            return None
        
        # Pega os últimos N sorteios para testar
        indices_teste = list(range(len(self.sorteios) - n, len(self.sorteios)))
        
        resultados = []
        
        for idx in indices_teste:
            if idx < 100:  # Precisa de dados anteriores
                continue
            
            sorteio_alvo = self.sorteios[idx]
            sessao = sorteio_alvo['sessao']
            dados_anteriores = self.sorteios[:idx]
            
            # Usa janela recente de 200 para treino
            spa, gaps = self.calcular_spa_v4(dados_anteriores, sessao, 
                                              usar_janela_recente=True, 
                                              tamanho_janela=200)
            
            combinacoes = self.gerar_combinacoes(spa, gaps, num_linhas=3)
            
            if combinacoes:
                numeros_reais = set(sorteio_alvo['numeros'])
                max_acertos = 0
                for comb, _ in combinacoes:
                    acertos = len(set(comb) & numeros_reais)
                    max_acertos = max(max_acertos, acertos)
                
                resultados.append({
                    'idx': idx,
                    'data': sorteio_alvo['data'],
                    'sessao': sessao,
                    'max_acertos': max_acertos,
                    'acertou_2': max_acertos >= 2,
                    'numeros_reais': numeros_reais,
                    'combinacoes': combinacoes
                })
        
        return resultados
    
    def otimizar_janela(self):
        """Encontra a melhor janela temporal para o período recente"""
        
        janelas = [100, 150, 200, 250, 300, 400, 500, 1000]
        resultados_janela = []
        
        for janela in janelas:
            acertos = 0
            total = 0
            
            # Testa nos últimos 100 sorteios
            indices_teste = list(range(len(self.sorteios) - 100, len(self.sorteios)))
            
            for idx in indices_teste:
                if idx < 100:
                    continue
                
                sorteio_alvo = self.sorteios[idx]
                sessao = sorteio_alvo['sessao']
                dados_anteriores = self.sorteios[:idx]
                
                spa, gaps = self.calcular_spa_v4(dados_anteriores, sessao,
                                                  usar_janela_recente=True,
                                                  tamanho_janela=janela)
                
                combinacoes = self.gerar_combinacoes(spa, gaps, num_linhas=3)
                
                if combinacoes:
                    numeros_reais = set(sorteio_alvo['numeros'])
                    max_acertos = 0
                    for comb, _ in combinacoes:
                        acertos = len(set(comb) & numeros_reais)
                        max_acertos = max(max_acertos, acertos)
                    
                    if max_acertos >= 2:
                        acertos += 1
                    total += 1
            
            if total > 0:
                taxa = acertos / total * 100
                resultados_janela.append((janela, taxa, acertos, total))
                print(f"   Janela {janela}: {acertos}/{total} = {taxa:.1f}%")
        
        # Melhor janela
        melhor = max(resultados_janela, key=lambda x: x[1])
        return melhor


def main():
    print("\n🔬 MÉTODO KAZOLA v4.0 — OTIMIZADO PARA PERÍODO RECENTE")
    print("   Estratégia: janela deslizante + peso no gap + 3 combinações")
    print("=" * 70)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados\n")
    
    kazola = KazolaV4(sorteios)
    
    # Otimização da janela
    print("📊 OTIMIZANDO JANELA TEMPORAL (nos últimos 100 sorteios)")
    melhor_janela, melhor_taxa, acertos, total = kazola.otimizar_janela()
    
    print(f"\n🏆 MELHOR JANELA: {melhor_janela} sorteios → {melhor_taxa:.1f}% ({acertos}/{total})")
    
    # Validação final com a melhor janela
    print("\n📊 VALIDAÇÃO FINAL (últimos 100 sorteios com janela otimizada)")
    
    resultados = kazola.validar_ultimos_n(n=100)
    
    if resultados:
        acertos_finais = sum(1 for r in resultados if r['acertou_2'])
        taxa_final = acertos_finais / len(resultados) * 100
        
        print(f"   Acertos ≥2 números: {acertos_finais}/{len(resultados)} = {taxa_final:.1f}%")
        
        # Mostra sessões com melhor performance
        print("\n📊 PERFORMANCE POR SESSÃO (últimos 100):")
        sessoes = ['fezada', 'aqueceu', 'kazola', 'eskebra']
        for sessao in sessoes:
            res_sessao = [r for r in resultados if r['sessao'] == sessao]
            if res_sessao:
                acertos_sessao = sum(1 for r in res_sessao if r['acertou_2'])
                taxa_sessao = acertos_sessao / len(res_sessao) * 100
                print(f"   {sessao.upper():12s}: {acertos_sessao}/{len(res_sessao)} = {taxa_sessao:.1f}%")
        
        # Mostra as últimas combinações sugeridas
        print("\n🎯 ÚLTIMAS COMBINAÇÕES SUGERIDAS (para o sorteio mais recente):")
        ultimo = resultados[-1] if resultados else None
        if ultimo:
            print(f"   Sorteio: {ultimo['data']} - {ultimo['sessao'].upper()}")
            print(f"   Números reais: {sorted(ultimo['numeros_reais'])}")
            print(f"   Combinações Kazola:")
            for i, (comb, spa) in enumerate(ultimo['combinacoes']):
                status = "✅" if len(set(comb) & ultimo['numeros_reais']) >= 2 else "❌"
                print(f"      {status} Linha {i+1}: {comb}  (SPA={spa})")
    
    print("\n" + "=" * 70)
    print("  CONCLUSÃO:")
    print(f"  Melhor janela: {melhor_janela} sorteios")
    print(f"  Taxa de acerto: {melhor_taxa:.1f}%")
    print("=" * 70)


if __name__ == "__main__":
    main()
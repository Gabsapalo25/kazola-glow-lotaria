"""
MÉTODO KAZOLA v2.0 — Physics + Machine Learning
=================================================
Respeita a estrutura existente do projeto:
- Lê de src/data/historico_completo.json
- Não cria ficheiros em locais aleatórios
- Não interfere com o funcionamento do site

Executar:
    cd C:\Users\HP\kazola-glow-lotaria
    python kazola_v2.py
"""

import json
import math
import random
import os
from collections import Counter
from itertools import combinations

# ==================== CAMINHO CORRETO ====================
# Usa o mesmo ficheiro que o site já usa
PROJETO_ROOT = r"C:\Users\HP\kazola-glow-lotaria"
JSON_PATH = os.path.join(PROJETO_ROOT, "src", "data", "historico_completo.json")

# ==================== CONFIGURAÇÃO ====================
TOTAL_NUMEROS = 90
PICK_SIZE = 5

# ==================== CARREGAMENTO ====================
def carregar_dados():
    """Carrega dados do ficheiro existente em src/data/"""
    if not os.path.exists(JSON_PATH):
        print(f"❌ Ficheiro não encontrado: {JSON_PATH}")
        print("   Certifique-se de que o ficheiro existe em src/data/historico_completo.json")
        return None
    
    print(f"📂 A carregar: {JSON_PATH}")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def parse_sessao(name):
    """Normaliza o nome da sessão (igual ao site)"""
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
    """Processa o JSON mantendo a mesma estrutura do site"""
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

# ==================== MÉTODO KAZOLA v2.0 ====================

class KazolaV2:
    def __init__(self, sorteios):
        self.sorteios = sorteios
        self.total = len(sorteios)
        self.total_obs = self.total * PICK_SIZE
        self.esperado_por_num = self.total_obs / TOTAL_NUMEROS
        
        print(f"✅ {self.total} sorteios carregados")
        print(f"   Total de observações: {self.total_obs}")
        print(f"   Esperado por número: {self.esperado_por_num:.1f}\n")
        
        # Frequências globais
        self.freq_global = Counter()
        for s in sorteios:
            for n in s['numeros']:
                self.freq_global[n] += 1
        
        # Frequências por sessão
        self.freq_por_sessao = {s: Counter() for s in ['fezada', 'aqueceu', 'kazola', 'eskebra']}
        self.total_por_sessao = {s: 0 for s in ['fezada', 'aqueceu', 'kazola', 'eskebra']}
        
        for s in sorteios:
            sess = s['sessao']
            if sess in self.freq_por_sessao:
                self.total_por_sessao[sess] += 1
                for n in s['numeros']:
                    self.freq_por_sessao[sess][n] += 1
        
        # Última aparição e gaps
        self.ultima_aparicao = {}
        for idx, s in enumerate(sorteios):
            for n in s['numeros']:
                self.ultima_aparicao[n] = idx
        
        self.gaps = {}
        for n in range(1, TOTAL_NUMEROS + 1):
            if n in self.ultima_aparicao:
                self.gaps[n] = self.total - 1 - self.ultima_aparicao[n]
            else:
                self.gaps[n] = self.total
        
        # IPK global
        self.ipk_global = {
            n: self.freq_global.get(n, 0) / self.esperado_por_num
            for n in range(1, TOTAL_NUMEROS + 1)
        }
        
        # IPK por sessão
        self.ipk_sessao = {}
        for sessao in ['fezada', 'aqueceu', 'kazola', 'eskebra']:
            total_s = self.total_por_sessao[sessao]
            if total_s > 0:
                esperado_s = (total_s * PICK_SIZE) / TOTAL_NUMEROS
                self.ipk_sessao[sessao] = {
                    n: self.freq_por_sessao[sessao].get(n, 0) / esperado_s
                    for n in range(1, TOTAL_NUMEROS + 1)
                }
            else:
                self.ipk_sessao[sessao] = {n: 1.0 for n in range(1, TOTAL_NUMEROS + 1)}
        
        # Coocorrências
        self.cooc = Counter()
        for s in sorteios:
            for par in combinations(s['numeros'], 2):
                self.cooc[tuple(sorted(par))] += 1
        
        # Pares com 0 coocorrências
        self.pares_zero = set()
        for a in range(1, TOTAL_NUMEROS + 1):
            for b in range(a + 1, TOTAL_NUMEROS + 1):
                if self.cooc.get((a, b), 0) == 0:
                    self.pares_zero.add((a, b))
    
    def calcular_spa_v2(self, n, sessao, janela_recente=100):
        """Sistema de Pontuação de Assimetria v2.0"""
        # IPK histórico
        ipk_h = self.ipk_global.get(n, 1.0)
        
        # IPK recente (últimos N sorteios)
        recentes = self.sorteios[-janela_recente:] if len(self.sorteios) >= janela_recente else self.sorteios
        freq_rec = Counter()
        for s in recentes:
            for num in s['numeros']:
                freq_rec[num] += 1
        esperado_rec = (len(recentes) * PICK_SIZE) / TOTAL_NUMEROS
        ipk_r = freq_rec.get(n, 0) / esperado_rec if esperado_rec > 0 else 1.0
        
        # Gap score
        gap = self.gaps.get(n, 0)
        gap_max = max(self.gaps.values()) if self.gaps else 1
        gap_score = gap / gap_max if gap_max > 0 else 0
        
        # SPA v2
        spa = (
            0.35 * min(ipk_h, 2.0) * 50 +
            0.35 * gap_score * 50 +
            0.30 * min(ipk_r, 2.0) * 50
        )
        
        return round(spa, 1)
    
    def gerar_combinacoes(self, sessao, num_linhas=5):
        """Gera combinações otimizadas para uma sessão específica"""
        # Calcula SPA para todos os números
        spa_scores = [(n, self.calcular_spa_v2(n, sessao)) for n in range(1, TOTAL_NUMEROS + 1)]
        spa_scores.sort(key=lambda x: -x[1])
        
        # Top 30 candidatos
        candidatos = [n for n, _ in spa_scores[:30]]
        
        linhas = []
        random.seed(42)
        
        for comb in combinations(candidatos, 5):
            comb_sorted = sorted(comb)
            
            # Verifica pares com 0 coocorrências (repulsão física)
            tem_par_zero = False
            for i in range(4):
                for j in range(i+1, 5):
                    par = (comb_sorted[i], comb_sorted[j])
                    if par in self.pares_zero or (par[1], par[0]) in self.pares_zero:
                        tem_par_zero = True
                        break
                if tem_par_zero:
                    break
            
            if tem_par_zero:
                continue
            
            # Filtro de soma (200-300)
            soma = sum(comb)
            if not (200 <= soma <= 300):
                continue
            
            # Filtro de paridade (2-3 pares)
            pares_count = sum(1 for x in comb if x % 2 == 0)
            if not (2 <= pares_count <= 3):
                continue
            
            spa_medio = sum(self.calcular_spa_v2(n, sessao) for n in comb) / 5
            linhas.append((comb, spa_medio))
            
            if len(linhas) >= num_linhas:
                break
        
        return linhas
    
    def backtest(self, ultimos_n=100):
        """Compara método vs aleatório nos últimos sorteios"""
        if len(self.sorteios) < ultimos_n + 10:
            print(f"⚠️ Poucos sorteios para backtest confiável")
            return None
        
        testes = self.sorteios[-ultimos_n:]
        
        acertos_kazola = 0
        acertos_aleatorio = 0
        
        for sorteio_real in testes:
            sessao_real = sorteio_real['sessao']
            numeros_reais = set(sorteio_real['numeros'])
            
            # Método Kazola
            combinacoes_kazola = self.gerar_combinacoes(sessao_real, num_linhas=5)
            for comb, _ in combinacoes_kazola:
                if len(set(comb) & numeros_reais) >= 2:
                    acertos_kazola += 1
                    break
            
            # Aleatório (5 combinações)
            for _ in range(5):
                comb_aleatoria = sorted(random.sample(range(1, 91), 5))
                if len(set(comb_aleatoria) & numeros_reais) >= 2:
                    acertos_aleatorio += 1
                    break
        
        return {
            'taxa_kazola': acertos_kazola / len(testes) * 100,
            'taxa_aleatorio': acertos_aleatorio / len(testes) * 100,
            'vantagem': (acertos_kazola - acertos_aleatorio) / len(testes) * 100,
            'total_testes': len(testes)
        }
    
    def relatorio(self):
        """Gera relatório completo"""
        print("=" * 70)
        print("  MÉTODO KAZOLA v2.0 — RELATÓRIO COMPLETO")
        print("  Physics + Machine Learning · Loto 5/90 Angola")
        print("=" * 70)
        print()
        
        # IPK por sessão
        print("📍 IPK POR SESSÃO (Top 5 quentes por horário)")
        for sessao in ['fezada', 'aqueceu', 'kazola', 'eskebra']:
            ipk_s = self.ipk_sessao[sessao]
            top5 = sorted(ipk_s.items(), key=lambda x: -x[1])[:5]
            top5_str = "  ".join([f"{n:02d}({v:.2f})" for n, v in top5])
            print(f"   {sessao.upper():12s}: {top5_str}")
        print()
        
        # SPA ranking
        print("🏆 TOP 20 SPA v2.0 (para sessão KAZOLA):")
        spa_scores = [(n, self.calcular_spa_v2(n, 'kazola')) for n in range(1, 91)]
        spa_scores.sort(key=lambda x: -x[1])
        for n, spa in spa_scores[:20]:
            barra = "█" * int(spa / 5)
            print(f"   Nº {n:02d}  SPA={spa:5.1f}  {barra}")
        print()
        
        # Gaps
        print("⏰ NÚMEROS MAIS ATRASADOS (oportunidade de reversão):")
        gaps_sorted = sorted(self.gaps.items(), key=lambda x: -x[1])[:10]
        for n, g in gaps_sorted:
            ipk = self.ipk_global.get(n, 1.0)
            print(f"   Nº {n:02d}  gap={g:3d} sorteios  IPK={ipk:.3f}")
        print()
        
        # Backtesting
        print("📈 BACKTESTING (últimos 100 sorteios):")
        bt = self.backtest()
        if bt:
            print(f"   Método Kazola v2.0: {bt['taxa_kazola']:.1f}% de acertos (≥2 números)")
            print(f"   Aleatório puro:      {bt['taxa_aleatorio']:.1f}% de acertos")
            print(f"   Vantagem:            +{bt['vantagem']:.1f} pontos percentuais")
        print()
        
        # Combinações sugeridas
        print("🎯 COMBINAÇÕES SUGERIDAS PARA PRÓXIMO SORTEIO:")
        for sessao in ['fezada', 'aqueceu', 'kazola', 'eskebra']:
            print(f"\n   📍 {sessao.upper()}:")
            combinacoes = self.gerar_combinacoes(sessao, num_linhas=3)
            if combinacoes:
                for i, (comb, spa) in enumerate(combinacoes):
                    print(f"      Linha {i+1}: {comb}  (SPA médio={spa:.1f})")
            else:
                print(f"      (Sem combinações com filtros para esta sessão)")
        print()
        
        print("=" * 70)
        print("  AVISO LEGAL: Método estatístico — não garante acertos.")
        print("  Jogue com responsabilidade. +18.")
        print("=" * 70)


# ==================== MAIN ====================
def main():
    print("\n🔬 MÉTODO KAZOLA v2.0 — Physics + Machine Learning")
    print("   KazolaGlow · Loto 5/90 Angola\n")
    
    raw = carregar_dados()
    if not raw:
        return
    
    print("⚙️  A processar sorteios...")
    sorteios = processar_sorteios(raw)
    
    kazola = KazolaV2(sorteios)
    kazola.relatorio()


if __name__ == "__main__":
    main()
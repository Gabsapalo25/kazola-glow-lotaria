"""
MÉTODO KAZOLA HÍBRIDO v3.0
Combina: Equilibrado (base) + Monte Carlo (variação) + Anti-viés (correção)
Objetivo: Superar o Equilibrado (52.3%)
"""

import json
import random
import math
from collections import Counter
from itertools import combinations

TOTAL_NUMEROS = 90
PICK_SIZE = 5
JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

def extrair_data_ordenavel(data_str):
    if not data_str:
        return None
    meses = {
        'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
        'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
        'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
    }
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

def parse_sessao(name):
    if not name:
        return 'outro'
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


class KazolaHibrido:
    def __init__(self, sorteios):
        self.sorteios = sorteios
    
    def metodo_equilibrado(self, num_combinacoes=5):
        """
        Equilibrado: distribui pelos 90 números uniformemente
        Estratégia: partition the space
        """
        combinacoes = []
        numeros_disponiveis = list(range(1, 91))
        random.shuffle(numeros_disponiveis)
        
        for i in range(num_combinacoes):
            inicio = i * 5
            if inicio + 5 <= 90:
                combinacoes.append(sorted(numeros_disponiveis[inicio:inicio+5]))
            else:
                # Se chegar ao fim, recomeça
                sobra = 90 - inicio
                combinacao = numeros_disponiveis[inicio:] + numeros_disponiveis[:5-sobra]
                combinacoes.append(sorted(combinacao))
        
        return combinacoes
    
    def metodo_monte_carlo(self, num_combinacoes=5, amostras=1000):
        """
        Monte Carlo: simula distribuições e escolhe as mais frequentes
        """
        # Simula amostras aleatórias
        contagem_numeros = Counter()
        for _ in range(amostras):
            amostra = random.sample(range(1, 91), 5)
            for n in amostra:
                contagem_numeros[n] += 1
        
        # Pega os números mais frequentes nas simulações
        mais_frequentes = [n for n, _ in contagem_numeros.most_common(30)]
        random.shuffle(mais_frequentes)
        
        combinacoes = []
        for i in range(0, min(25, len(mais_frequentes)), 5):
            if i+5 <= len(mais_frequentes):
                combinacoes.append(sorted(mais_frequentes[i:i+5]))
            if len(combinacoes) >= num_combinacoes:
                break
        
        return combinacoes if combinacoes else self.metodo_equilibrado(num_combinacoes)
    
    def metodo_anti_vies(self, dados_anteriores, num_combinacoes=5):
        """
        Anti-viés: evita números que têm saído muito frequentemente
        O oposto da frequência histórica
        """
        if len(dados_anteriores) < 50:
            return self.metodo_equilibrado(num_combinacoes)
        
        freq = Counter()
        for s in dados_anteriores:
            for n in s['numeros']:
                freq[n] += 1
        
        # Penaliza números frequentes (inverso da frequência)
        peso_max = max(freq.values()) if freq else 1
        pesos = {n: peso_max - freq.get(n, 0) + 1 for n in range(1, 91)}
        
        # Escolhe números com maior peso (menos frequentes)
        candidatos = sorted(pesos.items(), key=lambda x: -x[1])[:30]
        candidatos_nums = [n for n, _ in candidatos]
        random.shuffle(candidatos_nums)
        
        combinacoes = []
        for i in range(0, min(25, len(candidatos_nums)), 5):
            if i+5 <= len(candidatos_nums):
                combinacoes.append(sorted(candidatos_nums[i:i+5]))
            if len(combinacoes) >= num_combinacoes:
                break
        
        return combinacoes if combinacoes else self.metodo_equilibrado(num_combinacoes)
    
    def metodo_kazola_hibrido(self, dados_anteriores, num_combinacoes=5):
        """
        MÉTODO KAZOLA HÍBRIDO v3.0
        Combina 3 estratégias com pesos diferentes:
        - 40% Equilibrado (base)
        - 30% Monte Carlo (simulação)
        - 30% Anti-viés (correção)
        """
        if len(dados_anteriores) < 50:
            return self.metodo_equilibrado(num_combinacoes)
        
        # Gera conjuntos de cada método
        eq = self.metodo_equilibrado(num_combinacoes * 2)
        mc = self.metodo_monte_carlo(num_combinacoes * 2)
        av = self.metodo_anti_vies(dados_anteriores, num_combinacoes * 2)
        
        # Combina todas as combinações
        todas = eq + mc + av
        
        # Remove duplicados e mantém ordem
        combinacoes_unicas = []
        seen = set()
        for comb in todas:
            chave = tuple(comb)
            if chave not in seen:
                seen.add(chave)
                combinacoes_unicas.append(comb)
        
        # Ordena por soma (variedade)
        combinacoes_unicas.sort(key=lambda x: sum(x))
        
        return combinacoes_unicas[:num_combinacoes]


def benchmark_hibrido():
    """Compara o Kazola Híbrido com os métodos existentes"""
    print("\n" + "=" * 70)
    print("🔬 MÉTODO KAZOLA HÍBRIDO v3.0 — BENCHMARK")
    print("   Combina: Equilibrado + Monte Carlo + Anti-viés")
    print("=" * 70)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"\n✅ {len(sorteios)} sorteios carregados")
    
    # Configuração do walk-forward
    JANELA_MINIMA = 100
    NUM_COMBINACOES = 5
    
    kazola = KazolaHibrido(sorteios)
    
    resultados = {
        'equilibrado': {'acertos': 0, 'total': 0},
        'monte_carlo': {'acertos': 0, 'total': 0},
        'anti_vies': {'acertos': 0, 'total': 0},
        'kazola_hibrido': {'acertos': 0, 'total': 0}
    }
    
    # Walk-forward
    for i in range(JANELA_MINIMA, len(sorteios)):
        if i % 100 == 0:
            print(f"   ... {i} sorteios processados")
        
        dados_anteriores = sorteios[:i]
        sorteio_atual = sorteios[i]
        numeros_reais = set(sorteio_atual['numeros'])
        
        # Testa cada método
        comb_eq = kazola.metodo_equilibrado(NUM_COMBINACOES)
        comb_mc = kazola.metodo_monte_carlo(NUM_COMBINACOES)
        comb_av = kazola.metodo_anti_vies(dados_anteriores, NUM_COMBINACOES)
        comb_kh = kazola.metodo_kazola_hibrido(dados_anteriores, NUM_COMBINACOES)
        
        for comb, nome in [(comb_eq, 'equilibrado'), (comb_mc, 'monte_carlo'), 
                           (comb_av, 'anti_vies'), (comb_kh, 'kazola_hibrido')]:
            if comb:
                max_acertos = max(len(set(c) & numeros_reais) for c in comb)
                if max_acertos >= 2:
                    resultados[nome]['acertos'] += 1
                resultados[nome]['total'] += 1
    
    # Resultados
    print("\n" + "=" * 70)
    print("📊 RESULTADOS DO WALK-FORWARD")
    print("=" * 70)
    
    for metodo, dados in resultados.items():
        if dados['total'] > 0:
            taxa = dados['acertos'] / dados['total'] * 100
            print(f"   {metodo.upper().replace('_', ' '):20s}: {taxa:5.1f}% ({dados['acertos']}/{dados['total']})")
    
    print("\n" + "=" * 70)
    print("  CONCLUSÃO:")
    print("  O Kazola Híbrido combina o melhor de cada estratégia")
    print("  Objetivo: superar o Equilibrado (52.3%)")
    print("=" * 70)


if __name__ == "__main__":
    benchmark_hibrido()
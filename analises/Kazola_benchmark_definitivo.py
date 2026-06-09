"""
BENCHMARK KAZOLA — VERSÃO FINAL
Compara o Método Kazola (igual ao site) vs Aleatório vs Frequência
"""

import json
import random
from collections import Counter
from itertools import combinations

# ==================== CONFIGURAÇÃO ====================
TOTAL_NUMEROS = 90
PICK_SIZE = 5
JANELA_TREINO = 200  # Últimos N sorteios para treino

JSON_PATH = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"

# ==================== FUNÇÕES KAZOLA (replicam o site) ====================

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

def metodo_kazola(dados_anteriores):
    """
    Método Kazola v2.2 (replicado do site)
    Baseado em: gap (sorteios desde última aparição) + filtros físicos
    """
    if len(dados_anteriores) < 50:
        return []
    
    # Calcula gaps
    ultima = {}
    for idx, s in enumerate(dados_anteriores):
        for n in s['numeros']:
            ultima[n] = idx
    total = len(dados_anteriores)
    gaps = {}
    for n in range(1, TOTAL_NUMEROS + 1):
        if n in ultima:
            gaps[n] = total - 1 - ultima[n]
        else:
            gaps[n] = total
    
    # Score baseado no gap (quanto maior o gap, maior o score)
    scores = {}
    for n in range(1, TOTAL_NUMEROS + 1):
        g = gaps.get(n, 0)
        if g > 60:
            scores[n] = 1.0
        elif g > 40:
            scores[n] = 0.8
        elif g > 25:
            scores[n] = 0.5
        elif g > 15:
            scores[n] = 0.3
        else:
            scores[n] = 0
    
    # Seleciona top 30
    candidatos = sorted(scores.items(), key=lambda x: -x[1])[:30]
    candidatos_nums = [n for n, _ in candidatos if scores[n] > 0]
    
    if len(candidatos_nums) < 5:
        return []
    
    # Gera combinações com filtros
    linhas = []
    for comb in combinations(candidatos_nums, 5):
        soma = sum(comb)
        if not (180 <= soma <= 320):
            continue
        pares = sum(1 for x in comb if x % 2 == 0)
        if not (1 <= pares <= 4):
            continue
        linhas.append(comb)
        if len(linhas) >= 5:
            break
    
    return linhas

def metodo_aleatorio():
    """Gera 5 combinações aleatórias"""
    return [sorted(random.sample(range(1, 91), 5)) for _ in range(5)]

def metodo_frequencia(dados_anteriores):
    """Usa números mais frequentes no histórico"""
    if len(dados_anteriores) < 50:
        return metodo_aleatorio()
    
    freq = Counter()
    for s in dados_anteriores:
        for n in s['numeros']:
            freq[n] += 1
    
    mais_frequentes = [n for n, _ in freq.most_common(30)]
    random.shuffle(mais_frequentes)
    
    linhas = []
    for i in range(0, min(25, len(mais_frequentes)), 5):
        if i+5 <= len(mais_frequentes):
            linhas.append(sorted(mais_frequentes[i:i+5]))
        if len(linhas) >= 5:
            break
    
    return linhas if linhas else metodo_aleatorio()


def benchmark():
    """Executa benchmark com walk-forward validation"""
    print("\n" + "=" * 70)
    print("🔬 BENCHMARK DEFINITIVO — MÉTODO KAZOLA vs ALEATÓRIO vs FREQUÊNCIA")
    print("   Walk-forward: cada sorteio usa apenas dados anteriores")
    print("=" * 70)
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"\n✅ {len(sorteios)} sorteios carregados")
    print(f"   Período: {sorteios[0]['data_str']} → {sorteios[-1]['data_str']}")
    
    # Parâmetros
    JANELA_MINIMA = 100
    NUM_COMBINACOES = 5
    
    # Para cada sessão
    sessoes = ['fezada', 'aqueceu', 'kazola', 'eskebra']
    resultados = {}
    
    for sessao in sessoes:
        print(f"\n📊 {sessao.upper()}:")
        
        # Filtra sorteios da sessão
        sorteios_sessao = [s for s in sorteios if s['sessao'] == sessao]
        
        if len(sorteios_sessao) < JANELA_MINIMA + 10:
            print(f"   Dados insuficientes: {len(sorteios_sessao)}")
            continue
        
        # Estatísticas
        acertos_kazola = 0
        acertos_aleatorio = 0
        acertos_frequencia = 0
        total_testes = 0
        
        # Lista para média de acertos
        media_kazola = []
        media_aleatorio = []
        media_frequencia = []
        
        # Walk-forward
        for i in range(JANELA_MINIMA, len(sorteios_sessao)):
            # Dados anteriores (apenas até i-1)
            dados_anteriores = sorteios_sessao[:i]
            
            # Sorteio atual (o que vamos prever)
            sorteio_atual = sorteios_sessao[i]
            numeros_reais = set(sorteio_atual['numeros'])
            
            # Gera combinações com cada método
            comb_kazola = metodo_kazola(dados_anteriores)
            comb_aleatorio = metodo_aleatorio()
            comb_frequencia = metodo_frequencia(dados_anteriores)
            
            # Testa Kazola
            if comb_kazola:
                max_acertos = 0
                for comb in comb_kazola[:NUM_COMBINACOES]:
                    acertos = len(set(comb) & numeros_reais)
                    max_acertos = max(max_acertos, acertos)
                if max_acertos >= 2:
                    acertos_kazola += 1
                media_kazola.append(max_acertos)
            
            # Testa Aleatório
            if comb_aleatorio:
                max_acertos = 0
                for comb in comb_aleatorio[:NUM_COMBINACOES]:
                    acertos = len(set(comb) & numeros_reais)
                    max_acertos = max(max_acertos, acertos)
                if max_acertos >= 2:
                    acertos_aleatorio += 1
                media_aleatorio.append(max_acertos)
            
            # Testa Frequência
            if comb_frequencia:
                max_acertos = 0
                for comb in comb_frequencia[:NUM_COMBINACOES]:
                    acertos = len(set(comb) & numeros_reais)
                    max_acertos = max(max_acertos, acertos)
                if max_acertos >= 2:
                    acertos_frequencia += 1
                media_frequencia.append(max_acertos)
            
            total_testes += 1
            
            # Progresso
            if total_testes % 50 == 0:
                print(f"   ... {total_testes} testes realizados")
        
        # Resultados finais da sessão
        if total_testes > 0:
            taxa_kazola = acertos_kazola / total_testes * 100
            taxa_aleatorio = acertos_aleatorio / total_testes * 100
            taxa_frequencia = acertos_frequencia / total_testes * 100
            
            media_k = sum(media_kazola) / len(media_kazola) if media_kazola else 0
            media_a = sum(media_aleatorio) / len(media_aleatorio) if media_aleatorio else 0
            media_f = sum(media_frequencia) / len(media_frequencia) if media_frequencia else 0
            
            print(f"\n   ✅ Testes: {total_testes}")
            print(f"   🎲 Aleatório:     {taxa_aleatorio:.1f}% (média acertos: {media_a:.2f})")
            print(f"   📊 Frequência:   {taxa_frequencia:.1f}% (média acertos: {media_f:.2f})")
            print(f"   🔬 Kazola:       {taxa_kazola:.1f}% (média acertos: {media_k:.2f})")
            
            # Determina vencedor
            if taxa_kazola > taxa_aleatorio and taxa_kazola > taxa_frequencia:
                print(f"   🏆 VENCEDOR: KAZOLA (+{taxa_kazola - taxa_aleatorio:.1f} pts vs aleatório)")
            elif taxa_frequencia > taxa_aleatorio:
                print(f"   🏆 VENCEDOR: FREQUÊNCIA (+{taxa_frequencia - taxa_aleatorio:.1f} pts vs aleatório)")
            else:
                print(f"   ⚠️ NENHUMA VANTAGEM SIGNIFICATIVA")
            
            resultados[sessao] = {
                'total': total_testes,
                'kazola': taxa_kazola,
                'aleatorio': taxa_aleatorio,
                'frequencia': taxa_frequencia,
                'media_kazola': media_k,
                'media_aleatorio': media_a
            }
    
    # Resumo final
    print("\n" + "=" * 70)
    print("📋 RESUMO FINAL")
    print("=" * 70)
    
    for sessao, res in resultados.items():
        vantagem = res['kazola'] - res['aleatorio']
        status = "✅" if vantagem > 2 else ("⚠️" if vantagem > 0 else "❌")
        print(f"   {status} {sessao.upper()}: Kazola={res['kazola']:.1f}% | Aleatório={res['aleatorio']:.1f}% | Vantagem={vantagem:+.1f}%")
    
    print("\n" + "=" * 70)
    print("  CONCLUSÃO:")
    print("  Este benchmark replica fielmente o Método Kazola do site")
    print("  e compara com estratégias alternativas.")
    print("=" * 70)


if __name__ == "__main__":
    benchmark()
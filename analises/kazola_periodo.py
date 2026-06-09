"""
MÉTODO KAZOLA — VALIDAÇÃO EM PERÍODO ESPECÍFICO
20/01/2025 a 01/05/2026
"""

import json
from collections import Counter
from itertools import combinations
from datetime import datetime

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
                hora_raw = draw.get('hour', '')
                hora = hora_raw.replace('H00', ':00') if hora_raw else '00:00'
                
                sorteios.append({
                    'sessao': parse_sessao(draw.get('name', '')),
                    'numeros': sorted(nums),
                    'data_str': data_str,
                    'data_key': data_key,
                    'hora': hora
                })
    
    sorteios.sort(key=lambda x: (x['data_key'] or '0000-00-00', x['hora']))
    return sorteios

def calcular_gaps(sorteios_ate_data):
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

def calcular_gap_score(gaps, n):
    g = gaps.get(n, 0)
    if g > 60:
        return 1.0
    if g > 40:
        return 0.8
    if g > 25:
        return 0.5
    if g > 15:
        return 0.3
    return 0

def testar_sessao_no_periodo(sorteios, sessao_alvo, data_inicio, data_fim):
    """Testa o método para uma sessão num período específico"""
    
    # Filtra apenas a sessão alvo
    dados_sessao = [s for s in sorteios if s['sessao'] == sessao_alvo]
    
    # Filtra pelo período
    dados_periodo = []
    for s in dados_sessao:
        if s['data_key'] and data_inicio <= s['data_key'] <= data_fim:
            dados_periodo.append(s)
    
    if len(dados_periodo) < 30:
        return None, f"Apenas {len(dados_periodo)} sorteios no período"
    
    # Para cada sorteio no período, usa dados ANTERIORES
    resultados = []
    
    for i, sorteio_alvo in enumerate(dados_periodo):
        # Encontra índice no array original
        idx_global = None
        for idx, s in enumerate(sorteios):
            if s is sorteio_alvo:
                idx_global = idx
                break
        
        if idx_global is None or idx_global < 100:
            continue
        
        # Dados anteriores (apenas da mesma sessão e antes da data)
        dados_anteriores = [s for s in sorteios[:idx_global] if s['sessao'] == sessao_alvo]
        
        if len(dados_anteriores) < 50:
            continue
        
        gaps, _ = calcular_gaps(dados_anteriores)
        
        scores = {}
        for n in range(1, TOTAL_NUMEROS + 1):
            scores[n] = calcular_gap_score(gaps, n) * 100
        
        candidatos = sorted(scores.items(), key=lambda x: -x[1])[:30]
        candidatos_nums = [n for n, _ in candidatos if scores[n] > 0]
        
        if len(candidatos_nums) < 5:
            continue
        
        max_acertos = 0
        for comb in combinations(candidatos_nums, 5):
            soma = sum(comb)
            if not (180 <= soma <= 320):
                continue
            pares = sum(1 for x in comb if x % 2 == 0)
            if not (1 <= pares <= 4):
                continue
            
            acertos = len(set(comb) & set(sorteio_alvo['numeros']))
            if acertos > max_acertos:
                max_acertos = acertos
                if max_acertos >= 3:
                    break
        
        resultados.append({
            'data': sorteio_alvo['data_str'],
            'numeros_reais': sorteio_alvo['numeros'],
            'max_acertos': max_acertos,
            'acertou_2': max_acertos >= 2
        })
    
    if not resultados:
        return None, "Nenhum teste válido"
    
    total = len(resultados)
    acertos_2 = sum(1 for r in resultados if r['acertou_2'])
    acertos_3 = sum(1 for r in resultados if r['max_acertos'] >= 3)
    acertos_4 = sum(1 for r in resultados if r['max_acertos'] >= 4)
    acertos_5 = sum(1 for r in resultados if r['max_acertos'] >= 5)
    
    return {
        'sessao': sessao_alvo,
        'total': total,
        'acertos_2': acertos_2,
        'taxa_2': acertos_2 / total * 100,
        'acertos_3': acertos_3,
        'taxa_3': acertos_3 / total * 100,
        'acertos_4': acertos_4,
        'acertos_5': acertos_5,
        'resultados': resultados
    }, None


def main():
    print("\n🔬 MÉTODO KAZOLA — VALIDAÇÃO EM PERÍODO ESPECÍFICO")
    print("   20 de Janeiro de 2025 a 1 de Maio de 2026")
    print("=" * 70)
    
    # Datas do período (formato YYYY-MM-DD)
    DATA_INICIO = "2025-01-20"
    DATA_FIM = "2026-05-01"
    
    print(f"\n📅 Período: {DATA_INICIO} → {DATA_FIM}")
    
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    
    sorteios = processar_sorteios(raw)
    print(f"✅ {len(sorteios)} sorteios carregados e ordenados")
    
    sessoes = ['fezada', 'aqueceu', 'kazola', 'eskebra']
    resultados_geral = []
    
    print("\n📊 TESTANDO CADA SESSÃO...")
    print("-" * 70)
    
    for sessao in sessoes:
        resultado, erro = testar_sessao_no_periodo(sorteios, sessao, DATA_INICIO, DATA_FIM)
        
        if resultado:
            resultados_geral.append(resultado)
            print(f"\n   📍 {sessao.upper()}:")
            print(f"      Sorteios no período: {resultado['total']}")
            print(f"      Acertos ≥2: {resultado['acertos_2']} ({resultado['taxa_2']:.1f}%)")
            print(f"      Acertos ≥3: {resultado['acertos_3']} ({resultado['taxa_3']:.1f}%)")
            print(f"      Acertos ≥4: {resultado['acertos_4']}")
            print(f"      Acertos 5: {resultado['acertos_5']}")
        else:
            print(f"\n   📍 {sessao.upper()}: {erro}")
    
    # Ranking
    print("\n" + "=" * 70)
    print("🏆 RANKING NO PERÍODO")
    print("=" * 70)
    
    ranking = sorted(resultados_geral, key=lambda x: -x['taxa_2'])
    
    for i, r in enumerate(ranking, 1):
        estrela = "🥇" if i == 1 else ("🥈" if i == 2 else ("🥉" if i == 3 else "  "))
        print(f"   {estrela} {r['sessao'].upper()}: {r['taxa_2']:.1f}% ({r['acertos_2']}/{r['total']})")
    
    # Aleatório esperado
    print("\n" + "-" * 70)
    print(f"   🎲 Aleatório puro (esperado): ~5.4%")
    print(f"   📊 Melhor sessão: {ranking[0]['sessao'].upper()} com {ranking[0]['taxa_2']:.1f}%")
    
    # Mostra detalhes da melhor sessão
    melhor = ranking[0]
    print(f"\n📋 DETALHES DA MELHOR SESSÃO ({melhor['sessao'].upper()})")
    print("-" * 70)
    
    # Mostra últimos 10 testes
    print("\n   Últimos 10 testes no período:")
    for r in melhor['resultados'][-10:]:
        status = "✅" if r['acertou_2'] else "❌"
        print(f"      {status} {r['data']}: {r['numeros_reais']} → acertos={r['max_acertos']}")
    
    print("\n" + "=" * 70)
    print("  CONCLUSÃO:")
    print(f"  Melhor sessão: {melhor['sessao'].upper()}")
    print(f"  Taxa de acerto: {melhor['taxa_2']:.1f}%")
    print(f"  vs Aleatório: +{(melhor['taxa_2'] - 5.4):.1f} pontos percentuais")
    print("=" * 70)


if __name__ == "__main__":
    main()
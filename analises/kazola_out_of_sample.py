"""
EXTRATOR COMPLETO — Busca todas as páginas da API
"""

import requests
import json
import os
import time
from datetime import datetime

# ==================== CONFIGURAÇÃO ====================
PROJETO_DIR = r"C:\Users\HP\kazola-glow-lotaria"
JSON_ORIGEM = os.path.join(PROJETO_DIR, "src", "data", "historico_completo.json")

BASE_URL = "https://api.mtjogos.co.ao/api/daily-lottery-results"

def extrair_todos_sorteios():
    """Busca TODAS as páginas da API até não haver mais dados"""
    
    print(f"\n🔄 Iniciando extração completa...")
    
    todos_sorteios = []
    pagina = 1
    limite = 100  # Aumentado para 100 por página
    
    while True:
        url = f"{BASE_URL}?page={pagina}&limit={limite}"
        print(f"   Buscando página {pagina}...", end=" ")
        
        try:
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                dados = response.json()
                resultados = dados.get('data', [])
                
                if not resultados:
                    print(f"sem resultados. Fim da busca.")
                    break
                
                print(f"{len(resultados)} registos")
                todos_sorteios.extend(resultados)
                pagina += 1
                time.sleep(0.5)  # Pequena pausa para não sobrecarregar a API
            else:
                print(f"erro {response.status_code}")
                break
                
        except Exception as e:
            print(f"erro: {e}")
            break
    
    print(f"\n✅ Total de registos encontrados: {len(todos_sorteios)}")
    
    if todos_sorteios:
        # Garantir que a pasta existe
        os.makedirs(os.path.dirname(JSON_ORIGEM), exist_ok=True)
        
        # Guardar JSON
        with open(JSON_ORIGEM, "w", encoding="utf-8") as f:
            json.dump(todos_sorteios, f, indent=4, ensure_ascii=False)
        
        print(f"✅ Ficheiro guardado em: {JSON_ORIGEM}")
        
        # Mostra últimas datas
        ultimos = []
        for grupo in todos_sorteios[-10:]:
            data = grupo.get('formatedDate', 'sem data')
            resultados = len(grupo.get('results', []))
            ultimos.append(f"{data} ({resultados} sorteios)")
        
        print(f"\n📅 Últimos registos:")
        for item in ultimos[-5:]:
            print(f"   {item}")
        
        return todos_sorteios
    else:
        print("❌ Nenhum dado encontrado")
        return None


def main():
    print("=" * 50)
    print("📡 EXTRATOR COMPLETO - LOTARIA NACIONAL")
    print("   Busca TODOS os sorteios disponíveis na API")
    print("=" * 50)
    
    sorteios = extrair_todos_sorteios()
    
    if sorteios:
        # Conta total de sorteios individuais
        total_sorteios = 0
        for grupo in sorteios:
            total_sorteios += len(grupo.get('results', []))
        
        print(f"\n📊 RESUMO:")
        print(f"   Grupos/dias: {len(sorteios)}")
        print(f"   Sorteios individuais: {total_sorteios}")
    
    print("\n✅ Extração concluída!")


if __name__ == "__main__":
    main()
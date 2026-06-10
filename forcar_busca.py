import requests
import json
import time
import os

print("=" * 50)
print("🔍 FORÇANDO BUSCA COMPLETA DA API")
print("=" * 50)

base_url = "https://api.mtjogos.co.ao/api/daily-lottery-results"
historico_total = []
pagina = 1

while True:
    url = f"{base_url}?page={pagina}&limit=50"
    try:
        print(f"📄 Buscando página {pagina}...")
        response = requests.get(url, timeout=60)
        
        if response.status_code != 200:
            print(f"   ⚠️ HTTP {response.status_code} - parando")
            break
            
        dados = response.json()
        
        if not dados.get('data') or len(dados['data']) == 0:
            print(f"   📄 Página {pagina} vazia - parando")
            break
            
        historico_total.extend(dados['data'])
        print(f"   ✅ +{len(dados['data'])} registos (total: {len(historico_total)})")
        
        pagina += 1
        time.sleep(0.5)
        
    except Exception as e:
        print(f"   ❌ Erro na página {pagina}: {e}")
        print(f"   Continuando para próxima página...")
        pagina += 1
        time.sleep(1)
        
        # Se já tivermos muitos registos e erro, paramos
        if pagina > 25:
            break

print("=" * 50)
print(f"📊 TOTAL: {len(historico_total)} registos")
print("=" * 50)

# Salvar o ficheiro
caminho = r"C:\Users\HP\kazola-glow-lotaria\src\data\historico_completo.json"
with open(caminho, 'w', encoding='utf-8') as f:
    json.dump(historico_total, f, indent=4, ensure_ascii=False)

print(f"✅ Ficheiro salvo: {caminho}")
print(f"📁 Tamanho: {os.path.getsize(caminho)} bytes")

# Contar sorteios de hoje
hoje = "2026-06-10"
sorteios_hoje = 0
for item in historico_total:
    if item.get('date', '').startswith(hoje):
        sorteios_hoje += len(item.get('results', []))
print(f"📅 Sorteios de hoje ({hoje}): {sorteios_hoje}")
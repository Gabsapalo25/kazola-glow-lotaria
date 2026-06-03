import requests
import json
import time
import os

base_url = "https://api.mtjogos.co.ao/api/daily-lottery-results"
historico_total = []

# Criar a pasta src/data se não existir (NOVO - só adiciona, não altera o resto)
os.makedirs("src/data", exist_ok=True)

# O JSON indicou que existem 17 páginas no total
for pagina in range(1, 18): 
    print(f"Extraindo página {pagina}...")
    url = f"{base_url}?page={pagina}&limit=28"
    response = requests.get(url)
    
    if response.status_code == 200:
        dados = response.json()
        # Adiciona os resultados desta página à lista total
        historico_total.extend(dados['data'])
    else:
        print(f"Erro na página {pagina}")
    
    # Pausa de 0.5s para não sobrecarregar o servidor
    time.sleep(0.5)

# Salva o histórico completo DIRETAMENTE na pasta correta (ÚNICA MUDANÇA)
with open("src/data/historico_completo.json", "w", encoding="utf-8") as f:
    json.dump(historico_total, f, indent=4)

print("Extração concluída! 'src/data/historico_completo.json' criado com todos os dados.")
input("Pressione Enter para sair...")
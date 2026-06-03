import requests
import json
import time
import os
from datetime import datetime

# Configuração
BASE_URL = "https://api.mtjogos.co.ao/api/daily-lottery-results"
DATA_FILE = "src/data/historico_completo.json"
LOG_FILE = "logs/extracao_log.txt"

def log_message(msg):
    """Regista mensagens com timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {msg}"
    print(log_entry)
    
    # Escreve no ficheiro de log
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_entry + "\n")

def extrair_todos_os_dados():
    """Extrai todas as páginas da API"""
    historico_total = []
    total_paginas = 17  # Conforme verificado
    
    for pagina in range(1, total_paginas + 1):
        log_message(f"📡 Extraindo página {pagina}/{total_paginas}...")
        url = f"{BASE_URL}?page={pagina}&limit=28"
        
        try:
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                dados = response.json()
                if 'data' in dados and dados['data']:
                    historico_total.extend(dados['data'])
                    log_message(f"✅ Página {pagina}: {len(dados['data'])} registos obtidos")
                else:
                    log_message(f"⚠️ Página {pagina}: sem dados")
            else:
                log_message(f"❌ Erro na página {pagina}: HTTP {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            log_message(f"❌ Erro de conexão na página {pagina}: {str(e)}")
        
        # Pausa para não sobrecarregar o servidor
        time.sleep(0.5)
    
    return historico_total

def main():
    log_message("=" * 60)
    log_message("🚀 INICIANDO EXTRAÇÃO DE DADOS DA LOTARIA NACIONAL")
    log_message(f"🕒 Hora da execução: {datetime.now().strftime('%H:%M:%S')}")
    log_message("=" * 60)
    
    # Coletar dados
    raw_data = extrair_todos_os_dados()
    
    if not raw_data:
        log_message("❌ Nenhum dado foi coletado!")
        return False
    
    log_message(f"✅ Total de registos brutos coletados: {len(raw_data)}")
    
    # Criar diretório se não existir
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    
    # Salvar ficheiro JSON
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(raw_data, f, indent=4, ensure_ascii=False)
    
    log_message(f"💾 Dados salvos em: {DATA_FILE}")
    log_message(f"📊 Tamanho do ficheiro: {os.path.getsize(DATA_FILE)} bytes")
    log_message("=" * 60)
    log_message("✅ EXTRAÇÃO CONCLUÍDA COM SUCESSO")
    log_message("=" * 60)
    
    return True

if __name__ == "__main__":
    main()
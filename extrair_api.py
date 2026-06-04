import schedule
import time
import threading
import requests
import json
import os

def extrair():
    """Executa a extração dos dados da API"""
    print(f"\n🔄 Executando extração às {time.strftime('%H:%M:%S')}")
    
    base_url = "https://api.mtjogos.co.ao/api/daily-lottery-results"
    historico_total = []
    
    os.makedirs("src/data", exist_ok=True)
    
    for pagina in range(1, 18):
        url = f"{base_url}?page={pagina}&limit=28"
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                dados = response.json()
                historico_total.extend(dados['data'])
            else:
                print(f"Erro na página {pagina}: {response.status_code}")
        except Exception as e:
            print(f"Erro na página {pagina}: {e}")
        time.sleep(0.5)
    
    if historico_total:
        with open("src/data/historico_completo.json", "w", encoding="utf-8") as f:
            json.dump(historico_total, f, indent=4)
        print(f"✅ Extração concluída! {len(historico_total)} registos guardados.")
    else:
        print("❌ Nenhum dado foi extraído.")

# ==================== CONFIGURAÇÃO DOS HORÁRIOS ====================

# 1. Horários dos sorteios (12 horários)
horarios_sorteios = [
    "10:05", "10:10", "10:20",
    "13:05", "13:10", "13:20",
    "16:05", "16:10", "16:20",
    "19:05", "19:10", "19:20"
]

# 2. Horários extras (4 horários)
horarios_extras = [
    "00:00",   # meia-noite
    "06:00",   # 6 da manhã
    "09:00",   # 9 da manhã
    "20:00"    # 20 horas
]

# Combinar todos os horários
todos_horarios = list(set(horarios_sorteios + horarios_extras))
todos_horarios.sort()

print("=" * 50)
print("📅 CONFIGURAÇÃO DO SCHEDULER")
print("=" * 50)

print("\n📍 Horários dos sorteios (12):")
for h in horarios_sorteios:
    print(f"   ⏰ {h}")

print("\n📍 Horários extras (4):")
for h in horarios_extras:
    print(f"   ⏰ {h}")

print(f"\n📍 Total de horários: {len(todos_horarios)}")

# Agendar todos os horários
for horario in todos_horarios:
    schedule.every().day.at(horario).do(extrair)
    print(f"✅ Agendado: {horario}")

# Executar uma vez ao iniciar
print("\n" + "=" * 50)
print("🟢 Executando primeira extração...")
print("=" * 50)
extrair()

print("\n🟢 Scheduler iniciado. Aguardando horários...\n")

def run_scheduler():
    while True:
        schedule.run_pending()
        time.sleep(60)

# Rodar em thread separada
thread = threading.Thread(target=run_scheduler, daemon=True)
thread.start()

# Manter o script vivo
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n⏹️ Scheduler interrompido.")
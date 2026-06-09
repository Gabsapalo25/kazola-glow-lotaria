import schedule
import time
import threading
import requests
import json
import os
import subprocess
from datetime import datetime

# ==================== CONFIGURAÇÃO DOS CAMINHOS ====================
PROJETO_DIR = r"C:\Users\HP\kazola-glow-lotaria"
REPO_DIR = os.path.join(PROJETO_DIR, "kazola-dados")
JSON_ORIGEM = os.path.join(PROJETO_DIR, "src", "data", "historico_completo.json")
JSON_DESTINO = os.path.join(REPO_DIR, "historico_completo.json")

# ==================== CONFIGURAÇÃO JSDELIVR ====================
GITHUB_USER = "Gabsapalo25"
GITHUB_REPO = "kazola-dados"
FILE_PATH = "historico_completo.json"

def executar_comando(cmd, cwd):
    try:
        result = subprocess.run(
            cmd, cwd=cwd, shell=True,
            capture_output=True, text=True, timeout=30
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def purge_jsdelivr():
    """Força o jsDelivr a limpar o cache após push para GitHub"""
    url = f"https://purge.jsdelivr.net/gh/{GITHUB_USER}/{GITHUB_REPO}@main/{FILE_PATH}"
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            print("   ✅ jsDelivr cache limpo com sucesso!")
        else:
            print(f"   ⚠️ jsDelivr purge status: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️ Erro no purge jsDelivr: {e}")

def git_commit_and_push():
    print("📤 A enviar para o GitHub...")

    try:
        import shutil
        shutil.copy2(JSON_ORIGEM, JSON_DESTINO)
        print(f"   ✅ Ficheiro copiado: {JSON_ORIGEM} → {JSON_DESTINO}")
    except Exception as e:
        print(f"   ❌ Erro ao copiar ficheiro: {e}")
        return False

    sucesso, stdout, stderr = executar_comando("git add historico_completo.json", REPO_DIR)
    if not sucesso:
        print(f"   ❌ Erro no git add: {stderr}")
        return False
    print("   ✅ git add OK")

    data_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mensagem = f"🔄 Actualização automática: {data_hora}"
    sucesso, stdout, stderr = executar_comando(f'git commit -m "{mensagem}"', REPO_DIR)
    if not sucesso:
        if "nothing to commit" in stderr or "nothing to commit" in stdout:
            print("   ℹ️ Nenhuma alteração para commit")
            return True
        else:
            print(f"   ❌ Erro no git commit: {stderr}")
            return False
    print(f"   ✅ git commit OK: {mensagem}")

    sucesso, stdout, stderr = executar_comando("git push", REPO_DIR)
    if not sucesso:
        print(f"   ❌ Erro no git push: {stderr}")
        return False
    print("   ✅ git push OK")

    return True

def extrair():
    print(f"\n🔄 Executando extração às {time.strftime('%H:%M:%S')}")

    base_url = "https://api.mtjogos.co.ao/api/daily-lottery-results"
    historico_total = []

    os.makedirs(os.path.dirname(JSON_ORIGEM), exist_ok=True)

    for pagina in range(1, 18):
        url = f"{base_url}?page={pagina}&limit=28"
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                dados = response.json()
                historico_total.extend(dados['data'])
            else:
                print(f"   ⚠️ Erro na página {pagina}: {response.status_code}")
        except Exception as e:
            print(f"   ⚠️ Erro na página {pagina}: {e}")
        time.sleep(0.5)

    if historico_total:
        with open(JSON_ORIGEM, "w", encoding="utf-8") as f:
            json.dump(historico_total, f, indent=4)
        print(f"✅ Extração concluída! {len(historico_total)} registos guardados.")

        # Push para GitHub + limpar cache jsDelivr
        if git_commit_and_push():
            purge_jsdelivr()
    else:
        print("❌ Nenhum dado foi extraído.")

# ==================== HORÁRIOS ====================
horarios_sorteios = [
    "10:05", "10:10", "10:20",
    "13:05", "13:10", "13:20",
    "16:05", "16:10", "16:20",
    "19:05", "19:10", "19:20"
]

horarios_extras = [
    "00:00",
    "06:00",
    "09:00",
    "20:00"
]

todos_horarios = sorted(set(horarios_sorteios + horarios_extras))

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
print(f"\n🌐 jsDelivr purge: Gabsapalo25/kazola-dados")

for horario in todos_horarios:
    schedule.every().day.at(horario).do(extrair)
    print(f"✅ Agendado: {horario}")

print("\n" + "=" * 50)
print("🟢 Executando primeira extração...")
print("=" * 50)
extrair()

print("\n🟢 Scheduler iniciado. Aguardando horários...\n")

def run_scheduler():
    while True:
        schedule.run_pending()
        time.sleep(60)

thread = threading.Thread(target=run_scheduler, daemon=True)
thread.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n⏹️ Scheduler interrompido.")
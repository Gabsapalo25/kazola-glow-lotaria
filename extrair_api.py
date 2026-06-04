import schedule
import time
import threading
import requests
import json
import os
import subprocess
from datetime import datetime

# ==================== CONFIGURAÇÃO DOS CAMINHOS ====================
# Caminho absoluto do projeto principal (onde está o extrair_api.py)
PROJETO_DIR = r"C:\Users\HP\kazola-glow-lotaria"
# Caminho absoluto do repositório clonado (kazola-dados)
REPO_DIR = os.path.join(PROJETO_DIR, "kazola-dados")
# Caminho do ficheiro JSON original
JSON_ORIGEM = os.path.join(PROJETO_DIR, "src", "data", "historico_completo.json")
# Caminho do ficheiro JSON no repositório
JSON_DESTINO = os.path.join(REPO_DIR, "historico_completo.json")

def executar_comando(cmd, cwd):
    """Executa um comando no shell e retorna (sucesso, output, erro)"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def git_commit_and_push():
    """Faz commit e push do historico_completo.json para o repositório"""
    print("📤 A enviar para o GitHub...")
    
    # 1. Copiar o JSON atualizado para a pasta do repositório
    try:
        import shutil
        shutil.copy2(JSON_ORIGEM, JSON_DESTINO)
        print(f"   ✅ Ficheiro copiado: {JSON_ORIGEM} → {JSON_DESTINO}")
    except Exception as e:
        print(f"   ❌ Erro ao copiar ficheiro: {e}")
        return False
    
    # 2. git add
    sucesso, stdout, stderr = executar_comando("git add historico_completo.json", REPO_DIR)
    if not sucesso:
        print(f"   ❌ Erro no git add: {stderr}")
        return False
    print("   ✅ git add OK")
    
    # 3. git commit (com data e hora)
    data_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mensagem = f"🔄 Actualização automática: {data_hora}"
    sucesso, stdout, stderr = executar_comando(f'git commit -m "{mensagem}"', REPO_DIR)
    if not sucesso:
        # Se não há nada para commitar (sem alterações), não é erro
        if "nothing to commit" in stderr or "nothing to commit" in stdout:
            print("   ℹ️ Nenhuma alteração para commit")
        else:
            print(f"   ❌ Erro no git commit: {stderr}")
            return False
    else:
        print(f"   ✅ git commit OK: {mensagem}")
    
    # 4. git push
    sucesso, stdout, stderr = executar_comando("git push", REPO_DIR)
    if not sucesso:
        print(f"   ❌ Erro no git push: {stderr}")
        return False
    print("   ✅ git push OK")
    
    return True

def extrair():
    """Executa a extração dos dados da API e guarda no JSON + Git"""
    print(f"\n🔄 Executando extração às {time.strftime('%H:%M:%S')}")
    
    base_url = "https://api.mtjogos.co.ao/api/daily-lottery-results"
    historico_total = []
    
    # Garantir que a pasta src/data existe
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
        # Guardar JSON
        with open(JSON_ORIGEM, "w", encoding="utf-8") as f:
            json.dump(historico_total, f, indent=4)
        print(f"✅ Extração concluída! {len(historico_total)} registos guardados em {JSON_ORIGEM}")
        
        # Enviar para o GitHub
        git_commit_and_push()
    else:
        print("❌ Nenhum dado foi extraído.")

# ==================== CONFIGURAÇÃO DOS HORÁRIOS ====================
# Horários dos sorteios (12 horários)
horarios_sorteios = [
    "10:05", "10:10", "10:20",
    "13:05", "13:10", "13:20",
    "16:05", "16:10", "16:20",
    "19:05", "19:10", "19:20"
]

# Horários extras (4 horários)
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
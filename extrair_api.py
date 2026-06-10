import time
import threading
import requests
import json
import os
import subprocess
import shutil
import schedule
from datetime import datetime

# ==================== CONFIGURAÇÃO ====================
PROJETO_DIR    = r"C:\Users\HP\kazola-glow-lotaria"
REPO_DIR       = os.path.join(PROJETO_DIR, "kazola-dados")
JSON_ORIGEM    = os.path.join(PROJETO_DIR, "src", "data", "historico_completo.json")
JSON_DESTINO   = os.path.join(REPO_DIR, "historico_completo.json")
API_URL        = "https://api.mtjogos.co.ao/api/daily-lottery-results"
GITHUB_USER    = "Gabsapalo25"
GITHUB_REPO    = "kazola-dados"
LIMIT_POR_PAG  = 50   # registos por pedido
MAX_PAGINAS    = 30   # tecto de segurança

# ==================== GIT + JSDELIVR ====================

def executar_comando(cmd, cwd):
    try:
        result = subprocess.run(
            cmd, cwd=cwd, shell=True,
            capture_output=True, text=True, timeout=60
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def purge_jsdelivr():
    url = f"https://purge.jsdelivr.net/gh/{GITHUB_USER}/{GITHUB_REPO}@main/historico_completo.json"
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            print("   ✅ jsDelivr cache limpo!")
        else:
            print(f"   ⚠️ jsDelivr purge: HTTP {r.status_code}")
    except Exception as e:
        print(f"   ⚠️ jsDelivr purge falhou: {e}")

def git_push():
    print("📤 A enviar para GitHub...")

    try:
        shutil.copy2(JSON_ORIGEM, JSON_DESTINO)
        print(f"   ✅ Ficheiro copiado")
    except Exception as e:
        print(f"   ❌ Erro ao copiar: {e}")
        return False

    ok, _, err = executar_comando("git add historico_completo.json", REPO_DIR)
    if not ok:
        print(f"   ❌ git add: {err}")
        return False

    msg = f"🔄 Auto-update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    ok, out, err = executar_comando(f'git commit -m "{msg}"', REPO_DIR)
    if not ok:
        if "nothing to commit" in (out + err):
            print("   ℹ️ Nenhuma alteração para commit")
            return True
        print(f"   ❌ git commit: {err}")
        return False
    print(f"   ✅ git commit: {msg}")

    ok, _, err = executar_comando("git push origin main", REPO_DIR)
    if not ok:
        print(f"   ❌ git push: {err}")
        return False
    print("   ✅ git push OK")
    return True

# ==================== EXTRACÇÃO ====================

def extrair(motivo="agendado"):
    inicio = datetime.now()
    print(f"\n{'='*60}")
    print(f"⏰ [{inicio.strftime('%H:%M:%S')}] Extracção — motivo: {motivo}")
    print(f"{'='*60}")

    todos = []
    pagina = 1

    while pagina <= MAX_PAGINAS:
        url = f"{API_URL}?page={pagina}&limit={LIMIT_POR_PAG}"
        try:
            print(f"   📄 Página {pagina}...", end=" ", flush=True)
            r = requests.get(url, timeout=60)

            if r.status_code != 200:
                print(f"HTTP {r.status_code} — parando")
                break

            dados = r.json()
            registos = dados.get('data', [])

            if not registos:
                print("vazia — parando")
                break

            todos.extend(registos)
            print(f"+{len(registos)} (acumulado: {len(todos)})")
            pagina += 1
            time.sleep(0.3)

        except requests.exceptions.Timeout:
            print(f"TIMEOUT — a tentar novamente...")
            time.sleep(2)
            # Não incrementa página — tenta de novo
            continue
        except Exception as e:
            print(f"ERRO: {e} — parando")
            break

    if not todos:
        print("❌ Nenhum registo obtido da API.")
        print(f"{'='*60}\n")
        return False

    # Remover duplicatas por date (cada registo = 1 dia)
    vistos = set()
    sem_dup = []
    for item in todos:
        # A chave única é a data — cada registo representa um dia completo
        uid = item.get('date', '')[:10]
        if uid and uid not in vistos:
            vistos.add(uid)
            sem_dup.append(item)

    # Ordenar por data descendente
    sem_dup.sort(key=lambda x: x.get('date', ''), reverse=True)

    # Guardar
    os.makedirs(os.path.dirname(JSON_ORIGEM), exist_ok=True)
    with open(JSON_ORIGEM, 'w', encoding='utf-8') as f:
        json.dump(sem_dup, f, indent=4, ensure_ascii=False)

    # Contar sorteios de hoje correctamente (results dentro de cada dia)
    hoje = datetime.now().strftime("%Y-%m-%d")
    sorteios_hoje = sum(
        len(item.get('results', []))
        for item in sem_dup
        if item.get('date', '').startswith(hoje)
    )

    print(f"\n✅ {len(sem_dup)} registos guardados  |  hoje: {sorteios_hoje} sorteios")

    # Push + purge
    if git_push():
        purge_jsdelivr()
        cdn = f"https://cdn.jsdelivr.net/gh/{GITHUB_USER}/{GITHUB_REPO}@main/historico_completo.json"
        print(f"   🌐 {cdn}")

    duracao = (datetime.now() - inicio).seconds
    print(f"⏱️  Concluído em {duracao}s")
    print(f"{'='*60}\n")
    return True

# ==================== MENU PRINCIPAL ====================

def menu():
    print("\n" + "="*60)
    print("🎲  KAZOLA EXTRACTOR — VERSÃO DEFINITIVA")
    print("="*60)
    print(f"📁  Origem : {JSON_ORIGEM}")
    print(f"📁  Destino: {JSON_DESTINO}")
    print(f"🌐  API    : {API_URL}")
    print(f"👤  GitHub : {GITHUB_USER}/{GITHUB_REPO}")
    print("="*60)
    print("\nO que queres fazer?\n")
    print("  1 — Extrair AGORA (uma vez) e sair")
    print("  2 — Extrair AGORA e depois iniciar scheduler")
    print("  3 — Iniciar scheduler SEM extrair agora")
    print("  0 — Sair")
    print()

    while True:
        escolha = input("Escolha (0/1/2/3): ").strip()
        if escolha in ('0', '1', '2', '3'):
            return escolha
        print("   ⚠️  Opção inválida. Tenta novamente.")

# ==================== SCHEDULER ====================

def configurar_scheduler():
    horarios = sorted(set([
        "10:05", "10:10", "10:20",   # Fezada
        "13:05", "13:10", "13:20",   # Aqueceu
        "16:05", "16:10", "16:20",   # Kazola
        "19:05", "19:10", "19:20",   # Eskebra
        "00:00", "06:00", "09:00", "20:00",  # extras
    ]))

    print(f"\n📅 {len(horarios)} horários agendados:")
    for h in horarios:
        schedule.every().day.at(h).do(extrair, motivo="agendado")
        print(f"   ⏰ {h}")

def iniciar_scheduler():
    def loop():
        while True:
            schedule.run_pending()
            time.sleep(30)  # verifica a cada 30s para maior precisão

    t = threading.Thread(target=loop, daemon=True)
    t.start()
    print("\n🟢 Scheduler activo. Janela aberta = scheduler vivo.")
    print("   Pressiona CTRL+C para parar.\n")

    # Mostra countdown para próxima execução
    try:
        while True:
            proximo = schedule.next_run()
            if proximo:
                falta = int((proximo - datetime.now()).total_seconds())
                if falta > 0:
                    hh, mm = divmod(falta // 60, 60)
                    ss = falta % 60
                    print(f"\r   ⏳ Próxima extracção em {hh:02d}h {mm:02d}m {ss:02d}s", end="", flush=True)
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Scheduler interrompido pelo utilizador.")

# ==================== MAIN ====================

if __name__ == "__main__":
    escolha = menu()

    if escolha == '0':
        print("👋 Saindo.")

    elif escolha == '1':
        extrair(motivo="manual")

    elif escolha == '2':
        extrair(motivo="manual + arranque scheduler")
        configurar_scheduler()
        iniciar_scheduler()

    elif escolha == '3':
        configurar_scheduler()
        iniciar_scheduler()
#!/bin/bash
# scripts/agendar_cron.sh

PROJECT_PATH="/home/user/lotaria-analytics-pro"  # ALTERAR PARA O CAMINHO CORRETO
PYTHON_SCRIPT="$PROJECT_PATH/scripts/extrair_api.py"
LOG_CRON="$PROJECT_PATH/logs/cron_log.txt"

# Criar diretório de logs
mkdir -p "$PROJECT_PATH/logs"

# Remover entradas antigas do crontab
crontab -l 2>/dev/null | grep -v "extrair_api.py" | crontab -

# Adicionar novas entradas
(crontab -l 2>/dev/null; echo "5 10 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "20 10 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "5 13 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "20 13 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "5 16 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "20 16 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "5 19 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "10 19 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "20 19 * * * cd $PROJECT_PATH && python $PYTHON_SCRIPT >> $LOG_CRON 2>&1") | crontab -

echo "✅ Tarefas agendadas no cron"
echo "📋 Horários configurados:"
crontab -l | grep "extrair_api.py"
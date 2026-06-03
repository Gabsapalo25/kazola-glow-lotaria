# scripts/agendar_tarefas.ps1
# Executar como Administrador no PowerShell

$projectPath = "C:\Users\HP\lotaria-analytics-pro"
$pythonScript = "$projectPath\scripts\extrair_api.py"
$pythonExe = "python"  # ou caminho completo como "C:\Python39\python.exe"

# Função para criar tarefa agendada
function Create-ScheduledTask {
    param(
        [string]$TaskName,
        [string]$Time
    )
    
    $action = New-ScheduledTaskAction -Execute $pythonExe -Argument $pythonScript -WorkingDirectory $projectPath
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force
    
    Write-Host "✅ Tarefa criada: $TaskName às $Time"
}

# Remover tarefas antigas se existirem
$tarefasExistentes = @(
    "KazolaGlow_FetchData_1005", "KazolaGlow_FetchData_1020",
    "KazolaGlow_FetchData_1305", "KazolaGlow_FetchData_1320",
    "KazolaGlow_FetchData_1605", "KazolaGlow_FetchData_1620",
    "KazolaGlow_FetchData_1905", "KazolaGlow_FetchData_1910", "KazolaGlow_FetchData_1920"
)

foreach ($tarefa in $tarefasExistentes) {
    Unregister-ScheduledTask -TaskName $tarefa -Confirm:$false -ErrorAction SilentlyContinue
}

# Criar tarefas para cada horário
$horarios = @(
    "10:05", "10:20",
    "13:05", "13:20",
    "16:05", "16:20",
    "19:05", "19:10", "19:20"
)

foreach ($horario in $horarios) {
    $taskName = "KazolaGlow_FetchData_$($horario.Replace(':', ''))"
    Create-ScheduledTask -TaskName $taskName -Time $horario
}

Write-Host ""
Write-Host "🎯 Todas as tarefas foram criadas com sucesso!"
Write-Host "📋 Para verificar: Abra o 'Agendador de Tarefas' do Windows"
Write-Host "📁 Logs disponíveis em: $projectPath\logs\extracao_log.txt"
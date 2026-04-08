# Script para verificar o CI localmente (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "--- Iniciando Verificacao Local do CI ---" -ForegroundColor Cyan

function Run-Check {
    param (
        [string]$Name,
        [scriptblock]$Command
    )
    Write-Host "`n$Name..." -ForegroundColor Yellow
    & $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ $Name falhou! (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
        return $false
    }
    Write-Host "✅ $Name passou!" -ForegroundColor Green
    return $true
}

$AllPassed = $true

# 1. Verificar dependencias
if (!(Run-Check "Verificando dependencias" { py -3.12 -m pip install -r requirements.txt -r requirements-dev.txt -q })) { $AllPassed = $false }

# 2. Ruff Check (Linting)
if (!(Run-Check "Ruff Check (Linting)" { py -3.12 -m ruff check . })) { $AllPassed = $false }

# 3. Ruff Format (Estilo)
if (!(Run-Check "Ruff Format Check" { py -3.12 -m ruff format --check . })) { 
    Write-Host "DICA: Use 'py -3.12 -m ruff format .' para corrigir automaticamente." -ForegroundColor Gray
    $AllPassed = $false 
}

# 4. Mypy (Tipagem)
if (!(Run-Check "Mypy (Tipagem)" { py -3.12 -m mypy app/core app/casos_uso --ignore-missing-imports --explicit-package-bases })) { $AllPassed = $false }

# 5. Pytest (Testes)
if (!(Run-Check "Pytest (Testes)" { py -3.12 -m pytest })) { $AllPassed = $false }

Write-Host "`n--- Verificacao concluida ---" -ForegroundColor Cyan

if ($AllPassed) {
    Write-Host "✨ TUDO PASSOU! Pode subir os cambios com seguranca." -ForegroundColor Green
} else {
    Write-Host "⚠️  Alguns checks falharam. Corrija antes de subir." -ForegroundColor Red
    exit 1
}

param (
    [string]$target = "help"
)

$commands = @{
    "dev"         = "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd backend; .venv\Scripts\activate; python -m uvicorn app.principal:app --host localhost --port 8000 --reload'; cd frontend; npm run dev"
    "dev-back"    = "cd backend; .venv\Scripts\activate; python -m uvicorn app.principal:app --host localhost --port 8000 --reload"
    "dev-front"   = "cd frontend; npm run dev"
    "test-back"   = "cd backend; .venv\Scripts\activate; python -m pytest"
    "test-front"  = "cd frontend; npm run test"
    "test"        = "cd backend; .venv\Scripts\activate; python -m pytest; cd ../frontend; npm run test"
    "help"        = "Write-Host 'Atajos disponibles: dev, dev-back, dev-front, test-back, test-front, test' -ForegroundColor Yellow"
}

if ($commands.ContainsKey($target)) {
    Write-Host "🚀 Ejecutando atajo: $target" -ForegroundColor Cyan
    Invoke-Expression $commands[$target]
}
else {
    Write-Host "❌ Atajo '$target' no encontrado." -ForegroundColor Red
    Invoke-Expression $commands["help"]
}

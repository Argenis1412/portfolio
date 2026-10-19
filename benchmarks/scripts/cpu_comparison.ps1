# Run from the repository root. Uses only disposable, isolated local containers.
param(
    [string]$Results = "benchmarks/results/cpu-comparison-$(Get-Date -Format yyyyMMdd-HHmmss)"
)
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
if ($Results -notmatch '^benchmarks/results/[A-Za-z0-9-]+$') { throw 'Use a directory directly under benchmarks/results' }
if (Test-Path -LiteralPath $Results) { throw 'Results directory already exists; preserve previous evidence' }
New-Item -ItemType Directory $Results | Out-Null
function DockerOutput {
    param([string[]]$Arguments)
    $output = & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed: $Arguments" }
    return $output
}
function CpuSnapshot {
    $values = @{}
    DockerOutput @('exec', 'portfolio-diagnostic-api', 'cat', '/sys/fs/cgroup/cpu.stat') | ForEach-Object {
        $parts = $_ -split ' '
        $values[$parts[0]] = [long]$parts[1]
    }
    return $values
}
$names = DockerOutput @('ps', '-a', '--format', '{{.Names}}')
if ($names -contains 'portfolio-diagnostic-api' -or $names -contains 'portfolio-diagnostic-redis') {
    throw 'Diagnostic container names are already in use'
}
$networks = DockerOutput @('network', 'ls', '--format', '{{.Name}}')
if ($networks -contains 'portfolio-diagnostic-local') { throw 'Diagnostic network already exists' }
$image = DockerOutput @('image', 'inspect', 'portfolio-backend-validation:local', '--format', '{{.Id}}')
if ($image -ne 'sha256:298141ec2088e76c96b5a76320392c7448c7356f797ba53627ccaecdf2bc9122') {
    throw 'Expected the original validation image'
}
DockerOutput @('network', 'create', '--internal', 'portfolio-diagnostic-local') | Out-Null
try {
    # Reversed second pair reduces simple ordering bias; each run has fresh Redis/API.
    $budgets = @('0.1', '1', '1', '0.1')
    for ($index = 0; $index -lt $budgets.Count; $index++) {
        $run = $index + 1
        $cpu = $budgets[$index]
        $apiCreated = $false
        $redisCreated = $false
        try {
            DockerOutput @('run', '-d', '--name', 'portfolio-diagnostic-redis', '--network', 'portfolio-diagnostic-local', '--network-alias', 'redis', 'redis:7-alpine') | Out-Null
            $redisCreated = $true
            DockerOutput @('run', '-d', '--name', 'portfolio-diagnostic-api', '--network', 'portfolio-diagnostic-local', "--cpus=$cpu", '--memory=512m', '--memory-swap=512m', '--no-healthcheck',
                '-e', 'ENVIRONMENT=production', '-e', 'REDIS_URL=redis://redis:6379/0', '-e', 'WORKER_ENABLED=true', '-e', 'OTEL_ENABLED=false', '-e', 'SENTRY_DSN=', '-e', 'RESEND_API_KEY=', '-e', 'RESEND_TO_EMAIL=',
                '-e', 'METRICS_BASIC_AUTH_USERNAME=validation', '-e', 'METRICS_BASIC_AUTH_PASSWORD=local-only', '-e', 'ALLOWED_ORIGINS=http://127.0.0.1:18080', '-e', 'REGEX_ALLOWED_ORIGINS=^http://127[.]0[.]0[.]1:18080$',
                $image, 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '18080', '--workers', '1') | Out-Null
            $apiCreated = $true
            $healthy = $false
            for ($attempt = 0; $attempt -lt 30; $attempt++) {
                Start-Sleep -Seconds 1
                $health = & docker exec portfolio-diagnostic-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:18080/health').read().decode())" 2>$null
                if ($LASTEXITCODE -eq 0 -and ($health | ConvertFrom-Json).status -eq 'ok') { $healthy = $true; break }
            }
            if (-not $healthy) { throw 'JSON health did not become ok' }
            # Same fixed post-readiness settling interval for every fresh process.
            Start-Sleep -Seconds 5
            $before = CpuSnapshot
            $started = [DateTimeOffset]::UtcNow
            & docker run --rm --network container:portfolio-diagnostic-api --user 0 --mount "type=bind,source=$root/benchmarks,target=/benchmarks" grafana/k6:1.7.1 run --summary-trend-stats 'avg,min,med,max,p(90),p(95),p(99)' --env "RUN_ID=$run" --env "SUMMARY_PATH=/$results/run-$run.json" /benchmarks/scripts/single_process_local.js
            $loadExit = $LASTEXITCODE
            $ended = [DateTimeOffset]::UtcNow
            $after = CpuSnapshot
            $delta = @{}
            foreach ($key in $before.Keys) { $delta[$key] = $after[$key] - $before[$key] }
            $inspection = (DockerOutput @('inspect', 'portfolio-diagnostic-api') | ConvertFrom-Json)[0]
            $record = [ordered]@{
                source_commit = (git rev-parse HEAD); image_id = $image; run = $run; cpu = $cpu
                started_utc = $started.ToString('o'); ended_utc = $ended.ToString('o'); k6_exit = $loadExit
                cpu_before = $before; cpu_after = $after; cpu_delta = $delta
                cpu_max = (DockerOutput @('exec', 'portfolio-diagnostic-api', 'cat', '/sys/fs/cgroup/cpu.max'))
                memory_peak = (DockerOutput @('exec', 'portfolio-diagnostic-api', 'cat', '/sys/fs/cgroup/memory.peak'))
                memory_events = (DockerOutput @('exec', 'portfolio-diagnostic-api', 'cat', '/sys/fs/cgroup/memory.events'))
                limits = @{ cpu = $inspection.HostConfig.NanoCpus; memory = $inspection.HostConfig.Memory; swap = $inspection.HostConfig.MemorySwap }
                restarts = $inspection.RestartCount; oom_killed = $inspection.State.OOMKilled; ports = $inspection.NetworkSettings.Ports
                initial_health = ($health | ConvertFrom-Json)
                final_health = ((DockerOutput @('exec', 'portfolio-diagnostic-api', 'python', '-c', "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:18080/health').read().decode())")) | ConvertFrom-Json)
                pending = (DockerOutput @('exec', 'portfolio-diagnostic-redis', 'redis-cli', 'XPENDING', 'contact_jobs', 'email_workers'))
                group = (DockerOutput @('exec', 'portfolio-diagnostic-redis', 'redis-cli', 'XINFO', 'GROUPS', 'contact_jobs'))
                dlq = (DockerOutput @('exec', 'portfolio-diagnostic-redis', 'redis-cli', 'XLEN', 'contact_jobs_dlq'))
            }
            $record | ConvertTo-Json -Depth 12 | Set-Content "$results/run-$run-environment.json" -Encoding utf8
            DockerOutput @('logs', 'portfolio-diagnostic-api') | Set-Content "$results/run-$run-stdout.txt" -Encoding utf8
            if ($loadExit -ne 0 -and $loadExit -ne 99) { throw "Unexpected k6 exit $loadExit" }
        } finally {
            if ($apiCreated) { DockerOutput @('rm', '-f', 'portfolio-diagnostic-api') | Out-Null }
            if ($redisCreated) { DockerOutput @('rm', '-f', 'portfolio-diagnostic-redis') | Out-Null }
        }
    }
} finally {
    DockerOutput @('network', 'rm', 'portfolio-diagnostic-local') | Out-Null
}

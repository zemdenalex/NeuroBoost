# NeuroBoost Log Viewer for PowerShell
# Usage: .\view-logs.ps1 [service] [lines]

param(
    [Parameter(Position=0)]
    [ValidateSet("api", "bot", "all", "")]
    [string]$Service = "all",
    
    [Parameter(Position=1)]
    [int]$Lines = 50,
    
    [switch]$Watch,
    [switch]$Errors,
    [switch]$Help
)

function Show-Help {
    Write-Host @"

NeuroBoost Log Viewer (PowerShell)

Usage:
    .\view-logs.ps1 [service] [lines] [-Watch] [-Errors] [-Help]

Parameters:
    service   : api, bot, or all (default: all)
    lines     : Number of lines to show (default: 50)
    -Watch    : Follow logs in real-time
    -Errors   : Show only error logs
    -Help     : Show this help message

Examples:
    .\view-logs.ps1                    # Show last 50 lines from all services
    .\view-logs.ps1 api               # Show API logs
    .\view-logs.ps1 bot 100           # Show last 100 bot logs
    .\view-logs.ps1 api -Watch        # Watch API logs in real-time
    .\view-logs.ps1 all -Errors       # Show error logs only

Log Levels:
    DEBUG - Detailed debugging info (Cyan)
    INFO  - General information (Green)
    WARN  - Warning messages (Yellow)
    ERROR - Error messages (Red)

"@ -ForegroundColor White
}

function Format-LogLine {
    param([string]$Line)
    
    try {
        $log = $Line | ConvertFrom-Json
        $timestamp = [DateTime]::Parse($log.timestamp).ToString("yyyy-MM-dd HH:mm:ss")
        $level = $log.level.PadRight(5)
        $service = $log.service.PadRight(3)
        
        # Color mapping
        $color = switch ($log.level) {
            "DEBUG" { "Cyan" }
            "INFO"  { "Green" }
            "WARN"  { "Yellow" }
            "ERROR" { "Red" }
            default { "White" }
        }
        
        Write-Host "[$timestamp] $level [$service] " -NoNewline -ForegroundColor Gray
        Write-Host $log.message -ForegroundColor $color
        
        # Show additional data if present
        if ($log.PSObject.Properties | Where-Object { $_.Name -notin @("timestamp", "service", "level", "pid", "message", "type") }) {
            $additionalProps = $log.PSObject.Properties | Where-Object { $_.Name -notin @("timestamp", "service", "level", "pid", "message", "type") }
            if ($additionalProps) {
                $dataStr = ($additionalProps | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join ", "
                Write-Host "    Data: $dataStr" -ForegroundColor DarkGray
            }
        }
    }
    catch {
        Write-Host $Line -ForegroundColor Gray
    }
}

function Get-LogLines {
    param(
        [string]$FilePath,
        [int]$LineCount = 50
    )
    
    if (-not (Test-Path $FilePath)) {
        return @()
    }
    
    try {
        $content = Get-Content $FilePath -Encoding UTF8
        if ($content.Count -gt $LineCount) {
            return $content[-$LineCount..-1]
        }
        else {
            return $content
        }
    }
    catch {
        Write-Warning "Error reading $FilePath : $($_.Exception.Message)"
        return @()
    }
}

function Watch-LogFile {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-Warning "Log file not found: $FilePath"
        return
    }
    
    Write-Host "`nWatching $FilePath for changes... (Press Ctrl+C to stop)`n" -ForegroundColor Yellow
    
    # Show last 10 lines first
    $initialLines = Get-LogLines -FilePath $FilePath -LineCount 10
    foreach ($line in $initialLines) {
        Format-LogLine $line
    }
    
    # Watch for changes
    $lastSize = (Get-Item $FilePath).Length
    
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            
            if (Test-Path $FilePath) {
                $currentSize = (Get-Item $FilePath).Length
                
                if ($currentSize -gt $lastSize) {
                    # Read new content
                    $stream = [System.IO.File]::OpenRead($FilePath)
                    $stream.Seek($lastSize, [System.IO.SeekOrigin]::Begin) | Out-Null
                    
                    $reader = [System.IO.StreamReader]::new($stream)
                    $newContent = $reader.ReadToEnd()
                    $reader.Close()
                    $stream.Close()
                    
                    # Process new lines
                    $newLines = $newContent.Trim() -split "`n" | Where-Object { $_.Trim() }
                    foreach ($line in $newLines) {
                        Format-LogLine $line.Trim()
                    }
                    
                    $lastSize = $currentSize
                }
            }
        }
    }
    catch {
        if ($_.Exception -is [System.Management.Automation.PipelineStoppedException]) {
            Write-Host "`nStopped watching logs." -ForegroundColor Yellow
        }
        else {
            Write-Error "Error watching file: $($_.Exception.Message)"
        }
    }
}

function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    $logsDir = Join-Path (Get-Location) "logs"
    
    if (-not (Test-Path $logsDir)) {
        Write-Host "❌ Logs directory not found. Make sure to run the API or Bot first to generate logs." -ForegroundColor Red
        Write-Host "Expected directory: $logsDir" -ForegroundColor Gray
        return
    }
    
    $services = if ($Service -eq "all") { @("api", "bot") } else { @($Service) }
    
    if ($Watch) {
        if ($Service -eq "all") {
            Write-Host "❌ Cannot watch all services simultaneously. Please specify api or bot." -ForegroundColor Red
            return
        }
        
        $logFile = Join-Path $logsDir "$Service.log"
        Watch-LogFile $logFile
        return
    }
    
    Write-Host "📋 NeuroBoost Logs - $($Service.ToUpper()) (last $Lines lines)`n" -ForegroundColor Cyan
    
    if ($Service -eq "all") {
        # Collect logs from all services
        $allLogs = @()
        
        foreach ($svc in @("api", "bot")) {
            $logFile = Join-Path $logsDir "$svc.log"
            if ($Errors) {
                $logFile = Join-Path $logsDir "$svc.error.log"
            }
            
            $logs = Get-LogLines -FilePath $logFile -LineCount ($Lines * 2)
            
            foreach ($line in $logs) {
                try {
                    $parsed = $line | ConvertFrom-Json
                    $allLogs += [PSCustomObject]@{
                        Timestamp = [DateTime]::Parse($parsed.timestamp)
                        OriginalLine = $line
                        Level = $parsed.level
                        Service = $parsed.service
                    }
                }
                catch {
                    $allLogs += [PSCustomObject]@{
                        Timestamp = Get-Date
                        OriginalLine = $line
                        Level = "INFO"
                        Service = $svc
                    }
                }
            }
        }
        
        # Sort by timestamp and take last N lines
        $sortedLogs = $allLogs | Sort-Object Timestamp | Select-Object -Last $Lines
        
        foreach ($log in $sortedLogs) {
            Format-LogLine $log.OriginalLine
        }
    }
    else {
        # Show logs from specific service
        $logFile = Join-Path $logsDir "$Service.log"
        if ($Errors) {
            $logFile = Join-Path $logsDir "$Service.error.log"
        }
        
        $logs = Get-LogLines -FilePath $logFile -LineCount $Lines
        
        if ($logs.Count -eq 0) {
            Write-Host "📝 No logs found for $Service. Make sure the service is running." -ForegroundColor Yellow
            return
        }
        
        foreach ($line in $logs) {
            Format-LogLine $line
        }
    }
    
    # Show log file info
    Write-Host "`n$('─' * 80)" -ForegroundColor Gray
    
    foreach ($svc in $services) {
        $logFile = Join-Path $logsDir "$svc.log"
        $errorFile = Join-Path $logsDir "$svc.error.log"
        
        if (Test-Path $logFile) {
            $stats = Get-Item $logFile
            $sizeKB = [math]::Round($stats.Length / 1024, 1)
            $modified = $stats.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            Write-Host "📁 $svc.log: ${sizeKB}KB (modified: $modified)" -ForegroundColor Green
        }
        
        if (Test-Path $errorFile) {
            $stats = Get-Item $errorFile
            $sizeKB = [math]::Round($stats.Length / 1024, 1)
            Write-Host "🚨 $svc.error.log: ${sizeKB}KB" -ForegroundColor Red
        }
    }
    
    Write-Host "`n💡 Tips:" -ForegroundColor Cyan
    Write-Host "  • Use -Watch to follow logs in real-time"
    Write-Host "  • Use -Errors to show only error logs"  
    Write-Host "  • Check logs/[service].error.log for error details"
    Write-Host "  • Logs are automatically rotated when they get large"
}

# Run the main function
Main
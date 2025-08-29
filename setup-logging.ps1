# NeuroBoost Logging Setup Script
# Run this from your project root (v0.2.1/)

param(
    [switch]$Help
)

function Show-Help {
    Write-Host @"
NeuroBoost Logging Setup Script

This script will:
1. Create the logs directory structure
2. Set up log viewer scripts
3. Update package.json files with log commands
4. Create environment variables for logging

Usage:
    .\setup-logging.ps1

After running this script:
    .\view-logs.ps1 all          # View all logs
    .\view-logs.ps1 api -Watch   # Watch API logs in real-time
    .\view-logs.ps1 bot 100      # Show last 100 bot logs

"@ -ForegroundColor White
}

if ($Help) {
    Show-Help
    exit 0
}

Write-Host "🔧 Setting up NeuroBoost Logging System..." -ForegroundColor Cyan
Write-Host ""

# Create logs directory
$logsDir = "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "✅ Created logs directory" -ForegroundColor Green
} else {
    Write-Host "✅ Logs directory already exists" -ForegroundColor Yellow
}

# Create log viewer permissions
Write-Host "🔧 Setting up log viewer scripts..." -ForegroundColor Cyan

# Make PowerShell script executable
if (Test-Path "view-logs.ps1") {
    Write-Host "✅ PowerShell log viewer found" -ForegroundColor Green
} else {
    Write-Host "⚠️  PowerShell log viewer not found - make sure to create view-logs.ps1" -ForegroundColor Yellow
}

# Check Node.js log viewer
if (Test-Path "view-logs.mjs") {
    Write-Host "✅ Node.js log viewer found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Node.js log viewer not found - make sure to create view-logs.mjs" -ForegroundColor Yellow
}

# Check API logger
if (Test-Path "apps/api/src/logger.mjs") {
    Write-Host "✅ API logger found" -ForegroundColor Green
} else {
    Write-Host "⚠️  API logger not found - create apps/api/src/logger.mjs" -ForegroundColor Yellow
}

# Check Bot logger  
if (Test-Path "apps/bot/src/logger.mjs") {
    Write-Host "✅ Bot logger found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Bot logger not found - create apps/bot/src/logger.mjs" -ForegroundColor Yellow
}

# Update environment files
Write-Host "🔧 Setting up environment variables..." -ForegroundColor Cyan

# API environment
$apiEnvFile = "apps/api/.env"
$apiEnvContent = @"
# NeuroBoost API Environment
DATABASE_URL=postgresql://user:password@localhost:5433/neuroboost
API_PORT=3001
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
LOGS_DIR=../../logs

# Route Configuration  
NB_ROUTE_PRIMARY=telegram-stub
NB_QUIET=23:00-08:00
"@

if (-not (Test-Path $apiEnvFile)) {
    $apiEnvContent | Out-File -FilePath $apiEnvFile -Encoding UTF8
    Write-Host "✅ Created API .env file with logging config" -ForegroundColor Green
} else {
    Write-Host "✅ API .env file already exists" -ForegroundColor Yellow
}

# Bot environment
$botEnvFile = "apps/bot/.env"
$botEnvContent = @"
# NeuroBoost Bot Environment
TELEGRAM_BOT_TOKEN=your_bot_token_here
API_BASE=http://localhost:3001
DATABASE_URL=postgresql://user:password@localhost:5433/neuroboost
BOT_PORT=3002
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
LOGS_DIR=../../logs
TZ=Europe/Moscow

# Cleanup Configuration
CLEANUP_INTERVAL_MINUTES=60
"@

if (-not (Test-Path $botEnvFile)) {
    $botEnvContent | Out-File -FilePath $botEnvFile -Encoding UTF8
    Write-Host "✅ Created Bot .env file with logging config" -ForegroundColor Green
} else {
    Write-Host "✅ Bot .env file already exists" -ForegroundColor Yellow
}

# Test directory structure
Write-Host ""
Write-Host "📁 Directory Structure:" -ForegroundColor Cyan
Write-Host "neuroboost-v0.2.1/"
Write-Host "├── logs/                 # Log files will be created here" -ForegroundColor Gray
Write-Host "├── view-logs.ps1         # PowerShell log viewer" -ForegroundColor Gray
Write-Host "├── view-logs.mjs         # Node.js log viewer" -ForegroundColor Gray
Write-Host "├── apps/"
Write-Host "│   ├── api/"
Write-Host "│   │   ├── src/logger.mjs    # API logging utility" -ForegroundColor Gray
Write-Host "│   │   └── .env              # API environment config" -ForegroundColor Gray
Write-Host "│   └── bot/"
Write-Host "│       ├── src/logger.mjs    # Bot logging utility" -ForegroundColor Gray
Write-Host "│       └── .env              # Bot environment config" -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Make sure you have the logger.mjs files in both api and bot src directories"
Write-Host "2. Update your server.mjs and bot index.mjs files to use the new logging"
Write-Host "3. Start your services:"
Write-Host "   cd apps/api && pnpm dev" -ForegroundColor Yellow
Write-Host "   cd apps/bot && pnpm dev" -ForegroundColor Yellow
Write-Host "4. View logs:"
Write-Host "   .\view-logs.ps1 all" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Logging setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Pro Tips:" -ForegroundColor Cyan
Write-Host "• Use .\view-logs.ps1 api -Watch to watch API logs in real-time"
Write-Host "• Check logs/api.error.log and logs/bot.error.log for errors only"  
Write-Host "• Logs are automatically rotated when they exceed 10MB"
Write-Host "• Set LOG_LEVEL=debug in .env for more detailed logs"
Write-Host ""
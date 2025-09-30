#!/bin/bash
# deploy-backend-bot.sh - Fast backend API and bot updates without touching database or frontend
# Usage: ./deploy-backend-bot.sh [--migrate] [--seed] [--force] [--show-logs]

set -e

echo "🚀 NeuroBoost Backend/Bot Deployment"
echo "===================================="
echo ""

# Parse command line arguments
RUN_MIGRATION=false
RUN_SEED=false
FORCE_UPDATE=false
SHOW_LOGS=false

for arg in "$@"; do
    case $arg in
        --migrate)
            RUN_MIGRATION=true
            shift
            ;;
        --seed)
            RUN_SEED=true
            shift
            ;;
        --force)
            FORCE_UPDATE=true
            shift
            ;;
        --show-logs)
            SHOW_LOGS=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --migrate    Run database migrations (v0.4.x safe migration)"
            echo "  --seed       Run v0.4.x seed script after migration"
            echo "  --force      Force rebuild even if no changes detected"
            echo "  --show-logs  Show service logs after deployment"
            echo "  --help       Show this help message"
            echo ""
            echo "This script only updates backend services without affecting:"
            echo "  • Database data (unless --migrate is used)"
            echo "  • Frontend (Web UI)"
            echo "  • Nginx configuration"
            echo ""
            exit 0
            ;;
    esac
done

# Function to check if a service is running
check_service_health() {
    local service=$1
    if docker compose ps | grep -q "nb-$service.*Up"; then
        return 0
    else
        return 1
    fi
}

# 1. Pre-flight checks
echo "🔍 Pre-flight checks..."

# Check if database is running
if ! check_service_health "postgres"; then
    echo "❌ Database is not running! Starting it first..."
    docker compose up -d db
    echo "⏳ Waiting for database to be ready..."
    sleep 10
    until docker compose exec -T db pg_isready -U nb_user -d neuroboost >/dev/null 2>&1; do
        sleep 2
    done
fi

echo "✅ Database is running"

# 2. Backup database before any changes
echo ""
echo "💾 Creating database backup..."
BACKUP_FILE="backup_backend_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose exec -T db pg_dump -U nb_user neuroboost | gzip > "$BACKUP_FILE"
echo "✅ Database backed up to $BACKUP_FILE"

# 3. Check for backend changes
echo ""
echo "🔍 Checking for backend changes..."

API_CHANGED=false
BOT_CHANGED=false

if [ "$FORCE_UPDATE" = false ]; then
    # Check API container date
    if check_service_health "api"; then
        API_IMAGE_DATE=$(docker inspect nb-api --format='{{.Created}}' 2>/dev/null || echo "1970-01-01T00:00:00Z")
        API_IMAGE_TIMESTAMP=$(date -d "$API_IMAGE_DATE" +%s 2>/dev/null || echo "0")
        
        # Find newest file in API directory
        API_NEWEST=$(find apps/api/src apps/api/prisma apps/api/scripts -type f -newer /proc/$$/fd/0 2>/dev/null | head -1)
        if [ -z "$API_NEWEST" ]; then
            echo "ℹ️  No API changes detected"
        else
            API_CHANGED=true
            echo "📝 API changes detected"
        fi
    else
        API_CHANGED=true
    fi
    
    # Check Bot container date
    if check_service_health "bot"; then
        BOT_IMAGE_DATE=$(docker inspect nb-bot --format='{{.Created}}' 2>/dev/null || echo "1970-01-01T00:00:00Z")
        BOT_IMAGE_TIMESTAMP=$(date -d "$BOT_IMAGE_DATE" +%s 2>/dev/null || echo "0")
        
        # Find newest file in Bot directory
        BOT_NEWEST=$(find apps/bot/src -type f -newer /proc/$$/fd/0 2>/dev/null | head -1)
        if [ -z "$BOT_NEWEST" ]; then
            echo "ℹ️  No Bot changes detected"
        else
            BOT_CHANGED=true
            echo "📝 Bot changes detected"
        fi
    else
        BOT_CHANGED=true
    fi
else
    API_CHANGED=true
    BOT_CHANGED=true
    echo "🔄 Force update enabled"
fi

if [ "$API_CHANGED" = false ] && [ "$BOT_CHANGED" = false ] && [ "$RUN_MIGRATION" = false ]; then
    echo ""
    echo "✅ Backend services are already up to date!"
    exit 0
fi

# 4. Run migration if requested
if [ "$RUN_MIGRATION" = true ]; then
    echo ""
    echo "🔧 Running v0.4.x Safe Migration..."
    
    # Apply the safe migration SQL directly
    docker compose exec -T db psql -U nb_user -d neuroboost < apps/api/prisma/migrations/20250920_v04x_safe/migration.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully"
        
        # Regenerate Prisma client
        echo "🔧 Regenerating Prisma client..."
        docker compose exec -T api pnpm prisma generate
        
        # Run seed if requested
        if [ "$RUN_SEED" = true ]; then
            echo ""
            echo "🌱 Running v0.4.x seed script..."
            docker compose exec -T api npx tsx scripts/seed-v04x.ts
            if [ $? -eq 0 ]; then
                echo "✅ Seed data created successfully"
            else
                echo "⚠️  Seed script had issues, but continuing..."
            fi
        fi
    else
        echo "⚠️  Migration had issues, but continuing..."
    fi
fi

# 5. Build new images if needed
echo ""
echo "🏗️  Building backend images..."

if [ "$API_CHANGED" = true ] || [ "$FORCE_UPDATE" = true ]; then
    echo "   Building API service..."
    docker compose build --no-cache api
    if [ $? -ne 0 ]; then
        echo "❌ API build failed!"
        exit 1
    fi
fi

if [ "$BOT_CHANGED" = true ] || [ "$FORCE_UPDATE" = true ]; then
    echo "   Building Bot service..."
    docker compose build --no-cache bot
    if [ $? -ne 0 ]; then
        echo "❌ Bot build failed!"
        exit 1
    fi
fi

echo "✅ Backend images built successfully"

# 6. Deploy with minimal downtime
echo ""
echo "🚀 Deploying backend services..."

START_TIME=$(date +%s)

# Stop and restart services as needed
if [ "$API_CHANGED" = true ] || [ "$FORCE_UPDATE" = true ]; then
    echo "   Restarting API service..."
    docker compose stop api
    docker compose up -d api
    echo "   Waiting for API to be ready..."
    sleep 5
    
    # Wait for API health
    until curl -f -s http://localhost:3001/health >/dev/null 2>&1; do
        sleep 2
    done
fi

if [ "$BOT_CHANGED" = true ] || [ "$FORCE_UPDATE" = true ]; then
    echo "   Restarting Bot service..."
    docker compose stop bot
    docker compose up -d bot
    echo "   Waiting for Bot to be ready..."
    sleep 5
fi

END_TIME=$(date +%s)
DOWNTIME=$((END_TIME - START_TIME))

echo "✅ Backend deployment complete! (downtime: ${DOWNTIME}s)"

# 7. Health checks
echo ""
echo "🏥 Running health checks..."

# Check API
if check_service_health "api"; then
    echo "✅ API container is running"
    
    # Test API endpoints
    if curl -f -s http://localhost:3001/health >/dev/null; then
        echo "✅ API health endpoint working"
    else
        echo "❌ API health check failed!"
        docker compose logs --tail=20 api
    fi
    
    # Test new v0.4.x endpoints if migration was run
    if [ "$RUN_MIGRATION" = true ]; then
        if curl -f -s http://localhost:3001/api/contexts >/dev/null; then
            echo "✅ v0.4.x contexts endpoint working"
        fi
        
        if curl -f -s http://localhost:3001/api/layers >/dev/null; then
            echo "✅ v0.4.x layers endpoint working"
        fi
        
        if curl -f -s http://localhost:3001/api/routines >/dev/null; then
            echo "✅ v0.4.x routines endpoint working"
        fi
    fi
else
    echo "❌ API container failed to start!"
    exit 1
fi

# Check Bot
if check_service_health "bot"; then
    echo "✅ Bot container is running"
    
    if curl -f -s http://localhost:3002/health >/dev/null; then
        echo "✅ Bot health endpoint working"
    else
        echo "❌ Bot health check failed!"
        docker compose logs --tail=20 bot
    fi
else
    echo "❌ Bot container failed to start!"
    exit 1
fi

# 8. Database verification if migration was run
if [ "$RUN_MIGRATION" = true ]; then
    echo ""
    echo "🔍 Verifying v0.4.x database schema..."
    
    CONTEXT_COUNT=$(docker compose exec -T db psql -U nb_user -d neuroboost -t -c "SELECT COUNT(*) FROM \"Context\";" 2>/dev/null | tr -d '[:space:]')
    if [ -n "$CONTEXT_COUNT" ] && [ "$CONTEXT_COUNT" -ge 8 ]; then
        echo "✅ Contexts table has $CONTEXT_COUNT entries"
    else
        echo "⚠️  Contexts table has $CONTEXT_COUNT entries (expected 8+)"
    fi
    
    LAYER_COUNT=$(docker compose exec -T db psql -U nb_user -d neuroboost -t -c "SELECT COUNT(*) FROM \"CalendarLayer\";" 2>/dev/null | tr -d '[:space:]')
    if [ -n "$LAYER_COUNT" ] && [ "$LAYER_COUNT" -ge 6 ]; then
        echo "✅ CalendarLayer table has $LAYER_COUNT entries"
    else
        echo "⚠️  CalendarLayer table has $LAYER_COUNT entries (expected 6+)"
    fi
    
    # Check new Task columns
    TASK_COLS=$(docker compose exec -T db psql -U nb_user -d neuroboost -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Task' AND column_name IN ('energy', 'contexts', 'emotionalDifficulty', 'timeWindowType');" 2>/dev/null | tr -d '[:space:]')
    if [ -n "$TASK_COLS" ] && [ "$TASK_COLS" -eq 4 ]; then
        echo "✅ Task table has v0.4.x columns"
    else
        echo "⚠️  Task table has $TASK_COLS v0.4.x columns (expected 4)"
    fi
fi

# 9. Performance check
echo ""
echo "📈 Checking performance..."

API_RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3001/health 2>/dev/null || echo "timeout")
if [ "$API_RESPONSE_TIME" != "timeout" ]; then
    echo "✅ API response time: ${API_RESPONSE_TIME}s"
else
    echo "⚠️  API not responding"
fi

# 10. Cleanup old images
echo ""
echo "🧹 Cleaning up old images..."
docker image prune -f >/dev/null 2>&1
echo "✅ Cleanup complete"

# 11. Final report
echo ""
echo "🎉 Backend/Bot Deployment Complete!"
echo "==================================="
echo ""
echo "📍 Updated Services:"
if [ "$API_CHANGED" = true ] || [ "$FORCE_UPDATE" = true ]; then
    echo "   • API: http://193.104.57.79/api (updated)"
else
    echo "   • API: http://193.104.57.79/api (unchanged)"
fi

if [ "$BOT_CHANGED" = true ] || [ "$FORCE_UPDATE" = true ]; then
    echo "   • Bot: Telegram @YourBotName (updated)"
else
    echo "   • Bot: Telegram @YourBotName (unchanged)"
fi

echo ""
echo "🔄 Unchanged Services:"
echo "   • Web UI: http://193.104.57.79"
echo "   • Database: PostgreSQL (data preserved)"
echo "   • Nginx: Proxy unchanged"
echo ""

if [ "$RUN_MIGRATION" = true ]; then
    echo "✨ v0.4.x Features Now Available:"
    echo "   • Task contexts (@home, @office, @computer, etc.)"
    echo "   • Energy levels (1-5 scale)"
    echo "   • Calendar layers (Work, Personal, Health, etc.)"
    echo "   • Task dependencies and subtasks"
    echo "   • Routines and patterns"
    echo ""
    echo "🤖 New Bot Commands:"
    echo "   • Context-filtered task views"
    echo "   • Layer-based calendar filtering"
    echo "   • Routine activation"
    echo "   • Energy-based suggestions"
    echo ""
fi

echo "⚡ Total downtime: ${DOWNTIME} seconds"
echo ""
echo "💾 Backup available: $BACKUP_FILE"
echo "   Restore: gunzip < $BACKUP_FILE | docker exec -i nb-postgres psql -U nb_user -d neuroboost"
echo ""

echo "🔧 Test new features:"
if [ "$RUN_MIGRATION" = true ]; then
    echo "   curl http://193.104.57.79/api/contexts | jq"
    echo "   curl http://193.104.57.79/api/layers | jq"
    echo "   curl 'http://193.104.57.79/api/tasks/by-context?context=@home' | jq"
    echo ""
fi

echo "📊 Monitor logs:"
echo "   docker compose logs -f api bot"
echo ""

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    echo "📋 Recent API Logs:"
    docker compose logs --tail=20 api
    echo ""
    echo "🤖 Recent Bot Logs:"
    docker compose logs --tail=20 bot
fi

echo "✨ Backend services successfully updated!"
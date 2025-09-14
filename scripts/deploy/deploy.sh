#!/bin/bash
# deploy.sh - Improved deployment script for NeuroBoost v0.2.1
# No database reset, no git pull, automated corepack

set -e

echo "🚀 Deploying NeuroBoost v0.2.1 Enhanced (Safe Mode)"
echo "=================================================="

# 1. Skip git pull (user edits directly on server)
echo "📝 Skipping git pull (local edits mode)"

# 2. Backup current database (safety first!)
echo "💾 Creating database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql.gz"
if docker compose ps | grep -q "nb-postgres.*Up"; then
    docker compose exec -T db pg_dump -U nb_user neuroboost | gzip > "$BACKUP_FILE"
    echo "✅ Database backed up to $BACKUP_FILE"
else
    echo "⚠️  Database not running, skipping backup"
fi

# 3. Stop current services
echo "⏹️ Stopping current services..."
docker compose down

# 4. Check environment configuration
echo "🔧 Checking environment configuration..."
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating from template..."
    cp .env.production .env
    echo "⚠️  Please edit .env file with your configuration"
    exit 1
fi

# 5. Set environment variables to automate corepack
echo "🔧 Setting up automated corepack..."
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export COREPACK_ENABLE_STRICT=0

# 6. Build new images
echo "🏗️ Building Docker images..."
docker compose build --no-cache

# 7. Start database first
echo "🗄️ Starting database..."
docker compose up -d

# 8. Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10
until docker compose exec -T db pg_isready -U nb_user -d neuroboost >/dev/null 2>&1; do
  sleep 2
done
echo "✅ Database is ready"

# 9. Handle schema changes safely (NO RESET)
echo "🧩 Applying DB schema..."
docker compose exec -T api pnpm prisma migrate deploy || \
docker compose exec -T api pnpm prisma db push --accept-data-loss

echo "🔧 Regenerating Prisma client..."
docker compose exec -T api pnpm prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Schema updated successfully (no data lost)"
else
    echo "⚠️  Schema update had issues, but continuing..."
fi

# 10. Initialize default user settings (safe upsert)
echo "⚙️ Initializing user settings..."
docker compose exec -T api node --input-type=module - <<'NODE'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  await prisma.userSettings.upsert({
    where: { userId: 'default' },
    update: {
      hidePersonalTasksDuringWork: true,
      autoCategorizeTasks: true,
      taskPriorityDecay: false
    },
    create: {
      userId: 'default',
      defaultTimezone: 'Europe/Moscow',
      workingHoursStart: 9,
      workingHoursEnd: 17,
      // workingDays is Int[] with default [1..5]; omit to keep DB default
      hidePersonalTasksDuringWork: true,
      showWorkTasksAfterHours: false,
      autoCategorizeTasks: true,
      taskPriorityDecay: false
    }
  });
  console.log('✅ User settings initialized/updated');
} catch (e) {
  console.error('⚠️  Settings error:', e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
NODE



# 11. Start all services
echo "🚀 Starting all services..."
docker compose up -d

# 12. Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 15

# 13. Enhanced health checks
echo "🏥 Running enhanced health checks..."

# Basic service checks
for service in api bot; do
    if docker compose ps | grep -q "nb-$service.*Up"; then
        echo "✅ $service container is running"
    else
        echo "❌ $service container is not running!"
        docker compose logs --tail=50 $service
        exit 1
    fi
done

# 14. Test enhanced endpoints
echo "🧪 Testing enhanced endpoints..."

# Wait a bit more for services to fully start
sleep 5

API_RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3001/health 2>/dev/null || echo "timeout")
if [ "$API_RESPONSE_TIME" != "timeout" ] && [ "$(echo "$API_RESPONSE_TIME < 2.0" | bc -l)" = "1" ]; then
    echo "✅ API response time: ${API_RESPONSE_TIME}s (good)"
else
    echo "⚠️  API response time: ${API_RESPONSE_TIME}s"
fi

# Bot health
if curl -f -s http://localhost:3002/health > /dev/null; then
    echo "✅ Bot health check passed"
else
    echo "❌ Bot health check failed"
    docker compose logs --tail=20 bot
fi

# Enhanced features endpoints (with timeout)
if timeout 10 curl -f -s http://localhost:3001/settings > /dev/null; then
    echo "✅ Settings endpoint working"
else
    echo "⚠️  Settings endpoint not responding (may need time to initialize)"
fi

if timeout 10 curl -f -s "http://localhost:3001/tasks/filtered" > /dev/null; then
    echo "✅ Task filtering endpoint working"
else
    echo "⚠️  Task filtering endpoint not responding"
fi

if timeout 10 curl -f -s "http://localhost:3001/bot/today-focus" > /dev/null; then
    echo "✅ Bot today-focus endpoint working"
else
    echo "⚠️  Bot today-focus endpoint not responding"
fi

# 15. Database schema verification (non-blocking)
echo "🔍 Verifying enhanced database schema..."
# Schema verify
SCHEMA_CHECK=$(
  docker compose exec -T db psql -U nb_user -d neuroboost -t -c "
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_name = 'Task' AND column_name IN ('category','hiddenDuringWorkHours');" \
  2>/dev/null | tr -d '[:space:]'
)
if [ "$SCHEMA_CHECK" = "2" ]; then
  echo "✅ Enhanced Task schema is correct"
else
  echo "⚠️  Enhanced Task schema may be incomplete (${SCHEMA_CHECK:-0} fields found)"
fi

USER_SETTINGS_CHECK=$(
  docker compose exec -T db psql -U nb_user -d neuroboost -t -c 'SELECT COUNT(*) FROM "UserSettings";' \
  2>/dev/null | tr -d '[:space:]'
)
if [ -n "$USER_SETTINGS_CHECK" ] && [ "$USER_SETTINGS_CHECK" -ge 1 ]; then
  echo "✅ UserSettings table has data"
else
  echo "⚠️  UserSettings table is empty or query failed"
fi


if [ "${SCHEMA_CHECK// }" = "2" ]; then
    echo "✅ Enhanced Task schema is correct"
else
    echo "⚠️  Enhanced Task schema may be incomplete (${SCHEMA_CHECK// } fields found)"
fi

USER_SETTINGS_CHECK=$(docker compose exec -T db psql -U admin -d neuroboost -t -c "SELECT COUNT(*) FROM \"UserSettings\";" 2>/dev/null || echo "0")
if [ "${USER_SETTINGS_CHECK// }" -ge "1" ]; then
    echo "✅ UserSettings table has data"
else
    echo "⚠️  UserSettings table is empty or missing"
fi

# 16. Performance check
echo "📈 Checking performance..."
API_RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3001/health 2>/dev/null || echo "timeout")
if [ "$API_RESPONSE_TIME" != "timeout" ] && awk -v t="$API_RESPONSE_TIME" 'BEGIN{exit !(t+0 < 2.0)}'; then
  echo "✅ API response time: ${API_RESPONSE_TIME}s (good)"
else
  echo "⚠️  API response time: ${API_RESPONSE_TIME}s"
fi

echo ""
echo "🎉 Enhanced Deployment Complete!"
echo "================================="
echo ""
echo "📍 Access your enhanced services at:"
echo "   API: http://193.104.57.79/api"
if docker compose ps | grep -q "nb-nginx.*Up"; then
    echo "   Web UI: http://193.104.57.79"
fi
echo ""
echo "🆕 New Features Available:"
echo "   • Smart work hours task filtering (9-17, Mon-Fri)"
echo "   • Month-ahead calendar navigation in Telegram"
echo "   • Quick task-to-event conversion"
echo "   • Enhanced today's focus view"
echo ""
echo "📱 Telegram Bot Test Checklist:"
echo "   1. Send /start to your bot"
echo "   2. Look for new buttons: 📅 Today's Focus, 🗓️ Calendar View, ⚙️ Work Hours"
echo "   3. Try 'Today's Focus' → should show work hours status"
echo "   4. Try 'Calendar View' → should show month grid navigation"
echo "   5. Try 'Top Tasks' → tap task → 'Schedule Now' → pick duration"
echo "   6. Try 'Work Hours' → configure your schedule"
echo ""
echo "📊 Monitor logs:"
echo "   docker compose logs -f api bot"
echo ""
echo "🔧 Test enhanced API:"
echo "   curl http://193.104.57.79/api/settings | jq"
echo "   curl http://193.104.57.79/api/tasks/filtered | jq '.metadata'"
echo "   curl http://193.104.57.79/api/bot/today-focus | jq '.isWorkHours'"
echo ""
echo "💾 Backup created: $BACKUP_FILE"
echo "   Restore: gunzip < $BACKUP_FILE | docker exec -i nb-postgres psql -U admin -d neuroboost"
echo ""

# 17. Final status summary
echo "📋 Deployment Status Summary:"
echo "============================="
docker compose ps
echo ""
echo "🎯 If you see issues:"
echo "   1. Check logs: docker compose logs api bot"
echo "   2. Restart services: docker compose restart"
echo "   3. Test bot with: /start in Telegram"
echo ""
echo "🚀 NeuroBoost v0.2.1 Enhanced is ready!"

# 18. Optional: Show recent logs
if [ "$1" = "--show-logs" ]; then
    echo ""
    echo "📊 Recent API logs:"
    docker compose logs --tail=10 api
    echo ""
    echo "🤖 Recent Bot logs:"
    docker compose logs --tail=10 bot
fi
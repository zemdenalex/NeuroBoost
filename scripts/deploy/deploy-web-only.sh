#!/bin/bash
# deploy-web-only.sh - Fast web frontend updates without touching backend services
# Usage: ./deploy-web-only.sh [--backup] [--force] [--show-logs]

set -e

echo "🌐 NeuroBoost Web-Only Deployment"
echo "================================="
echo ""

# Parse command line arguments
BACKUP_ENABLED=false
FORCE_UPDATE=false
SHOW_LOGS=false

for arg in "$@"; do
    case $arg in
        --backup)
            BACKUP_ENABLED=true
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
            echo "  --backup     Create backup of current web container before update"
            echo "  --force      Force rebuild even if no changes detected"
            echo "  --show-logs  Show web container logs after deployment"
            echo "  --help       Show this help message"
            echo ""
            echo "This script only updates the web frontend without affecting:"
            echo "  • Database (PostgreSQL)"
            echo "  • API service"
            echo "  • Telegram bot"
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

# Function to get container image ID
get_image_id() {
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | grep "neuroboost.*web" | awk '{print $2}' | head -1
}

# 1. Pre-flight checks
echo "🔍 Pre-flight checks..."

# Check if core services are running (don't touch them)
if ! check_service_health "api"; then
    echo "❌ API service is not running! This script only updates web."
    echo "   Please run the full deployment script first."
    exit 1
fi

if ! check_service_health "postgres"; then
    echo "❌ Database is not running! This script only updates web."
    echo "   Please run the full deployment script first."
    exit 1
fi

echo "✅ Core services (API, DB) are running"

# Check if web service exists
WEB_RUNNING=false
if check_service_health "web"; then
    WEB_RUNNING=true
    echo "✅ Web service is currently running"
else
    echo "⚠️  Web service is not running (will start fresh)"
fi

# 2. Backup current web image (optional)
if [ "$BACKUP_ENABLED" = true ] && [ "$WEB_RUNNING" = true ]; then
    echo ""
    echo "💾 Creating backup of current web container..."
    
    BACKUP_TAG="neuroboost-web-backup-$(date +%Y%m%d_%H%M%S)"
    CURRENT_IMAGE=$(docker compose images web -q)
    
    if [ -n "$CURRENT_IMAGE" ]; then
        docker tag $CURRENT_IMAGE $BACKUP_TAG
        echo "✅ Backup created: $BACKUP_TAG"
        echo "   Restore with: docker tag $BACKUP_TAG neuroboost-web:latest"
    else
        echo "⚠️  Could not create backup (no current image found)"
    fi
fi

# 3. Check for changes in web directory
echo ""
echo "🔍 Checking for web changes..."

WEB_CHANGED=true
if [ "$FORCE_UPDATE" = false ]; then
    # Simple change detection - check if any files in apps/web/ are newer than the current image
    if [ "$WEB_RUNNING" = true ]; then
        CURRENT_IMAGE_DATE=$(docker inspect $(docker compose images web -q) --format='{{.Created}}' 2>/dev/null || echo "1970-01-01T00:00:00Z")
        CURRENT_IMAGE_TIMESTAMP=$(date -d "$CURRENT_IMAGE_DATE" +%s 2>/dev/null || echo "0")
        
        # Find newest file in web directory
        NEWEST_FILE_TIMESTAMP=$(find apps/web/src apps/web/public apps/web/*.json apps/web/*.ts apps/web/*.js -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1 | cut -d. -f1)
        
        if [ "$NEWEST_FILE_TIMESTAMP" -le "$CURRENT_IMAGE_TIMESTAMP" ]; then
            WEB_CHANGED=false
            echo "ℹ️  No changes detected in web files"
            echo "   Use --force to rebuild anyway"
        fi
    fi
fi

if [ "$WEB_CHANGED" = false ] && [ "$FORCE_UPDATE" = false ]; then
    echo ""
    echo "✅ Web is already up to date!"
    exit 0
fi

echo "📝 Changes detected, proceeding with update..."

# 4. Build new web image
echo ""
echo "🏗️  Building new web image..."
echo "   This may take 1-2 minutes..."

# Build only the web service with no cache to ensure fresh build
docker compose build --no-cache web

if [ $? -ne 0 ]; then
    echo "❌ Web build failed!"
    exit 1
fi

echo "✅ Web image built successfully"

# 5. Test build before deployment (quick smoke test)
echo ""
echo "🧪 Testing new web build..."

# Start a temporary container to test the build
TEST_CONTAINER="nb-web-test-$(date +%s)"
docker run --name $TEST_CONTAINER -d -p 8099:80 neuroboost-web:latest >/dev/null

sleep 3

# Quick HTTP test
if curl -f -s http://localhost:8099 >/dev/null; then
    echo "✅ New web build passes smoke test"
else
    echo "❌ New web build failed smoke test!"
    docker stop $TEST_CONTAINER >/dev/null 2>&1
    docker rm $TEST_CONTAINER >/dev/null 2>&1
    exit 1
fi

# Cleanup test container
docker stop $TEST_CONTAINER >/dev/null 2>&1
docker rm $TEST_CONTAINER >/dev/null 2>&1

# 6. Deploy new web container with minimal downtime
echo ""
echo "🚀 Deploying new web container..."

# Record start time for downtime measurement
START_TIME=$(date +%s)

# Stop current web container
if [ "$WEB_RUNNING" = true ]; then
    echo "   Stopping current web container..."
    docker compose stop web
fi

# Start new web container
echo "   Starting new web container..."
docker compose up -d web

# Wait for it to be ready
echo "   Waiting for web service to be ready..."
sleep 5

# Check if nginx needs to be refreshed (usually not needed, but just in case)
if check_service_health "nginx"; then
    echo "   Refreshing nginx configuration..."
    docker compose exec nginx nginx -s reload
fi

END_TIME=$(date +%s)
DOWNTIME=$((END_TIME - START_TIME))

echo "✅ Web deployment complete! (downtime: ${DOWNTIME}s)"

# 7. Health checks
echo ""
echo "🏥 Running health checks..."

# Wait a bit more for service to fully start
sleep 3

# Check web container status
if check_service_health "web"; then
    echo "✅ Web container is running"
else
    echo "❌ Web container failed to start!"
    echo "   Check logs with: docker compose logs web"
    exit 1
fi

# Check nginx can reach web
if check_service_health "nginx"; then
    echo "✅ Nginx is running"
    
    # Test web through nginx
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Web is accessible through nginx (HTTP $HTTP_STATUS)"
    else
        echo "⚠️  Web returned HTTP $HTTP_STATUS (may need time to initialize)"
    fi
else
    echo "⚠️  Nginx is not running (web still accessible directly)"
fi

# 8. API integration check
echo ""
echo "🔗 Testing API integration..."

# Test if web can reach API (through nginx proxy)
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ Web → API proxy is working (HTTP $API_STATUS)"
else
    echo "⚠️  Web → API proxy returned HTTP $API_STATUS"
    echo "   Direct API check..."
    API_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")
    if [ "$API_DIRECT" = "200" ]; then
        echo "   ✅ API is working directly (nginx proxy issue)"
    else
        echo "   ❌ API is not responding"
    fi
fi

# 9. Final status report
echo ""
echo "📊 Final Status Report"
echo "====================="
echo ""

# Show current containers
echo "🐳 Container Status:"
docker compose ps

echo ""
echo "📈 Resource Usage:"
docker stats --no-stream nb-web nb-nginx 2>/dev/null || echo "   (Stats not available)"

# 10. Cleanup old images (optional)
echo ""
echo "🧹 Cleaning up..."

# Remove old web images (keep last 3)
OLD_IMAGES=$(docker images neuroboost-web --format "{{.ID}}" | tail -n +4)
if [ -n "$OLD_IMAGES" ]; then
    echo "   Removing old web images..."
    echo "$OLD_IMAGES" | xargs docker rmi >/dev/null 2>&1 || true
    echo "✅ Old images cleaned up"
fi

# Remove dangling images
docker image prune -f >/dev/null 2>&1

echo ""
echo "🎉 Web-Only Deployment Complete!"
echo "================================"
echo ""
echo "📍 Updated Service:"
echo "   • Web UI: http://193.104.57.79"
echo "   • Direct:  http://193.104.57.79:80"
echo ""
echo "🔄 Unchanged Services:"
echo "   • API: http://193.104.57.79/api"
echo "   • Database: PostgreSQL (no interruption)"
echo "   • Telegram Bot: (no interruption)"
echo ""
echo "⚡ Total downtime: ${DOWNTIME} seconds"
echo ""

if [ "$BACKUP_ENABLED" = true ]; then
    echo "💾 Rollback available:"
    echo "   docker tag $BACKUP_TAG neuroboost-web:latest"
    echo "   docker compose up -d web"
    echo ""
fi

echo "🔧 Troubleshooting:"
echo "   • View logs: docker compose logs -f web"
echo "   • Restart web: docker compose restart web"
echo "   • Restart nginx: docker compose restart nginx"
echo "   • Full rollback: ./deploy.sh"
echo ""

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    echo "📋 Recent Web Logs:"
    echo "=================="
    docker compose logs --tail=20 web
fi

echo "✨ Web frontend successfully updated!"
#!/bin/bash
# quick-web.sh - Ultra-fast web updates for development
# Usage: ./quick-web.sh

set -e

echo "⚡ Quick Web Update"
echo "=================="

# Check if web is running
if ! docker compose ps | grep -q "nb-web.*Up"; then
    echo "❌ Web container not running. Use ./deploy-web-only.sh instead."
    exit 1
fi

echo "🏗️  Building..."
docker compose build web --quiet

echo "🔄 Restarting..."
docker compose restart web nginx

echo "⏳ Waiting..."
sleep 3

# Quick health check
if curl -f -s http://localhost/ >/dev/null; then
    echo "✅ Updated! http://193.104.57.79"
else
    echo "⚠️  May need more time to start..."
fi

echo "📊 Status:"
docker compose ps web nginx
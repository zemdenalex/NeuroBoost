#!/bin/bash
# docker-start.sh - Quick start script for NeuroBoost Docker deployment

set -e

echo "🚀 NeuroBoost Docker Deployment Script"
echo "======================================"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker installation
if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        echo "📝 Creating .env from .env.production template..."
        cp .env.production .env
        echo "⚠️  Please edit .env file and set your configuration values"
        echo "   Especially: TELEGRAM_BOT_TOKEN and POSTGRES_PASSWORD"
        echo ""
        read -p "Press Enter after you've edited the .env file..."
    else
        echo "❌ No .env file found. Please create one from the template."
        exit 1
    fi
fi

# Parse command
MODE=${1:-dev}

case $MODE in
    "dev")
        echo "🔧 Starting in DEVELOPMENT mode..."
        echo ""
        
        # Start services
        echo "Starting database..."
        docker-compose up -d db
        
        echo "Waiting for database to be ready..."
        sleep 5
        
        echo "Starting API and Bot services..."
        docker-compose up -d api bot
        
        echo "Starting Web UI..."
        docker-compose --profile with-web up -d web
        
        echo ""
        echo "✅ Development environment is running!"
        echo ""
        echo "📍 Services available at:"
        echo "   - API:      http://localhost:3001/health"
        echo "   - Bot:      http://localhost:3002/health"
        echo "   - Web UI:   http://localhost:5173"
        echo "   - Database: postgresql://localhost:5433/neuroboost"
        echo ""
        echo "📝 View logs with:"
        echo "   docker-compose logs -f api"
        echo "   docker-compose logs -f bot"
        echo ""
        ;;
        
    "prod")
        echo "🚀 Starting in PRODUCTION mode..."
        echo ""
        
        # Build images
        echo "Building Docker images..."
        docker-compose build
        
        # Start core services
        echo "Starting services..."
        docker-compose up -d
        
        echo ""
        echo "✅ Production environment is running!"
        echo ""
        echo "📍 Services available at:"
        echo "   - API: http://localhost:3001/health"
        echo "   - Bot: http://localhost:3002/health"
        echo ""
        echo "⚠️  Don't forget to:"
        echo "   1. Setup nginx reverse proxy"
        echo "   2. Configure SSL certificates"
        echo "   3. Setup domain DNS"
        echo ""
        ;;
        
    "stop")
        echo "⏹️  Stopping all services..."
        docker-compose down
        echo "✅ All services stopped"
        ;;
        
    "restart")
        echo "🔄 Restarting all services..."
        docker-compose restart
        echo "✅ All services restarted"
        ;;
        
    "logs")
        SERVICE=${2:-all}
        if [ "$SERVICE" = "all" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f $SERVICE
        fi
        ;;
        
    "status")
        echo "📊 Service Status:"
        echo ""
        docker-compose ps
        echo ""
        echo "📈 Resource Usage:"
        docker stats --no-stream
        ;;
        
    "backup")
        echo "💾 Creating backup..."
        BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p $BACKUP_DIR
        
        # Backup database
        docker-compose exec -T db pg_dump -U nb_user neuroboost | gzip > $BACKUP_DIR/database.sql.gz
        
        # Backup environment
        cp .env $BACKUP_DIR/
        
        echo "✅ Backup created in $BACKUP_DIR"
        ;;
        
    "migrate")
        echo "🔄 Running database migrations..."
        docker-compose exec api pnpm prisma migrate deploy
        echo "✅ Migrations completed"
        ;;
        
    "clean")
        echo "🧹 Cleaning up Docker resources..."
        docker system prune -a --volumes
        echo "✅ Cleanup completed"
        ;;
        
    *)
        echo "Usage: $0 [dev|prod|stop|restart|logs|status|backup|migrate|clean]"
        echo ""
        echo "Commands:"
        echo "  dev      - Start in development mode with hot-reload"
        echo "  prod     - Start in production mode"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs (optionally specify service: logs api)"
        echo "  status   - Show service status and resource usage"
        echo "  backup   - Create database backup"
        echo "  migrate  - Run database migrations"
        echo "  clean    - Clean up Docker resources"
        ;;
esac
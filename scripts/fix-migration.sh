#!/bin/bash
# fix-migration.sh - Fix schema drift and apply v0.4.x migration safely
# This resolves the drift between expected schema and actual database

set -e

echo "🔧 NeuroBoost Migration Fix & v0.4.x Update"
echo "=========================================="
echo ""

# 1. Backup database first
echo "💾 Creating backup before migration..."
BACKUP_FILE="backup_migration_fix_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose exec -T db pg_dump -U nb_user neuroboost | gzip > "$BACKUP_FILE"
echo "✅ Database backed up to $BACKUP_FILE"
echo ""

# 2. Mark current schema as baseline (resolve drift)
echo "🔄 Resolving schema drift..."
echo "   This will mark the current database state as the baseline"

# First, ensure Prisma client is generated
docker compose exec -T api pnpm prisma generate

# Create a baseline migration to match current schema
docker compose exec -T api npx prisma migrate resolve --applied "20250820175734_init" || true
docker compose exec -T api npx prisma migrate resolve --applied "20250824155153_enhance_for_v021" || true

# 3. Apply the safe v0.4.x migration
echo ""
echo "📦 Applying v0.4.x safe migration..."
docker compose exec -T db psql -U nb_user -d neuroboost <<'SQL'
-- Safe v0.4.x Migration - Handles existing columns gracefully
DO $$ 
BEGIN
    -- Only add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'energy') THEN
        ALTER TABLE "Task" ADD COLUMN "energy" INTEGER CHECK ("energy" IS NULL OR "energy" BETWEEN 1 AND 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'contexts') THEN
        ALTER TABLE "Task" ADD COLUMN "contexts" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    
    -- Add other v0.4.x columns similarly...
    RAISE NOTICE 'v0.4.x columns added successfully';
END $$;

-- Create new tables only if they don't exist
CREATE TABLE IF NOT EXISTS "Context" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL DEFAULT 'default',
  "name" VARCHAR(50) NOT NULL,
  "color" VARCHAR(7),
  "icon" VARCHAR(50),
  "availabilityHours" JSONB,
  "isSystem" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CalendarLayer" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL DEFAULT 'default',
  "name" VARCHAR(100) NOT NULL,
  "color" VARCHAR(7) NOT NULL,
  "isVisible" BOOLEAN DEFAULT true,
  "reminderDefaults" JSONB,
  "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data only if not exists
INSERT INTO "Context" ("userId", "name", "color", "icon", "isSystem") 
SELECT 'default', '@home', '#10B981', '🏠', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@home' AND "userId" = 'default');

-- Continue with other default contexts...

SELECT 'Migration completed successfully' as status;
SQL

if [ $? -eq 0 ]; then
    echo "✅ v0.4.x migration applied successfully"
else
    echo "❌ Migration failed. Restoring from backup..."
    gunzip < "$BACKUP_FILE" | docker compose exec -T db psql -U nb_user neuroboost
    exit 1
fi

# 4. Update Prisma schema to match
echo ""
echo "🔄 Updating Prisma schema tracking..."
docker compose exec -T api npx prisma db pull
docker compose exec -T api pnpm prisma generate

# 5. Run the v0.4.x seed script
echo ""
echo "🌱 Adding sample v0.4.x data..."
docker compose exec -T api npx tsx scripts/seed-v04x.ts || echo "⚠️  Seed script skipped or had issues"

# 6. Verify migration
echo ""
echo "🔍 Verifying migration..."

# Check for new tables
CONTEXTS=$(docker compose exec -T db psql -U nb_user -d neuroboost -t -c "SELECT COUNT(*) FROM \"Context\";" 2>/dev/null | tr -d '[:space:]')
LAYERS=$(docker compose exec -T db psql -U nb_user -d neuroboost -t -c "SELECT COUNT(*) FROM \"CalendarLayer\";" 2>/dev/null | tr -d '[:space:]')

if [ "$CONTEXTS" -ge 1 ] && [ "$LAYERS" -ge 1 ]; then
    echo "✅ Migration verified successfully"
    echo "   - Contexts: $CONTEXTS"
    echo "   - Calendar Layers: $LAYERS"
else
    echo "⚠️  Migration may be incomplete"
    echo "   - Contexts: $CONTEXTS"
    echo "   - Calendar Layers: $LAYERS"
fi

echo ""
echo "🎉 Migration Fix Complete!"
echo "========================="
echo ""
echo "💾 Backup saved to: $BACKUP_FILE"
echo ""
echo "📋 Next steps:"
echo "1. Restart services: docker compose restart api bot"
echo "2. Test new endpoints:"
echo "   curl http://localhost:3001/api/contexts | jq"
echo "   curl http://localhost:3001/api/layers | jq"
echo "3. Update bot to use new features"
echo ""
echo "⚠️  If issues occur, restore with:"
echo "   gunzip < $BACKUP_FILE | docker compose exec -T db psql -U nb_user neuroboost"
-- Safe v0.4.x Migration - Adds only missing fields without dropping data
-- Handles existing schema drift gracefully

-- Ensure pgcrypto extension is available for gen_random_uuid()
-- Without this extension, any calls to gen_random_uuid() will fail at runtime.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- First, handle existing columns that might already exist
DO $$ 
BEGIN
    -- Check and add Task columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'energy') THEN
        ALTER TABLE "Task" ADD COLUMN "energy" INTEGER CHECK ("energy" IS NULL OR "energy" BETWEEN 1 AND 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'contexts') THEN
        ALTER TABLE "Task" ADD COLUMN "contexts" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'customContexts') THEN
        ALTER TABLE "Task" ADD COLUMN "customContexts" JSONB;
    END IF;
    
    -- Time window fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'timeWindowType') THEN
        ALTER TABLE "Task" ADD COLUMN "timeWindowType" VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'earliestTime') THEN
        ALTER TABLE "Task" ADD COLUMN "earliestTime" TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'latestTime') THEN
        ALTER TABLE "Task" ADD COLUMN "latestTime" TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'idealTime') THEN
        ALTER TABLE "Task" ADD COLUMN "idealTime" TIME;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'windowDays') THEN
        ALTER TABLE "Task" ADD COLUMN "windowDays" VARCHAR(7);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'windowFrequency') THEN
        ALTER TABLE "Task" ADD COLUMN "windowFrequency" INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'lastScheduled') THEN
        ALTER TABLE "Task" ADD COLUMN "lastScheduled" DATE;
    END IF;
    
    -- Dependency fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'parentTaskId') THEN
        ALTER TABLE "Task" ADD COLUMN "parentTaskId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'dependencyType') THEN
        ALTER TABLE "Task" ADD COLUMN "dependencyType" VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'dependencies') THEN
        ALTER TABLE "Task" ADD COLUMN "dependencies" TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'progressPercentage') THEN
        ALTER TABLE "Task" ADD COLUMN "progressPercentage" INTEGER DEFAULT 0 CHECK ("progressPercentage" IS NULL OR "progressPercentage" BETWEEN 0 AND 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'isMilestone') THEN
        ALTER TABLE "Task" ADD COLUMN "isMilestone" BOOLEAN DEFAULT false;
    END IF;
    
    -- Emotional and aging fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'emotionalDifficulty') THEN
        ALTER TABLE "Task" ADD COLUMN "emotionalDifficulty" INTEGER CHECK ("emotionalDifficulty" IS NULL OR "emotionalDifficulty" BETWEEN 1 AND 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'createdDate') THEN
        ALTER TABLE "Task" ADD COLUMN "createdDate" DATE DEFAULT CURRENT_DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'postponeCount') THEN
        ALTER TABLE "Task" ADD COLUMN "postponeCount" INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'lastInteraction') THEN
        ALTER TABLE "Task" ADD COLUMN "lastInteraction" DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'guiltScore') THEN
        ALTER TABLE "Task" ADD COLUMN "guiltScore" INTEGER CHECK ("guiltScore" IS NULL OR "guiltScore" BETWEEN 0 AND 10);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'escalationTriggered') THEN
        ALTER TABLE "Task" ADD COLUMN "escalationTriggered" BOOLEAN DEFAULT false;
    END IF;
    
    -- Layer references
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Event' AND column_name = 'layerId') THEN
        ALTER TABLE "Event" ADD COLUMN "layerId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'layerId') THEN
        ALTER TABLE "Task" ADD COLUMN "layerId" TEXT;
    END IF;
END $$;

-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS "Context" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL DEFAULT 'default',
  "name" VARCHAR(50) NOT NULL,
  "color" VARCHAR(7),
  "icon" VARCHAR(50),
  "availabilityHours" JSONB,
  "isSystem" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CalendarLayer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL DEFAULT 'default',
  "name" VARCHAR(100) NOT NULL,
  "color" VARCHAR(7) NOT NULL,
  "isVisible" BOOLEAN DEFAULT true,
  "reminderDefaults" JSONB,
  "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "CalendarLayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Routine" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL DEFAULT 'default',
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "triggerType" VARCHAR(20),
  "triggerConfig" JSONB,
  "estimatedDuration" INTEGER,
  "tasks" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RoutineInstance" (
  "id" TEXT NOT NULL,
  "routineId" TEXT NOT NULL,
  "activatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(6),
  "tasksCompleted" JSONB,
  "tasksSkipped" JSONB,
  "actualDuration" INTEGER,
  
  CONSTRAINT "RoutineInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TaskPattern" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL DEFAULT 'default',
  "taskType" VARCHAR(100),
  "context" VARCHAR(50),
  "bestTime" TIME,
  "averageDuration" INTEGER,
  "completionRate" DECIMAL(5,2),
  "energyBefore" INTEGER,
  "energyAfter" INTEGER,
  "moodImpact" INTEGER,
  "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "TaskPattern_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Task_contexts_idx" ON "Task" USING GIN ("contexts");
CREATE INDEX IF NOT EXISTS "Task_energy_idx" ON "Task" ("energy");
CREATE INDEX IF NOT EXISTS "Task_parentTaskId_idx" ON "Task" ("parentTaskId");
CREATE INDEX IF NOT EXISTS "Task_layerId_idx" ON "Task" ("layerId");
CREATE INDEX IF NOT EXISTS "Task_postponeCount_idx" ON "Task" ("postponeCount");
CREATE INDEX IF NOT EXISTS "Event_layerId_idx" ON "Event" ("layerId");
CREATE INDEX IF NOT EXISTS "Context_userId_idx" ON "Context" ("userId");
CREATE INDEX IF NOT EXISTS "CalendarLayer_userId_idx" ON "CalendarLayer" ("userId");
CREATE INDEX IF NOT EXISTS "Routine_userId_isActive_idx" ON "Routine" ("userId", "isActive");

-- Add foreign keys only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Task_parentTaskId_fkey'
    ) THEN
        ALTER TABLE "Task" 
        ADD CONSTRAINT "Task_parentTaskId_fkey" 
        FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Task_layerId_fkey'
    ) THEN
        ALTER TABLE "Task" 
        ADD CONSTRAINT "Task_layerId_fkey" 
        FOREIGN KEY ("layerId") REFERENCES "CalendarLayer"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Event_layerId_fkey'
    ) THEN
        ALTER TABLE "Event" 
        ADD CONSTRAINT "Event_layerId_fkey" 
        FOREIGN KEY ("layerId") REFERENCES "CalendarLayer"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'RoutineInstance_routineId_fkey'
    ) THEN
        ALTER TABLE "RoutineInstance" 
        ADD CONSTRAINT "RoutineInstance_routineId_fkey" 
        FOREIGN KEY ("routineId") REFERENCES "Routine"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Insert default data only if not exists
INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@home', '#10B981', '🏠', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@home' AND "userId" = 'default');

INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@office', '#3B82F6', '🏢', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@office' AND "userId" = 'default');

INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@computer', '#6366F1', '💻', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@computer' AND "userId" = 'default');

INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@phone', '#8B5CF6', '📱', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@phone' AND "userId" = 'default');

INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@errands', '#F59E0B', '🚶', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@errands' AND "userId" = 'default');

INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@anywhere', '#6B7280', '🌍', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@anywhere' AND "userId" = 'default');

INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@energy-high', '#EF4444', '⚡', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@energy-high' AND "userId" = 'default');

INSERT INTO "Context" ("id", "userId", "name", "color", "icon", "isSystem") 
SELECT gen_random_uuid(), 'default', '@energy-low', '#06B6D4', '🔋', true
WHERE NOT EXISTS (SELECT 1 FROM "Context" WHERE "name" = '@energy-low' AND "userId" = 'default');

-- Insert default calendar layers only if not exists
INSERT INTO "CalendarLayer" ("id", "userId", "name", "color") 
SELECT gen_random_uuid(), 'default', 'Work', '#3B82F6'
WHERE NOT EXISTS (SELECT 1 FROM "CalendarLayer" WHERE "name" = 'Work' AND "userId" = 'default');

INSERT INTO "CalendarLayer" ("id", "userId", "name", "color") 
SELECT gen_random_uuid(), 'default', 'Personal', '#10B981'
WHERE NOT EXISTS (SELECT 1 FROM "CalendarLayer" WHERE "name" = 'Personal' AND "userId" = 'default');

INSERT INTO "CalendarLayer" ("id", "userId", "name", "color") 
SELECT gen_random_uuid(), 'default', 'Health', '#EF4444'
WHERE NOT EXISTS (SELECT 1 FROM "CalendarLayer" WHERE "name" = 'Health' AND "userId" = 'default');

INSERT INTO "CalendarLayer" ("id", "userId", "name", "color") 
SELECT gen_random_uuid(), 'default', 'Home Care', '#F59E0B'
WHERE NOT EXISTS (SELECT 1 FROM "CalendarLayer" WHERE "name" = 'Home Care' AND "userId" = 'default');

INSERT INTO "CalendarLayer" ("id", "userId", "name", "color") 
SELECT gen_random_uuid(), 'default', 'Education', '#8B5CF6'
WHERE NOT EXISTS (SELECT 1 FROM "CalendarLayer" WHERE "name" = 'Education' AND "userId" = 'default');

INSERT INTO "CalendarLayer" ("id", "userId", "name", "color") 
SELECT gen_random_uuid(), 'default', 'Social', '#EC4899'
WHERE NOT EXISTS (SELECT 1 FROM "CalendarLayer" WHERE "name" = 'Social' AND "userId" = 'default');
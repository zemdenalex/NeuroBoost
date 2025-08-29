/*
  Warnings:

  - The `tags` column on the `QuickNote` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `channel` column on the `Reminder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[eventId,occurrence]` on the table `EventException` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId]` on the table `Reflection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('TELEGRAM', 'WEB', 'DESKTOP', 'EMAIL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TaskStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "color" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isMultiDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ExportRun" ADD COLUMN     "errorMessage" TEXT;

-- AlterTable
ALTER TABLE "QuickNote" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'web',
DROP COLUMN "tags",
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Reflection" ADD COLUMN     "actualEndsAt" TIMESTAMPTZ(6),
ADD COLUMN     "actualStartsAt" TIMESTAMPTZ(6),
ADD COLUMN     "wasCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "wasOnTime" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "acknowledgedAt" TIMESTAMPTZ(6),
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deliveredAt" TIMESTAMPTZ(6),
ADD COLUMN     "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "message" TEXT,
DROP COLUMN "channel",
ADD COLUMN     "channel" "ReminderChannel" NOT NULL DEFAULT 'TELEGRAM';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueDate" TIMESTAMPTZ(6),
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT,
    "state" TEXT NOT NULL,
    "data" JSONB,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "workingHoursStart" INTEGER NOT NULL DEFAULT 9,
    "workingHoursEnd" INTEGER NOT NULL DEFAULT 18,
    "workingDays" TEXT[] DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri']::TEXT[],
    "enableTelegram" BOOLEAN NOT NULL DEFAULT true,
    "enableWeb" BOOLEAN NOT NULL DEFAULT true,
    "enableDesktop" BOOLEAN NOT NULL DEFAULT false,
    "shortEventReminder" INTEGER NOT NULL DEFAULT 3,
    "mediumEventReminder" INTEGER NOT NULL DEFAULT 5,
    "longEventReminder" INTEGER NOT NULL DEFAULT 30,
    "obsidianVaultPath" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramSession_expiresAt_idx" ON "TelegramSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSession_chatId_key" ON "TelegramSession"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "Event_startsAt_endsAt_idx" ON "Event"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Event_rrule_idx" ON "Event"("rrule");

-- CreateIndex
CREATE UNIQUE INDEX "EventException_eventId_occurrence_key" ON "EventException"("eventId", "occurrence");

-- CreateIndex
CREATE INDEX "ExportRun_startedAt_idx" ON "ExportRun"("startedAt");

-- CreateIndex
CREATE INDEX "QuickNote_source_idx" ON "QuickNote"("source");

-- CreateIndex
CREATE INDEX "QuickNote_createdAt_idx" ON "QuickNote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reflection_eventId_key" ON "Reflection"("eventId");

-- CreateIndex
CREATE INDEX "Reminder_isDelivered_deliveredAt_idx" ON "Reminder"("isDelivered", "deliveredAt");

-- CreateIndex
CREATE INDEX "Task_priority_status_idx" ON "Task"("priority", "status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

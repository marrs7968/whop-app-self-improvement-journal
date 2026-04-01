-- AlterTable
ALTER TABLE "users" ADD COLUMN "companyId" TEXT;
ALTER TABLE "users" ADD COLUMN "experienceId" TEXT;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_whopUserId_key";
CREATE INDEX IF NOT EXISTS "users_whopUserId_idx" ON "users"("whopUserId");
CREATE INDEX IF NOT EXISTS "users_companyId_idx" ON "users"("companyId");

-- AlterTable
ALTER TABLE "drafts" ADD COLUMN "companyId" TEXT;
ALTER TABLE "drafts" ADD COLUMN "experienceId" TEXT;
CREATE INDEX IF NOT EXISTS "drafts_companyId_weekStartISO_sectionKey_idx" ON "drafts"("companyId","weekStartISO","sectionKey");

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "companyId" TEXT;
ALTER TABLE "submissions" ADD COLUMN "experienceId" TEXT;
CREATE INDEX IF NOT EXISTS "submissions_companyId_submittedAt_idx" ON "submissions"("companyId","submittedAt");
CREATE INDEX IF NOT EXISTS "submissions_companyId_sectionKey_submittedAt_idx" ON "submissions"("companyId","sectionKey","submittedAt");

-- Enums
DO $$ BEGIN
  CREATE TYPE "ChallengeCadence" AS ENUM ('DAILY', 'SPRINT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'DAILY_CHALLENGE_REMINDER',
    'SPRINT_MILESTONE_REMINDER',
    'REENGAGEMENT',
    'CONSISTENCY_LEADERBOARD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationTargetType" AS ENUM ('CHANNEL', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "creator_dashboard_configs" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "defaultChannelId" TEXT,
  "reengagementInactiveDays" INTEGER NOT NULL DEFAULT 14,
  "reengagementCooldownDays" INTEGER NOT NULL DEFAULT 7,
  "leaderboardIntervalMonths" INTEGER NOT NULL DEFAULT 2,
  "leaderboardTopN" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "creator_dashboard_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "creator_dashboard_configs_companyId_key" ON "creator_dashboard_configs"("companyId");

CREATE TABLE IF NOT EXISTS "challenges" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "experienceId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "cadence" "ChallengeCadence" NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reminderHourUtc" INTEGER,
  "channelId" TEXT NOT NULL,
  "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "challenges_companyId_status_startsAt_idx" ON "challenges"("companyId","status","startsAt");

CREATE TABLE IF NOT EXISTS "challenge_participants" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastProofAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "challenge_participants_challengeId_userId_key" ON "challenge_participants"("challengeId","userId");
CREATE INDEX IF NOT EXISTS "challenge_participants_userId_isActive_idx" ON "challenge_participants"("userId","isActive");

CREATE TABLE IF NOT EXISTS "challenge_proofs" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "proofText" TEXT,
  "mediaIds" TEXT NOT NULL DEFAULT '[]',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "challenge_proofs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "challenge_proofs_challengeId_submittedAt_idx" ON "challenge_proofs"("challengeId","submittedAt");
CREATE INDEX IF NOT EXISTS "challenge_proofs_userId_submittedAt_idx" ON "challenge_proofs"("userId","submittedAt");

CREATE TABLE IF NOT EXISTS "notification_jobs" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "companyId" TEXT NOT NULL,
  "experienceId" TEXT,
  "challengeId" TEXT,
  "windowStart" TIMESTAMP(3),
  "windowEnd" TIMESTAMP(3),
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "runAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notification_jobs_companyId_type_scheduledFor_idx" ON "notification_jobs"("companyId","type","scheduledFor");
CREATE INDEX IF NOT EXISTS "notification_jobs_status_scheduledFor_idx" ON "notification_jobs"("status","scheduledFor");

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" TEXT NOT NULL,
  "notificationType" "NotificationType" NOT NULL,
  "companyId" TEXT NOT NULL,
  "challengeId" TEXT,
  "targetType" "NotificationTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "userId" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "errorMessage" TEXT,
  "payload" JSONB,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_dedupeKey_key" ON "notification_deliveries"("dedupeKey");
CREATE INDEX IF NOT EXISTS "notification_deliveries_companyId_notificationType_sentAt_idx" ON "notification_deliveries"("companyId","notificationType","sentAt");
CREATE INDEX IF NOT EXISTS "notification_deliveries_challengeId_sentAt_idx" ON "notification_deliveries"("challengeId","sentAt");

CREATE TABLE IF NOT EXISTS "user_engagement_daily" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dateISO" TEXT NOT NULL,
  "dailyCount" INTEGER NOT NULL DEFAULT 0,
  "reflectionCount" INTEGER NOT NULL DEFAULT 0,
  "weighInCount" INTEGER NOT NULL DEFAULT 0,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_engagement_daily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_engagement_daily_companyId_userId_dateISO_key" ON "user_engagement_daily"("companyId","userId","dateISO");
CREATE INDEX IF NOT EXISTS "user_engagement_daily_companyId_dateISO_idx" ON "user_engagement_daily"("companyId","dateISO");

-- Foreign keys
ALTER TABLE "challenge_participants"
  ADD CONSTRAINT "challenge_participants_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_participants"
  ADD CONSTRAINT "challenge_participants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "challenge_proofs"
  ADD CONSTRAINT "challenge_proofs_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_proofs"
  ADD CONSTRAINT "challenge_proofs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_jobs"
  ADD CONSTRAINT "notification_jobs_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

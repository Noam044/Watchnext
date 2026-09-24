-- AlterTable
ALTER TABLE "LetterboxdProfile" ADD COLUMN     "lastSyncAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "syncStartedAt" TIMESTAMP(3);


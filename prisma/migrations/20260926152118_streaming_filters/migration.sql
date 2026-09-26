-- AlterTable
ALTER TABLE "Film" ADD COLUMN     "originalLanguage" TEXT,
ADD COLUMN     "providers" JSONB,
ADD COLUMN     "providersAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "streamingProviders" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "watchRegion" TEXT NOT NULL DEFAULT 'FR';

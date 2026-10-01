-- AlterTable
ALTER TABLE "ImportEntry" ADD COLUMN     "ratedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserFilm" ADD COLUMN     "ratedAt" TIMESTAMP(3);

-- Notes existantes : la date du dernier visionnage est la meilleure approximation disponible.
UPDATE "UserFilm" SET "ratedAt" = "watchedAt" WHERE "rating" IS NOT NULL AND "watchedAt" IS NOT NULL;

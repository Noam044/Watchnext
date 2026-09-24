-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "emblemFilmId" TEXT,
ADD COLUMN     "handle" TEXT,
ADD COLUMN     "publicProfile" BOOLEAN NOT NULL DEFAULT false;

-- Backfill : pseudo Letterboxd, sinon partie locale de l'email, nettoyé et dédoublonné.
WITH base AS (
  SELECT u."id",
         left(regexp_replace(lower(coalesce(nullif(lp."username", ''), split_part(u."email", '@', 1))), '[^a-z0-9_]', '', 'g'), 20) AS b
  FROM "User" u
  LEFT JOIN "LetterboxdProfile" lp ON lp."userId" = u."id"
), padded AS (
  SELECT "id", CASE WHEN length(b) < 3 THEN b || 'cine' ELSE b END AS b FROM base
), ranked AS (
  SELECT "id", b, row_number() OVER (PARTITION BY b ORDER BY "id") AS n FROM padded
)
UPDATE "User" u
SET "handle" = CASE WHEN r.n = 1 THEN r.b ELSE r.b || '_' || r.n END
FROM ranked r
WHERE r."id" = u."id";

ALTER TABLE "User" ALTER COLUMN "handle" SET NOT NULL;

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_status_idx" ON "Friendship"("addresseeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_emblemFilmId_fkey" FOREIGN KEY ("emblemFilmId") REFERENCES "Film"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

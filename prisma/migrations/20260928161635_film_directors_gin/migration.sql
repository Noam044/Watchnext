-- CreateIndex
CREATE INDEX "Film_directors_idx" ON "Film" USING GIN ("directors" jsonb_path_ops);

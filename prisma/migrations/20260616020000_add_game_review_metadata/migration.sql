ALTER TABLE "Game"
  ADD COLUMN "openingName" TEXT,
  ADD COLUMN "openingEco" TEXT,
  ADD COLUMN "bookExitPly" INTEGER,
  ADD COLUMN "bookExitMove" TEXT,
  ADD COLUMN "reviewSnapshot" JSONB,
  ADD COLUMN "reviewSnapshotUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "averageAccuracy" DOUBLE PRECISION,
  ADD COLUMN "blunders" INTEGER,
  ADD COLUMN "shareToken" TEXT,
  ADD COLUMN "shareEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Game_shareToken_key" ON "Game"("shareToken");

-- AlterTable
ALTER TABLE "Friendly" ADD COLUMN     "categoryFormat" TEXT,
ADD COLUMN     "matchId" TEXT,
ADD COLUMN     "modality" TEXT,
ADD COLUMN     "refereeCode" TEXT,
ADD COLUMN     "refereeCodeExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "friendlyId" TEXT,
ALTER COLUMN "bracketId" DROP NOT NULL,
ALTER COLUMN "round" SET DEFAULT 0,
ALTER COLUMN "position" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "FriendlyAthlete" (
    "id" TEXT NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "side" TEXT NOT NULL,

    CONSTRAINT "FriendlyAthlete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FriendlyAthlete_friendlyId_idx" ON "FriendlyAthlete"("friendlyId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendlyAthlete_friendlyId_teamMemberId_key" ON "FriendlyAthlete"("friendlyId", "teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendly_matchId_key" ON "Friendly"("matchId");

-- CreateIndex
CREATE INDEX "Friendly_matchId_idx" ON "Friendly"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_friendlyId_key" ON "Match"("friendlyId");

-- CreateIndex
CREATE INDEX "Match_friendlyId_idx" ON "Match"("friendlyId");

-- AddForeignKey
ALTER TABLE "FriendlyAthlete" ADD CONSTRAINT "FriendlyAthlete_friendlyId_fkey" FOREIGN KEY ("friendlyId") REFERENCES "Friendly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyAthlete" ADD CONSTRAINT "FriendlyAthlete_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_friendlyId_fkey" FOREIGN KEY ("friendlyId") REFERENCES "Friendly"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendly" ADD CONSTRAINT "Friendly_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

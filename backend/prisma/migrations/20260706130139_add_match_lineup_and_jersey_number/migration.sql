-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "jerseyNumber" INTEGER;

-- CreateTable
CREATE TABLE "MatchLineupSlot" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "teamMemberId" UUID NOT NULL,

    CONSTRAINT "MatchLineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchLineupSlot_matchId_setNumber_idx" ON "MatchLineupSlot"("matchId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineupSlot_matchId_setNumber_team_position_key" ON "MatchLineupSlot"("matchId", "setNumber", "team", "position");

-- AddForeignKey
ALTER TABLE "MatchLineupSlot" ADD CONSTRAINT "MatchLineupSlot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineupSlot" ADD CONSTRAINT "MatchLineupSlot_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MatchEventType" ADD VALUE 'POINT';
ALTER TYPE "MatchEventType" ADD VALUE 'MATCH_START';
ALTER TYPE "MatchEventType" ADD VALUE 'SET_FINISH';
ALTER TYPE "MatchEventType" ADD VALUE 'MATCH_FINISH';
ALTER TYPE "MatchEventType" ADD VALUE 'WALKOVER';
ALTER TYPE "MatchEventType" ADD VALUE 'SIDE_SWITCH';

-- DropForeignKey
ALTER TABLE "TournamentReferee" DROP CONSTRAINT "TournamentReferee_userId_fkey";

-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "scoreA" INTEGER,
ADD COLUMN     "scoreB" INTEGER,
ADD COLUMN     "team" TEXT;

-- AddForeignKey
ALTER TABLE "TournamentReferee" ADD CONSTRAINT "TournamentReferee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

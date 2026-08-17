-- AlterEnum
ALTER TYPE "BracketType" ADD VALUE 'GROUPS_THEN_ELIMINATION';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "group" INTEGER;

-- AlterTable
ALTER TABLE "TournamentCategory" ADD COLUMN     "bracketType" "BracketType",
ADD COLUMN     "groupsCount" INTEGER,
ADD COLUMN     "teamsAdvancing" INTEGER,
ADD COLUMN     "teamsPerGroup" INTEGER;

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_friendlyId_fkey";

-- AlterTable
ALTER TABLE "FriendlyAthlete" ADD COLUMN     "isCaptain" BOOLEAN NOT NULL DEFAULT false;

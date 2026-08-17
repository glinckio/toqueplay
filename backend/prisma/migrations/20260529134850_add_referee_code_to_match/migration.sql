-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "refereeCode" TEXT,
ADD COLUMN     "refereeCodeExpiresAt" TIMESTAMP(3);

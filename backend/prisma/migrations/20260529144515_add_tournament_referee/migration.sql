-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "refereeCode" TEXT,
ADD COLUMN     "refereeCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "refereeId" TEXT;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

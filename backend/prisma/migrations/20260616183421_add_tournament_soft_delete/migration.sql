-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Tournament_deletedAt_idx" ON "Tournament"("deletedAt");

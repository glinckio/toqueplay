/*
  Warnings:

  - You are about to drop the column `refereeId` on the `Tournament` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tournament" DROP CONSTRAINT "Tournament_refereeId_fkey";

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "refereeId";

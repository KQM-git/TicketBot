/*
  Warnings:

  - You are about to drop the column `transcriptId` on the `Verification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_transcriptId_fkey";

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "transcriptId";

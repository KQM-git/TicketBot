/*
  Warnings:

  - The `lastVerifierPing` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "lastVerifierPing",
ADD COLUMN     "lastVerifierPing" JSONB;

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "type" TEXT NOT NULL DEFAULT E'DEFAULT';

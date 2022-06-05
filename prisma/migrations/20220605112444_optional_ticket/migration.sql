-- DropForeignKey
ALTER TABLE "Transcript" DROP CONSTRAINT "Transcript_ticketId_fkey";

-- AlterTable
ALTER TABLE "Transcript" ALTER COLUMN "ticketId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "transcriptionId";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "statusUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

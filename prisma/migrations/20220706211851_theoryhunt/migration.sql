-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "theoryhuntId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "theoryhuntId" INTEGER;

-- CreateTable
CREATE TABLE "Theoryhunt" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT E'',
    "difficulty" TEXT NOT NULL,
    "difficultyReason" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "Theoryhunt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theoryhunt_messageId_key" ON "Theoryhunt"("messageId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_theoryhuntId_fkey" FOREIGN KEY ("theoryhuntId") REFERENCES "Theoryhunt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_theoryhuntId_fkey" FOREIGN KEY ("theoryhuntId") REFERENCES "Theoryhunt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Theoryhunt" ADD CONSTRAINT "Theoryhunt_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

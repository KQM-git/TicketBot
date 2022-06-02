-- CreateTable
CREATE TABLE "TicketDirectory" (
    "serverId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketDirectory_channelId_serverId_type_key" ON "TicketDirectory"("channelId", "serverId", "type");

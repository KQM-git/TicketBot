-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "initialName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueuedTranscript" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "botReplyId" TEXT NOT NULL,
    "botChannelId" TEXT NOT NULL,
    "upTo" TEXT,
    "latest" TEXT NOT NULL,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "transcriberId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "transcriptId" INTEGER NOT NULL,

    CONSTRAINT "QueuedTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "transcriptId" INTEGER,
    "ticketsId" INTEGER NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "discordId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "roleColor" TEXT,
    "nickname" TEXT,
    "username" TEXT,
    "tag" TEXT,
    "avatar" TEXT,
    "bot" BOOLEAN,
    "verified" BOOLEAN,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "discordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "attachments" JSONB[],
    "reactions" JSONB[],
    "embeds" JSONB[],
    "content" TEXT NOT NULL,
    "components" JSONB[],
    "stickers" JSONB[],
    "reply" TEXT,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "transcriptId" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TranscriptToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_slug_key" ON "Transcript"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "QueuedTranscript_transcriptId_key" ON "QueuedTranscript"("transcriptId");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_serverId_key" ON "User"("discordId", "serverId");

-- CreateIndex
CREATE UNIQUE INDEX "_TranscriptToUser_AB_unique" ON "_TranscriptToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_TranscriptToUser_B_index" ON "_TranscriptToUser"("B");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_serverId_fkey" FOREIGN KEY ("userId", "serverId") REFERENCES "User"("discordId", "serverId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueuedTranscript" ADD CONSTRAINT "QueuedTranscript_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueuedTranscript" ADD CONSTRAINT "QueuedTranscript_transcriberId_serverId_fkey" FOREIGN KEY ("transcriberId", "serverId") REFERENCES "User"("discordId", "serverId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueuedTranscript" ADD CONSTRAINT "QueuedTranscript_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_ticketsId_fkey" FOREIGN KEY ("ticketsId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_serverId_fkey" FOREIGN KEY ("userId", "serverId") REFERENCES "User"("discordId", "serverId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_serverId_fkey" FOREIGN KEY ("userId", "serverId") REFERENCES "User"("discordId", "serverId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TranscriptToUser" ADD CONSTRAINT "_TranscriptToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TranscriptToUser" ADD CONSTRAINT "_TranscriptToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketDirectory" ADD CONSTRAINT "TicketDirectory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

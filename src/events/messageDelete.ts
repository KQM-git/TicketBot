import { Message } from "discord.js"
import log4js from "log4js"
import client from "../main"

const Logger = log4js.getLogger("messageDelete")

export async function handle(message: Message): Promise<void> {
    try {
        if (!message.partial && message.author.id !== client.user?.id)
            return

        const td = await client.prisma.ticketDirectory.deleteMany({
            where: {
                messageId: message.id
            }
        })

        if (td.count > 0)
            Logger.info(`Deleted ${td.count} from ticket directory due to message deletion`)
    } catch (error) {
        Logger.error(error)
    }
}

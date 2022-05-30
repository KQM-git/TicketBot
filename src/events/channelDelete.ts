import { DMChannel, GuildChannel } from "discord.js"
import log4js from "log4js"
import client from "../main"
import { TicketStatus } from "../utils/Types"

const Logger = log4js.getLogger("channelDelete")

export async function handle(channel: DMChannel | GuildChannel): Promise<void> {
    if (!(channel instanceof GuildChannel)) return

    Logger.info(`Delete ${channel.id} - ${channel.name} in ${channel.guild.id}`)
    try {
        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: channel.id
            },
            select: {
                id: true,
                status: true
            }
        })

        if (ticket?.status == TicketStatus.OPEN) {
            await client.prisma.ticket.update({
                where: {
                    id: ticket.id
                },
                data: {
                    status: "DELETED"
                }
            })
            Logger.info(`Updated ticket ${ticket.id} from open to deleted.`)
        }
    } catch (error) {
        Logger.error(error)
    }
}

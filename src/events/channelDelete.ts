import { DMChannel, GuildChannel } from "discord.js"
import log4js from "log4js"
import client from "../main"
import { TicketStatus } from "../utils/Types"
import { isTicketable } from "../utils/Utils"

const Logger = log4js.getLogger("channelDelete")

export async function handle(channel: DMChannel | GuildChannel): Promise<void> {
    if (!(isTicketable(channel))) return

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

        if (ticket && ticket.status != TicketStatus.DELETED) {
            await client.prisma.ticket.update({
                where: {
                    id: ticket.id
                },
                data: {
                    status: TicketStatus.DELETED
                }
            })
            Logger.info(`Updated ticket ${ticket.id} from ${ticket.status} to deleted.`)
        }
    } catch (error) {
        Logger.error(error)
    }

    try {
        const td = await client.prisma.ticketDirectory.deleteMany({
            where: {
                channelId: channel.id
            }
        })
        if (td.count > 0)
            Logger.info(`Deleted ${td.count} from ticket directory due to channel deletion`)
    } catch (error) {
        Logger.error(error)
    }
}

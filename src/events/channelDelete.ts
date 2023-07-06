import { DMChannel, GuildChannel, ThreadChannel } from "discord.js"
import log4js from "log4js"
import client from "../main"
import { isTicketable } from "../utils/Utils"

const Logger = log4js.getLogger("channelDelete")

export async function handle(channel: DMChannel | GuildChannel | ThreadChannel): Promise<void> {
    if (!isTicketable(channel)) return

    Logger.info(`Delete channel ${channel.id}: ${channel.name} in ${channel.guild.id}`)
    try {
        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: channel.id
            },
            select: {
                id: true,
                status: true,
                deleted: true
            }
        })

        if (ticket && !ticket.deleted) {
            await client.prisma.ticket.update({
                where: {
                    id: ticket.id
                },
                data: {
                    deleted: true
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

    try {
        await client.prisma.channel.updateMany({
            where: {
                discordId: channel.id,
                serverId: channel.guildId
            },
            data: {
                name: channel.name ?? undefined,
                deleted: true
            }
        })
    } catch (error) {
        Logger.error(error)
    }
}

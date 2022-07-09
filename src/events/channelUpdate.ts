import { DMChannel, GuildChannel } from "discord.js"
import log4js from "log4js"
import client from "../main"
import { isTicketable } from "../utils/Utils"

const Logger = log4js.getLogger("channelUpdate")

export async function handle(old: DMChannel | GuildChannel, channel: DMChannel | GuildChannel): Promise<void> {
    if (!old) return
    if (old instanceof GuildChannel && channel instanceof GuildChannel && (
        old.position != channel.position ||
        old.calculatedPosition != channel.calculatedPosition ||
        old.rawPosition != channel.rawPosition ||
        old.parentId != channel.parentId
    ))
        Logger.info(`Channel move ${channel.id}: ${channel.name} | Pos: ${old.position} -> ${channel.position} / Raw: ${old.rawPosition} -> ${channel.rawPosition} / Calculated: ${old.calculatedPosition} -> ${channel.calculatedPosition} / Parent: ${old.parentId} -> ${channel.parentId}`)

    if (!isTicketable(channel) || !isTicketable(old)) return
    if (old.name == channel.name && old.type == channel.type) return

    Logger.info(`Update channel ${channel.id}: ${old.name} -> ${channel.name} / ${old.type} -> ${channel.type} in ${channel.guildId}`)

    try {
        await client.prisma.channel.updateMany({
            where: {
                discordId: channel.id,
                serverId: channel.guildId
            },
            data: {
                name: channel.name ?? undefined,
                type: channel.type
            }
        })
    } catch (error) {
        Logger.error(error)
    }
}

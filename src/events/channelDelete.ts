import { DMChannel, GuildChannel } from "discord.js"
import log4js from "log4js"

const Logger = log4js.getLogger("channelDelete")

export function handle(channel: DMChannel | GuildChannel): void {
    if (!(channel instanceof GuildChannel)) return

    Logger.info(`Delete ${channel.id} - ${channel.name} in ${channel.guild.id}`)
}

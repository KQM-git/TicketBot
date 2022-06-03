import { Guild } from "discord.js"
import log4js from "log4js"

const Logger = log4js.getLogger("left")

export function handle(guild: Guild): void {
    Logger.info(`Left ${guild.id}: ${guild.name} with ${guild.memberCount} members`)
}

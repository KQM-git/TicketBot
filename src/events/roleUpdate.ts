import { Role } from "discord.js"
import log4js from "log4js"
import client from "../main"

const Logger = log4js.getLogger("roleUpdate")

export async function handle(old: Role, role: Role): Promise<void> {
    if (old.name == role.name && old.color == role.color) return
    Logger.info(`Update role ${role.id}: ${old.name} -> ${role.name} / ${old.hexColor} -> ${role.hexColor} in ${role.guild.id}`)
    try {
        await client.prisma.role.updateMany({
            where: {
                discordId: role.id,
                serverId: role.guild.id
            },
            data: {
                name: role.name ?? undefined,
                roleColor: role.hexColor
            }
        })
    } catch (error) {
        Logger.error(error)
    }
}

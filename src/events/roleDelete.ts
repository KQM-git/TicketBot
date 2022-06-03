import { Role } from "discord.js"
import log4js from "log4js"
import client from "../main"

const Logger = log4js.getLogger("roleUpdate")

export async function handle(_: Role, role: Role): Promise<void> {
    Logger.info(`Deleted role ${role.id}:  ${role.name} in ${role.guild.id}`)
    try {
        await client.prisma.role.updateMany({
            where: {
                discordId: role.id,
                serverId: role.guild.id
            },
            data: {
                deleted: true
            }
        })
    } catch (error) {
        Logger.error(error)
    }
}

import { User } from "discord.js"
import log4js from "log4js"
import client from "../main"

const Logger = log4js.getLogger("memberUpdate")

export async function handle(old: User, user: User): Promise<void> {
    if (user.username == old.username && user.discriminator == old.discriminator && user.avatar == old.avatar) return
    try {
        const response = await client.prisma.user.updateMany({
            where: {
                discordId: user.id,
            },
            data: {
                username: user.username,
                tag: user.discriminator,
                avatar: user.avatar,
            }
        })
        if (response.count > 0)
            Logger.info(`Updated user ${user.id}: ${old.username}#${old.discriminator} -> ${user.username}#${user.discriminator}`)
    } catch (error) {
        Logger.error(error)
    }
}

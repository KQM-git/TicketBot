import { GuildMember } from "discord.js"
import log4js from "log4js"
import client from "../main"

const Logger = log4js.getLogger("userUpdate")

export async function handle(old: GuildMember, member: GuildMember): Promise<void> {
    if (member.displayColor == old.displayColor && member.nickname == old.nickname) return
    Logger.info(`Update member ${member.id}:  ${old.nickname} -> ${member.nickname} / ${old.displayHexColor} -> ${member.displayHexColor} in ${member.guild.id}`)
    try {
        await client.prisma.user.updateMany({
            where: {
                discordId: member.id,
                serverId: member.guild.id
            },
            data: {
                nickname: member.nickname,
                roleColor: member.displayHexColor
            }
        })
    } catch (error) {
        Logger.error(error)
    }
}

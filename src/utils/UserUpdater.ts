import { GuildMember, User } from "discord.js"
import log4js from "log4js"
import client from "../main"

const Logger = log4js.getLogger("userUpdater")

/**
 * The GuildMembers intent is privileged, so guildMemberUpdate/userUpdate barely fire anymore.
 * Instead, member/user data gets refreshed whenever Discord hands us one of these objects
 * (messages, interactions, ...). These caches keep us from spamming the DB with no-op updates.
 */
const memberCache: Map<string, string> = new Map()
const userCache: Map<string, string> = new Map()

const MAX_CACHE_SIZE = 25000

function isKnown(cache: Map<string, string>, key: string, value: string): boolean {
    if (cache.get(key) == value) return true
    if (cache.size >= MAX_CACHE_SIZE) cache.clear()
    cache.set(key, value)
    return false
}

/** Refreshes the nickname/role color of a member (and their user data) in the DB, if changed since last seen */
export async function updateMember(member: GuildMember): Promise<void> {
    await updateUser(member.user)
    if (member.partial) return

    const nickname = member.nickname
    const roleColor = member.displayHexColor
    const key = `${member.guild.id}-${member.id}`

    if (isKnown(memberCache, key, JSON.stringify([nickname, roleColor]))) return

    try {
        const response = await client.prisma.user.updateMany({
            where: {
                discordId: member.id,
                serverId: member.guild.id
            },
            data: {
                nickname,
                roleColor
            }
        })
        if (response.count > 0)
            Logger.debug(`Updated member ${member.id}: ${nickname} / ${roleColor} in ${member.guild.id}`)
    } catch (error) {
        memberCache.delete(key)
        Logger.error(error)
    }
}

/** Refreshes the username/tag/avatar of a user in the DB, if changed since last seen */
export async function updateUser(user: User): Promise<void> {
    if (user.partial) return

    const { username, discriminator, avatar } = user

    if (isKnown(userCache, user.id, JSON.stringify([username, discriminator, avatar]))) return

    try {
        const response = await client.prisma.user.updateMany({
            where: {
                discordId: user.id,
            },
            data: {
                username,
                tag: discriminator,
                avatar,
            }
        })
        if (response.count > 0)
            Logger.debug(`Updated user ${user.id}: ${username}#${discriminator} / ${avatar}`)
    } catch (error) {
        userCache.delete(user.id)
        Logger.error(error)
    }
}

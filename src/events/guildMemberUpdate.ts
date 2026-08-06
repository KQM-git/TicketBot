import { GuildMember } from "discord.js"
import { updateMember } from "../utils/UserUpdater"

/**
 * Only fires when the (privileged) GuildMembers intent is enabled, which it isn't.
 * Member data is instead kept up to date from messages/interactions, see UserUpdater.
 */
export async function handle(old: GuildMember, member: GuildMember): Promise<void> {
    if (member.displayColor == old.displayColor && member.nickname == old.nickname) return
    await updateMember(member)
}

import { User } from "discord.js"
import { updateUser } from "../utils/UserUpdater"

export async function handle(old: User, user: User): Promise<void> {
    if (user.username == old.username && user.discriminator == old.discriminator && user.avatar == old.avatar) return
    await updateUser(user)
}

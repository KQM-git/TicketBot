import { APIMessage } from "discord-api-types/v9"
import { CommandInteraction, Message } from "discord.js"

// Discord shortcuts
export type CommandSource = Message | CommandInteraction
export type SendMessage = Message | APIMessage
export type CommandResponse = Promise<SendMessage | undefined> | undefined

export interface DBUser {
    id: string
    roleColor?: string | null
    nickname?: string | null
    username?: string | null
    tag?: string | null
    avatar?: string | null
    bot?: boolean | null
    verified?: boolean | null
}

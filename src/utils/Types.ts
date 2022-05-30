import { APIMessage } from "discord-api-types/v9"
import { CommandInteraction, Message } from "discord.js"

// Discord shortcuts
export type CommandSource = Message | CommandInteraction
export type SendMessage = Message | APIMessage
export type CommandResponse = Promise<SendMessage | undefined> | undefined

export type MessageInput = {
    discordId: string
    createdAt: Date | string
    editedAt?: Date | string | null
    attachments?: Enumerable<InputJsonValue>
    reactions?: Enumerable<InputJsonValue>
    embeds?: Enumerable<InputJsonValue>
    content: string
    components?: Enumerable<InputJsonValue>
    mentions?: Enumerable<InputJsonValue>
    stickers?: Enumerable<InputJsonValue>
    reply?: string | null
    userId: string
    serverId: string
    transcriptId: number
}

export type UserInput = {
    discordId: string
    serverId: string
    roleColor: string | null
    nickname: string | null
    username: string | null
    tag: string | null
    avatar: string | null
    bot: boolean | null
    verified: boolean | null
}


export type Enumerable<T> = T | Array<T>
export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray
type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}
type InputJsonArray = ReadonlyArray<InputJsonValue | null>

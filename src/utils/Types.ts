import { APIMessage } from "discord-api-types/v9"
import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageButtonStyle, MessageEmbedOptions, ModalSubmitInteraction, NewsChannel, TextChannel, ThreadChannel } from "discord.js"

// Discord shortcuts
export type CommandSource = Message | CommandInteraction | ModalSubmitInteraction | ButtonInteraction
export type SendMessage = Message | APIMessage
export type CommandResponse = Promise<unknown> | unknown

export type TicketableChannel = NewsChannel | TextChannel | ThreadChannel

// Ticket data
export enum TicketStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    VERIFIED = "VERIFIED"
}

export enum EndingAction {
    DELETE = "DELETE",
    NOTHING = "NOTHING",
    VERIFIED = "VERIFIED"
}

export type TicketType = {
    id: string
    name: string
    emoji: string
    style: MessageButtonStyle
    opening: {
        content: string
        embeds?: [MessageEmbedOptions]
        components?: [MessageActionRow]
        pingUsers?: string[]
    }
    creationRoles: string[]
    blacklistRoles?: string[]
    verifyRoles?: string[]
    manageRoles: string[]
    defaultCategory: string
    closeCategory?: string
    muteOwnerOnClose?: true
    verifications?: number
    verifiedCategory?: string
    verifiedRole?: string
    verifiedChannel?: string
    dumpChannel?: string
    creationChannel?: string
    dinkDonk?: {
        time: number
        message: string
    }
    dinkDonkVerifiers?: {
        time: number
        message: string
        roles: string[]
    }
    randomDefaultSlug?: true
}

// Database stuff
export type MessageInput = {
    discordId: string
    createdAt: Date | string
    editedAt?: Date | string | null
    attachments?: Enumerable<InputJsonValue>
    reactions?: Enumerable<InputJsonValue>
    embeds?: Enumerable<InputJsonValue>
    content: string
    components?: Enumerable<InputJsonValue>
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

export type RoleInput = {
    discordId: string
    serverId: string
    name: string
    roleColor: string | null
}

export type ChannelInput = {
    discordId: string
    serverId: string
    name: string
    type: string
}


export type Enumerable<T> = T | Array<T>
export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray
type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}
type InputJsonArray = ReadonlyArray<InputJsonValue | null>

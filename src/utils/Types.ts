import { APIMessage } from "discord-api-types/v9"
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, EmbedBuilder, Message, MessageContextMenuCommandInteraction, ModalSubmitInteraction, NewsChannel, PrivateThreadChannel, PublicThreadChannel, TextChannel, VoiceChannel } from "discord.js"

// Discord shortcuts
export type InteractionSource = CommandInteraction | ButtonInteraction | MessageContextMenuCommandInteraction
export type CommandSource = Message | InteractionSource | ModalSubmitInteraction
export type SendMessage = Message | APIMessage
export type CommandResponse = Promise<unknown> | unknown

export type TicketableChannel = NewsChannel | TextChannel | PublicThreadChannel | PrivateThreadChannel | VoiceChannel

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

export enum VerifierType {
    DEFAULT = "DEFAULT",
    GUIDE = "GUIDE",
    GUIDE_TC = "GUIDE_TC",
    GUIDE_GRAMMAR = "GUIDE_GRAMMAR",
    CALCS = "CALCS",
}

type ButtonStyling = {
    label: string
    emoji: string
    style: ButtonStyle
}

export type TicketType = {
    id: string
    name: string
    emoji: string
    style: ButtonStyle
    opening: {
        content: string
        embeds?: [EmbedBuilder]
        components?: [ActionRowBuilder<ButtonBuilder>]
        pingUsers?: string[]
    }
    creationRoles: string[]
    blacklistRoles?: string[]
    blacklistNames?: {
        regex: RegExp
        until?: Date
        message: string
    }[]
    manageRoles: string[]
    defaultCategory: string
    closeCategory?: string
    muteOwnerOnClose?: true
    verifications?: {
        type: VerifierType
        roles: string[]
        button: ButtonStyling
        required?: number
        dinkDonk?: {
            time: number
            message: string
            roles: string[]
            button: ButtonStyling
        }
    }[]
    lockout?: number
    verifiedCategory?: string
    verifiedRoles?: string[]
    verifiedChannel?: string
    dumpChannel?: string
    creationChannel?: string
    dinkDonk?: {
        time: number
        message: string
    }
    randomDefaultSlug?: true
}

export type TicketButton = {
    name: string
    value: string
    content?: string
    title: string
    desc: string
    ticketTypes: {
        customId?: string
        id?: string
        name: string
        emoji: string
        style: ButtonStyle
    }[]
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

export type UserConnection = {
    where: { discordId_serverId: { discordId: string, serverId: string } }
    create: UserInput
}

export type Enumerable<T> = T | Array<T>
export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray
type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}
type InputJsonArray = ReadonlyArray<InputJsonValue | null>

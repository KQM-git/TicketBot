import { ChannelType, Guild, GuildMember, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../main"
import { TicketableChannel, TicketType } from "./Types"
import { trim } from "./Utils"


const Logger = getLogger("tickets")
export async function createTicket(ticketType: TicketType, name: string, member: GuildMember, guild: Guild) {
    const parent = await guild.channels.fetch(ticketType.defaultCategory)
    if (!parent)
        throw Error("Invalid parent channel")

    Logger.info(`Creating a ticket for ${member.id} (@${member.user.tag}) in ${guild.id}: ${name}`)

    await client.transcriptionManager.updateServer(guild)

    const msgPayload = {
        content: `<@${member.id}>${ticketType.opening.content}`,
        allowedMentions: {
            users: [member.id, ...(ticketType.opening.pingUsers ?? [])].filter((x, i, a) => a.indexOf(x) == i)
        },
        embeds: ticketType.opening.embeds,
        components: ticketType.opening.components
    }

    let channelId: string |null = null
    if (parent.type === ChannelType.GuildCategory) {
        const channel = await guild.channels.create({
            name: trim(name),
            type: ChannelType.GuildText,
            parent
        })

        const msg = await channel.send(msgPayload)
        await msg.pin("Initial create ticket message")

        try {
            await channel.permissionOverwrites.edit(member, {
                ViewChannel: true,
                ManageMessages: true
            })
        } catch (error) {
            Logger.error("Couldn't give creator permission for ManageMessages")
        }

        channelId = channel.id
    } else if (parent.type === ChannelType.GuildForum) {
        const thread = await parent.threads.create({
            name: trim(name),
            message: msgPayload,
            reason: "Triggered from createTicket"
        })
        channelId = thread.id
    } else
        throw Error("Invalid parent channel")

    await client.prisma.ticket.create({
        data: {
            channelId: channelId,
            name,
            type: ticketType.id,
            server: client.transcriptionManager.getServer(guild),
            creator: await client.transcriptionManager.connectUser(member, guild.id),
            contributors: ticketType.id == "theoryhunt" ? undefined : await client.transcriptionManager.connectUser(member, guild.id),
        },
        select: { id: true }
    })

    if (ticketType.creationChannel) {
        const creationChannel = await guild.channels.fetch(ticketType.creationChannel)

        if (creationChannel?.isTextBased())
            await creationChannel.send({
                content: `<@${member.id}> created a ${ticketType.name}: ${name} over at <#${channelId}>!`
            })
    }

    Logger.info(`Created ticket for ${channelId}`)

    return channelId
}

export async function convertTicket(ticketType: TicketType, channel: TicketableChannel, member: GuildMember | User, status: string, guild: Guild) {
    await client.transcriptionManager.updateServer(guild)

    Logger.debug(`Checking pins of ${channel.id}`)
    const pinned = await channel.messages.fetchPinned()
    const target = pinned.find(m => m.content.includes("As an author, it is your responsibility to complete the ticket"))
    if (target) {
        Logger.debug("Found message, fetching member")
        const mentioned = target.mentions.users.find(x => x.id != "235719068726853632")
        if (mentioned)
            member = (await guild.members.fetch(mentioned.id)) ?? mentioned
    }

    try {
        const ticket = await client.prisma.ticket.upsert({
            where: {
                channelId: channel.id
            },
            update: {
                type: ticketType.id,
                status
            },
            create: {
                channelId: channel.id,
                createdAt: channel.createdAt ?? undefined,
                name: channel.name,
                type: ticketType.id,
                server: client.transcriptionManager.getServer(guild),
                creator: await client.transcriptionManager.connectUser(member, guild.id),
                status
            },
            select: {
                id: true,
                creator: {
                    select: { discordId: true }
                }
            }
        })
        Logger.info(`Converted ticket ${channel.id} / ${channel.name} -> ${ticket.id}`)
        return `Created #${ticket.id} from <#${channel.id}> for <@${ticket.creator.discordId}>`
    } catch (error) {
        return `${error}`
    }
}

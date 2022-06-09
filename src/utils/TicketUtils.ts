import { Guild, GuildMember, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../main"
import { TicketableChannel, TicketType } from "./Types"
import { trim } from "./Utils"


const Logger = getLogger("tickets")
export async function createTicket(ticketType: TicketType, name: string, member: GuildMember, guild: Guild) {
    const parent = await guild.channels.fetch(ticketType.defaultCategory)
    if (!parent || parent.type != "GUILD_CATEGORY")
        throw Error("Invalid parent channel")

    Logger.info(`Creating a ticket for ${member.id} (@${member.user.tag}) in ${guild.id}: ${name}`)

    await client.transcriptionManager.updateServer(guild)

    const channel = await guild.channels.create(trim(name), {
        type: "GUILD_TEXT",
        parent
    })

    const mgs = await channel.send({
        content: `<@${member.id}>${ticketType.opening.content}`,
        allowedMentions: {
            users: [member.id, ...(ticketType.opening.pingUsers ?? [])]
        },
        embeds: ticketType.opening.embeds,
        components: ticketType.opening.components
    })

    await client.prisma.ticket.create({
        data: {
            channelId: channel.id,
            name,
            type: ticketType.id,
            server: client.transcriptionManager.getServer(guild),
            creator: await client.transcriptionManager.connectUser(member, guild.id),
            contributors: await client.transcriptionManager.connectUser(member, guild.id),
        },
        select: { id: true }
    })

    await mgs.pin("Initial create ticket message")


    try {
        await channel.permissionOverwrites.create(member, {
            VIEW_CHANNEL: true,
            MANAGE_MESSAGES: true
        })
    } catch (error) {
        Logger.error("Couldn't give creator permission for MANAGE_MESSAGES")
    }
    if (ticketType.creationChannel) {
        const creationChannel = await guild.channels.fetch(ticketType.creationChannel)

        if (creationChannel?.isText())
            await creationChannel.send({
                content: `<@${member.id}> created a ${ticketType.name}: ${name} over at <#${channel.id}>!`
            })
    }

    Logger.info(`Created ticket for ${channel.id} / ${channel.name}`)

    return channel.id
}

export async function convertTicket(ticketType: TicketType, channel: TicketableChannel, member: GuildMember | User, status: string, guild: Guild) {
    await client.transcriptionManager.updateServer(guild)

    const pinned = await channel.messages.fetchPinned()
    const target = pinned.find(m => m.content.includes("As an author, it is your responsibility to complete the ticket"))
    if (target) {
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
            select: { id: true }
        })
        Logger.info(`Converted ticket ${channel.id} / ${channel.id} -> ${ticket.id}`)
        return `Created #${ticket.id} from <#${channel.id}> for <@${member.id}>`
    } catch (error) {
        return `${error}`
    }
}

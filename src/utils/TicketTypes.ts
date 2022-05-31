import { Guild, GuildMember, MessageActionRow, MessageButton, TextChannel, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../main"
import { TicketType } from "./Types"
import { trim } from "./Utils"

export const tickets: Record<string, TicketType> = {
    libsubs: {
        id: "libsubs",
        name: "Library Submission",
        emoji: "🔖",
        style: "PRIMARY",
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If a ticket needs to be deleted, you can use \`/delete\` within the first 5 minutes
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button; the ticket will automatically be moved to be reviewed.
- The ticket will be scrapped if: No activity >1 week or open for >1 month.`,
            embeds: [{
                title: "Write-up Format",
                description: `**Theory/Finding/Bug:** Title of your submission

**Evidence:** Explanations with calculations and/or YouTube/Imgur proofs

**Significance:** Conclusion`,
                color: "#A758BF"
            }],
            components: [
                new MessageActionRow().addComponents(
                    new MessageButton()
                        .setLabel("Close")
                        .setCustomId("close")
                        .setEmoji("🔒")
                        .setStyle("DANGER"),
                    new MessageButton()
                        .setLabel("Rename")
                        .setCustomId("rename")
                        .setEmoji("✏️")
                        .setStyle("SECONDARY")
                ),
            ]
        },
        creationRoles: ["980899762054254593"],
        manageRoles: ["980899103049383936"],
        verifyRoles: ["980898982316351578"],
        defaultCategory: "980837799076958310",
        closeCategory: "980837820929294367",
        verifications: 1,
        verifiedCategory: "980838078300164096",
        verifiedRole: "980899054177374268",
        dumpChannel: "980924167648079892",
        creationChannel: "981316199185014806"
    },
    guide: {
        id: "guide",
        name: "Guide Submission",
        emoji: "📔",
        style: "SUCCESS",
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- Name it appropriately with \`/rename <ticket name>\`
- When done ping <@235719068726853632> to begin the review process.`,
            embeds: [{
                title: "Guide Guidelines",
                description: "Here are the KQM Guide standards if you are interested. These are not enforced at the moment but it is heavily encouraged you follow them.",
                color: "#A758BF"
            }],
            components: [
                new MessageActionRow().addComponents(
                    new MessageButton()
                        .setLabel("Guide Guidelines")
                        .setURL("https://docs.google.com/document/d/1hZ0bNmMy1t5R8TOF1v8mcuzQpR0BgJD5pKY2T_t6uh0/edit?usp=sharing")
                        .setStyle("LINK"),
                    new MessageButton()
                        .setLabel("Close")
                        .setCustomId("close")
                        .setEmoji("🔒")
                        .setStyle("DANGER")
                )
            ]
        },
        creationRoles: ["980899740029956106"],
        manageRoles: ["980899103049383936"],
        verifyRoles: ["980898982316351578"],
        defaultCategory: "980838140099039272",
        verifications: 2,
        creationChannel: "981316199185014806"
    },
    staff: {
        id: "staff",
        name: "Staff Ticket",
        emoji: "🐒",
        creationRoles: ["980899219235807302"],
        manageRoles: ["980899219235807302"],
        defaultCategory: "980926469737963530",
        opening: {
            content: " - This is a staff ticket"
        },
        style: "DANGER"
    }
}

export const presets: {
    name: string
    value: string
    title: string
    desc: string
    buttons: TicketType[]
}[] = [{
    name: "Theorycrafting Tickets",
    value: "TC",
    title: "Theorycrafting Ticket",
    desc: `Welcome, Theorycrafter. Click on one of the buttons below to open a ticket.

**Library Submissions:** To submit an entry into the library
**Guide Ticket:** For guide submissions

Please read the ticket guidelines above before opening a ticket.`,
    buttons: [tickets.libsubs, tickets.guide]
}, {
    name: "Staff Tickets",
    value: "ST",
    title: "Staff Tasks",
    desc: "Click below to create a task",
    buttons: [tickets.staff]
}]


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
                content: `<@${member.id}> created a ${ticketType.name}: ${name} over at <#${channel.id}>!`,
                allowedMentions: {
                    users: []
                }
            })
    }

    Logger.info(`Created ticket for ${channel.id} / ${channel.name}`)

    return channel.id
}

export async function convertTicket(ticketType: TicketType, channel: TextChannel, member: GuildMember | User, status: string, guild: Guild) {
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
                createdAt: channel.createdAt,
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

import { Guild, GuildMember, MessageActionRow, MessageButton } from "discord.js"
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
- Name your ticket with /rename <ticket name>
- When you are ready to submit the ticket, compile everything into one message following the format below. Then type /close or click the button; the ticket will automatically be moved to be reviewed.
- The ticket will be scrapped if: No activity >1 week or open for >1 month.`,
            embeds: [{
                title: "Write-up Format",
                description: `Theory/Finding/Bug: Title of your submission

**Evidence:** Explanations with calculations and/or YouTube/Imgur proofs

**Significance:** Conclusion`,
                color: "#A758BF"
            }],
        },
        defaultCategory: "980837799076958310",
        closeCategory: "980837820929294367",
        verifications: 2,
        verifiedCategory: "980838078300164096"
    },
    guide: {
        id: "guide",
        name: "Guide Submission",
        emoji: "📔",
        style: "SUCCESS",
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- Name it appropriately with /rename <ticket name>
- When done ping <@235719068726853632> to begin the review process.`,
            embeds: [{
                title: "Guide Guidelines",
                description: "Here are the KQM Guide standards if you are interested. These are not enforced at the moment but it is heavily encouraged you follow them.",
                color: "#A758BF"
            }],
            components: [
                new MessageActionRow()
                    .addComponents(new MessageButton()
                        .setLabel("Guide Guidelines")
                        .setURL("https://docs.google.com/document/d/1hZ0bNmMy1t5R8TOF1v8mcuzQpR0BgJD5pKY2T_t6uh0/edit?usp=sharing")
                        .setStyle("LINK")
                    )
            ]
        },
        defaultCategory: "980838140099039272",
        verifications: 2
    }
}

export const presets = [{
    name: "Theorycrafting tickets",
    value: "TC",
    title: "Theorycrafting Ticket",
    desc: `Welcome, Theorycrafter. Click on one of the buttons below to open a ticket.

**Library Submissions:** To submit an entry into the library
**Guide Ticket:** For guide submissions

Please read the ticket guidelines above before opening a ticket.`,
    buttons: [tickets.libsubs, tickets.guide]
}]


export async function createTicket(ticketType: TicketType, name: string, member: GuildMember, guild: Guild) {
    const parent = await guild.channels.fetch(ticketType.defaultCategory)
    if (!parent || parent.type != "GUILD_CATEGORY")
        throw Error("Invalid parent channel")

    await client.transcriptionManager.updateServer(guild)

    const channel = await guild.channels.create(trim(name), {
        type: "GUILD_TEXT",
        parent
    })

    await channel.send({
        content: `<@${member.id}>${ticketType.opening.content}`,
        embeds: ticketType.opening.embeds,
        components: ticketType.opening.components
    })

    await client.prisma.ticket.create({
        data: {
            channelId: channel.id,
            initialName: name,
            type: ticketType.id,
            server: client.transcriptionManager.getServer(guild),
            creator: await client.transcriptionManager.connectUser(member)
        },
        select: { id: true }
    })

    return channel.id
}

import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, User } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { tickets } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


export default class CloseTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Closes a ticket.",
            usage: "close",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't close transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || source.channel.type != "GUILD_TEXT") return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channel.id
            },
            include: {
                creator: true,
            }
        })

        if (ticket == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        if (ticket.status != TicketStatus.OPEN)
            return await sendMessage(source, "This ticket is already closed", undefined, true)

        const ticketType = tickets[ticket.type]

        if (!(ticket.creator.discordId == user.id || (ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))))
            return await sendMessage(source, "Only the ticket creator and people with management roles can close tickets", undefined, true)


        await source.channel.permissionOverwrites.create(ticket.creator.discordId, { SEND_MESSAGES: false })
        if (ticketType?.closeCategory) {
            await source.channel.setParent(ticketType.closeCategory)
        }

        await source.channel.send({
            embeds: [
                new MessageEmbed()
                    .setDescription(`Ticket closed by <@${member.id}>`)
            ],
            components: [new MessageActionRow().addComponents(
                ...(ticketType?.verifications ? [new MessageButton()
                    .setCustomId("verify")
                    .setLabel("Verify")
                    .setEmoji("✅")
                    .setStyle("PRIMARY")] : []),
                new MessageButton()
                    .setCustomId("open")
                    .setLabel("Open")
                    .setEmoji("🔓")
                    .setStyle("SECONDARY"),
                new MessageButton()
                    .setCustomId("transcript")
                    .setLabel("Transcript")
                    .setEmoji("📑")
                    .setStyle("SECONDARY")
            )]
        })

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: TicketStatus.CLOSED
            },
        })

        return await sendMessage(source, "Closed ticket!")
    }
}

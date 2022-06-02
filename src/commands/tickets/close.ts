import { BaseGuildTextChannel, ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageEmbed, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { buttons, ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"

const Logger = getLogger("close")
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
        return await this.run(source, source.author)
    }

    async run(source: CommandSource, user: User): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't close transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !source.channel.isText()) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

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

        const ticketType = ticketTypes[ticket.type]

        if (!(ticket.creator.discordId == user.id || (ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))))
            return await sendMessage(source, "Only the ticket creator and people with management roles can close tickets", undefined, true)

        Logger.info(`Closing ticket ${ticket.id} (${ticket.name}) by ${member.id} (${member.user.tag})`)

        if (source.channel instanceof BaseGuildTextChannel) {
            await source.channel.permissionOverwrites.create(ticket.creator.discordId, { SEND_MESSAGES: false })
            if (ticketType?.closeCategory) {
                await source.channel.setParent(ticketType.closeCategory)
            }
        }

        await source.channel.send({
            embeds: [
                new MessageEmbed()
                    .setDescription(`Ticket closed by <@${member.id}>`)
            ],
            components: [new MessageActionRow().addComponents(
                ...(ticketType?.verifications ? [buttons.VERIFY] : []),
                buttons.OPEN,
                buttons.TRANSCRIPT
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

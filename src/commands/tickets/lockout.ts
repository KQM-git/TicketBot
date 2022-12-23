import { ButtonInteraction, ChatInputCommandInteraction, Message, User } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { displayTimestamp, isTicketable, sendMessage } from "../../utils/Utils"

export default class Lockout extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Display the ticket lockout time.",
            usage: "lockout",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | string | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user)
    }

    async runMessage(source: Message): Promise<SendMessage | string | undefined> {
        return this.run(source, source.author)
    }

    async run(source: CommandSource, user: User): Promise<SendMessage | undefined | string> {
        if (!source.guild) return await sendMessage(source, "Can't send lockout message here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !isTicketable(source.channel)) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channel.id
            },
            select: {
                type: true,
                status: true,
                statusUpdate: true,
            }
        })

        if (ticket == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        if (ticket.status != TicketStatus.CLOSED)
            return await sendMessage(source, "This can only be done when the ticket is closed!", undefined, true)

        const ticketType = ticketTypes[ticket.type]

        if (!ticketType?.lockout)
            return await sendMessage(source, "Couldn't find ticket type / doesn't have lockout set", undefined, true)

        const lockoutTime = new Date(ticket.statusUpdate.getTime() + ticketType.lockout)
        if (Date.now() > lockoutTime.getTime())
            return await sendMessage(source, "Past lockout time", undefined, true)
        try {
            await source.channel.send({
                content: `Lockout period ends at ${displayTimestamp(lockoutTime)} (${displayTimestamp(lockoutTime, "D")})`
            })
        } catch (error) {
            return await sendMessage(source, "Couldn't send message!", undefined, true)
        }

        return await sendMessage(source, "See above", undefined, true)
    }
}

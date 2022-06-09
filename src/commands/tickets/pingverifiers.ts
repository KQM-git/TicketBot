import { ButtonInteraction, CommandInteraction, Message, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { displayTimestamp, isTicketable, sendMessage } from "../../utils/Utils"

const Logger = getLogger("rename")
export default class PingVerifiers extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Pings the verifiers for this ticket type.",
            usage: "pingverifiers",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | string | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await this.run(source, source.user)
    }

    async runMessage(source: Message): Promise<SendMessage | string | undefined> {
        return this.run(source, source.author)
    }

    async run(source: CommandSource, user: User): Promise<SendMessage | undefined | string> {
        if (!source.guild) return await sendMessage(source, "Can't rename transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !isTicketable(source.channel)) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channel.id
            },
            include: {
                creator: true
            }
        })

        if (ticket == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        if (ticket.status != TicketStatus.CLOSED)
            return await sendMessage(source, "This can only be done when the ticket is closed!", undefined, true)

        const ticketType = ticketTypes[ticket.type]

        if (!ticketType?.dinkDonkVerifiers)
            return await sendMessage(source, "This ticket type doesn't have verifiers pinging set up", undefined, true)

        if (!(ticketType && member.roles.cache.hasAny(...ticketType.manageRoles)))
            return await sendMessage(source, "Only the people with management roles can ping the verifiers", undefined, true)

        if (ticket.lastVerifierPing && ticket.lastVerifierPing.getTime() + ticketType.dinkDonkVerifiers.time > Date.now())
            return await sendMessage(source, `Verifiers have already been pinged recently in this ticket! Please wait until ${displayTimestamp(new Date(ticket.lastVerifierPing.getTime() + ticketType.dinkDonkVerifiers.time))} before pinging them again!`, undefined, true)


        Logger.info(`Pinging verifiers in ${ticket.id}: ${ticket.name} by ${user.id} (${user.tag})`)

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                lastVerifierPing: new Date()
            }
        })

        try {
            await source.channel.send({
                content: ticketType.dinkDonkVerifiers.message,
                allowedMentions: {
                    roles: ticketType.dinkDonkVerifiers.roles
                }
            })
        } catch (error) {
            return await sendMessage(source, "Couldn't ping verifiers!", undefined, true)
        }

        return await sendMessage(source, "Pinged!", undefined, true)
    }
}

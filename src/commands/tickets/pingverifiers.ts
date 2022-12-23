import { ApplicationCommandOptionType, ButtonInteraction, ChatInputCommandInteraction, Message, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus, VerifierType } from "../../utils/Types"
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
            options: [{
                name: "type",
                description: "Type of verifiers to ping",
                type: ApplicationCommandOptionType.String,
                choices: [{
                    name: "Guide verifiers",
                    value: VerifierType.GUIDE
                }, {
                    name: "Calculation verifiers",
                    value: VerifierType.CALCS
                }],
                required: true
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | string | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getString("type", true))
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        const name = source.customId.split("-")[1] ?? VerifierType.DEFAULT
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user, name)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | string | undefined> {
        return this.run(source, source.author, args[0])
    }

    async run(source: CommandSource, user: User, type: string): Promise<SendMessage | undefined | string> {
        if (!source.guild) return await sendMessage(source, "Can't ping verifiers here", undefined, true)

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

        if (!ticketType?.verifications)
            return await sendMessage(source, "Couldn't find ticket type / doesn't require verifications", undefined, true)

        const verifierType = ticketType.verifications.find(x => x.type == type)
        if (!verifierType || !verifierType.dinkDonk)
            return await sendMessage(source, "This ticket / verifier type doesn't have verifiers pinging set up", undefined, true)

        if (!(ticketType && member.roles.cache.hasAny(...ticketType.manageRoles)))
            return await sendMessage(source, "Only the people with management roles can ping the verifiers", undefined, true)

        const lastPing = (ticket.lastVerifierPing ?? {}) as Record<string, number>
        const lastTime = lastPing?.[verifierType.type] ?? 0
        if (ticket.lastVerifierPing && lastTime + verifierType.dinkDonk.time > Date.now())
            return await sendMessage(source, `Verifiers have already been pinged recently in this ticket! Please wait until ${displayTimestamp(new Date(lastTime + verifierType.dinkDonk.time))} before pinging them again!`, undefined, true)

        lastPing[verifierType.type] = Date.now()

        Logger.info(`Pinging verifiers in ${ticket.id}: ${ticket.name} by ${user.id} (${user.tag})`)

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                lastVerifierPing: lastPing
            }
        })

        try {
            await source.channel.send({
                content: verifierType.dinkDonk.message,
                allowedMentions: {
                    roles: verifierType.dinkDonk.roles
                }
            })
        } catch (error) {
            return await sendMessage(source, "Couldn't ping verifiers!", undefined, true)
        }

        return await sendMessage(source, "Pinged!", undefined, true)
    }
}

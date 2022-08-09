import { ApplicationCommandOptionType, ChatInputCommandInteraction, EmbedBuilder, Message, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"

const Logger = getLogger("transferowner")
export default class TransferOwnerTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Transfers ownership",
            usage: "close",
            aliases: [],
            options: [{
                name: "user",
                description: "User to make the new owner of the current channel",
                type: ApplicationCommandOptionType.User,
                required: true
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getUser("user", true))
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, target: User): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't transfer ownership here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        const targetMember = await source.guild.members.fetch(target.id)
        if (!targetMember) return await sendMessage(source, "Couldn't fetch target Discord profile", undefined, true)

        if (!source.channel || !source.channel.isTextBased()) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

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

        const ticketType = ticketTypes[ticket.type]

        if (member.roles.cache.hasAny(...(ticketType.blacklistRoles ?? [])))
            return await sendMessage(source, "You are blacklisted from closing a ticket", undefined, true)

        if (!(ticketType && member.roles.cache.hasAny(...ticketType.manageRoles)))
            return await sendMessage(source, "Only people with management roles can transfer ownership", undefined, true)

        Logger.info(`Transferring ownership of ticket ${ticket.id} (${ticket.name}) by ${member.id} (${member.user.tag})`)

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                creator: await client.transcriptionManager.connectUser(targetMember, member.guild.id)
            }
        })

        await source.channel.send({
            embeds: [
                new EmbedBuilder().setDescription(`<@${member.id}> transferred ownership of this ticket to <@${targetMember.id}>.`)
            ]
        })

        return await sendMessage(source, "Transferred ownership!")
    }
}

import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, EndingAction, SendMessage } from "../../utils/Types"
import { Colors, isTicketable, sendMessage, trim } from "../../utils/Utils"

const Logger = getLogger("deleter")
export default class DeleteTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Deletes the current ticket.",
            usage: "delete",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | string | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        const isSure = !!source.customId.split("-")[1]

        if (isSure) {
            await this.runDelete(source, source.user, true)
            return
        }

        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source, source.author)
    }

    async run(source: CommandSource, user: User): Promise<SendMessage | undefined> {
        const d = await this.runDelete(source, user, false)

        if (d != true) return d

        return sendMessage(source, "Are you sure you want to delete this ticket and **channel**?", [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setStyle("DANGER")
                    .setLabel("YES")
                    .setEmoji("✖️")
                    .setCustomId("delete-yes")
            )
        ], true)
    }

    async runDelete(source: CommandSource, user: User, run: boolean): Promise<SendMessage | undefined | true> {
        if (!source.guild) return await sendMessage(source, "Can't delete transcripts here", undefined, true)

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

        const ticketType = ticketTypes[ticket.type]
        if (!(ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))) {
            if (member.id == ticket.creator.discordId) {
                if (ticket.createdAt.getTime() + 5 * 60 * 1000 < Date.now())
                    return await sendMessage(source, "Only the people with management roles can delete tickets (owner can also delete in first 5 minutes).", undefined, true)
            } else
                return await sendMessage(source, "Only the people with management roles can delete tickets (owner can also delete in first 5 minutes).", undefined, true)
        }

        if (!run)
            return true

        const channel = source.channel
        const response = await channel.send({
            embeds: [
                new MessageEmbed()
                    .setDescription(`This ticket will shortly be deleted - by <@${member.id}>`)
                    .setColor(Colors.DARK_RED)
            ],
        })

        Logger.info(`${member.id} (@${member.user.tag}) is deleting ticket ${channel.id} (${channel.name} / ${ticket.name})`)

        await client.transcriptionManager.startTranscript(channel, response, undefined, response.id, member, trim(ticket.name), ticketType.dumpChannel, EndingAction.DELETE)


        return await sendMessage(source, "Queued deletion!", undefined, true)
    }
}

import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageButton, MessageEmbed, User } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { tickets } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { displayTimestamp, sendMessage } from "../../utils/Utils"


export default class OpenTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Opens a ticket.",
            usage: "open",
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
        if (!source.guild) return await sendMessage(source, "Can't open transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || source.channel.type != "GUILD_TEXT") return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channel.id
            },
            include: {
                creator: true,
                verifications: {
                    include: {
                        verifier: true
                    }
                }
            }
        })


        if (ticket == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        if (ticket.status == TicketStatus.OPEN)
            return await sendMessage(source, "This ticket is already open", undefined, true)

        const ticketType = tickets[ticket.type]
        if (!(ticket.creator.discordId == user.id || (ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))))
            return await sendMessage(source, "Only the ticket creator and people with management roles can open tickets", undefined, true)

        await source.channel.permissionOverwrites.create(ticket.creator.discordId, { SEND_MESSAGES: null })
        if (ticketType?.defaultCategory) {
            await source.channel.setParent(ticketType?.defaultCategory)
        }

        await source.channel.send({
            embeds: [
                new MessageEmbed()
                    .setDescription(`Ticket re-opened by <@${member.id}>`)
                    .addField("Previous verifications", `${ticket.verifications.map(v => `- <@${v.verifier.discordId}> at ${displayTimestamp(v.createdAt)}`).join("\n") || "Wasn't verified"}`)
            ],
            components: [new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId("close")
                    .setLabel("Close")
                    .setEmoji("🔓")
                    .setStyle("DANGER")
            )]
        })

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: TicketStatus.OPEN,
                verifications: {
                    deleteMany: {
                        channelId: source.channel.id
                    }
                }
            }
        })

        return await sendMessage(source, "Opened ticket!")
    }
}

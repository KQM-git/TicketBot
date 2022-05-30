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
            help: "Verify a ticket.",
            usage: "verify",
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

        if (ticket.verifications.find(v => v.userId == user.id))
            return await sendMessage(source, "You already verified this ticket!", undefined, true)

        const ticketType = tickets[ticket.type]
        if (!(ticketType && member.roles.cache.hasAny(...ticketType.manageRoles, ...(ticketType.verifyRoles ?? []))))
            return await sendMessage(source, "Only people with verify or management roles can verify tickets", undefined, true)

        const enough = ticketType.verifications && ticket.verifications.length + 1 >= ticketType.verifications
        const components: MessageActionRow[] = []
        if (enough) {
            if (ticketType?.verifiedCategory)
                await source.channel.setParent(ticketType?.verifiedCategory)

            components.push(new MessageActionRow().addComponents(new MessageButton()
                .setCustomId("transcript")
                .setLabel("Transcript")
                .setEmoji("📑")
                .setStyle("SECONDARY")
            ))
        }

        await source.channel.send({
            embeds: [new MessageEmbed().setDescription(`Ticket verified by <@${member.id}>`)],
            components
        })

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: enough ? TicketStatus.VERIFIED : undefined,
                verifications: {
                    create: {
                        channelId: source.channel.id,
                        channelName: source.channel.name,
                        server: client.transcriptionManager.getServer(source.guild),
                        verifier: await client.transcriptionManager.connectUser(member, source.guild.id),
                    }
                }
            }
        })

        return await sendMessage(source, "Verified ticket!")
    }
}

import { ActionRowBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder, Message, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { buttons, ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus, VerifierType } from "../../utils/Types"
import { displayTimestamp, isTicketable, sendMessage, verificationTypeName } from "../../utils/Utils"
import { thInclude, updateTHMessage } from "./theoryhunt"


const Logger = getLogger("open")
export default class OpenTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Opens the current ticket (resets verifiers).",
            usage: "open",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source, source.author)
    }

    async run(source: CommandSource, user: User): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't open transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !isTicketable(source.channel)) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

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

        const ticketType = ticketTypes[ticket.type]
        if (!(ticket.creator.discordId == user.id || (ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))))
            return await sendMessage(source, "Only the ticket creator and people with management roles can open tickets", undefined, true)

        Logger.info(`Opening ticket ${source.channel.id} / ${source.channel.id} -> ${ticket.id} by ${user.id} (${user.tag})`)
        if (source.channel instanceof BaseGuildTextChannel) {
            const user = await client.users.fetch(ticket.creator.discordId)
            if (!user)
                return await sendMessage(source, `Couldn't fetch ticket owner user profile - ${ticket.creator.discordId}`)
            await source.channel.permissionOverwrites.edit(user, { SendMessages: null })
            if (ticketType?.defaultCategory)
                await source.channel.setParent(ticketType?.defaultCategory, { lockPermissions: false })
        }

        await source.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`Ticket re-opened by <@${member.id}>`)
                    .addFields([{
                        name: "Previous verifications",
                        value: `${ticket.verifications.map(v => `- ${verificationTypeName[v.type as VerifierType] ?? "Unknown"} <@${v.verifier.discordId}> at ${displayTimestamp(v.createdAt)}`).join("\n") || "Wasn't verified"}`
                    }])
            ],
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
                buttons.CLOSE
            )]
        })

        const updatedTicket = await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: TicketStatus.OPEN,
                statusUpdate: new Date(),
                verifications: {
                    deleteMany: {
                        channelId: source.channel.id
                    }
                }
            },
            include: { theoryhunt: { include: thInclude } }
        })

        await updateTHMessage(updatedTicket.theoryhunt)
        Logger.info(`Opened ticket ${source.channel.id} / ${source.channel.id} -> ${ticket.id} by ${user.id} (${user.tag})`)

        return await sendMessage(source, "Opened ticket!")
    }
}

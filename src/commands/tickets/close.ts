import { ActionRowBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, Message, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { buttons, ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"
import { thInclude, updateTHMessage } from "./theoryhunt"

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

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
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

        if (ticket.status != TicketStatus.OPEN)
            return await sendMessage(source, "This ticket is already closed", undefined, true)

        const ticketType = ticketTypes[ticket.type]

        if (member.roles.cache.hasAny(...(ticketType.blacklistRoles ?? [])))
            return await sendMessage(source, "You are blacklisted from closing a ticket", undefined, true)

        if (!(ticket.creator.discordId == user.id || (ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))))
            return await sendMessage(source, "Only the ticket creator and people with management roles can close tickets", undefined, true)

        Logger.info(`Closing ticket ${ticket.id} (${ticket.name}) by ${member.id} (${member.user.tag})`)

        if (source.channel instanceof BaseGuildTextChannel) {
            if (ticketType?.muteOwnerOnClose) {
                const user = await client.users.fetch(ticket.creator.discordId)
                if (!user)
                    return await sendMessage(source, `Couldn't fetch ticket owner user profile - ${ticket.creator.discordId}`)
                await source.channel.permissionOverwrites.edit(user, { SendMessages: false })
            }
            if (ticketType?.closeCategory)
                await source.channel.setParent(ticketType.closeCategory, { lockPermissions: false })
        }

        const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...(ticketType?.verifications?.map(v => new ButtonBuilder()
                .setCustomId(`verify-${v.type}`)
                .setLabel(v.button.label)
                .setEmoji(v.button.emoji)
                .setStyle(v.button.style)
            ) ?? []),
            buttons.OPEN,
            buttons.TRANSCRIPT
        )]

        const dinkDonks = ticketType.verifications?.filter(x => x.dinkDonk)
        if (dinkDonks && dinkDonks.length > 0)
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...dinkDonks.map(v => new ButtonBuilder()
                .setCustomId(`pingverifiers-${v.type}`)
                .setLabel(v.dinkDonk?.button.label ?? "Remind verifiers")
                .setEmoji(v.dinkDonk?.button.emoji ?? "<a:dinkdonk:981687794000879696>")
                .setStyle(v.dinkDonk?.button.style ?? ButtonStyle.Danger)
            )))

        await source.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`Ticket closed by <@${member.id}>. If there are any issues with it - it can be reopened by the owner or staff by using the buttons below or \`/open\`.`)
            ],
            components
        })

        const updatedTicket = await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: TicketStatus.CLOSED,
                statusUpdate: new Date()
            },
            include: { theoryhunt: { include: thInclude } }
        })

        await updateTHMessage(updatedTicket.theoryhunt)

        if (ticketType?.tags?.[TicketStatus.CLOSED] && source.channel.isThread())
            await source.channel.setAppliedTags(ticketType.tags[TicketStatus.CLOSED])

        return await sendMessage(source, "Closed ticket!")
    }
}

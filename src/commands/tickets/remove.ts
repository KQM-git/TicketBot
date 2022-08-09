import { APIInteractionDataResolvedGuildMember, APIRole } from "discord-api-types/v9"
import { ApplicationCommandOptionType, BaseGuildTextChannel, ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message, Role, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, isTicketable, sendMessage } from "../../utils/Utils"

const Logger = getLogger("remove")
export default class RemoveUserTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Remove a user/group a ticket.",
            usage: "remove",
            aliases: [],
            options: [{
                name: "target",
                type: ApplicationCommandOptionType.Mentionable,
                description: "User/group to remove",
                required: true
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getMentionable("target", true))
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, target: User | GuildMember | Role | APIInteractionDataResolvedGuildMember | APIRole): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't remove from transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !isTicketable(source.channel)) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const targetId = (target as User).id

        if (!targetId) return await sendMessage(source, "Couldn't get ID of target", undefined, true)

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

        if (!(ticketType && member.roles.cache.hasAny(...ticketType.manageRoles)))
            return await sendMessage(source, "Only people with management roles can remove groups from tickets", undefined, true)

        if (!(source.channel instanceof BaseGuildTextChannel))
            return await sendMessage(source, "This isn't a regular channel")

        Logger.info(`Removing group ${targetId} ticket ${ticket.id} (${ticket.name}) by ${member.id} (${member.user.tag})`)

        const targetRole = await source.guild.roles.fetch(targetId)
        if (targetRole) {
            await source.channel.permissionOverwrites.edit(targetRole, { ViewChannel: null })

            await source.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`<@${member.id}> removed role ${target} to this ticket`)
                        .setColor(Colors.RED)
                ]
            })
            return await sendMessage(source, `Removed ${target} to ticket`)
        }

        const targetUser = await client.users.fetch(targetId)
        if (targetUser) {
            await source.channel.permissionOverwrites.edit(targetUser, { ViewChannel: null })

            await source.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`<@${member.id}> removed user ${target} to this ticket`)
                        .setColor(Colors.RED)
                ]
            })
            return await sendMessage(source, `Removed ${target} to ticket`)
        }


        return await sendMessage(source, `Couldn't get type of ${target}`)
    }
}

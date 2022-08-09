import { APIInteractionDataResolvedGuildMember, APIRole } from "discord-api-types/v9"
import { ApplicationCommandOptionType, BaseGuildTextChannel, ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message, Role, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

const Logger = getLogger("add")
export default class AddUserTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Add a user/group a ticket.",
            usage: "add",
            aliases: [],
            options: [{
                name: "target",
                type: ApplicationCommandOptionType.Mentionable,
                description: "User/group to add",
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
        if (!source.guild) return await sendMessage(source, "Can't add to transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !source.channel.isTextBased()) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

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
            return await sendMessage(source, "Only people with management roles can add/remove groups from tickets", undefined, true)

        if (!(source.channel instanceof BaseGuildTextChannel))
            return await sendMessage(source, "This isn't a regular channel")

        Logger.info(`Adding group ${targetId} ticket ${ticket.id} (${ticket.name}) by ${member.id} (${member.user.tag})`)

        const targetRole = await source.guild.roles.fetch(targetId)
        if (targetRole) {
            await source.channel.permissionOverwrites.edit(targetRole, { ViewChannel: true })

            await source.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`<@${member.id}> added role ${target} to this ticket`)
                        .setColor(Colors.GREEN)
                ]
            })
            return await sendMessage(source, `Added ${target} to ticket`)
        }

        const targetUser = await client.users.fetch(targetId)
        if (targetUser) {
            await source.channel.permissionOverwrites.edit(targetUser, { ViewChannel: true })

            await source.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`<@${member.id}> added user ${target} to this ticket`)
                        .setColor(Colors.GREEN)
                ]
            })
            return await sendMessage(source, `Added ${target} to ticket`)
        }


        return await sendMessage(source, `Couldn't get type of ${target}`)
    }
}

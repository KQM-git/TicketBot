import { APIInteractionDataResolvedChannel } from "discord-api-types/v9"
import { ApplicationCommandOptionType, ChannelType, ChatInputCommandInteraction, GuildBasedChannel, Message, PermissionFlagsBits, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { convertTicket } from "../../utils/TicketUtils"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { isTicketable, sendMessage } from "../../utils/Utils"


const Logger = getLogger("convert")
export default class ConvertTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Convert a channel or category into a ticket or change type.",
            usage: "convertticket",
            aliases: [],
            options: [{
                name: "channel",
                description: "Channel / category to convert",
                type: ApplicationCommandOptionType.Channel,
                required: false
            }, {
                name: "type",
                description: "Ticket type to use",
                type: ApplicationCommandOptionType.String,
                choices: Object.values(ticketTypes).map(a => ({ name: a.name, value: a.id })),
                required: true
            }, {
                name: "status",
                description: "Ticket status",
                type: ApplicationCommandOptionType.String,
                choices: [{
                    name: "Open",
                    value: TicketStatus.OPEN
                }, {
                    name: "Closed",
                    value: TicketStatus.CLOSED
                }, {
                    name: "Verified",
                    value: TicketStatus.VERIFIED
                }],
                required: true
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        const channel = source.options.getChannel("channel", false) ?? source.channel
        if (!channel || channel.type == ChannelType.DM)
            return await sendMessage(source, "Couldn't find channel?", undefined, true)
        return this.run(source, source.user, source.options.getString("type", true), channel, source.options.getString("status", true))
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, type: string, chan: APIInteractionDataResolvedChannel | GuildBasedChannel, status: string): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't convert tickets here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        const channel = await client.channels.fetch(chan.id)
        if (!channel)
            return await sendMessage(source, "Couldn't fetch channel data", undefined, true)

        const ticketType = ticketTypes[type]

        if (!ticketType)
            return await sendMessage(source, "Couldn't find ticket type", undefined, true)

        if (!member.roles.cache.hasAny(...ticketType.manageRoles))
            return await sendMessage(source, `You can't make transcripts of ${ticketType.name} here`, undefined, true)

        if (!member.permissionsIn(channel.id).has(PermissionFlagsBits.ManageChannels))
            return await sendMessage(source, "You can only convert tickets where you have manage channel permission", undefined, true)

        try {
            if (channel.type == ChannelType.GuildCategory) {
                const children = channel.children.cache
                const converted: string[] = []
                for (const child of children) {
                    if (child[1].isTextBased())
                        converted.push(await convertTicket(ticketType, child[1], member, status, source.guild))
                }
                return await sendMessage(source, converted.join("\n").substring(0, 1900), undefined)
            } else if (isTicketable(channel)) {
                return await sendMessage(source, `${await convertTicket(ticketType, channel, member, status, source.guild)}`, undefined)
            } else {
                return await sendMessage(source, `Can't convert channel type ${channel.type}`, undefined, true)
            }
        } catch (error) {
            Logger.error(error)
            return await sendMessage(source, `Converting ticket failed: ${error}`, undefined, true)
        }
    }
}

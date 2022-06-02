import { APIInteractionDataResolvedChannel } from "discord-api-types/v9"
import { CommandInteraction, GuildBasedChannel, Message, User } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { convertTicket } from "../../utils/TicketUtils"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { isTicketable, sendMessage } from "../../utils/Utils"


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
                type: "CHANNEL",
                required: true
            }, {
                name: "type",
                description: "Ticket type to use",
                type: "STRING",
                choices: Object.values(ticketTypes).map(a => ({ name: a.name, value: a.id })),
                required: true
            }, {
                name: "status",
                description: "Ticket status",
                type: "STRING",
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

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getString("type", true), source.options.getChannel("channel", true), source.options.getString("status", true))
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

        // TODO check perms
        if (!member.permissionsIn(channel.id).has("MANAGE_CHANNELS"))
            return await sendMessage(source, "You can only convert tickets where you have manage channel permission", undefined, true)

        const ticketType = ticketTypes[type]

        if (!ticketType)
            return await sendMessage(source, "Couldn't find type", undefined, true)

        try {
            if (channel.type == "GUILD_CATEGORY") {
                const children = channel.children.map(x => x)
                const converted: string[] = []
                for (const child of children) {
                    if (child.isText())
                        converted.push(await convertTicket(ticketType, child, member, status, source.guild))
                }
                return await sendMessage(source, converted.join("\n").substring(0, 1900), undefined)
            } else if (isTicketable(channel)) {
                return await sendMessage(source, `${await convertTicket(ticketType, channel, member, status, source.guild)}`, undefined)
            } else {
                return await sendMessage(source, `Can't convert channel type ${channel.type}`, undefined, true)
            }
        } catch (error) {
            return await sendMessage(source, `Converting ticket failed: ${error}`, undefined, true)
        }
    }
}

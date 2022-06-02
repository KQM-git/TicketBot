import { APIInteractionDataResolvedChannel } from "discord-api-types/v9"
import { BaseGuildTextChannel, CommandInteraction, GuildBasedChannel, Message, MessageEmbed, TextBasedChannel, User } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"


export default class CreateTicketDirectory extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Create ticket directory message.",
            usage: "createticketdirectory",
            aliases: [],
            options: [{
                name: "type",
                description: "Ticket types to display",
                type: "STRING",
                choices: Object.values(ticketTypes).map(a => ({ name: a.name, value: a.id })),
                required: true
            }, {
                name: "channel",
                description: "Which channel to post in (defaults to current)",
                type: "CHANNEL",
                required: false
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user, source.options.getString("type", true), source.options.getChannel("channel", false) ?? source.channel)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, type: string, channel: TextBasedChannel | GuildBasedChannel | APIInteractionDataResolvedChannel | null): Promise<SendMessage | undefined> {
        if (!channel) return await sendMessage(source, "Couldn't fetch channel", undefined, true)
        if (!(channel instanceof BaseGuildTextChannel) || !source.guild) return await sendMessage(source, "Can't make transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        // TODO check perms
        if (!member.permissionsIn(channel.id).has("MANAGE_CHANNELS"))
            return await sendMessage(source, "Only people who can manage the target channel can create a ticket directory", undefined, true)

        const ticketType = ticketTypes[type]

        if (!ticketType)
            return await sendMessage(source, "Couldn't find ticket type", undefined, true)

        const response = await channel.send({
            embeds: [new MessageEmbed()
                .setTitle(`List of currently open ${ticketType.name}`)
                .setDescription("Loading...")
                .setColor(Colors.ORANGE)
            ]
        })

        const td = await client.prisma.ticketDirectory.upsert({
            create: {
                channelId: channel.id,
                messageId: response.id,
                serverId: channel.guild.id,
                type: ticketType.id
            },
            update: {
                messageId: response.id
            },
            where: {
                channelId_serverId_type: {
                    channelId: channel.id,
                    serverId: channel.guild.id,
                    type: ticketType.id
                }
            }
        })

        if (!td)
            return await sendMessage(source, "An error occurred while upserting data...", undefined, false)

        const tickets = await client.prisma.ticket.findMany({
            where: {
                status: { not: TicketStatus.DELETED },
                type: td.type,
                serverId: td.serverId
            }
        })
        await client.timerManager.updateTicketDirectory(td, tickets)

        return await sendMessage(source, "Created!", undefined, true)
    }
}

import { APIInteractionDataResolvedChannel } from "discord-api-types/v10"
import { ButtonInteraction, CommandInteraction, GuildBasedChannel, Message, MessageEmbed, User } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus } from "../../utils/Types"
import { Colors, displayTimestamp, sendMessage } from "../../utils/Utils"


export default class TicketInfo extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Get info about a ticket.",
            usage: "ticketinfo",
            aliases: [],
            options: [{
                name: "channel",
                description: "Channel to check",
                type: "CHANNEL",
                required: true
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getChannel("channel", false))
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await this.run(source, source.user)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source, source.author)
    }

    async run(source: CommandSource, user: User, chan?: APIInteractionDataResolvedChannel | GuildBasedChannel | null): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Couldn't get guild data", undefined, true)

        const channelId = chan?.id || source.channelId
        if (!channelId) return await sendMessage(source, "Couldn't get channel ID", undefined, true)

        const channel = await client.channels.fetch(channelId)
        if (!channel) return await sendMessage(source, "Couldn't get channel data", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (channel.type == "GUILD_CATEGORY") {
            const children = channel.children.map(x => x)
            const converted: string[] = []
            for (const child of children) {
                if (!member.permissionsIn(channel.id).has("MANAGE_CHANNELS"))
                    return await sendMessage(source, "You can't check categories", undefined, true)

                if (child.isText()) {
                    const ticketInfo = await client.prisma.ticket.findUnique({
                        where: {
                            channelId: child.id
                        },
                        include: {
                            creator: {
                                select: { discordId: true }
                            }
                        }
                    })
                    if (!ticketInfo)
                        converted.push(`Not a ticket <#${child.id}>`)
                    else {
                        const ticketType = ticketTypes[ticketInfo.type]
                        converted.push(`${ticketInfo.status} ${ticketType?.name ?? ticketInfo.type} <#${child.id}> by <@${ticketInfo.creator.discordId}>`)
                    }
                }
            }
            return await sendMessage(source, converted.join("\n").substring(0, 1900), undefined, true)
        }

        const ticketInfo = await client.prisma.ticket.findUnique({
            where: {
                channelId
            },
            include: {
                creator: true,
                contributors: true,
                verifications: {
                    include: {
                        verifier: true
                    }
                }
            }
        })

        if (ticketInfo == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        const ticketType = ticketTypes[ticketInfo.type]
        return await sendMessage(source, new MessageEmbed()
            .setTitle(`${ticketType?.name ?? ticketInfo.type} (Ticket #${ticketInfo.id})`)
            .setDescription(`Created by <@${ticketInfo.creator.discordId}> (${ticketInfo.creator.username}#${ticketInfo.creator.tag}) ${displayTimestamp(ticketInfo.createdAt)}`)
            .addField("Status", ticketInfo.status)
            .addField("Verifications", `${ticketInfo.verifications.map(v => `- <@${v.verifier.discordId}> at ${displayTimestamp(v.createdAt)}`).join("\n") || "Not yet verified"}`)
            .addField("Contributors", `${ticketInfo.contributors.map(c => `<@${c.discordId}>`).join(", ") || "No contributors added"}`)
            .setColor(Colors[ticketInfo.status as TicketStatus])
        , undefined, true)
    }
}

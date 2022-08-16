import { APIInteractionDataResolvedChannel } from "discord-api-types/v10"
import { ApplicationCommandOptionType, ButtonInteraction, ChannelType, ChatInputCommandInteraction, EmbedBuilder, GuildBasedChannel, Message, PermissionFlagsBits, User } from "discord.js"
import { baseUrl } from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { TheoryhuntSettings, ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage, TicketStatus, VerifierType } from "../../utils/Types"
import { Colors, displayTimestamp, sendMessage, verificationTypeName } from "../../utils/Utils"


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
                type: ApplicationCommandOptionType.Channel
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
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

        if (channel.type == ChannelType.GuildCategory) {
            if (!member.permissionsIn(channel.id).has(PermissionFlagsBits.ManageChannels))
                return await sendMessage(source, "You can't check categories", undefined, true)

            const children = channel.children.cache
            const converted: string[] = []
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [_id, child] of children) {

                if (child.isTextBased()) {
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

        if (!member.permissionsIn(channel.id).has(PermissionFlagsBits.ViewChannel))
            return await sendMessage(source, "You can't view this channel", undefined, true)

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
                },
                transcript: {
                    select: { slug: true }
                },
                theoryhunt: {
                    select: { name: true, id: true, messageId: true }
                }
            }
        })

        if (ticketInfo == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        const ticketType = ticketTypes[ticketInfo.type]
        const embed =new EmbedBuilder()
            .setTitle(`${ticketType?.name ?? ticketInfo.type} (Ticket #${ticketInfo.id})`)
            .setDescription(`Created by <@${ticketInfo.creator.discordId}> (${ticketInfo.creator.username}#${ticketInfo.creator.tag}) ${displayTimestamp(ticketInfo.createdAt)}`)
            .addFields([{
                name: "Status",
                value: ticketInfo.status,
                inline: true
            }, {
                name: "Verifications",
                value: `${ticketInfo.verifications.map(v => `- ${verificationTypeName[v.type as VerifierType] ?? "Unknown"} <@${v.verifier.discordId}> at ${displayTimestamp(v.createdAt)}`).join("\n") || "Not yet verified"}`,
                inline: true
            }, {
                name: "Contributors",
                value: `${ticketInfo.contributors.map(c => `<@${c.discordId}>`).join(", ") || "No contributors added"}`,
                inline: true
            }, {
                name: "Transcripts",
                value: `${ticketInfo.transcript.map(t => `[${t.slug}](${baseUrl}/transcripts/${t.slug})`).join("\n") || "No transcripts made for this ticket"}`
            }])
            .setColor(Colors[ticketInfo.status as TicketStatus])

        if (ticketInfo.theoryhunt)
            embed.addFields([{
                name: "Linked theoryhunt",
                value: `#${ticketInfo.theoryhunt.id}: [${ticketInfo.theoryhunt.name}](https://discord.com/channels/${ticketInfo.serverId}/${TheoryhuntSettings.channel}/${ticketInfo.theoryhunt.messageId})`
            }])
        return await sendMessage(source, embed, undefined, true)
    }
}

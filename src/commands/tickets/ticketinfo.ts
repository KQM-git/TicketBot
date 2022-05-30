import { ButtonInteraction, CommandInteraction, Message, MessageEmbed } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { tickets } from "../../utils/TicketTypes"
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
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await this.run(source)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source)
    }

    async run(source: CommandSource): Promise<SendMessage | undefined> {
        if (!source.channelId)
            return await sendMessage(source, "Couldn't get channel ID", undefined, true)

        const ticketInfo = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channelId
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

        if (ticketInfo == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        const ticketType = tickets[ticketInfo.type]
        return await sendMessage(source, new MessageEmbed()
            .setTitle(`${ticketType?.name ?? ticketInfo.type} (Ticket #${ticketInfo.id})`)
            .setDescription(`Created by <@${ticketInfo.creator.discordId}> (${ticketInfo.creator.username}#${ticketInfo.creator.tag}) ${displayTimestamp(ticketInfo.createdAt)}`)
            .addField("Status", ticketInfo.status)
            .addField("Verifications", `${ticketInfo.verifications.map(v => `- <@${v.verifier.discordId}> at ${displayTimestamp(v.createdAt)}`).join("\n") || "Not yet verified"}`)
            .setColor(Colors[ticketInfo.status as TicketStatus])
        , undefined, true)
    }
}

import { PrismaClient, Ticket, TicketDirectory } from "@prisma/client"
import { MessageEmbed } from "discord.js"
import { getLogger } from "log4js"
import TiBotClient from "../TiBotClient"
import { ticketTypes } from "./TicketTypes"
import { TicketStatus } from "./Types"
import { Colors } from "./Utils"

const Logger = getLogger("timer")
export default class TimerManager {
    client: TiBotClient
    prisma: PrismaClient

    constructor(client: TiBotClient) {
        this.client = client
        this.prisma = client.prisma
    }

    public ready() {
        setTimeout(async () => this.runTask().catch((e) => Logger.error(e)), 5 * 1000)
    }

    private async dinkdonk(openTickets: Ticket[]) {
        for (const ticket of openTickets) {
            const ticketType = ticketTypes[ticket.type]
            if (!ticketType || !ticketType.dinkDonk) continue

            const minTime = Date.now() - ticketType.dinkDonk.time
            let lastTime = ticket.lastMessage.getTime()
            if (lastTime > minTime) continue

            const channel = await this.client.channels.fetch(ticket.channelId)
            if (!channel || !channel.isText()) {
                Logger.error(`Unable to check time for ticket #${ticket.id}: Channel ${ticket.channelId} in ${ticket.serverId} isn't available - ${ticket.type}: ${ticket.name}`)
                continue
            }

            let lastMessage = channel.lastMessage
            if (!lastMessage) {
                const msgs = await channel.messages.fetch({ limit: 1 })
                if (msgs.size == 0)
                    continue
                lastMessage = msgs.first() ?? lastMessage
            }

            if (lastMessage)
                lastTime = Math.max(lastTime, lastMessage.createdTimestamp)

            if (lastTime < minTime) {
                Logger.info(`Sending a dinkdonk message to ${ticket.id} - ${ticket.name} - last message was at ${new Date(lastTime)}`)
                try {
                    await channel.send({
                        embeds: [new MessageEmbed().setDescription(ticketType.dinkDonk.message)]
                    })
                    lastTime = Date.now()
                } catch (error) {
                    Logger.error(`Failed to send dinkdonk to ${ticket.id} / channel ${ticket.channelId} - ${ticket.name}!`)
                }
            }

            await this.prisma.ticket.update({
                data: {
                    lastMessage: new Date(lastTime)
                },
                where: {
                    id: ticket.id
                }
            })
        }
    }

    private async ticketDir(allTickets: Ticket[]) {
        const tds = await this.prisma.ticketDirectory.findMany()

        for (const td of tds)
            await this.updateTicketDirectory(td, allTickets)
    }

    public async updateTicketDirectory(td: TicketDirectory, allTickets: Ticket[]) {
        const channel = await this.client.channels.fetch(td.channelId)
        if (!channel || !channel.isText()) {
            Logger.error(`Unable to update ${td.type} ticket directory in channel ${td.channelId} in ${td.serverId} or isn't available (channel not found)`)
            return
        }

        const msg = await channel.messages.fetch(td.messageId)
        if (!msg) {
            Logger.error(`Unable to update ${td.type} ticket directory in channel ${td.channelId} in ${td.serverId} or isn't available (message not found)`)
            return
        }

        const tickets = allTickets.filter(t => t.serverId == td.serverId && t.type == td.type)

        const ticketType = ticketTypes[td.type]

        const stats: Record<Exclude<TicketStatus, "DELETED">, Ticket[]> = {
            OPEN: [],
            CLOSED: [],
            VERIFIED: []
        }

        tickets.forEach(t => stats[t.status as Exclude<TicketStatus, "DELETED">]?.push(t))

        const embeds: MessageEmbed[] = []
        if (stats.OPEN.length > 0)
            embeds.push(new MessageEmbed()
                .setTitle(`Open ${ticketType?.name ?? td.type}`)
                .setColor(Colors.ORANGE)
                .setDescription(stats.OPEN.map(t => `<#${t.channelId}>`).join("\n"))
            )

        if (stats.CLOSED.length > 0)
            embeds.push(new MessageEmbed()
                .setTitle(`Closed ${ticketType?.name ?? td.type}`)
                .setColor(Colors.GREEN)
                .setDescription(stats.CLOSED.map(t => `<#${t.channelId}>`).join("\n"))
            )

        if (stats.VERIFIED.length > 0)
            embeds.push(new MessageEmbed()
                .setTitle(`Verified ${ticketType?.name ?? td.type}`)
                .setColor(Colors.DARK_GREEN)
                .setDescription(stats.VERIFIED.map(t => `<#${t.channelId}>`).join("\n"))
            )

        if (embeds.length == 0)
            embeds.push(new MessageEmbed()
                .setTitle(`There are currently no ${ticketType?.name ?? td.type} open`)
                .setColor(Colors.RED)
            )

        try {
            await msg.edit({ embeds })
        } catch (error) {
            Logger.error(`Couldn't edit message ${td.messageId} for ${td.type} ticket directory`)
        }
    }

    private async runTask() {
        try {
            const allTickets = await this.prisma.ticket.findMany({
                where: {
                    status: { not: TicketStatus.DELETED }
                }
            })
            const open = allTickets.filter(t => t.status == TicketStatus.OPEN)

            Logger.info(`Handling ${open.length} tickets for dink donks and updating ticket directories for ${allTickets.length} tickets`)

            try {
                await this.dinkdonk(open)
            } catch (e) {
                Logger.error(e)
            }

            try {
                await this.ticketDir(allTickets)
            } catch (e) {
                Logger.error(e)
            }
        } catch (e) {
            Logger.error(e)
        }

        const nextCheck = new Date()
        nextCheck.setMinutes(nextCheck.getMinutes() + 15 - nextCheck.getMinutes() % 15, 0, 0)
        const delay = nextCheck.getTime() - Date.now()
        Logger.info(`Scheduling next check in ${(delay / 1000).toFixed(1)}s at ${nextCheck.toISOString()}`)
        setTimeout(async () => this.runTask().catch((e) => Logger.error(e)), delay)
    }
}

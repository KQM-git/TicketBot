import { PrismaClient } from "@prisma/client"
import { MessageEmbed } from "discord.js"
import { getLogger } from "log4js"
import TiBotClient from "../TiBotClient"
import { ticketTypes } from "./TicketTypes"
import { TicketStatus } from "./Types"

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

    private async runTask() {
        try {
            const tickets = await this.prisma.ticket.findMany({
                where: {
                    status: TicketStatus.OPEN
                },
                select: {
                    id: true,
                    type: true,
                    name: true,
                    serverId: true,
                    channelId: true,
                    lastMessage: true
                }
            })

            Logger.info(`Checking ${tickets.length} open tickets for dink donks`)
            for (const ticket of tickets) {
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
        } catch (e) {
            Logger.error(e)
        }

        const nextCheck = new Date()
        nextCheck.setMinutes(nextCheck.getMinutes() + 5 - nextCheck.getMinutes() % 5, 0, 0)
        const delay = nextCheck.getTime() - Date.now()
        Logger.info(`Scheduling next check in ${(delay / 1000).toFixed(1)}s at ${nextCheck.toISOString()}`)
        setTimeout(async () => this.runTask().catch((e) => Logger.error(e)), delay)
    }

}

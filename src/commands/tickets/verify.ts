import { BaseGuildTextChannel, ButtonInteraction, CommandInteraction, GuildMember, Message, MessageEmbed, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, EndingAction, SendMessage, TicketStatus } from "../../utils/Types"
import { Colors, isTicketable, sendMessage } from "../../utils/Utils"

const Logger = getLogger("verify")
export default class VerifyTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Verify a ticket.",
            usage: "verify",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await this.run(source, source.author)
    }

    async run(source: CommandSource, user: User): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't open transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !isTicketable(source.channel)) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channel.id
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

        if (ticket == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        if (ticket.verifications.find(v => v.userId == user.id))
            return await sendMessage(source, "You already verified this ticket!", undefined, true)

        if (ticket.status == TicketStatus.VERIFIED)
            return await sendMessage(source, "This ticket is already marked as verified!", undefined, true)
        else if (ticket.status == TicketStatus.OPEN)
            return await sendMessage(source, "This ticket is not yet ready for verification! Ask the owner to close this ticket first", undefined, true)

        const ticketType = ticketTypes[ticket.type]
        if (!(ticketType && member.roles.cache.hasAny(...ticketType.manageRoles, ...(ticketType.verifyRoles ?? []))))
            return await sendMessage(source, "Only people with verify or management roles can verify tickets", undefined, true)

        const enough = ticketType.verifications && ticket.verifications.length + 1 >= ticketType.verifications

        Logger.info(`Verifying ticket ${ticket.id}: ${ticket.name} by ${user.id} (${user.tag})`)
        await source.channel.send({
            embeds: [new MessageEmbed().setDescription(`Ticket verified by <@${member.id}>`)]
        })

        if (enough && ticket.status != TicketStatus.VERIFIED) {
            Logger.info(`Enough verifications for ticket ${ticket.id}: ${ticket.name} by ${user.id} (${user.tag}), doing some extra actions...`)
            if (ticketType?.verifiedCategory && source.channel instanceof BaseGuildTextChannel)
                await source.channel.setParent(ticketType?.verifiedCategory, { lockPermissions: false })


            if (ticketType.verifiedRole) {
                const givenUser: GuildMember[] = []

                for (const contributor of ticket.contributors) {
                    try {
                        const member = await source.guild.members.fetch(contributor.discordId)
                        if (member && !member.roles.cache.has(ticketType.verifiedRole)) {
                            Logger.info(`Giving contribution role for ${member.id} (${member.user.tag}) from ticket ${ticket.id}: ${ticket.name}`)
                            await member.roles.add(ticketType.verifiedRole)
                            givenUser.push(member)

                            if (givenUser.length > 5)
                                await source.channel.send({ embeds: [
                                    new MessageEmbed()
                                        .setTitle("Contribution roles")
                                        .setDescription(givenUser.map(u => `Given <@${u.id}> the role <@${ticketType.verifiedRole}>`).join("\n"))
                                        .setColor(Colors.AQUA)
                                ] })
                        }
                    } catch (error) {
                        Logger.error(`Couldn't give role to ${contributor.discordId}`)
                    }
                }

                if (givenUser.length > 0)
                    await source.channel.send({ embeds: [
                        new MessageEmbed()
                            .setTitle("Contribution roles")
                            .setDescription(givenUser.map(u => `Given <@${u.id}> the role <@&${ticketType.verifiedRole}>`).join("\n"))
                            .setColor(Colors.AQUA)
                    ] })
            }

            Logger.info(`Giving contribution role for ${member.id} (${member.user.tag}) from ticket ${ticket.id}: ${ticket.name}`)
            const response = await source.channel.send({ embeds: [ new MessageEmbed().setTitle("Creating transcript...").setColor(Colors.ORANGE) ] })
            if (response)
                await client.transcriptionManager.startTranscript(source.channel, response, undefined, response.id, member, source.channel.name, ticketType.dumpChannel, EndingAction.VERIFIED)
        }


        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: enough ? TicketStatus.VERIFIED : undefined,
                verifications: {
                    create: {
                        channelId: source.channel.id,
                        channelName: source.channel.name,
                        server: client.transcriptionManager.getServer(source.guild),
                        verifier: await client.transcriptionManager.connectUser(member, source.guild.id),
                    }
                }
            }
        })

        Logger.info(`Verified ticket ${ticket.id}: ${ticket.name} by ${user.id} (${user.tag})`)
        return await sendMessage(source, "Verified ticket!")
    }
}

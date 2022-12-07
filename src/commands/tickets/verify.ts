import { ActionRowBuilder, ApplicationCommandOptionType, BaseGuildTextChannel, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, Message, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, EndingAction, SendMessage, TicketStatus, VerifierType } from "../../utils/Types"
import { Colors, isTicketable, sendMessage, verificationTypeName } from "../../utils/Utils"
import { thInclude, updateTHMessage } from "./theoryhunt"

const Logger = getLogger("verify")
export default class VerifyTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Verify a ticket.",
            usage: "verify",
            aliases: [],
            options: [{
                name: "type",
                description: "Type of verification",
                type: ApplicationCommandOptionType.String,
                choices: [ {
                    name: "Default",
                    value: VerifierType.DEFAULT
                }, {
                    name: "Guide Readability/Grammar",
                    value: VerifierType.GUIDE_TC
                }, {
                    name: "Guide TC Content",
                    value: VerifierType.GUIDE_GRAMMAR
                }, {
                    name: "Calculations",
                    value: VerifierType.CALCS
                }]
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getString("type", false) ?? VerifierType.DEFAULT)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        const name = source.customId.split("-")[1] ?? VerifierType.DEFAULT
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user, name)
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | string | undefined> {
        return this.run(source, source.author, args[0])
    }

    async run(source: CommandSource, user: User, type: string): Promise<SendMessage | undefined> {
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

        if (ticket.verifications.find(v => v.userId == user.id && v.type == type))
            return await sendMessage(source, "You already verified this ticket!", undefined, true)

        if (ticket.creator.discordId == user.id)
            return await sendMessage(source, "You are the owner of this and therefore you can't verify!", undefined, true)

        if (ticket.contributors.find(c => c.discordId == user.id))
            return await sendMessage(source, "You are a contributor in this ticket and therefore you can't verify!", undefined, true)

        if (ticket.status == TicketStatus.VERIFIED)
            return await sendMessage(source, "This ticket is already marked as verified!", undefined, true)
        else if (ticket.status == TicketStatus.OPEN)
            return await sendMessage(source, "This ticket is not yet ready for verification! Ask the owner to close this ticket first", undefined, true)

        const ticketType = ticketTypes[ticket.type]

        if (!ticketType?.verifications)
            return await sendMessage(source, "Couldn't find ticket type / doesn't require verifications", undefined, true)

        const verificationType = ticketType.verifications.find(x => x.type == type)
        if (!verificationType)
            return await sendMessage(source, "This ticket / verifier type doesn't have verifiers set up", undefined, true)

        if (!(member.roles.cache.hasAny(...ticketType.manageRoles, ...(verificationType.roles ?? []))))
            return await sendMessage(source, "Only people with verify or management roles can verify tickets", undefined, true)

        let enough = true
        for (const verification of ticketType.verifications)
            if (verification.required) {
                const offset = verification.type == verificationType.type ? 1 : 0
                if (ticket.verifications.filter(x => x.type == verification.type).length + offset < verification.required) {
                    enough = false
                    break
                }
            }

        Logger.info(`Verifying ticket ${ticket.id}: ${ticket.name} for type ${verificationType.type} (${enough ? "enough!" : "not enough"}) by ${user.id} (${user.tag})`)
        await source.channel.send({
            embeds: [new EmbedBuilder().setDescription(`${verificationTypeName[verificationType.type]} verified by <@${member.id}>`)]
        })

        if (enough && ticket.status != TicketStatus.VERIFIED) {
            Logger.info(`Enough verifications for ticket ${ticket.id}: ${ticket.name} by ${user.id} (${user.tag}), doing some extra actions...`)
            if (ticketType?.verifiedCategory && source.channel instanceof BaseGuildTextChannel)
                await source.channel.setParent(ticketType?.verifiedCategory, { lockPermissions: false })


            if (ticketType.verifiedRoles) {
                let givenUser: string[] = []

                for (const contributor of ticket.contributors) {
                    try {
                        const member = await source.guild.members.fetch(contributor.discordId)
                        if (!member) continue
                        const roles = ticketType.verifiedRoles.filter(r => !member.roles.cache.has(r))
                        if (roles.length > 0) {
                            Logger.info(`Giving contribution role for ${member.id} (${member.user.tag}) from ticket ${ticket.id}: ${ticket.name} (${ticketType.name})`)
                            await member.roles.add(roles)
                            givenUser.push(`Given <@${member.id}> the role${roles.length > 1 ? "s" : ""} ${roles.map(x => `<@&${x}>`).join(", ")}`)

                            if (givenUser.length > 5) {
                                await source.channel.send({ embeds: [
                                    new EmbedBuilder()
                                        .setTitle("Contribution roles")
                                        .setDescription(givenUser.join("\n"))
                                        .setColor(Colors.AQUA)
                                ] })
                                givenUser = []
                            }
                        }
                    } catch (error) {
                        Logger.error(`Couldn't give role to ${contributor.discordId}`)
                    }
                }

                if (givenUser.length > 0)
                    await source.channel.send({ embeds: [
                        new EmbedBuilder()
                            .setTitle("Contribution roles")
                            .setDescription(givenUser.join("\n"))
                            .setColor(Colors.AQUA)
                    ] })
            }

            Logger.info(`Giving contribution role for ${member.id} (${member.user.tag}) from ticket ${ticket.id}: ${ticket.name}`)
            const response = await source.channel.send({
                embeds: [new EmbedBuilder().setTitle("Creating transcript...").setColor(Colors.ORANGE) ],
                components: ticket.theoryhuntId ? [new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`theoryhunt-close-${ticket.theoryhuntId}`)
                        .setLabel("Mark theoryhunt as done")
                        .setStyle(ButtonStyle.Success)
                )] : []
            })
            if (response)
                await client.transcriptionManager.startTranscript(source.channel, response, undefined, response.id, member, source.channel.name, ticketType.dumpChannel, EndingAction.VERIFIED)
        }


        const updatedTicket = await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                status: enough ? TicketStatus.VERIFIED : undefined,
                verifications: {
                    create: {
                        channelId: source.channel.id,
                        channelName: source.channel.name,
                        server: client.transcriptionManager.getServer(source.guild),
                        verifier: await client.transcriptionManager.connectUser(member, source.guild.id),
                        type: type,
                    }
                }
            },
            include: { theoryhunt: { include: thInclude } }
        })

        await updateTHMessage(updatedTicket.theoryhunt)

        Logger.info(`Verified ticket ${ticket.id}: ${ticket.name} by ${user.id} (${user.tag})`)
        return await sendMessage(source, "Verified ticket!")
    }
}

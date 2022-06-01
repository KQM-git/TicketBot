import { CommandInteraction, Message, MessageEmbed, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

const Logger = getLogger("contributor")
export default class ContributorTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Manage the contributors.",
            usage: "contributor",
            aliases: [],
            options: [{
                name: "add",
                description: "Add a contributor",
                type: "SUB_COMMAND",
                options: [{
                    name: "user",
                    description: "User to add as contributor",
                    type: "USER"
                }]
            }, {
                name: "remove",
                description: "Remove a contributor",
                type: "SUB_COMMAND",
                options: [{
                    name: "user",
                    description: "User to remove from contributors",
                    type: "USER"
                }]
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getSubcommand(true), source.options.getUser("user", true))
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, type: string, target: User): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't manage contributors here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || source.channel.type != "GUILD_TEXT") return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channel.id
            },
            include: {
                creator: true,
                contributors: {
                    where: {
                        discordId: target.id
                    }
                }
            }
        })


        if (ticket == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        const ticketType = ticketTypes[ticket.type]
        if (!(ticket.creator.discordId == user.id || (ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))))
            return await sendMessage(source, "Only the ticket creator and people with management roles can edit the contributors", undefined, true)

        const targetMember = await source.guild.members.fetch(target.id)
        if (!targetMember) return await sendMessage(source, "Couldn't fetch Discord profile of target", undefined, true)

        const contributor = ticket.contributors.find(c => c.discordId == target.id)
        if (type == "add") {
            if (contributor)
                return await sendMessage(source, "That user is already listed as a contributor")


            Logger.info(`Adding ${target.id} (${target.tag}) as contributor to ${ticket.id} (${ticket.name}) by ${member.id} (${member.user.tag})`)
            await client.prisma.ticket.update({
                where: {
                    id: ticket.id
                },
                data: {
                    contributors: await client.transcriptionManager.connectUser(targetMember, member.guild.id)
                }
            })

            await source.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setDescription(`<@${member.id}> added <@${target.id}> as contributor`)
                        .setColor(Colors.GREEN)
                ]
            })
            return await sendMessage(source, "Added user!")
        } else if (type == "remove") {
            if (!contributor)
                return await sendMessage(source, "That user isn't listed as a contributor")

            Logger.info(`Removing ${target.id} (${target.tag}) as contributor from ${ticket.id} (${ticket.name}) by ${member.id} (${member.user.tag})`)
            await client.prisma.ticket.update({
                where: {
                    id: ticket.id
                },
                data: {
                    contributors: {
                        disconnect: {
                            id: contributor.id
                        }
                    }
                }
            })

            await source.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setDescription(`<@${member.id}> removed <@${target.id}> as contributor`)
                        .setColor(Colors.RED)
                ]
            })
            return await sendMessage(source, "Removed user!")
        }

        return await sendMessage(source, "Unknown subcommand")
    }
}

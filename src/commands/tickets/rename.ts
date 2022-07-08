import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageEmbed, Modal, ModalSubmitInteraction, TextInputComponent, User } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { ticketTypes } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, isTicketable, sendMessage, trim } from "../../utils/Utils"

const Logger = getLogger("rename")
export default class RenameTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Renames the current ticket.",
            usage: "rename",
            aliases: [],
            options: [{
                name: "name",
                description: "Rename the current ticket",
                type: "STRING",
                required: true
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | string | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getString("name", true))
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        const currentName = await this.run(source, source.user)
        if (typeof currentName != "string")
            return

        const input = new TextInputComponent()
            .setCustomId("name")
            .setLabel("Name")
            .setStyle("SHORT")
            .setValue(currentName)
            .setPlaceholder("Enter new ticket name")
            .setRequired(true)

        const modal = new Modal()
            .setTitle("Renaming ticket")
            .setCustomId(source.customId)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .setComponents(new MessageActionRow().addComponents(input))

        await source.showModal(modal)
    }

    async runModalSubmit(source: ModalSubmitInteraction, _command: string): Promise<void> {
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user, source.fields.getTextInputValue("name"))
    }


    async runMessage(source: Message, args: string[]): Promise<SendMessage | string | undefined> {
        if (args.length == 0)
            return sendMessage(source, "No new name provided!")
        return this.run(source, source.author, args.join(" "))
    }

    async run(source: CommandSource, user: User, name?: string): Promise<SendMessage | undefined | string> {
        if (!source.guild) return await sendMessage(source, "Can't rename transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!source.channel || !isTicketable(source.channel)) return await sendMessage(source, "Couldn't get channel ID / not a text channel", undefined, true)

        const ticket = await client.prisma.ticket.findUnique({
            where: {
                channelId: source.channel.id
            },
            include: {
                creator: true
            }
        })

        if (ticket == null)
            return await sendMessage(source, "No ticket data associated with this channel!", undefined, true)

        if (ticket.lastRename && ticket.lastRename?.getTime() + 5 * 60 * 1000 > Date.now())
            return await sendMessage(source, "Please wait a couple minutes between renames!", undefined, true)

        const ticketType = ticketTypes[ticket.type]

        if (ticketType && member.roles.cache.hasAny(...(ticketType.blacklistRoles ?? [])))
            return await sendMessage(source, "You are blacklisted from renaming a ticket", undefined, true)

        if (!(ticket.creator.discordId == user.id || (ticketType && member.roles.cache.hasAny(...ticketType.manageRoles))))
            return await sendMessage(source, "Only the ticket creator and people with management roles can rename tickets", undefined, true)

        if (name == undefined)
            return ticket.name

        Logger.info(`Renaming ticket ${ticket.id}: ${ticket.name} -> ${name} by ${user.id} (${user.tag})`)

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                lastRename: new Date()
            }
        })

        try {
            await source.channel.setName(trim(name), `Rename by ${user.id} (${user.tag})`)
            await source.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setDescription(`This ticket has been renamed to \`${name.replace(/`/g, "")}\` by <@${member.id}>`)
                        .setColor(Colors.GREEN)
                ],
            })
        } catch (error) {
            return await sendMessage(source, "Couldn't rename ticket!", undefined, true)
        }

        await client.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
                name,
                lastRename: new Date()
            }
        })
        Logger.info(`Renamed ticket ${ticket.id}: ${ticket.name} -> ${name} by ${user.id} (${user.tag})`)

        return await sendMessage(source, "Successfully renamed ticket!")
    }
}

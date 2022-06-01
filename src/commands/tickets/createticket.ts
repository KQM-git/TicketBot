import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, Modal, ModalSubmitInteraction, TextInputComponent, User } from "discord.js"
import Command from "../../utils/Command"
import {  ticketTypes } from "../../utils/TicketTypes"
import { createTicket } from "../../utils/TicketUtils"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


export default class CreateTicket extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Create a ticket.",
            usage: "createticket",
            aliases: [],
            options: [{
                name: "type",
                description: "Ticket type to create",
                type: "STRING",
                choices: Object.values(ticketTypes).map(a => ({ name: a.name, value: a.id })),
                required: true
            }, {
                name: "name",
                description: "Ticket name",
                type: "STRING",
                required: true
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getString("type", true), source.options.getString("name", true))
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        const ticketType = ticketTypes[source.customId.split("-")[1]]
        if (!ticketType) {
            await source.reply({ content: "Couldn't find ticket type", ephemeral: true })
            return
        }
        const member = await source.guild?.members.fetch(source.user.id)
        if (!member) {
            await sendMessage(source, "Couldn't fetch your roles", undefined, true)
            return
        }

        if (!member.roles.cache.hasAny(...ticketType.creationRoles)) {
            await sendMessage(source, "You don't have one of the roles required to create this type of ticket", undefined, true)
            return
        }

        const input = new TextInputComponent()
            .setCustomId("name")
            .setLabel("Name")
            .setStyle("SHORT")
            .setPlaceholder("Enter a name for your ticket")

        const modal = new Modal()
            .setTitle(`Creating a ${ticketType.name}`)
            .setCustomId(source.customId)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .setComponents(new MessageActionRow().addComponents(input))

        await source.showModal(modal)
    }

    async runModalSubmit(source: ModalSubmitInteraction, _command: string): Promise<void> {
        await source.deferReply({ ephemeral: true })
        await this.run(source, source.user, source.customId.split("-")[1], source.fields.getTextInputValue("name"))
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, type: string, name: string): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't make transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        const ticketType = ticketTypes[type]

        if (!ticketType)
            return await sendMessage(source, "Couldn't find ticket type", undefined, true)

        if (!member.roles.cache.hasAny(...ticketType.creationRoles))
            return await sendMessage(source, "You don't have one of the roles required to create this type of ticket", undefined, true)

        try {
            const id = await createTicket(ticketType, name, member, source.guild)
            return await sendMessage(source, `Created ${ticketType.name}: ${name} over at <#${id}>!`, undefined, true)
        } catch (error) {
            return await sendMessage(source, `Creating ticket failed: ${error}`, undefined, true)
        }
    }
}

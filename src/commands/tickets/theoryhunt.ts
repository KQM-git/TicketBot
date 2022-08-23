import { Theoryhunt as StoredTheoryhunt, Ticket, User } from "@prisma/client"
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder, Message, MessageContextMenuCommandInteraction, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle, User as DiscordUser } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { TheoryhuntSettings, ticketTypes } from "../../utils/TicketTypes"
import { createTicket } from "../../utils/TicketUtils"
import { InteractionSource, SendMessage, UserConnection } from "../../utils/Types"
import { Color, Colors, sendMessage } from "../../utils/Utils"


const Logger = getLogger("theoryhunt")
export const thInclude/* : Prisma.TheoryhuntInclude*/ = {
    commissioner: { select: { discordId: true } },
    ticket: {
        where: { deleted: false },
        include: {
            contributors: true
        }
    }
}

type IncludedTheoryhunt = StoredTheoryhunt & {
    ticket: (Ticket & {
        contributors: User[]
    })[]
    commissioner: {
        discordId: string
    }[]
}

export default class Theoryhunt extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Manage theoryhunts",
            usage: "contributor",
            aliases: [],
            options: [{
                name: "create",
                description: "Create a theoryhunt",
                type: ApplicationCommandOptionType.Subcommand
            }, {
                name: "edit",
                description: "Edit a theoryhunt",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "id",
                    description: "ID to edit",
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }]
            }, {
                name: "edit2",
                description: "Edit more special stuff of a theoryhunt",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "id",
                    description: "ID to edit",
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }]
            }, {
                name: "reopen",
                description: "Reopen a theoryhunt (Double check ID using edit)",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "id",
                    description: "ID to reopen",
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }]
            }, {
                name: "close",
                description: "Close a theoryhunt (Double check ID using edit)",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "id",
                    description: "ID to close",
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }]
            }, {
                name: "createticket",
                description: "Create a ticket for a theoryhunt (Double check ID using edit)",
                type: ApplicationCommandOptionType.Subcommand,
                options: [{
                    name: "id",
                    description: "ID to create ticket for",
                    type: ApplicationCommandOptionType.Integer,
                    required: true
                }]
            }],
            onMessage: ["Edit theoryhunt", "Edit theoryhunt (more)", "Create a ticket"]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        const sub = source.options.getSubcommand(true)
        if (sub == "create")
            return await this.runMainModal(source)

        const th = await client.prisma.theoryhunt.findUnique({
            where: {
                id: source.options.getInteger("id", true)
            },
            include: thInclude
        })

        if (!th)
            return await sendMessage(source, "Couldn't find theoryhunt by that ID!", undefined, true)

        if (sub == "edit")
            return await this.runMainModal(source, th)
        else if (sub == "edit2")
            return await this.runSecondaryModal(source, th)
        else if (sub == "reopen")
            return await this.reopen(source, th)
        else if (sub == "close")
            return await this.close(source, th)
        else if (sub == "createticket")
            return await this.createTicket(source, source.user, th)
    }


    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async runMessageContext(source: MessageContextMenuCommandInteraction): Promise<void> {
        const targetId = source.targetMessage.id
        const theoryhunt = await client.prisma.theoryhunt.findUnique({
            where: {
                messageId: targetId
            },
            include: thInclude
        })

        if (!theoryhunt) {
            await sendMessage(source, "Couldn't find theoryhunt from this message!", undefined, true)
            return
        }

        if (source.commandName == "Edit theoryhunt")
            await this.runMainModal(source, theoryhunt)
        else if (source.commandName == "Edit theoryhunt (more)")
            await this.runSecondaryModal(source, theoryhunt)
        else if (source.commandName == "Create a ticket")
            await this.createTicket(source, source.user, theoryhunt)
    }

    async runMainModal(source: InteractionSource, theoryhunt?: IncludedTheoryhunt): Promise<undefined> {
        if (await this.checkPerms(source,  false, theoryhunt) !== true)
            return

        const member = await source.guild?.members.fetch(source.user.id)
        if (!member) {
            await sendMessage(source, "Couldn't fetch your roles", undefined, true)
            return
        }

        const ticketType = ticketTypes.theoryhunt
        if (!ticketType || !member.roles.cache.hasAny(...ticketType.creationRoles)) {
            await sendMessage(source, "You don't have one of the roles required to create this type of ticket", undefined, true)
            return
        }

        const name = new TextInputBuilder()
            .setCustomId("name")
            .setLabel("Name")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(100)
            .setPlaceholder("Enter a name for the theoryhunt")
            .setValue(theoryhunt?.name ?? "")
            .setRequired(true)

        const difficulty = new TextInputBuilder()
            .setCustomId("difficulty")
            .setLabel("Difficulty")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(1)
            .setPlaceholder("S/A/B/C/D")
            .setValue(theoryhunt?.difficulty ?? "")
            .setRequired(true)

        const difficultyReason = new TextInputBuilder()
            .setCustomId("difficultyreason")
            .setLabel("Difficulty reasoning")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setPlaceholder("Optional reason explaining difficulty")
            .setValue(theoryhunt?.difficultyReason ?? "")
            .setRequired(false)

        const req = new TextInputBuilder()
            .setCustomId("req")
            .setLabel("Requirements")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(500)
            .setPlaceholder("Enter requirements for the theoryhunt")
            .setRequired(true)
            .setValue(theoryhunt?.requirements ?? "")

        const details = new TextInputBuilder()
            .setCustomId("details")
            .setLabel("Details")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setPlaceholder("Enter details for the theoryhunt")
            .setRequired(true)
            .setValue(theoryhunt?.details ?? "")

        const modal = new ModalBuilder()
            .setTitle(theoryhunt ? `Editing ${ticketType.name} #${theoryhunt.id}` : `Creating a ${ticketType.name}`)
            .setCustomId(theoryhunt ? `theoryhunt-edit-${theoryhunt.id}` : "theoryhunt-create")
            .setComponents(
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(name),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(difficulty),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(difficultyReason),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(req),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(details),
            )

        await source.showModal(modal)

        return undefined
    }

    async runSecondaryModal(source: InteractionSource, theoryhunt: IncludedTheoryhunt): Promise<undefined> {
        if (await this.checkPerms(source, false, theoryhunt) !== true)
            return

        const description = new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setPlaceholder("Enter description for the theoryhunt")
            .setValue(theoryhunt.description ?? "")
            .setRequired(false)

        const commissioner = new TextInputBuilder()
            .setCustomId("commissioners")
            .setLabel("Commissioners")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setPlaceholder("Enter line separated list of Discord IDs")
            .setValue(theoryhunt.commissioner.map(c => c.discordId).join("\n"))
            .setRequired(false)

        const tickets = new TextInputBuilder()
            .setCustomId("tickets")
            .setLabel("Tickets")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setPlaceholder("Enter line separated list of Ticket IDs")
            .setValue(theoryhunt.ticket.map(c => c.id).join("\n"))
            .setRequired(false)

        const modal = new ModalBuilder()
            .setTitle(`Editing Theoryhunt #${theoryhunt.id}`)
            .setCustomId(`theoryhunt-edit2-${theoryhunt.id}`)
            .setComponents(
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(description),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(commissioner),
                new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(tickets),
            )

        await source.showModal(modal)

        return undefined
    }

    async runModalSubmit(source: ModalSubmitInteraction): Promise<void> {
        const type = source.customId.split("-")[1]
        if (type == "create")
            await this.runCreateTheoryhunt(source)
        else if (type == "edit")
            await this.runEditTheoryhunt(source, +source.customId.split("-")[2])
        else if (type == "edit2")
            await this.runEdit2Theoryhunt(source, +source.customId.split("-")[2])
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        const type = source.customId.split("-")[1]

        const th = await client.prisma.theoryhunt.findUnique({
            where: {
                id: +source.customId.split("-")[2]
            },
            include: thInclude
        })

        if (!th) {
            await sendMessage(source, "Couldn't find theoryhunt", undefined, true)
            return
        }

        if (await this.checkPerms(source, false, th) !== true)
            return

        if (type == "close")
            await this.close(source, th)
    }

    async runCreateTheoryhunt(source: ModalSubmitInteraction): Promise<SendMessage | undefined> {
        if (await this.checkPerms(source, false) !== true)
            return

        const guild = source.guild
        if (!guild) return await sendMessage(source, "Can't manage theoryhunts here", undefined, true)
        const member = await source.guild.members.fetch(source.user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        const ticketType = ticketTypes.theoryhunt
        if (!ticketType || !member.roles.cache.hasAny(...ticketType.creationRoles)) {
            await sendMessage(source, "You don't have one of the roles required to create this type of ticket", undefined, true)
            return
        }

        if (await this.checkPerms(source, true) !== true)
            return

        const creationChannel = await guild.channels.fetch(TheoryhuntSettings.channel)
        if (!creationChannel?.isTextBased()) return await sendMessage(source, "Theoryhunt channel might not be configured correctly", undefined, true)

        Logger.info(`Creating TH ${source.fields.getTextInputValue("name")} for ${member.id} / ${member.user.tag}`)

        const msg = await creationChannel.send({
            content: "<@&855509799335493692> <:keqgrab:1011631839569518643>",
            embeds: [new EmbedBuilder().setTitle(source.fields.getTextInputValue("name") ?? "Unknown").setDescription("Creating theoryhunt...")],
            allowedMentions: {
                roles: ["855509799335493692"],
            },
        })

        const theoryhunt = await client.prisma.theoryhunt.create({
            data: {
                name: source.fields.getTextInputValue("name"),
                difficulty: source.fields.getTextInputValue("difficulty").toUpperCase(),
                difficultyReason: source.fields.getTextInputValue("difficultyreason"),
                requirements: source.fields.getTextInputValue("req"),
                details: source.fields.getTextInputValue("details"),
                messageId: msg.id,
                state: "OPEN",
                server: client.transcriptionManager.getServer(source.guild),
                commissioner: await client.transcriptionManager.connectUser(member, source.guild.id)
            },
            include: thInclude
        })

        Logger.info(`Created TH #${theoryhunt.id} for ${member.id} / ${member.user.tag}`)

        await updateTHMessage(theoryhunt)

        return sendMessage(source, `Created theoryhunt #${theoryhunt.id}!`, undefined, true)
    }

    async runEditTheoryhunt(source: ModalSubmitInteraction, id: number): Promise<SendMessage | undefined> {
        const channel = await client.channels.fetch(TheoryhuntSettings.channel)
        if (!channel || !channel.isTextBased())
            return await sendMessage(source, "Theoryhunt channel might not be configured correctly", undefined, true)

        const oldTh = await client.prisma.theoryhunt.findUnique({
            where: { id },
            include: thInclude
        })

        if (await this.checkPerms(source, false, oldTh) !== true)
            return

        Logger.info(`Updating TH #${id} for ${source.user.id} / ${source.user.tag}`)

        const theoryhunt = await client.prisma.theoryhunt.update({
            where: {
                id
            },
            data: {
                name: source.fields.getTextInputValue("name"),
                difficulty: source.fields.getTextInputValue("difficulty").toUpperCase(),
                difficultyReason: source.fields.getTextInputValue("difficultyreason"),
                requirements: source.fields.getTextInputValue("req"),
                details: source.fields.getTextInputValue("details"),
            },
            include: thInclude
        })

        Logger.info(`Updated TH #${id} for ${source.user.id} / ${source.user.tag}`)


        try {
            await updateTHMessage(theoryhunt)
        } catch (error) {
            return await sendMessage(source, "Couldn't find message?", undefined, true)
        }

        return sendMessage(source, `Updated theoryhunt #${theoryhunt.id}!`, undefined, true)
    }

    async runEdit2Theoryhunt(source: ModalSubmitInteraction, id: number): Promise<SendMessage | undefined> {
        const guild = source.guild
        if (!guild) return await sendMessage(source, "Can't manage theoryhunts here", undefined, true)
        const channel = await client.channels.fetch(TheoryhuntSettings.channel)
        if (!channel || !channel.isTextBased())
            return await sendMessage(source, "Theoryhunt channel might not be configured correctly", undefined, true)

        const oldTh = await client.prisma.theoryhunt.findUnique({
            where: { id },
            include: thInclude
        })

        if (await this.checkPerms(source, false, oldTh) !== true)
            return

        Logger.info(`Updating TH #${id} for ${source.user.id} / ${source.user.tag}`)

        const commissioners: UserConnection[] = []
        for (const id of source.fields.getTextInputValue("commissioners").split("\n")) {
            if (id.trim().length == 0) continue

            const member = await guild.members.fetch(id.trim())
            if (member == undefined)
                return await sendMessage(source, `Couldn't fetch member ${id}`, undefined, true)

            const connect = await client.transcriptionManager.connectUser(member, source.guild.id)
            commissioners.push(connect.connectOrCreate)
        }

        const tickets: { id: number }[] = []
        for (const id of source.fields.getTextInputValue("tickets").split("\n")) {
            if (id.trim().length == 0) continue
            tickets.push({ id: +id.trim() })
        }
        const old = await client.prisma.theoryhunt.findUnique({
            where: {
                id
            },
            include: {
                commissioner: { select: { id: true } },
                ticket: { select: { id: true } }
            }
        })

        const theoryhunt = await client.prisma.theoryhunt.update({
            where: {
                id
            },
            data: {
                description: source.fields.getTextInputValue("description"),
                commissioner: {
                    disconnect: old?.commissioner,
                    connectOrCreate: commissioners
                },
                ticket: {
                    disconnect: old?.ticket,
                    connect: tickets
                }
            },
            include: thInclude
        })

        Logger.info(`Updated TH #${id} for ${source.user.id} / ${source.user.tag}`)

        try {
            await updateTHMessage(theoryhunt)
        } catch (error) {
            return await sendMessage(source, "Couldn't find message?", undefined, true)
        }

        return sendMessage(source, `Updated theoryhunt #${theoryhunt.id}!`, undefined, true)
    }

    async reopen(source: InteractionSource | ModalSubmitInteraction, theoryhunt: IncludedTheoryhunt): Promise<SendMessage | undefined> {
        if (await this.checkPerms(source, true) !== true)
            return

        const channel = await client.channels.fetch(TheoryhuntSettings.channel)
        if (!channel || !channel.isTextBased())
            return await sendMessage(source, "Theoryhunt channel might not be configured correctly", undefined, true)

        const newMsg = await channel.send({
            content: "<@&855509799335493692> <:keqgrab:1011631839569518643>",
            embeds: [createEmbed(theoryhunt)],
            allowedMentions: {
                roles: ["855509799335493692"]
            }
        })

        await client.prisma.theoryhunt.update({
            where: { id: theoryhunt.id },
            data: {
                messageId: newMsg.id,
                state: "OPEN"
            }
        })

        try {
            const msg = await channel.messages.fetch(theoryhunt.messageId)
            await msg.delete()
        } catch (error) {
            void 0
        }

        return await sendMessage(source, "Reopened theoryhunt!", undefined, true)
    }

    async close(source: InteractionSource | ModalSubmitInteraction, theoryhunt: IncludedTheoryhunt): Promise<SendMessage | undefined> {
        if (await this.checkPerms(source, false, theoryhunt) !== true)
            return

        const channel = await client.channels.fetch(TheoryhuntSettings.channel)
        if (!channel || !channel.isTextBased())
            return await sendMessage(source, "Theoryhunt channel might not be configured correctly", undefined, true)

        await client.prisma.theoryhunt.update({
            where: { id: theoryhunt.id },
            data: {
                state: "CLOSED"
            }
        })

        try {
            const msg = await channel.messages.fetch(theoryhunt.messageId)
            await msg.delete()
        } catch (error) {
            void 0
        }

        return await sendMessage(source, "Closed theoryhunt!", undefined, true)
    }

    async createTicket(source: InteractionSource | ModalSubmitInteraction, user: DiscordUser, theoryhunt: IncludedTheoryhunt): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't manage theoryhunts here", undefined, true)

        const member = await source.guild.members.fetch(source.user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        const channel = await client.channels.fetch(TheoryhuntSettings.channel)
        if (!channel || !channel.isTextBased())
            return await sendMessage(source, "Theoryhunt channel might not be configured correctly", undefined, true)

        if (theoryhunt.ticket.filter(t => t.deleted == false).length > 0)
            return await sendMessage(source, "This ticket already has a ticket attached!", undefined, true)

        if (!(member.roles.cache.hasAny(...TheoryhuntSettings.manageRoles) || !theoryhunt.commissioner.some(c => c.discordId == user.id)))
            return await sendMessage(source, "Only people with management roles can create tickets for theoryhunts", undefined, true)

        const id = await createTicket(ticketTypes.theoryhunt, "TH " + theoryhunt.name, member, source.guild)

        const th = await client.prisma.theoryhunt.update({
            where: { id: theoryhunt.id },
            data: {
                ticket: { connect: { channelId: id } }
            },
            include: thInclude
        })

        await updateTHMessage(th)

        return await sendMessage(source, `Created Theoryhunt: ${theoryhunt.name} over at <#${id}>!`, undefined, true)
    }

    async checkPerms(source: InteractionSource | ModalSubmitInteraction, requireManage: boolean, theoryhunt?: IncludedTheoryhunt | null): Promise<SendMessage | undefined | true> {
        if (!source.guild) return await sendMessage(source, "Can't manage theoryhunts here", undefined, true)

        const member = await source.guild.members.fetch(source.user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!(member.roles.cache.hasAny(...TheoryhuntSettings.manageRoles) || (!requireManage && theoryhunt?.commissioner.some(c => c.discordId == member.id)))) {
            await sendMessage(source, "Only people with management roles can manage theoryhunts", undefined, true)
            return
        }

        return true
    }
}

function createEmbed(theoryhunt: IncludedTheoryhunt) {
    const contributors = theoryhunt.ticket.flatMap(t => t.contributors.map(c => `<@${c.discordId}>`)).filter((v, i, a) => a.indexOf(v) == i)
    const embed =new EmbedBuilder()
        .setColor(Colors[theoryhunt.difficulty as Color] ?? Colors.GRAY)
        .setTitle(theoryhunt.name)
        .setDescription(theoryhunt.description || null)
        .addFields([{
            name: "Difficulty",
            value:  `${theoryhunt.difficulty}${theoryhunt.difficultyReason ? ` (${theoryhunt.difficultyReason})`:""}`
        }, {
            name: "Requirements",
            value:  theoryhunt.requirements
        }, {
            name: "Details",
            value:  theoryhunt.details
        }, {
            name: "Commissioner",
            value:  theoryhunt.commissioner.length == 0 ? "KQM" : theoryhunt.commissioner.map(c => `<@${c.discordId}>`).sort().join(", "),
            inline: true
        }, {
            name: "Ticket",
            value:  theoryhunt.ticket.length == 0 ? "Ask a Scholar to create a ticket for you if you want to work on this." : theoryhunt.ticket.map(t => `<#${t.channelId}> [${t.status}]`).sort().join("\n"),
            inline: true
        }, {
            name: "Participants",
            value:  contributors.length == 0 ? "This could be you!" : contributors.join(", "),
            inline: contributors.length < 3
        }])
    return embed
}

export async function updateTHMessage(theoryhunt: IncludedTheoryhunt|null) {
    if (theoryhunt == null) return

    const channel = await client.channels.fetch(TheoryhuntSettings.channel)
    if (!channel || !channel.isTextBased()) return

    try {
        const msg = await channel.messages.fetch(theoryhunt.messageId)
        await msg.edit({
            content: "<@&855509799335493692> <:keqgrab:1011631839569518643>",
            embeds: [createEmbed(theoryhunt)],
            allowedMentions: {
                roles: ["855509799335493692"]
            }
        })
    } catch (error) {
        void 0
    }
}

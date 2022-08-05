import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageContextMenuInteraction, MessageEmbed, Modal, ModalSubmitInteraction, Snowflake, TextInputComponent, TextInputStyleResolvable } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { CHANNEL, ROLE } from "../../utils/TicketTypes"
import { InteractionSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

const templates: Record<string, {
    name: string
    embedTitle: string
    createThreads?: Snowflake[]
    fields: {
        id: string
        inline?: true
        modalTitle: string
        embedTitle: string
        modalPlaceholder?: string
        modalDefault?: string
        type: TextInputStyleResolvable
    }[]
    threadPing?: string[]
}> = {
    proposal: {
        name: "Proposal",
        embedTitle: "Theorycrafting Proposal",
        fields: [{
            id: "proposal",
            modalTitle: "Proposal",
            embedTitle: "Proposal",
            modalPlaceholder: "What is the idea that you want to explore?",
            type: "SHORT"
        }, {
            id: "motivation",
            modalTitle: "Motivation",
            embedTitle: "Why are you TC'ing this?",
            modalPlaceholder: "<I like X unit> <Meta/Value Analysis>",
            type: "SHORT"
        }, {
            id: "idea",
            modalTitle: "Reasoning",
            embedTitle: "Why would this idea work? What is it competing against? What are some substitutes and alternatives that we already use?",
            modalPlaceholder: "The shield from Xinyan provides small defense but has Pyro application.",
            type: "PARAGRAPH"
        }, {
            id: "what",
            modalTitle: "What do you need",
            embedTitle: "Did you want to try to calc this? What is the end goal?",
            modalPlaceholder: "<TheoryHunt> <Calc Guide> <GCsim>",
            type: "PARAGRAPH"
        }]
    },
    reqcalc: {
        name: "Calculation Request",
        embedTitle: "Calculation Request",
        createThreads: [CHANNEL.CALC_REQUEST],
        threadPing: ["975990552812204032"],
        fields: [{
            id: "type",
            embedTitle: "Type of Calculation",
            modalTitle: "Calculation Type",
            modalPlaceholder: "Weapon / Team / etc.",
            type: "SHORT"
        }, {
            id: "composition",
            modalTitle: "Team / Character(s)",
            embedTitle: "Composition",
            modalPlaceholder: "List the team members and rotation video",
            modalDefault: `- Team member 1 + Weapon + Artifact Set/Stats 
(repeat for all team members)
(if anything is not included, up to calcer's discretion)`,
            type: "PARAGRAPH"
        }, {
            id: "misc",
            modalTitle: "Misc",
            embedTitle: "Other details",
            modalPlaceholder: "At least purpose is required",
            modalDefault: `- Purpose of calc (for guide, compendium, etc.)
- Rotation (required if team calc)
- Rotation video (required if team calc), links can be formatted like [this](https://youtu.be/dQw4w9WgXcQ)
- Additional details (if necessary)`,
            type: "PARAGRAPH"
        }, {
            id: "status",
            inline: true,
            modalTitle: "Status",
            embedTitle: "Status",
            modalPlaceholder: "Open / Under verification / etc.",
            modalDefault: "Open",
            type: "SHORT"
        }, {
            id: "participants",
            inline: true,
            modalTitle: "Participants",
            embedTitle: "Participants",
            modalPlaceholder: "Participants",
            modalDefault: "This can be you!",
            type: "PARAGRAPH"
        }]
    }
}

export default class Template extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: "Use a template.",
            usage: "template <name>",
            aliases: [],
            options: [{
                name: "template",
                description: "Template to use",
                type: "STRING",
                choices: Object.entries(templates).map(([value, { name }]) => ({
                    name, value
                })),
                required: true
            }],
            onMessage: [
                "Edit template"
            ]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.createModal(source, source.options.getString("template", true))
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await this.createModal(source, source.customId.split("-")[1])
    }

    async runMessageContext(source: MessageContextMenuInteraction, _command: string): Promise<void> {
        const msg = source.targetMessage
        if (msg.author.id !== client.user?.id || msg.embeds.length != 1) return
        const embed = msg.embeds[0]

        const member = await source.guild?.members.fetch(source.user.id)
        if (!member) {
            await sendMessage(source, "Couldn't fetch your roles", undefined, true)
            return
        }

        if (member.roles.cache.hasAny(...ROLE.BLACKLIST)) {
            await sendMessage(source, "You are blacklisted from using templates", undefined, true)
            return
        }

        if (msg.interaction?.user.id != source.user.id && !member.roles.cache.hasAny(...ROLE.TC_STAFF)){
            await sendMessage(source, "You don't have permissions to edit this template", undefined, true)
            return
        }

        const templateName = Object.entries(templates).find(([_name, template]) => template.embedTitle == embed.title)?.[0]
        if (!templateName) {
            await sendMessage(source, "Could not find the relevant template!", undefined, true)
            return
        }

        const template = templates[templateName]
        const modal = new Modal()
            .setTitle(`Editing a ${template.name}`)
            .setCustomId(`template-${templateName}-${msg.id}`)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .setComponents(...template.fields.map(p => new MessageActionRow().addComponents(new TextInputComponent()
                .setCustomId(p.id)
                .setLabel(p.modalTitle)
                .setStyle(p.type)
                .setPlaceholder(p.modalPlaceholder ?? "")
                .setValue(embed.fields?.find(f => f.name == p.embedTitle)?.value ?? p.modalDefault ?? "")
                .setRequired(true)
                .setMaxLength(1000)
            )))

        await source.showModal(modal)
    }

    async createModal(source: InteractionSource, templateName: string) {
        const member = await source.guild?.members.fetch(source.user.id)
        if (!member) {
            await sendMessage(source, "Couldn't fetch your roles", undefined, true)
            return
        }

        if (member.roles.cache.hasAny(...ROLE.BLACKLIST))
            return await sendMessage(source, "You are blacklisted from using templates", undefined, true)

        const template = templates[templateName]
        if (!template)
            return await sendMessage(source, "Could not find a template by that name!", undefined, true)

        const modal = new Modal()
            .setTitle(`Creating a ${template.name}`)
            .setCustomId(`template-${templateName}`)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .setComponents(...template.fields.map(p => new MessageActionRow().addComponents(new TextInputComponent()
                .setCustomId(p.id)
                .setLabel(p.modalTitle)
                .setStyle(p.type)
                .setPlaceholder(p.modalPlaceholder ?? "")
                .setValue(p.modalDefault ?? "")
                .setRequired(true)
                .setMaxLength(1000)
            )))

        await source.showModal(modal)
    }

    async runModalSubmit(source: ModalSubmitInteraction): Promise<void> {
        const member = await source.guild?.members.fetch(source.user.id)
        if (!member) {
            await sendMessage(source, "Couldn't fetch your roles", undefined, true)
            return
        }

        if (member.roles.cache.hasAny(...ROLE.BLACKLIST)) {
            await sendMessage(source, "You are blacklisted from using templates", undefined, true)
            return
        }

        const split = source.customId.split("-")
        const templateName = split[1]
        const template = templates[templateName]
        if (!template) {
            await sendMessage(source, "Could not find a template by that name!", undefined, true)
            return
        }

        const embed = new MessageEmbed()
            .setAuthor({
                name: source.user.tag,
                iconURL: source.user.avatarURL() ?? undefined
            })
            .setTitle(template.embedTitle)
            .setColor(Colors.GREEN)
            .addFields(template.fields.map(p => ({
                name: p.embedTitle,
                value: source.fields.getTextInputValue(p.id),
                inline: p.inline
            })))

        const msgId = split[2]
        if (msgId) {
            const msg = await source.channel?.messages.fetch(msgId)
            if (!msg) {
                await sendMessage(source, "Could not find the message this belonged to!", undefined, true)
                return
            }

            if (msg.embeds[0].author)
                embed.setAuthor(msg.embeds[0].author)

            await msg.edit({ embeds: [embed] })
            await sendMessage(source, "Edited!", undefined, true)
            return
        }

        const msg = await sendMessage(source, embed)
        if (msg && source.channel?.type == "GUILD_TEXT" && template.createThreads?.includes(source.channel.id)) {
            const thread = await source.channel.threads.create({
                name: source.fields.getTextInputValue(template.fields[0].id).substring(0, 100),
                startMessage: msg.id,
            })
            await thread.send({
                content: `Feel free to further discuss the topic in this thread ${[`<@${source.user.id}>`, ...(template.threadPing??[]).map(x => `<@&${x}>`)].join(", ")}`,
                allowedMentions: {
                    users: [source.user.id],
                    roles: template.threadPing
                }
            })
        }
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }
}

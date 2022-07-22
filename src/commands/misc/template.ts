import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageEmbed, Modal, ModalSubmitInteraction, TextInputComponent, TextInputStyleResolvable } from "discord.js"
import Command from "../../utils/Command"
import { ROLE } from "../../utils/TicketTypes"
import { InteractionSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

const templates: Record<string, {
    name: string
    embedTitle: string
    fields: {
        id: string
        modalTitle: string
        embedTitle: string
        modalPlaceholder?: string
        modalDefault?: string
        type: TextInputStyleResolvable
    }[]
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
            modalPlaceholder: "Leave 'n/a' if not applicable.",
            modalDefault: `- Rotation (required if team calc)
- Rotation video (required if team calc), links can be formatted like [this](https://youtu.be/dQw4w9WgXcQ)
- Additional details (if necessary)`,
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
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.createModal(source, source.options.getString("template", true))
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await this.createModal(source, source.customId.split("-")[1])
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

        const templateName = source.customId.split("-")[1]
        const template = templates[templateName]
        if (!template) {
            await sendMessage(source, "Could not find a template by that name!", undefined, true)
            return
        }

        await sendMessage(source, new MessageEmbed()
            .setAuthor({
                name: source.user.tag,
                iconURL: source.user.avatarURL() ?? undefined
            })
            .setTitle(template.embedTitle)
            .setColor(Colors.GREEN)
            .addFields(template.fields.map(p => ({
                name: p.embedTitle,
                value: source.fields.getTextInputValue(p.id)
            })))
        )
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }
}

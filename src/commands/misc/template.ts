import { ActionRowBuilder, ApplicationCommandOptionType, ButtonInteraction, ChannelType, ChatInputCommandInteraction, EmbedBuilder, Message, MessageContextMenuCommandInteraction, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { ROLE, templates } from "../../utils/TicketTypes"
import { InteractionSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

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
                type: ApplicationCommandOptionType.String,
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

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        return this.createModal(source, source.options.getString("template", true))
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await this.createModal(source, source.customId.split("-")[1])
    }

    async runMessageContext(source: MessageContextMenuCommandInteraction, _command: string): Promise<void> {
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
        const modal = new ModalBuilder()
            .setTitle(`Editing a ${template.name}`)
            .setCustomId(`template-${templateName}-${msg.id}`)
            .setComponents(...template.fields.map(p => new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
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

        const modal = new ModalBuilder()
            .setTitle(`Creating a ${template.name}`)
            .setCustomId(`template-${templateName}`)
            .setComponents(...template.fields.map(p => new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(new TextInputBuilder()
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

        const embed = new EmbedBuilder()
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
        if (msg && source.channel?.type == ChannelType.GuildText && template.createThreads?.includes(source.channel.id)) {
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

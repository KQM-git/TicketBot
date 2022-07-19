import { ButtonInteraction, CommandInteraction, Message, MessageActionRow, MessageEmbed, Modal, ModalSubmitInteraction, TextInputComponent, TextInputStyleResolvable } from "discord.js"
import Command from "../../utils/Command"
import { ROLE } from "../../utils/TicketTypes"
import { InteractionSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

const proposal: {
    name: string
    modalTitle: string
    embedTitle: string
    modalDefault: string
    type: TextInputStyleResolvable
}[] = [{
    name: "proposal",
    modalTitle: "Proposal",
    embedTitle: "Proposal",
    modalDefault: "What is the idea that you want to explore?",
    type: "SHORT"
}, {
    name: "motivation",
    modalTitle: "Motivation",
    embedTitle: "Why are you TC'ing this?",
    modalDefault: "<I like X unit> <Meta/Value Analysis>",
    type: "SHORT"
}, {
    name: "idea",
    modalTitle: "Reasoning",
    embedTitle: "Why would this idea work? What is it competing against? What are some substitutes and alternatives that we already use?",
    modalDefault: "The shield from Xinyan provides small defense but has Pyro application.",
    type: "PARAGRAPH"
}, {
    name: "what",
    modalTitle: "What do you need",
    embedTitle: "Did you want to try to calc this? What is the end goal?",
    modalDefault: "<TheoryHunt> <Calc Guide> <GCsim>",
    type: "PARAGRAPH"
}]

export default class Proposal extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: "Create a proposal.",
            usage: "proposal",
            aliases: [],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.createModal(source)
    }

    async runButton(source: ButtonInteraction): Promise<void> {
        await this.createModal(source)
    }

    async createModal(source: InteractionSource) {
        const member = await source.guild?.members.fetch(source.user.id)
        if (!member) {
            await sendMessage(source, "Couldn't fetch your roles", undefined, true)
            return
        }

        if (member.roles.cache.hasAny(...ROLE.BLACKLIST))
            return await sendMessage(source, "You are blacklisted from creating a proposal", undefined, true)

        const modal = new Modal()
            .setTitle("Creating a TC proposal")
            .setCustomId("proposal")
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .setComponents(...proposal.map(p => new MessageActionRow().addComponents(new TextInputComponent()
                .setCustomId(p.name)
                .setLabel(p.modalTitle)
                .setStyle(p.type)
                .setPlaceholder(`${p.modalDefault}`)
                .setRequired(true)
                .setMaxLength(1000)
            )))

        await source.showModal(modal)
    }

    async runModalSubmit(source: ModalSubmitInteraction): Promise<void> {
        await sendMessage(source, new MessageEmbed()
            .setAuthor({
                name: source.user.tag,
                iconURL: source.user.avatarURL() ?? undefined
            })
            .setTitle("Theorycrafing proposal")
            .setColor(Colors.GREEN)
            .addFields(proposal.map(p => ({
                name: p.embedTitle,
                value: source.fields.getTextInputValue(p.name)
            })))
        )
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }
}

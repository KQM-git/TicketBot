import { APIInteractionDataResolvedChannel } from "discord-api-types/v9"
import { BaseGuildTextChannel, CommandInteraction, GuildBasedChannel, Message, MessageActionRow, MessageButton, MessageButtonStyleResolvable, MessageEmbed, TextBasedChannel } from "discord.js"
import Command from "../../utils/Command"
import { presets } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"


export default class CreateTicketMenu extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Create ticket creation menu.",
            usage: "createticketmenu",
            aliases: [],
            options: [{
                name: "preset",
                description: "Preset to use",
                type: "STRING",
                choices: presets.map(a => ({ name: a.name, value: a.value })),
                required: true
            }, {
                name: "channel",
                description: "Which channel to post in (defaults to current)",
                type: "CHANNEL",
                required: false
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.options.getString("preset", true), source.options.getChannel("channel", false) ?? source.channel)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, preset: string, channel: TextBasedChannel | GuildBasedChannel | APIInteractionDataResolvedChannel | null): Promise<SendMessage | undefined> {
        if (!channel) return await sendMessage(source, "Couldn't fetch channel", undefined, true)
        if (!(channel instanceof BaseGuildTextChannel) || !source.guild) return await sendMessage(source, "Can't make transcripts here", undefined, true)

        // TODO check perms

        const set = presets.find(p => p.value == preset)

        if (!set)
            return await sendMessage(source, "Couldn't find preset", undefined, true)

        await channel.send({
            embeds: [new MessageEmbed()
                .setTitle(set.title)
                .setDescription(set.desc)
                .setColor(Colors.GREEN)
            ],
            components: [new MessageActionRow().setComponents(
                set.buttons.map(b => new MessageButton()
                    .setCustomId(`createticket-${b.id}`)
                    .setLabel(b.name)
                    .setEmoji(b.emoji)
                    .setStyle(b.style as MessageButtonStyleResolvable))
            )]
        })

        return await sendMessage(source, "Created!", undefined, true)

    }
}

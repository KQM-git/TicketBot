import { APIInteractionDataResolvedChannel } from "discord-api-types/v9"
import { BaseGuildTextChannel, CommandInteraction, GuildBasedChannel, Message, MessageActionRow, MessageButton, MessageEmbed, TextBasedChannel, User } from "discord.js"
import Command from "../../utils/Command"
import { menus } from "../../utils/TicketTypes"
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
                choices: menus.map(a => ({ name: a.name, value: a.value })),
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
        return this.run(source, source.user, source.options.getString("preset", true), source.options.getChannel("channel", false) ?? source.channel)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, preset: string, channel: TextBasedChannel | GuildBasedChannel | APIInteractionDataResolvedChannel | null): Promise<SendMessage | undefined> {
        if (!channel) return await sendMessage(source, "Couldn't fetch channel", undefined, true)
        if (!(channel instanceof BaseGuildTextChannel) || !source.guild) return await sendMessage(source, "Can't make transcripts here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        // TODO check perms
        if (!member.permissionsIn(channel.id).has("MANAGE_CHANNELS"))
            return await sendMessage(source, "Only people who can manage the target channel can create ticket menu", undefined, true)

        const set = menus.find(p => p.value == preset)

        if (!set)
            return await sendMessage(source, "Couldn't find preset", undefined, true)

        await channel.send({
            embeds: [new MessageEmbed()
                .setTitle(set.title)
                .setDescription(set.desc)
                .setColor(Colors.GREEN)
            ],
            components: [new MessageActionRow().setComponents(
                set.ticketTypes.map(b => new MessageButton()
                    .setCustomId(`createticket-${b.id}`)
                    .setLabel(b.name)
                    .setEmoji(b.emoji)
                    .setStyle(b.style)
                )
            )]
        })

        return await sendMessage(source, "Created!", undefined, true)

    }
}

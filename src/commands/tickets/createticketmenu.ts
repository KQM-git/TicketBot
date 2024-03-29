import { APIInteractionDataResolvedChannel } from "discord-api-types/v9"
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildBasedChannel, Message, PermissionFlagsBits, TextBasedChannel, User } from "discord.js"
import client from "../../main"
import Command from "../../utils/Command"
import { menus } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, isTicketable, sendMessage } from "../../utils/Utils"


export default class CreateTicketMenu extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Post a ticket creation menu.",
            usage: "createticketmenu",
            aliases: [],
            options: [{
                name: "preset",
                description: "Preset to use",
                type: ApplicationCommandOptionType.String,
                choices: menus.map(a => ({ name: a.name, value: a.value })),
                required: true
            }, {
                name: "channel",
                description: "Which channel to post in (defaults to current)",
                type: ApplicationCommandOptionType.Channel,
                required: false
            }]
        })
    }

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user, source.options.getString("preset", true), source.options.getChannel("channel", false) ?? source.channel)
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }

    async run(source: CommandSource, user: User, preset: string, chan: TextBasedChannel | GuildBasedChannel | APIInteractionDataResolvedChannel | null): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't make ticket menu here", undefined, true)
        if (!chan) return await sendMessage(source, "Couldn't fetch channel", undefined, true)

        const channel = await client.channels.fetch(chan.id)
        if (!channel)
            return await sendMessage(source, "Couldn't fetch channel data", undefined, true)
        if (!isTicketable(channel))
            return await sendMessage(source, "Can't make ticket menu here", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!member.permissionsIn(channel.id).has(PermissionFlagsBits.ManageChannels))
            return await sendMessage(source, "Only people who can manage the target channel can create ticket menu", undefined, true)

        const set = menus.find(p => p.value == preset)

        if (!set)
            return await sendMessage(source, "Couldn't find preset", undefined, true)

        await channel.send({
            content: set.content,
            embeds: [new EmbedBuilder()
                .setTitle(set.title)
                .setDescription(set.desc)
                .setColor(Colors.GREEN)
            ],
            components: [new ActionRowBuilder<ButtonBuilder>().setComponents(
                set.ticketTypes.map(b => new ButtonBuilder()
                    .setCustomId(b.customId ?? `createticket-${b.id}`)
                    .setLabel(b.name)
                    .setEmoji(b.emoji)
                    .setStyle(b.style)
                )
            )]
        })

        return await sendMessage(source, "Created!", undefined, true)

    }
}

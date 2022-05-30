import { BaseGuildTextChannel, CommandInteraction, Message, MessageEmbed, Snowflake, TextBasedChannel } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

const Logger = getLogger("transcript")
const discordMessageLink = /^https:\/\/discord.com\/channels\/\d+\/\d+\/(\d+)$/
export default class Transcript extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Create a transcript of the current channel.",
            usage: "transcript",
            aliases: ["transcribe"],
            options: [{
                name: "oldest",
                description: "Link to message or message ID up to which to fetch messages (defaults to entire channel)",
                type: "STRING",
                required: false
            }, {
                name: "newest",
                description: "Link to message or message ID to start from (defaults to start from current)",
                type: "STRING",
                required: false
            }, {
                name: "slug",
                description: "Slug to use (defaults to channel name, appends ID or timestamp if already used)",
                type: "STRING",
                required: false
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user.id, source.channel, source.options.getString("oldest", false), source.options.getString("newest", false), source.options.getString("slug", false))
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        return this.run(source, source.author.id, source.channel, args[0], args[1])
    }

    async run(source: CommandSource, senderId: Snowflake, channel: TextBasedChannel | null, upTo?: string | null, latest?: string | null, slug?: string | null): Promise<SendMessage | undefined> {
        if (!channel) return await sendMessage(source, "Couldn't fetch channel", undefined, true)
        if (!(channel instanceof BaseGuildTextChannel) || !source.guild) return await sendMessage(source, "Can't make transcripts here", undefined, true)

        const sender = await source.guild.members.fetch(senderId)
        // TODO check perms

        if (!upTo) upTo = undefined
        else {
            const link = upTo.match(discordMessageLink)
            if (link)
                upTo = link[1]
            else if (!upTo.match(/^\d+$/))
                return await sendMessage(source, "Invalid up to message", undefined, true)
        }

        if (latest) {
            const link = latest.match(discordMessageLink)
            if (link)
                latest = link[1]
            else if (!latest.match(/^\d+$/))
                return await sendMessage(source, "Invalid starting message", undefined, true)
        }


        const response = await sendMessage(source, new MessageEmbed()
            .setTitle("Creating transcript...")
            .setColor(Colors.ORANGE)
        )
        if (!response) return response
        if (!latest) latest = response.id

        if (upTo && BigInt(latest) < BigInt(upTo))
            [latest, upTo] = [upTo, latest]

        Logger.info(`${sender.id} (@${sender.user.tag}) requested a transcript for ${channel.id} (${channel.name}) - For messages ${upTo ?? "start of channel"} ~ ${latest}`)

        await client.transcriptionManager.startTranscript(channel, response, upTo, latest, sender, slug || channel.name)

        return response
    }
}

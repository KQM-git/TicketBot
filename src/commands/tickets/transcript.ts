import { Snowflake } from "discord-api-types"
import { BaseGuildTextChannel, CommandInteraction, Message, MessageEmbed, TextBasedChannel } from "discord.js"
import { getLogger } from "log4js"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { Colors, sendMessage } from "../../utils/Utils"

const Logger = getLogger("transcript")
const discordMessageLink = /^https:\/\/discord.com\/channels\/\d+\/\d+\/(\d+)$/
export default class Status extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Tickets",
            help: "Create a transcript of the current channel.",
            usage: "transcript",
            aliases: ["transcribe"],
            options: [{
                name: "message",
                description: "Link to message or message ID up to which to fetch messages (leave empty for entire channel)",
                type: "STRING",
                required: false
            }, {
                name: "start",
                description: "Link to message or message ID to start from (leave empty to start from current message)",
                type: "STRING",
                required: false
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user.id, source.channel, source.options.getString("message", false), source.options.getString("start", false))
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        return this.run(source, source.author.id, source.channel, args[0], args[1])
    }

    async run(source: CommandSource, senderId: Snowflake, channel: TextBasedChannel | null, upTo?: string | null, latest?: string | null): Promise<SendMessage | undefined> {
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

        await client.transcriptionManager.startTranscript(channel, response, upTo, latest, sender)

        return response
    }
}

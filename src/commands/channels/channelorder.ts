import { CommandInteraction, Message, MessageAttachment, NonThreadGuildBasedChannel, ThreadChannel, User } from "discord.js"
import Command from "../../utils/Command"
import { ROLE } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { displayTimestamp, sendMessage } from "../../utils/Utils"

export const recent: {time: number, msg: string}[] = []

export default class ChannelOrder extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Channels",
            help: "Some commands related to channel ordering.",
            usage: "channelorder <status/dump>",
            aliases: [],
            options: [{
                name: "status",
                description: "Check the status about the current channel positions",
                type: "SUB_COMMAND"
            }, {
                name: "dump",
                description: "Dump current channel positions",
                type: "SUB_COMMAND"
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getSubcommand(true))
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1)
            return this.sendHelp(source)

        return this.run(source, source.author, args[0].toLowerCase())
    }

    async run(source: CommandSource, user: User, command: string): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Couldn't get guild data", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!member.roles.cache.hasAny(...ROLE.STAFF))
            return await sendMessage(source, "You are not staff", undefined, true)


        const channels = [...source.guild.channels.cache.values()]
        const nonThread: NonThreadGuildBasedChannel[] = channels.filter(x => !(x instanceof ThreadChannel)) as NonThreadGuildBasedChannel[]

        const sorted = nonThread.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))

        const channelInfo = (x: NonThreadGuildBasedChannel) => ({
            id: x.id,
            position: x.rawPosition,
            name: x.name,
            type: x.type
        })


        const category = [4, "GUILD_CATEGORY"], text = [0, "GUILD_TEXT", 5, "GUILD_NEWS"], voice = [2, "GUILD_VOICE", 13, "GUILD_STAGE_VOICE"]

        const unknown = sorted.filter(x => !text.includes(x.type) && !voice.includes(x.type) && !category.includes(x.type)).map(x => x.type).filter((p, i, a) => a.indexOf(p) == i)
        const response: string[] = []
        if (unknown.length > 0)
            response.push(`Unknown channel types found: ${unknown.join(", ")}`)

        const categories = sorted.filter(c => category.includes(c.type))
        const data = [
            { id: null, rawPosition: -1, name: "No category", type: 4 },
            ...categories
        ]
            .map(p => ({
                id: p.id,
                position: p.rawPosition,
                name: p.name,
                type: p.type,
                text: sorted
                    .filter(c => c.parentId == p.id && text.includes(c.type))
                    .map(channelInfo),
                vc: sorted
                    .filter(c => c.parentId == p.id && voice.includes(c.type))
                    .map(channelInfo)
            }))

        let lastCategory = -2, lastText = -1, lastVoice = -1

        for (const category of data) {
            if (category.position != lastCategory + 1)
                response.push(`Category channel <#${category.id}> #${category.position} is not sorted!`)

            lastCategory = category.position

            for (const text of category.text) {
                if (text.position != lastText + 1)
                    response.push(`Text channel <#${text.id}> #${text.position} is not sorted!`)
                lastText = text.position
            }

            for (const voice of category.vc) {
                if (voice.position != lastVoice + 1)
                    response.push(`Voice channel <#${voice.id}> #${voice.position} is not sorted!`)
                lastVoice = voice.position
            }
        }

        if (command == "status") {
            const latest = Math.max(0, ...recent.map(x => x.time))

            return await sendMessage(source, `${
                latest > Date.now() - 60000 ? `🔴 Recent channel movements detected! Please wait until ${displayTimestamp(new Date(latest + 60000))} and re-run this command.` :
                    response.length > 0 ? "🟠 Server channel order is in an inconsistent state! Moving a channel might take a while!" :
                        "🟢 Everything looks okay from here!"
            }

**Recent moves**:
${recent.map(r => `${displayTimestamp(new Date(r.time))}: ${r.msg}`).join("\n") || "*None noticed*"}

**Current order issues**:
${response.join("\n") || "*No inconsistencies found!*"}`.substring(0, 1900), undefined, true)
        } else if (command == "dump") {
            await member.send({
                files: [new MessageAttachment(Buffer.from(JSON.stringify(data, undefined, 4)), "channels.json")]
            })
            return await sendMessage(source, "Send in DMs!", undefined, true)
        }

        return await sendMessage(source, "Unknown subcommand", undefined, true)
    }
}

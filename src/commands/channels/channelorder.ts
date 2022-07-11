import { APIInteractionDataResolvedChannel } from "discord-api-types/v10"
import { ChannelPosition, CommandInteraction, GuildBasedChannel, Message, MessageAttachment, NonThreadGuildBasedChannel, ThreadChannel, User } from "discord.js"
import { getLogger } from "log4js"
import fetch from "node-fetch"
import client from "../../main"
import Command from "../../utils/Command"
import { ROLE } from "../../utils/TicketTypes"
import { CommandSource, SendMessage } from "../../utils/Types"
import { displayTimestamp, sendMessage } from "../../utils/Utils"

export const channelUpdates: Record<string, {time: number, msg: string}[] | undefined> = {}

const logger = getLogger("channelOrder")
export default class ChannelOrder extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Channels",
            help: "Some commands related to channel ordering.",
            usage: "channelorder <status/dump> [category]",
            aliases: [],
            options: [{
                name: "status",
                description: "Check the status about the current channel positions",
                type: "SUB_COMMAND"
            }, {
                name: "dump",
                description: "Dump current channel positions",
                type: "SUB_COMMAND"
            }, {
                name: "stabilize",
                description: "Force re-ordering to prepare for human movement",
                type: "SUB_COMMAND"
            }, {
                name: "restore",
                description: "Restore channel positions from data file",
                type: "SUB_COMMAND",
                options: [{
                    name: "data",
                    description: "Dump to restore from",
                    type: "ATTACHMENT",
                    required: true
                }, {
                    name: "category",
                    description: "Category to restore, defaults to all channels",
                    type: "CHANNEL",
                }]
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        await source.deferReply({ ephemeral: true })
        return this.run(source, source.user, source.options.getSubcommand(true), source.options.getAttachment("data", false), source.options.getChannel("category", false))
    }

    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        if (args.length < 1)
            return this.sendHelp(source)

        return this.run(source, source.author, args[0].toLowerCase())
    }

    async run(source: CommandSource, user: User, command: string, attachment?: MessageAttachment | null, onlyMove?: APIInteractionDataResolvedChannel | GuildBasedChannel | null): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Couldn't get guild data", undefined, true)

        const member = await source.guild.members.fetch(user.id)
        if (!member) return await sendMessage(source, "Couldn't fetch your Discord profile", undefined, true)

        if (!member.roles.cache.hasAny(...ROLE.STAFF))
            return await sendMessage(source, "You are not staff", undefined, true)


        const channels = [...source.guild.channels.cache.values()]
        const nonThread: NonThreadGuildBasedChannel[] = channels.filter(x => !(x instanceof ThreadChannel)) as NonThreadGuildBasedChannel[]

        const sorted = nonThread.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))

        const me = await source.guild.members.fetch(client.user?.id ?? "0")

        const channelInfo = (x: NonThreadGuildBasedChannel) => ({
            id: x.id,
            position: x.rawPosition,
            name: x.name,
            type: x.type,
            canMove: x.permissionsFor(me).has("MANAGE_CHANNELS")
        })


        const category = [4, "GUILD_CATEGORY"], text = [0, "GUILD_TEXT", 5, "GUILD_NEWS"], voice = [2, "GUILD_VOICE", 13, "GUILD_STAGE_VOICE"]

        const misc = sorted.filter(x => !text.includes(x.type) && !voice.includes(x.type) && !category.includes(x.type))
        const unknown = misc.map(x => x.type).filter((p, i, a) => a.indexOf(p) == i)
        const response: string[] = []
        if (unknown.length > 0)
            response.push(`Unknown channel types found: ${unknown.join(", ")}. Please contact me to add support and watch out for these when doing stuff!`)

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
                    .map(channelInfo),
                unknown: sorted
                    .filter(c => c.parentId == p.id && misc.find(misc => c.id == misc.id))
                    .map(channelInfo),
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

        function shouldMove(channel: { id: string }, category: { id: string | null }) {
            return !onlyMove || onlyMove.id == channel.id || onlyMove.id == category.id
        }

        const latest = channelUpdates[source.guild.id] ? Math.max(0, ...(channelUpdates[source.guild.id]?.map(x => x.time) ?? [])) : 0
        const hasRecentMove = latest > Date.now() - 30000
        if (command == "status") {
            return await sendMessage(source, `${
                hasRecentMove ? `🔴 Recent channel movements detected! Please wait until ${displayTimestamp(new Date(latest + 35000))} and re-run this command.` :
                    response.length > 0 ? "🟠 Server channel order is in an inconsistent state! Moving a channel might take a while!" :
                        "🟢 Everything looks okay from here!"
            }

**Recent moves**:
${channelUpdates[source.guild.id]?.map(r => `${displayTimestamp(new Date(r.time))}: ${r.msg}`).join("\n") || "*None noticed*"}

**Current order issues**:
${response.join("\n") || "*No inconsistencies found!*"}`.substring(0, 1900), undefined, true)
        } else if (command == "dump") {
            await member.send({
                files: [new MessageAttachment(Buffer.from(JSON.stringify(data, undefined, 4)), `channels-${source.guild.id}-${new Date().toISOString().replace(/:|T/g, "-").replace("Z", "")}.json`)]
            })
            return await sendMessage(source, hasRecentMove ? "🔴 Recent channel movements detected! Data send might not be correct! (Refer to `/channelorder status` for more info)" : "Send in DMs!", undefined, true)
        } else if (command == "restore" || command == "stabilize") {
            if (!member.roles.cache.hasAny(...ROLE.ADMIN_LIKE) || !member.permissions.has("ADMINISTRATOR"))
                return await sendMessage(source, "You are not an admin", undefined, true)

            if (unknown.length > 0)
                return await sendMessage(source, `Unknown channel types found: ${unknown.join(", ")}. Please contact me to add support and watch out for these when doing stuff!`, undefined, true)
            if (hasRecentMove)
                return await sendMessage(source, "🔴 Recent channel movements detected! Please wait a bit and try again. (Refer to `/channelorder status` for more info)", undefined, true)

            let dump: typeof data = []
            if (attachment) {
                if (!attachment.contentType?.startsWith("application/json"))
                    return await sendMessage(source, `Invalid content type ${attachment.contentType}, expected application/json`, undefined, true)

                dump = await (await fetch(attachment.url)).json()
            }
            logger.debug(`Dump: ${JSON.stringify(dump)}`)

            const movement: ChannelPosition[] = []
            const cantMove: ChannelPosition[] = []

            let lastText = 0, lastVoice = 0

            for (const category of data) {
                const dumpCategory = dump.find(x => x.id == category.id)

                // eslint-disable-next-line no-inner-declarations
                function justAdd(channels: typeof category.text, position: number) {
                    for (const channel of channels) {
                        if (channel.position != position && shouldMove(channel, category))
                            if (channel.canMove)
                                movement.push({ channel: channel.id, position })
                            else
                                cantMove.push({ channel: channel.id, position })
                        position++
                    }
                    return position
                }

                if (dumpCategory == null) {
                    lastText = justAdd(category.text, lastText)
                    lastVoice = justAdd(category.vc, lastVoice)
                    continue
                }

                // eslint-disable-next-line no-inner-declarations
                function merge(categoryChannels: typeof category.text, dumpChannels: typeof category.text, position: number) {
                    const newOrder = categoryChannels
                        .filter(x => dumpChannels.some(n => n.id == x.id))
                        .sort((a, b) => dumpChannels.findIndex(c => c.id == a.id) - dumpChannels.findIndex(c => c.id == b.id))

                    const unique = categoryChannels.filter(x => !dumpChannels.some(n => n.id == x.id))

                    uniqueLoop: for (const channel of unique) {
                        const originalIndex = categoryChannels.indexOf(channel)
                        if (originalIndex == 0) {
                            newOrder.unshift(channel)
                            continue uniqueLoop
                        }
                        const prevChannel = categoryChannels[originalIndex - 1]

                        for (let i = 0; i < newOrder.length; i++) {
                            if (newOrder[i] == prevChannel) {
                                newOrder.splice(i + 1, 0, channel)
                                continue uniqueLoop
                            }
                        }
                    }

                    /*
                    console.log("Source: " + categoryChannels.map(i => i.name).join("/"))
                    console.log("Dump: " + dumpChannels.map(i => i.name).join("/"))
                    console.log("Unique: " + unique.map(i => i.name).join("/"))
                    console.log("New order: " + newOrder.map(i => i.name).join("/"))
                    console.log("==============")
                    */

                    for (const channel of newOrder) {
                        if (channel.position != position && shouldMove(channel, category))
                            if (channel.canMove)
                                movement.push({ channel: channel.id, position })
                            else
                                cantMove.push({ channel: channel.id, position })
                        position++
                    }

                    return position
                }


                lastText = merge(category.text, dumpCategory.text, lastText)
                lastVoice = merge(category.vc, dumpCategory.vc, lastVoice)
            }

            logger.info(`Moving ${movement.length} channels on request by ${member.user.tag}`)

            try {
                await source.guild.channels.setPositions(movement.reverse())

                return await sendMessage(source, `**Unable to move (due to permissions)**
${cantMove.map(m => `<#${m.channel}> to #${m.position}`).join("\n")}

**Moved**
${movement.map(m => `<#${m.channel}> to #${m.position}`).join("\n")}`.substring(0, 1900), undefined, true)
            } catch (error) {
                return await sendMessage(source, "Could not move channels!")
            }
        }

        return await sendMessage(source, "Unknown subcommand", undefined, true)
    }
}

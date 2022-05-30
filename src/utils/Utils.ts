import { BaseGuildTextChannel, ColorResolvable, Message, MessageActionRow, MessageEmbed } from "discord.js"
import log4js from "log4js"
import client from "../main"
import { CommandSource, SendMessage, TicketStatus } from "./Types"

const Logger = log4js.getLogger("Utils")

export function displayTimestamp(time: Date, display = "R"): string {
    return `<t:${Math.floor(time.getTime() / 1000)}:${display}>`
}

export function isMessage(msg: SendMessage | CommandSource | undefined): msg is Message {
    return msg instanceof Message
}
export async function updateMessage(channelId: string, replyId: string, response: string | MessageEmbed, components?: (MessageActionRow)[]): Promise<SendMessage | undefined> {
    let embeds: (MessageEmbed)[] | undefined
    let content: string | undefined

    if (typeof response == "string")
        content = response
    else
        embeds = [response]

    try {
        const channel = await client.channels.fetch(channelId)
        if (channel && channel instanceof BaseGuildTextChannel) {
            const msg = await channel.messages.fetch(replyId)
            await msg.edit({ content, embeds, components })
            return msg
        }
    } catch (error) {
        Logger.error(`Couldn't update message ${replyId}`, error)
    }
}

export async function sendMessage(source: CommandSource, response: string | MessageEmbed, components?: (MessageActionRow)[], ephemeral?: boolean): Promise<SendMessage | undefined> {
    let embeds: (MessageEmbed)[] | undefined
    let content: string | undefined

    if (typeof response == "string")
        content = response
    else
        embeds = [response]

    try {
        if (source instanceof Message)
            return await source.reply({ content, embeds, components, allowedMentions: {} })
        else if (source.deferred)
            return await source.editReply({ content, embeds, components })
        else
            return await source.reply({ content, embeds, components, fetchReply: true, ephemeral, allowedMentions: {} })
    } catch (error) {
        Logger.error("sendMessage", error)
    }
}
function searchClean(str: string): string {
    return str.toLowerCase().replace(/'/g, "")
}

function caps(str: string): string {
    return str.split("").filter(k => k != k.toLowerCase()).join("")
}

export function trim(input: string): string {
    return input.toLowerCase().replace(/[():"'-]/g, "").trim().replace(/ +/g, "-")
}


export function fuzzySearchScore(a: string, b: string): number {
    if (a.length == 0) return 0
    if (b.length == 0) return 0

    // swap to save some memory O(min(a,b)) instead of O(a)
    if (a.length > b.length) [a, b] = [b, a]

    const row = []
    // init the row
    for (let i = 0; i <= a.length; i++)
        row[i] = i


    // fill in the rest
    for (let i = 1; i <= b.length; i++) {
        let prev = i
        for (let j = 1; j <= a.length; j++) {
            const val = (b.charAt(i - 1) == a.charAt(j - 1)) ? row[j - 1] : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1)
            row[j - 1] = prev
            prev = val
        }
        row[a.length] = prev
    }

    return b.length - row[a.length]
}


export function findFuzzyBestCandidates(target: string[], search: string, amount: number): string[] {
    const cleaned = searchClean(search)
    const found = target.find(t => searchClean(t) == search)
    if (found)
        return [found]

    const dists = target.map(e => fuzzySearchScore(searchClean(e), cleaned) + fuzzySearchScore(caps(e), caps(search)) - e.length / 100 + 1)
    const max = Math.max(...dists)

    return target
        .map((t, i) => {
            return {
                t,
                d: dists[i]
            }
        })
        .sort((a, b) => b.d - a.d)
        .filter((e, i) => i < amount && e.d > max * 0.65)
        .map(({ t, d }) => {
            if (searchClean(t).startsWith(cleaned.substring(0, 3)) || searchClean(t).endsWith(cleaned.substring(cleaned.length - 3)))
                d += 1
            if (caps(t).includes(search[0]?.toUpperCase()))
                d += 1.5
            if (searchClean(t).startsWith(cleaned))
                d += 1
            if (caps(t) == caps(search))
                d += 0.5

            return { t, d }
        })
        .sort((a, b) => b.d - a.d)
        .map(e => e.t)
}


type Color = "GREEN" | "DARK_GREEN" | "ORANGE" | "RED" | "DARK_RED" | "AQUA" | "PURPLE" |
"Anemo" | "Cryo" | "Electro" | "Geo" | "Hydro" | "Pyro" | "Dendro" | "None" | TicketStatus

export const Colors: Record<Color, ColorResolvable> = {
    GREEN: "#00EA69",
    DARK_GREEN: "#2EF41F",

    ORANGE: "#F49C1F",

    RED: "#F7322E",
    DARK_RED: "#F4231F",

    AQUA: "#07EADB",
    PURPLE: "#6B68B1",

    "Anemo": "#32D39F",
    "Cryo": "#79E8EB",
    "Electro": "#CA7FFF",
    "Geo": "#FEE263",
    "Hydro": "#06E5FE",
    "Pyro": "#FFAA6E",
    "Dendro": "#B2EB28",

    "None": "#545353",

    OPEN: "#F49C1F",
    CLOSED: "#F4231F",
    VERIFIED: "#00EA69",
    TRANSCRIBED: "#2EF41F",
    DELETED: "#F4231F"
}

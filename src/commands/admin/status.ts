import child_process from "child_process"
import { CommandInteraction, Message, Snowflake } from "discord.js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


export default class Status extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Get bot status. Admins only.",
            usage: "status [more]",
            aliases: ["version"],
            options: [{
                name: "expanded",
                description: "Show more information",
                type: "BOOLEAN",
                required: false
            }]
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user.id, source.options.getBoolean("expanded") ?? false)

    }
    async runMessage(source: Message, args: string[]): Promise<SendMessage | undefined> {
        return this.run(source, source.author.id, args && args.length > 0)
    }

    async run(source: CommandSource, id: string, moreInfo: boolean): Promise<SendMessage | undefined> {
        if (!config.admins.includes(id)) return sendMessage(source, "Admins only")

        const formatTime = (sec: number): string => {
            const p = (t: number): string => t.toString().padStart(2, "0")

            const d = Math.floor(sec / (3600*24))
            const h = Math.floor(sec % (3600*24) / (3600))
            const m = Math.floor(sec % (3600) / 60)
            const s = Math.floor(sec % 60)

            return `${d}d${p(h)}h${p(m)}m${p(s)}s`
        }

        const getVersion = (): string => `https://github.com/Tibowl/TiBot/commit/${child_process.execSync("git rev-parse HEAD").toString().trim()}`
        const getMemoryUsage = (): string => {
            const mem = (bytes: number): string => `${(bytes/10e6).toFixed(2)} MB`
            const { heapTotal, heapUsed } = process.memoryUsage()
            return `${mem(heapUsed)}/${mem(heapTotal)}`
        }
        const getAdmins = async (): Promise<string> => {
            const users = config.admins.map(async (id) => client.users.fetch(id as Snowflake))
            return (await Promise.all(users)).map(user => user.tag).join(", ")
        }

        return sendMessage(source, `Running on commit <${getVersion()}>
Memory heap usage: ${getMemoryUsage()}
Current uptime: ${formatTime(process.uptime())}
Cache: in ${client.channels.cache.size} channels on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users.
${moreInfo ? `

Admins: ${await getAdmins()}
`:""}`, undefined, true)
    }
}

import { PrismaClient } from "@prisma/client"
import Discord, { ClientEvents, Intents } from "discord.js"
import Enmap from "enmap"
import fs from "fs"
import log4js from "log4js"
import { join } from "path"
import config from "./data/config.json"
import Command from "./utils/Command"
import TranscriptionManager from "./utils/TranscriptionManager"


const Logger = log4js.getLogger("main")
const intents = new Intents()
intents.add(
    // For handling commands in DMs
    "DIRECT_MESSAGES",
    // For follow stuff, also required for guild messages for some reason?
    "GUILDS",
    // For handling commands in guilds
    "GUILD_MESSAGES",
)

export default class TiBotClient extends Discord.Client {
    commands: Enmap<string, Command> = new Enmap()
    prisma: PrismaClient = new PrismaClient()

    transcriptionManager: TranscriptionManager= new TranscriptionManager(this)

    constructor() {
        super({
            intents,
            partials: ["CHANNEL", "GUILD_MEMBER", "REACTION", "MESSAGE"],
            shards: "auto",
            presence: {
                status: "idle",
                activities: [{
                    name: config.activity,
                    type: "LISTENING"
                }]
            }
        })

        process.on("SIGHUP", async () => this.shutdown(128 + 1))
        process.on("SIGINT", async () => this.shutdown(128 + 2))
        process.on("SIGTERM", async () => this.shutdown(128 + 15))
    }

    async shutdown(type: number): Promise<void> {
        Logger.info("Disconnecting DB...")
        await this.prisma.$disconnect()
        Logger.info("Done!")
        process.exit(type)
    }

    async init(): Promise<void> {
        fs.readdir(join(__dirname, "./events/"), (err, files) => {
            if (err) return Logger.error(err)
            files.forEach(file => {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const event = require(`./events/${file}`)
                const eventName = file.split(".")[0] as keyof ClientEvents
                this.on(eventName, event.handle)
            })
        })

        const knownCommands: string[] = []
        const readDir = (dir: string): void => {
            fs.readdir(join(__dirname, dir), (err, files) => {
                if (err) return Logger.error(err)
                files.forEach(file => {
                    if (!(file.endsWith(".js") || file.endsWith(".ts"))) return readDir(dir + file + "/")
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const props = require(`${dir}${file}`)
                    const commandName = file.split(".")[0]
                    Logger.info(`Loading ${commandName}`)

                    const command: Command = new (props.default)(commandName)
                    // Check if command is already registered
                    if (knownCommands.includes(commandName.toLowerCase()))
                        Logger.error(`${commandName} already exists!`)
                    knownCommands.push(commandName.toLowerCase())

                    // Check if any of the aliases are already registered
                    for (const alias of command.aliases) {
                        if (knownCommands.includes(alias.toLowerCase()))
                            Logger.error(`${commandName} is trying to register an alias that's already registered: ${alias}`)

                        knownCommands.push(alias.toLowerCase())
                    }

                    this.commands.set(commandName, command)
                })
            })
        }
        readDir("./commands/")

        await this.login(config.token)
    }
}

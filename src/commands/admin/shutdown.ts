import { CommandInteraction, Message } from "discord.js"
import log4js from "log4js"
import config from "../../data/config.json"
import client from "../../main"
import Command from "../../utils/Command"
import { CommandSource, SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"


const Logger = log4js.getLogger("shutdown")

export default class Shutdown extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Admin",
            help: "Kills bot. Bot developer only.",
            usage: "shutdown",
            aliases: ["exit", "restart"],
            options: []
        })
    }

    async runInteraction(source: CommandInteraction): Promise<SendMessage | undefined> {
        return this.run(source, source.user.id)

    }
    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return this.run(source, source.author.id)
    }

    async run(source: CommandSource, id: string): Promise<SendMessage | undefined> {
        if (!config.admins.includes(id)) return sendMessage(source, "This command is only for the bot developer", undefined, true)

        Logger.info(`Shutting down by ${id}`)

        await sendMessage(source, "Shutting down...", [], true)
        await client.destroy()
        process.exit()
    }
}

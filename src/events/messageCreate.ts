import { DMChannel, Message } from "discord.js"
import log4js from "log4js"
import config from "../data/config.json"
import client from "../main"
import { getCommand, handleLegacyCommand } from "../utils/CommandHandler"
import { isTicketable } from "../utils/Utils"

const Logger = log4js.getLogger("message")

export async function handle(message: Message): Promise<void> {
    if (message.author.bot) {
        if (message.type == "CHANNEL_PINNED_MESSAGE" && message.author.id == client.user?.id)
            try {
                await message.delete()
            } catch (a) {
                Logger.error(a)
            }
        return
    }

    if (!message.content.toLowerCase().startsWith(config.prefix)) return
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
    const command = args.shift()?.toLowerCase()
    if (!command) return

    const cmdInfo = getCommand(command)

    if (cmdInfo && cmdInfo.cmd) {
        if (message.channel instanceof DMChannel)
            Logger.info(`${message.author.id} (${message.author.tag}) executes command in ${message.channel.recipient.tag}: ${message.content}`)
        else
            Logger.info(`${message.author.id} (${message.author.tag}) executes command in ${isTicketable(message.channel) ? message.channel.name : message.channel.type} (guild ${message.guild ? message.guild.id : "NaN"}): ${message.content}`)

        // TODO add stat?
        await handleLegacyCommand(cmdInfo, message, args)
    } else if (message.channel.type === "DM") {
        Logger.info(`${message.author.id} (${message.author.tag}) sends message ${message.type} in dm: ${message.content}`)
    }
}

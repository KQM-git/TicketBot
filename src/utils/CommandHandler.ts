import { AutocompleteInteraction, ButtonInteraction, CommandInteraction, Message, ModalSubmitInteraction } from "discord.js"
import log4js from "log4js"
import client from "../main"
import Command from "../utils/Command"


const Logger = log4js.getLogger("commands")

interface ParsedCommand {
    command: string
    cmd: Command
}

export function getCommand(command: string): ParsedCommand | false {
    let cmd = client.commands.get(command)

    // If that command doesn't exist, try to find an alias
    if (!cmd) {
        cmd = client.commands.find((cmd: Command) => cmd.aliases.includes(command))

        // If that command doesn't exist, silently exit and do nothing
        if (!cmd)
            return false
    }
    return { command, cmd }
}

export async function handleCommand(cmdInfo: ParsedCommand, interaction: CommandInteraction): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const msg = cmd.runInteraction(interaction, command)
        const midTime = Date.now()
        if (msg && interaction.channel?.type !== "DM")
            await msg
        const endTime = Date.now()
        Logger.debug(`${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - interaction.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
}

export async function handleLegacyCommand(cmdInfo: ParsedCommand, message: Message, args: string[]): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const msg = cmd.runMessage(message, args, command)
        const midTime = Date.now()
        await msg
        const endTime = Date.now()
        Logger.debug(`${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - message.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
}

export async function handleAutoComplete(cmdInfo: ParsedCommand, interaction: AutocompleteInteraction): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const response = cmd.autocomplete(interaction, command)
        const midTime = Date.now()
        if (response)
            await response
        const endTime = Date.now()
        Logger.debug(`Autocomplete ${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - interaction.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
}

export async function handleButton(cmdInfo: ParsedCommand, interaction: ButtonInteraction): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const msg = cmd.runButton(interaction, command)
        const midTime = Date.now()
        if (msg && interaction.channel?.type !== "DM")
            await msg
        const endTime = Date.now()
        Logger.debug(`${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - interaction.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
}

export async function handleModalSubmit(cmdInfo: ParsedCommand, interaction: ModalSubmitInteraction): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const msg = cmd.runModalSubmit(interaction, command)
        const midTime = Date.now()
        if (msg && interaction.channel?.type !== "DM")
            await msg
        const endTime = Date.now()
        Logger.debug(`${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - interaction.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
}

import { AutocompleteInteraction, ButtonInteraction, ChatInputCommandInteraction, Message, MessageContextMenuCommandInteraction, ModalSubmitInteraction } from "discord.js"
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
        for (const newCmd of client.commands.values())
            if (newCmd.aliases.includes(command) || (newCmd.onMessage?.includes(command)))
                cmd = newCmd

        // If that command doesn't exist, silently exit and do nothing
        if (!cmd)
            return false
    }
    return { command, cmd }
}

export async function handleCommand(cmdInfo: ParsedCommand, interaction: ChatInputCommandInteraction): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const msg = cmd.runInteraction(interaction, command)
        const midTime = Date.now()
        if (msg)
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

export async function handleMessageContext(cmdInfo: ParsedCommand, interaction: MessageContextMenuCommandInteraction): Promise<void> {
    const { command, cmd } = cmdInfo
    try {
        const startTime = Date.now()
        const response = cmd.runMessageContext(interaction, command)
        const midTime = Date.now()
        if (response)
            await response
        const endTime = Date.now()
        Logger.debug(`Message context ${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - interaction.createdTimestamp}ms`)
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
        if (msg)
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
        if (msg)
            await msg
        const endTime = Date.now()
        Logger.debug(`${cmdInfo.command} took ${midTime - startTime}ms, sending took ${endTime - midTime}ms, message->start took ${startTime - interaction.createdTimestamp}ms`)
    } catch (error) {
        Logger.error(error)
    }
}

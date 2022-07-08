import { Interaction } from "discord.js"
import log4js from "log4js"
import { getCommand, handleAutoComplete, handleButton, handleCommand, handleMessageContext, handleModalSubmit } from "../utils/CommandHandler"
import { isTicketable } from "../utils/Utils"

const Logger = log4js.getLogger("interactionCreate")

export async function handle(interaction: Interaction): Promise<void> {
    if (interaction.isButton() || interaction.isModalSubmit()) {
        const commandName = interaction.customId.split("-")[0]
        const cmdInfo = getCommand(commandName)

        if (cmdInfo && cmdInfo.cmd) {
            if (interaction.isButton()) {
                Logger.info(`${interaction.user.id} (${interaction.user.tag}) clicks on button in ${isTicketable(interaction.channel) ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.customId}`)
                await handleButton(cmdInfo, interaction)
            } else if (interaction.isModalSubmit()) {
                Logger.info(`${interaction.user.id} (${interaction.user.tag}) submitted modal in ${isTicketable(interaction.channel) ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.customId}`)
                await handleModalSubmit(cmdInfo, interaction)
            }
        }
    } else if (interaction.isCommand() || interaction.isAutocomplete() || interaction.isMessageContextMenu()) {
        const cmdInfo = getCommand(interaction.commandName)

        if (cmdInfo && cmdInfo.cmd) {
            if (interaction.isCommand()) {
                Logger.info(`${interaction.user.id} (${interaction.user.tag}) executes slash command in ${isTicketable(interaction.channel) ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.commandName} ${interaction.options.data.map(x => `${x.name}->${x.value??"/"}`)}`)
                await handleCommand(cmdInfo, interaction)
            } else if (interaction.isAutocomplete()) {
                Logger.info(`${interaction.user.id} (${interaction.user.tag}) autocompletes in ${isTicketable(interaction.channel) ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.commandName} ${interaction.options.data.map(x => `${x.name}->${x.value??"/"}`)}`)
                await handleAutoComplete(cmdInfo, interaction)
            } else if (interaction.isMessageContextMenu()) {
                Logger.info(`${interaction.user.id} (${interaction.user.tag}) clicked on a message in ${isTicketable(interaction.channel) ? interaction.channel.name : interaction.channel?.type} (guild ${interaction.guild ? interaction.guild.id : "NaN"}): ${interaction.commandName} ${interaction.options.data.map(x => `${x.name}->${x.value??"/"}`)}`)
                await handleMessageContext(cmdInfo, interaction)
            }
        }
    }
}

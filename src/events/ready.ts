import client from "../main"
import log4js from "log4js"
import { ApplicationCommandData, ApplicationCommandType } from "discord.js"
import config from "../data/config.json"

const Logger = log4js.getLogger("ready")

let alreadyLoaded = false
export async function handle(): Promise<void> {
    Logger.info(`In ${(client.channels.cache).size} channels on ${(client.guilds.cache).size} servers, for a total of ${(client.users.cache).size} users.`)

    if (alreadyLoaded) return
    alreadyLoaded = true

    await client.transcriptionManager.ready()
    await client.timerManager.ready()

    await client.user?.setStatus("online")

    if (!client.application?.owner) await client.application?.fetch()
    const cmds: ApplicationCommandData[] = client.commands
        .array()
        .filter(cmd => cmd.category !== "Admin")
        .flatMap(cmd => {
            const help = (cmd.shortHelp ?? cmd.help).split("\n")[0]
            const name = cmd.commandName

            if (help.length > 99)
                Logger.error(`${name}'s description is too long'`)

            const cmds: ApplicationCommandData[] = [{
                name,
                options: cmd.options,
                description: help.substring(0, 100),
                // TODO default permissions?
            }]

            if (cmd.onMessage)
                for (const name of cmd.onMessage)
                    cmds.push({
                        name,
                        type: ApplicationCommandType.Message
                    })

            return cmds
        })

    try {
        if (config.production || (client.application?.commands.cache.size ?? 0) > 0) {
            await client.application?.commands.set(cmds)

            for (const id of ["247122362942619649", "980837690285109349"]) {
                const guild = await client.guilds.fetch(id)
                const commands = guild?.commands
                await commands?.set([])
                await commands?.fetch()
                if (commands)
                    for (const c of commands.cache.map(v => v))
                        await c.delete()
            }
        } else {
            await client.guilds.cache.get("247122362942619649")?.commands.set(cmds)
            await client.guilds.cache.get("980837690285109349")?.commands.set(cmds)
        }
        Logger.info(`Commands registered for ${config.production}`)
    } catch (error) {
        Logger.error("Unable to register commands")
        Logger.error(error)
    }
}

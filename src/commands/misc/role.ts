import { ApplicationCommandOptionType, AttachmentBuilder, ChatInputCommandInteraction, Message, PermissionFlagsBits } from "discord.js"
import log4js from "log4js"
import Command from "../../utils/Command"
import { SendMessage } from "../../utils/Types"
import { sendMessage } from "../../utils/Utils"

const Logger = log4js.getLogger("roles")

export default class Role extends Command {
    constructor(name: string) {
        super({
            name,
            category: "Misc",
            help: "Check users in a role.",
            usage: "role <role>",
            aliases: [],
            options: [{
                name: "role",
                description: "Role to check",
                type: ApplicationCommandOptionType.Role,
                required: true
            }]
        })
    }

    lastFetched: Map<string, number> = new Map()

    async runInteraction(source: ChatInputCommandInteraction): Promise<SendMessage | undefined> {
        if (!source.guild) return await sendMessage(source, "Can't add to transcripts here", undefined, true)
        if (!source.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) return await sendMessage(source, "You don't have manage role perms", undefined, true)

        await source.deferReply({ ephemeral: true })

        if ((this.lastFetched.get(source.guild.id) ?? 0) + 5 * 60 * 1000 < Date.now()) {
            Logger.log(`Member cache before: ${source.guild.members.cache.size}`)
            await source.guild.members.fetch()
            Logger.log(`Member cache after: ${source.guild.members.cache.size}`)
            this.lastFetched.set(source.guild.id, Date.now())
        }

        const role = source.options.getRole("role", true)
        const fetched = await source.guild?.roles.fetch(role.id)

        const members = fetched?.members.map(g => g) ?? []
        const memberNames = members.map(g => g.user.tag)
        const memberIDs = members.map(g => g.user.id)

        await sendMessage(source, `Found ${members.length} members in role ${role.name} (${role.id})`, undefined, undefined, [
            new AttachmentBuilder(Buffer.from(memberNames.join("\n")), { name: "names.txt" }),
            new AttachmentBuilder(Buffer.from(memberIDs.join("\n")), { name: "ids.txt" }),
        ])
        return
    }

    async runMessage(source: Message): Promise<SendMessage | undefined> {
        return await sendMessage(source, "This command isn't available in text form, please refer to the slash-command")
    }
}

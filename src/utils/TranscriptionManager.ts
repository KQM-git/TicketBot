import { PrismaClient, QueuedTranscript } from "@prisma/client"
import AdmZip from "adm-zip"
import { randomUUID } from "crypto"
import { ActionRow, APIEmbedField, Attachment, AttachmentBuilder, ComponentType, Embed, EmbedAssetData, EmbedBuilder, EmbedFooterData, Guild, GuildMember, MessageActionRowComponent, MessageMentions, MessageReaction, User, UserFlagsBitField } from "discord.js"
import { getLogger } from "log4js"
import { baseUrl } from "../data/config.json"
import TiBotClient from "../TiBotClient"
import { ticketTypes } from "./TicketTypes"
import { ChannelInput, EndingAction, Enumerable, InputJsonValue, MessageInput, RoleInput, SendMessage, TicketableChannel, UserConnection, UserInput, VerifierType } from "./Types"
import { Colors, displayTimestamp, isTicketable, trim, updateMessage, verificationTypeName } from "./Utils"

const Logger = getLogger("transcriber")
export default class TranscriptionManager {
    client: TiBotClient
    prisma: PrismaClient

    constructor(client: TiBotClient) {
        this.client = client
        this.prisma = client.prisma
    }

    public async startTranscript(channel: TicketableChannel, reply: SendMessage, upTo: string | undefined, latest: string, transcriber: GuildMember, slug: string, dumpChannel: string | undefined, endAction: EndingAction) {
        slug = trim(slug)
        const initialSlug = slug

        if (await this.prisma.transcript.findUnique({ where: { slug } })) {
            slug = `${initialSlug}-${channel.id}`
            if (await this.prisma.transcript.findUnique({ where: { slug } })) {
                slug = `${initialSlug}-${channel.id}-${Date.now()}`
                if (await this.prisma.transcript.findUnique({ where: { slug } }))
                    slug = randomUUID()
            }
        }

        const server = this.getServer(channel.guild)

        const transcript = await this.prisma.transcript.create({
            data: {
                channel: this.getChannel(channel),
                ticket: {
                    connect: {
                        channelId: channel.id
                    }
                },
                slug,
                server,
            }
        })

        const response = await this.prisma.queuedTranscript.create({
            data: {
                channel: this.getChannel(channel),
                latest: (BigInt(latest) + BigInt(1)).toString(),
                upTo,
                transcriber: await this.connectUser(transcriber, transcriber.guild.id),
                transcript: { connect: { id: transcript.id } },
                botReplyId: reply.id,
                botChannelId: channel.id,
                dumpChannelId: dumpChannel,
                endAction: endAction,
                server
            }
        })

        Logger.info(`Starting transcript queue #${response.transcriberId} (transcript ${transcript.id}) for channel ${channel.id} - ${channel.name}`)
        this.transcribe(response)
            .then(() => void 0)
            .catch((err) => Logger.error(err))
    }

    public getServer(guild: Guild) {
        return {
            connectOrCreate: {
                create: {
                    id: guild.id,
                    icon: guild.icon,
                    name: guild.name
                },
                where: {
                    id: guild.id
                }
            }
        }
    }

    private getChannel(channel: TicketableChannel) {
        return {
            connectOrCreate: {
                create: {
                    name: channel.name,
                    type: channel.type.toString(),
                    server: this.getServer(channel.guild),
                    discordId: channel.id,
                },
                where: {
                    discordId_serverId: {
                        discordId: channel.id,
                        serverId: channel.guild.id
                    }
                }
            }
        }
    }

    public async ready() {
        const t = await this.prisma.queuedTranscript.findMany()
        t.forEach(async t => this.transcribe(t)
            .then(() => void 0)
            .catch((err) => Logger.error(err)))
    }

    private async transcribe(queued: QueuedTranscript): Promise<void> {
        const channel = await this.client.channels.fetch(queued.channelId)
        if (!channel || !isTicketable(channel)) {
            Logger.error(`Couldn't find channel for ${queued.channelId} ${JSON.stringify(queued)}`)
            await this.deleteQueued(queued)
            return
        }

        const { latest, fetched } = queued
        const msgs = await channel.messages.fetch({ before: latest, limit: 100 })

        const messages: MessageInput[] = []
        const users: UserInput[] = []
        const mentionedRoles: RoleInput[] = []
        const mentionedChannels: ChannelInput[] = []
        const guild = channel.guild

        let newLatest = latest
        for (const msg of msgs.map(m => m)) {
            if (BigInt(newLatest) > BigInt(msg.id))
                newLatest = msg.id

            if (queued.upTo && BigInt(newLatest) < BigInt(queued.upTo))
                break

            if (msg.system)
                continue

            const relevantRoles: Set<string> = new Set()
            const relevantUsers: Set<string> = new Set()
            const relevantChannels: Set<string> = new Set()

            messages.push({
                discordId: msg.id,
                createdAt: msg.createdAt,
                editedAt: msg.editedAt,
                attachments: msg.attachments.map(a => this.mapAttachment(a)),
                reactions: msg.reactions.cache.map(r => this.mapReactions(r)),
                embeds: msg.embeds.map(e => this.mapEmbeds(e, relevantRoles, relevantUsers, relevantChannels)),
                content: this.parseText(msg.content, relevantRoles, relevantUsers, relevantChannels) ?? "",
                components: msg.components.map(c => this.mapRow(c)),
                stickers: msg.stickers.toJSON() as unknown as Enumerable<InputJsonValue>,
                reply: msg.reference?.messageId,
                userId: msg.author.id,
                transcriptId: queued.transcriptId,
                serverId: guild.id
            })

            if (!users.find(u => u.discordId == msg.author.id)) {
                try {
                    const member = await guild.members.fetch(msg.author.id)
                    users.push(await this.getMember(member))
                } catch (error) {
                    users.push({
                        discordId: msg.author.id,
                        serverId: guild.id,
                        avatar: msg.author.avatar,
                        bot: msg.author.bot,
                        nickname: null,
                        username: msg.author.username,
                        tag: msg.author.discriminator,
                        roleColor: null,
                        verified: null
                    })
                }
            }

            for (const uid of relevantUsers)
                if (!users.find(u => u.discordId == uid))
                    try {
                        const member = await guild.members.fetch(uid)
                        users.push(await this.getMember(member))
                    } catch (error) {
                        void 0
                    }

            for (const uid of relevantRoles)
                if (!mentionedRoles.find(r => r.discordId == uid))
                    try {
                        const role = await guild.roles.fetch(uid)
                        if (role)
                            mentionedRoles.push({
                                discordId: uid,
                                serverId: guild.id,
                                name: role.name,
                                roleColor: role.hexColor,
                            })
                    } catch (error) {
                        void 0
                    }

            for (const uid of relevantChannels)
                if (!mentionedChannels.find(c => c.discordId == uid))
                    try {
                        const channel = await guild.channels.fetch(uid)
                        if (channel)
                            mentionedChannels.push({
                                discordId: uid,
                                serverId: guild.id,
                                name: channel.name,
                                type: channel.type.toString(),
                            })
                    } catch (error) {
                        void 0
                    }
        }

        if (messages.length == 0) {
            Logger.info(`Finishing up queue #${queued.id} - transcript #${queued.transcriptId} (${queued.channelId}): ${fetched} msgs total`)

            const transcript = await this.prisma.transcript.findUnique({ where: { id: queued.transcriptId } })

            if (queued.dumpChannelId)
                try {
                    const channel = await this.client.channels.fetch(queued.dumpChannelId)
                    const fullTranscript = fetched > 50000 ? null : await this.prisma.transcript.findUnique({
                        where: { id: queued.transcriptId },
                        include: {
                            server: true,
                            channel: true,
                            mentionedChannels: true,
                            mentionedRoles: true,
                            ticket: {
                                include: {
                                    creator: {
                                        select: { discordId: true, username: true, tag: true, avatar: true }
                                    },
                                    contributors: {
                                        select: { discordId: true }
                                    },
                                    verifications: {
                                        select: { verifier: { select: { discordId: true } }, createdAt: true, type: true }
                                    },
                                }
                            },
                            users: true
                        }
                    })

                    if (!fullTranscript)
                        if (channel && channel.isTextBased())
                            await channel.send(`Couldn't fetch full transcript data/too big? Stored stuff is over at ${baseUrl}/transcripts/${transcript?.slug}`)
                        else Logger.error(`Couldn't send to transcript channel - couldn't fetch full transcript data? Stored stuff over at ${baseUrl}/transcripts/${transcript?.slug}`)
                    else {
                        const { ticket } = fullTranscript
                        const messages = await this.client.prisma.message.findMany({
                            where: {
                                transcriptId: fullTranscript.id
                            },
                            take: 10000,
                            orderBy: {
                                id: "desc"
                            }
                        })
                        const users: [string, number][] = []
                        messages.forEach(m => {
                            const ud = users.find(u => u[0] == m.userId)
                            if (ud)
                                ud[1] = ud[1] + 1
                            else
                                users.push([m.userId, 1])
                        })

                        const dump = Buffer.from(JSON.stringify({ ...fullTranscript, messages }))
                        const files = dump.length < 1000 * 1000 * 8 ? [
                            new AttachmentBuilder(Buffer.from(dump), { name: `transcript-${transcript?.slug}.json` })
                        ] : [
                            new AttachmentBuilder(this.createZip(dump, `transcript-${transcript?.slug}.json`), { name: `transcript-${transcript?.slug}.zip` })
                        ]

                        const embed =new EmbedBuilder()
                            .setDescription(`[Full transcript](${baseUrl}/transcripts/${transcript?.slug}) (${fetched} messages by ${users.length} users) of <#${fullTranscript.channel.discordId}> / ${fullTranscript.channel.name}${
                                messages.length < fetched ? "\n**PARTIAL DUMP**: Due to high message count, only a partial dump is available" : ""
                            }`)

                        if (ticket)
                            embed
                                .setAuthor({
                                    name: `${ticket.creator.username}#${ticket.creator.tag}`,
                                    iconURL: (ticket.creator.avatar && `https://cdn.discordapp.com/avatars/${ticket.creator.discordId}/${ticket.creator.avatar}.png`) || "https://cdn.discordapp.com/attachments/247122362942619649/980958465566572604/unknown.png"
                                })
                                .addFields([
                                    { name: "Ticket Name", value: ticket.name, inline: true },
                                    { name: "Type", value: ticketTypes[ticket.type]?.name ?? ticket.type, inline: true },
                                    { name: "Status", value: ticket.status, inline: true },
                                ])

                        embed.addFields([{
                            name: "Top users in transcript",
                            value: users
                                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                                .slice(0, 10)
                                .map(r => `${r[1]} - <@${r[0]}>`)
                                .join("\n"),
                            inline: true
                        }])

                        if (ticket)
                            embed
                                .addFields([{
                                    name: "Verifications",
                                    value: ticket.verifications.map(v => `${verificationTypeName[v.type as VerifierType] ?? "Unknown"} <@${v.verifier.discordId}> ${displayTimestamp(v.createdAt)}`).join("\n") || "Wasn't verified",
                                    inline: true
                                }, {
                                    name: "Contributors",
                                    value: ticket.contributors.map(c => `<@${c.discordId}>`).join(", ") || "No contributors added",
                                    inline: true
                                }])


                        try {
                            if (queued.endAction == EndingAction.VERIFIED && ticket) {
                                const id = ticketTypes[ticket.type].verifiedChannel
                                if (id) {
                                    const verifiedChannel = await this.client.channels.fetch(id)
                                    if (verifiedChannel && verifiedChannel.isTextBased())
                                        await verifiedChannel.send({
                                            embeds: [embed]
                                        })
                                    else
                                        Logger.error("Couldn't send to verified channel - not a text channel/not found")
                                }
                            }
                        } catch (error) {
                            Logger.error("Couldn't send to verified channel", error)
                        }

                        try {
                            if (channel && channel.isTextBased())
                                await channel.send({
                                    content: `Transcript for ${fullTranscript.channel.name}: <${baseUrl}/transcripts/${transcript?.slug}>`,
                                    embeds: [embed],
                                    files
                                })
                            else Logger.error(`Couldn't send to channel - Transcript for ${fullTranscript.channel.name}: ${baseUrl}/transcripts/${transcript?.slug}`)

                        } catch (error) {
                            Logger.error("Error while sending transcription message", error)

                            if (channel && channel.isTextBased())
                                await channel.send(`Error occurred while sending transcript details for ${baseUrl}/transcripts/${transcript?.slug}`)
                        }

                    }
                } catch (error) {
                    Logger.error("Error while sending log", error)
                }

            if (queued.endAction == EndingAction.DELETE) {
                await this.prisma.ticket.update({
                    where: { channelId: queued.channelId },
                    data: { deleted: true }
                })
                await channel.delete(`Deleted with transcript - ${transcript?.slug}`)
            } else {
                await updateMessage(queued.botChannelId, queued.botReplyId, new EmbedBuilder()
                    .setTitle("Created transcript!")
                    .setDescription(`<a:hellawicked:982029314285514793> Transcription has been made and is available on ${baseUrl}/transcripts/${transcript?.slug} - Fetched a total of ${fetched} messages!`)
                    .setColor(Colors.GREEN))
            }

            await this.prisma.queuedTranscript.delete({
                where: { id: queued.id },
            })
            return
        }

        const newFetched = fetched + messages.length

        queued.latest = newLatest
        queued.fetched = newFetched

        Logger.info(`Queue #${queued.id} - transcript #${queued.transcriptId} (${queued.channelId} - ${channel.name}): from ${fetched} msgs; ${messages.length} messages and ${users.length} users fetched, pushing to db`)

        await this.prisma.$transaction([
            this.prisma.queuedTranscript.update({
                where: { id: queued.id },
                data: queued,
                select: { id: true }
            }),
            ...users.map(u => this.prisma.user.upsert({
                create: u,
                update: u,
                where: {
                    discordId_serverId: {
                        discordId: u.discordId,
                        serverId: u.serverId
                    }
                },
                select: { id: true }
            })),
            ...mentionedRoles.map(r => this.prisma.role.upsert({
                create: r,
                update: r,
                where: {
                    discordId_serverId: {
                        discordId: r.discordId,
                        serverId: r.serverId
                    }
                },
                select: { id: true }
            })),
            ...mentionedChannels.map(c => this.prisma.channel.upsert({
                create: c,
                update: c,
                where: {
                    discordId_serverId: {
                        discordId: c.discordId,
                        serverId: c.serverId
                    }
                },
                select: { id: true }
            })),
            this.prisma.message.createMany({ data: messages }),
            this.prisma.transcript.update({
                data: {
                    users: this.mapConnectors(users),
                    mentionedRoles: this.mapConnectors(mentionedRoles),
                    mentionedChannels: this.mapConnectors(mentionedChannels),
                },
                where: {
                    id: queued.transcriptId
                },
                select: { id: true }
            })
        ])

        Logger.info(`Queue #${queued.id} - transcript #${queued.transcriptId} (${queued.channelId} - ${channel.name}): from ${fetched} msgs; ${messages.length} messages and ${users.length} users fetched, pushed!`)
        if (newFetched % 1000 == 0)
            await updateMessage(queued.botChannelId, queued.botReplyId, new EmbedBuilder()
                .setTitle("Creating transcript...")
                .setDescription(`Fetched ${newFetched} messages...`)
                .setColor(Colors.ORANGE))
        setImmediate(async () => this.transcribe(queued).catch((e) => Logger.error(e)))
    }

    private createZip(dump: Buffer, name: string): Buffer {
        const zip = new AdmZip()
        zip.addFile(name, dump)
        return zip.toBuffer()
    }

    private async deleteQueued(queued: QueuedTranscript): Promise<void> {
        await this.prisma.queuedTranscript.delete({ where: { id: queued.id } })
    }

    public async connectUser(member: GuildMember | User, guildId: string): Promise<{
        connectOrCreate: UserConnection
    }> {
        return {
            connectOrCreate: {
                where: {
                    discordId_serverId: {
                        discordId: member.id,
                        serverId: guildId
                    }
                },
                create: member instanceof GuildMember ? await this.getMember(member) : await this.getUser(member, guildId)
            }
        }
    }

    private async getMember(member: GuildMember): Promise<UserInput> {
        return {
            discordId: member.user.id,
            roleColor: member.displayHexColor,
            nickname: member.nickname,
            username: member.user.username,
            tag: member.user.discriminator,
            avatar: member.user.avatar,
            bot: member.user.bot,
            verified: (await member.user.fetchFlags()).has(UserFlagsBitField.Flags.VerifiedBot),
            serverId: member.guild.id
        }
    }

    private async getUser(user: User, guildId: string): Promise<UserInput> {
        return {
            discordId: user.id,
            roleColor: null,
            nickname: null,
            username: user.username,
            tag: user.discriminator,
            avatar: user.avatar,
            bot: user.bot,
            verified: (await user.fetchFlags()).has(UserFlagsBitField.Flags.VerifiedBot),
            serverId: guildId
        }
    }

    public async updateServer(guild: Guild) {
        await this.client.prisma.server.upsert({
            create: {
                id: guild.id,
                icon: guild.icon,
                name: guild.name
            },
            where: {
                id: guild.id
            },
            update: {
                id: guild.id,
                icon: guild.icon,
                name: guild.name
            }
        })
    }

    private mapConnectors(list: { discordId: string, serverId: string }[]) {
        return {
            connect: list.map(item => ({ discordId_serverId: { discordId: item.discordId, serverId: item.serverId } } ))
        }
    }

    private mapAttachment(a: Attachment) {
        return {
            name: a.name ?? undefined,
            desc: a.description ?? undefined,
            url: a.url,
            size: a.size,
            width: a.width ?? undefined,
            height: a.height ?? undefined,
            spoiler: a.spoiler
        }
    }

    private mapReactions(r: MessageReaction) {
        return {
            emoji: {
                name: r.emoji.name ?? undefined,
                id: r.emoji.id ?? undefined,
                url: r.emoji.url ?? undefined
            },
            count: r.count
        }
    }

    private mapEmbeds(e: Embed, relevantRoles: Set<string>, relevantUsers: Set<string>, relevantChannels: Set<string>) {
        function mapFooter(f: EmbedFooterData | null) {
            if (!f) return undefined
            return {
                text: f.text,
                url: f.iconURL ?? undefined,
            }
        }
        function mapAsset(i: EmbedAssetData | null) {
            if (!i) return undefined
            return {
                url: i.url,
                width: i.width,
                height: i.height
            }
        }
        function mapField(f: APIEmbedField) {
            return {
                name: f.name,
                value: f.value,
                inline: f.inline
            }
        }
        return {
            title: e.title || undefined,
            author: e.author ? {
                name: e.author.name,
                iconUrl: e.author.iconURL ?? undefined
            } : undefined,
            url: e.url,
            color: e.hexColor ?? undefined,
            description: this.parseText(e.description, relevantRoles, relevantUsers, relevantChannels) ?? undefined,
            fields: e.fields.map(f => mapField(f)),
            footer: mapFooter(e.footer),
            image: mapAsset(e.image),
            thumbnail: mapAsset(e.thumbnail),
            video: mapAsset(e.video),
            timestamp: e.timestamp ?? undefined,
        }
    }

    private parseText(text: string | null, relevantRoles: Set<string>, relevantUsers: Set<string>, relevantChannels: Set<string>): string | null {
        if (typeof text !== "string")
            return text

        for (const role of text.matchAll(new RegExp(MessageMentions.RolesPattern, "g")))
            relevantRoles.add(role[1])

        for (const user of text.matchAll(new RegExp(MessageMentions.UsersPattern, "g")))
            relevantUsers.add(user[1])

        for (const channel of text.matchAll(new RegExp(MessageMentions.ChannelsPattern, "g")))
            relevantChannels.add(channel[1])

        // eslint-disable-next-line no-control-regex
        if (text.match(/\u0000/))
            // eslint-disable-next-line no-control-regex
            return text.replace(/\u0000/g, "?")

        return text
    }

    private mapRow(c: ActionRow<MessageActionRowComponent>) {
        function mapComponent(d: MessageActionRowComponent) {
            if (d.type == ComponentType.Button)
                return {
                    type: d.type,
                    disabled: d.disabled,
                    emoji: d.emoji ?? undefined,
                    label: d.label ?? undefined,
                    style: d.style,
                    url: d.url ?? undefined
                }

            if (d.type == ComponentType.SelectMenu)
                return {
                    type: d.type,
                    disabled: d.disabled,
                    minValues: d.minValues ?? undefined,
                    maxValues: d.maxValues ?? undefined,
                    options: d.options,
                    placeholder: d.placeholder ?? undefined,
                }

            // @ts-expect-error There shouldn't be another type (add above if there is)
            return d.toJSON()
        }
        return {
            type: c.type,
            components: c.components.map(c => mapComponent(c))
        }
    }
}

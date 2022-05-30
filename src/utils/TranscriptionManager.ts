import { PrismaClient, QueuedTranscript } from "@prisma/client"
import { randomUUID } from "crypto"
import { BaseGuildTextChannel, Guild, GuildMember, MessageEmbed, User } from "discord.js"
import { getLogger } from "log4js"
import TiBotClient from "../TiBotClient"
import { Enumerable, InputJsonValue, MessageInput, SendMessage, TicketStatus, UserInput } from "./Types"
import { Colors, updateMessage } from "./Utils"

const Logger = getLogger("transcriber")
export default class TranscriptionManager {
    client: TiBotClient
    prisma: PrismaClient

    constructor(client: TiBotClient) {
        this.client = client
        this.prisma = client.prisma
    }

    public async startTranscript(channel: BaseGuildTextChannel, reply: SendMessage, upTo: string | undefined, latest: string, transcriber: GuildMember, slug: string, dumpChannel?: string) {
        const initialSlug = slug

        let trans = await this.prisma.transcript.findUnique({ where: { slug } })
        if (trans) {
            slug = `${initialSlug}-${channel.id}`
            trans = await this.prisma.transcript.findUnique({ where: { slug } })
            if (trans) {
                slug = `${initialSlug}-${channel.id}-${Date.now()}`
                trans = await this.prisma.transcript.findUnique({ where: { slug } })
                if (trans) {
                    slug = randomUUID()
                }
            }
        }

        const server = this.getServer(channel.guild)

        const transcript = await this.prisma.transcript.create({
            data: {
                channelId: channel.id,
                channelName: channel.name,
                slug,
                server,
            }
        })

        const response = await this.prisma.queuedTranscript.create({
            data: {
                channelId: channel.id,
                channelName: channel.name,
                latest: (BigInt(latest) + BigInt(1)).toString(),
                upTo,
                transcriber: await this.connectUser(transcriber, transcriber.guild.id),
                transcript: { connect: { id: transcript.id } },
                botReplyId: reply.id,
                botChannelId: channel.id,
                dumpChannelId: dumpChannel,
                server
            }
        })

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

    public async ready() {
        const t = await this.prisma.queuedTranscript.findMany()
        t.forEach(async t => this.transcribe(t)
            .then(() => void 0)
            .catch((err) => Logger.error(err)))
    }

    private async transcribe(queued: QueuedTranscript): Promise<void> {
        const channel = await this.client.channels.fetch(queued.channelId)
        if (!channel || !(channel instanceof BaseGuildTextChannel)) {
            Logger.error(`Couldn't find channel for ${queued.channelId} (${queued.channelName}) ${JSON.stringify(queued)}`)
            await this.deleteQueued(queued)
            return
        }

        const { latest, fetched } = queued
        const msgs = await channel.messages.fetch({ before: latest, limit: 100 })

        const messages: MessageInput[] = []
        const users: UserInput[] = []
        const guild = channel.guild

        let newLatest = latest
        for (const msg of msgs.map(m => m)) {
            if (BigInt(newLatest) > BigInt(msg.id))
                newLatest = msg.id

            if (queued.upTo && BigInt(newLatest) < BigInt(queued.upTo))
                break

            messages.push({
                discordId: msg.id,
                createdAt: msg.createdAt,
                editedAt: msg.editedAt,
                attachments: msg.attachments.map(a => a.toJSON() as unknown as Enumerable<InputJsonValue>),
                reactions: msg.reactions.cache.map(r => r.toJSON() as unknown as Enumerable<InputJsonValue>),
                embeds: msg.embeds.map(e => e.toJSON() as unknown as Enumerable<InputJsonValue>),
                content: msg.content,
                components: msg.components.map(c => c.toJSON() as unknown as Enumerable<InputJsonValue>),
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
        }

        if (messages.length == 0) {
            Logger.info(`Finishing up queue #${queued.id} - transcript #${queued.transcriptId} (${queued.channelId} - ${queued.channelName}): ${fetched} msgs total`)
            await this.prisma.ticket.update({
                where: { channelId: queued.channelId },
                data: { status: TicketStatus.TRANSCRIBED }
            })
            const transcript = await this.prisma.transcript.findUnique({ where: { id: queued.transcriptId } })

            await updateMessage(queued.botChannelId, queued.botReplyId, new MessageEmbed()
                .setTitle("Created transcript!")
                .setDescription(`:wicked: ${transcript?.slug} - Fetched ${fetched} messages!`)
                .setColor(Colors.GREEN))

            if (queued.dumpChannelId)
                try {
                    const channel = await this.client.channels.fetch(queued.dumpChannelId)
                    if (channel && channel instanceof BaseGuildTextChannel) {
                        await channel.send(`Transcript for ${queued.channelName}`)
                    }
                } catch (error) {
                    Logger.error("Error while sending log", error)
                }

            await this.prisma.queuedTranscript.delete({
                where: { id: queued.id },
            })
            return
        }

        const newFetched = fetched + messages.length

        queued.latest = newLatest
        queued.fetched = newFetched

        Logger.info(`Queue #${queued.id} - transcript #${queued.transcriptId} (${queued.channelId} - ${queued.channelName}): from ${fetched} msgs; ${messages.length} messages and ${users.length} users fetched, pushing to db`)

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
            this.prisma.message.createMany({ data: messages }),
            this.prisma.transcript.update({
                data: {
                    users: {
                        connect: users.map(u => ({ discordId_serverId: { discordId: u.discordId, serverId: u.serverId } } ))
                    }
                },
                where: {
                    id: queued.transcriptId
                },
                select: { id: true }
            })
        ])

        Logger.info(`Queue #${queued.id} - transcript #${queued.transcriptId} (${queued.channelId} - ${queued.channelName}): from ${fetched} msgs; ${messages.length} messages and ${users.length} users fetched, pushed!`)
        if (newFetched % 1000 == 0)
            await updateMessage(queued.botChannelId, queued.botReplyId, new MessageEmbed()
                .setTitle("Creating transcript...")
                .setDescription(`Fetched ${newFetched} messages...`)
                .setColor(Colors.ORANGE))
        setImmediate(async () => this.transcribe(queued).catch((e) => Logger.error(e)))
    }

    private async deleteQueued(queued: QueuedTranscript): Promise<void> {
        await this.prisma.queuedTranscript.delete({ where: { id: queued.id } })
    }

    public async connectUser(member: GuildMember | User, guildId: string): Promise<{
        connectOrCreate: {
            where: { discordId_serverId: { discordId: string, serverId: string } }
            create: UserInput
        }
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
            avatar: member.avatar ?? member.user.avatar,
            bot: member.user.bot,
            verified: (await member.user.fetchFlags()).has("VERIFIED_BOT"),
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
            verified: (await user.fetchFlags()).has("VERIFIED_BOT"),
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
}

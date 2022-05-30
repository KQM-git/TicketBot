import { PrismaClient, QueuedTranscript } from "@prisma/client"
import { randomUUID } from "crypto"
import { BaseGuildTextChannel, GuildMember, MessageEmbed } from "discord.js"
import { getLogger } from "log4js"
import TiBotClient from "../TiBotClient"
import { Enumerable, InputJsonValue, MessageInput, SendMessage, UserInput } from "./Types"
import { Colors, updateMessage } from "./Utils"

const Logger = getLogger("transcriber")
export default class TranscriptionManager {
    client: TiBotClient
    prisma: PrismaClient

    constructor(client: TiBotClient) {
        this.client = client
        this.prisma = client.prisma
    }

    public async startTranscript(channel: BaseGuildTextChannel, reply: SendMessage, upTo: string | undefined, latest: string, transcriber: GuildMember) {
        let slug = channel.name
        let trans = await this.prisma.transcript.findUnique({ where: { slug } })
        if (trans) {
            slug = `${channel.name}-${channel.id}`
            trans = await this.prisma.transcript.findUnique({ where: { slug } })
            if (trans) {
                slug = `${channel.name}-${channel.id}-${Date.now()}`
                trans = await this.prisma.transcript.findUnique({ where: { slug } })
                if (trans) {
                    slug = randomUUID()
                }
            }
        }

        const server = {
            connectOrCreate: {
                create: {
                    id: channel.guild.id,
                    icon: channel.guild.icon,
                    name: channel.guild.name
                },
                where: {
                    id: channel.guild.id
                }
            }
        }

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
                latest,
                upTo,
                transcriber: await this.connectUser(transcriber),
                transcript: { connect: { id: transcript.id } },
                botReplyId: reply.id,
                botChannelId: channel.id,
                server
            }
        })

        this.transcribe(response)
            .then(() => void 0)
            .catch((err) => Logger.error(err))
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
                mentions: msg.mentions.toJSON() as unknown as Enumerable<InputJsonValue>,
                stickers: msg.stickers.toJSON() as unknown as Enumerable<InputJsonValue>,
                reply: msg.reference?.messageId,
                userId: msg.author.id,
                transcriptId: queued.transcriptId,
                serverId: guild.id
            })

            if (!users.find(u => u.discordId == msg.author.id)) {
                try {
                    const member = await guild.members.fetch(msg.author.id)
                    users.push(await this.getUser(member))
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
            await this.prisma.queuedTranscript.delete({
                where: { id: queued.id },
            })
            const transcript = await this.prisma.transcript.findUnique({ where: { id: queued.transcriptId }, select: { slug: true } })

            await updateMessage(queued.botChannelId, queued.botReplyId, new MessageEmbed()
                .setTitle("Created transcript!")
                .setDescription(`:wicked: ${transcript?.slug} - Fetched ${fetched} messages!`)
                .setColor(Colors.GREEN))
            return
        }

        const newFetched = fetched + messages.length

        queued.latest = newLatest
        queued.fetched = newFetched

        Logger.info(`Queue #${queued.id} - transcript #${queued.transcriptId} (${queued.channelId} - ${queued.channelName}): from ${fetched} msgs; ${messages.length} messages and ${users.length} users fetched, pushing to db`)

        await this.prisma.$transaction([
            this.prisma.queuedTranscript.update({
                where: { id: queued.id },
                data: queued
            }),
            ...users.map(u => this.prisma.user.upsert({
                create: u,
                update: u,
                where: {
                    discordId_serverId: {
                        discordId: u.discordId,
                        serverId: u.serverId
                    }
                }
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
                }
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

    private async connectUser(member: GuildMember): Promise<{
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
                        serverId: member.guild.id
                    }
                },
                create: await this.getUser(member)
            }
        }
    }

    private async getUser(member: GuildMember) {
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
}

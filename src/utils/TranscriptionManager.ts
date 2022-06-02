import { PrismaClient, QueuedTranscript } from "@prisma/client"
import AdmZip from "adm-zip"
import { randomUUID } from "crypto"
import { Guild, GuildMember, MessageAttachment, MessageEmbed, User } from "discord.js"
import { getLogger } from "log4js"
import TiBotClient, { baseUrl } from "../TiBotClient"
import { ticketTypes } from "./TicketTypes"
import { EndingAction, Enumerable, InputJsonValue, MessageInput, SendMessage, TicketableChannel, TicketStatus, UserInput } from "./Types"
import { Colors, displayTimestamp, isTicketable, trim, updateMessage } from "./Utils"

const Logger = getLogger("transcriber")
export default class TranscriptionManager {
    client: TiBotClient
    prisma: PrismaClient

    constructor(client: TiBotClient) {
        this.client = client
        this.prisma = client.prisma
    }

    public async startTranscript(channel: TicketableChannel, reply: SendMessage, upTo: string | undefined, latest: string, transcriber: GuildMember, slug: string, dumpChannel: string | undefined, endAction: EndingAction) {
        const initialSlug = trim(slug)

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
                channelId: channel.id,
                channelName: channel.name,
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

    public async ready() {
        const t = await this.prisma.queuedTranscript.findMany()
        t.forEach(async t => this.transcribe(t)
            .then(() => void 0)
            .catch((err) => Logger.error(err)))
    }

    private async transcribe(queued: QueuedTranscript): Promise<void> {
        const channel = await this.client.channels.fetch(queued.channelId)
        if (!channel || !isTicketable(channel)) {
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

            const transcript = await this.prisma.transcript.findUnique({ where: { id: queued.transcriptId } })

            if (queued.dumpChannelId)
                try {
                    const channel = await this.client.channels.fetch(queued.dumpChannelId)
                    if (channel && isTicketable(channel)) {
                        const fullTranscript = await this.prisma.transcript.findUnique({
                            where: { id: queued.transcriptId },
                            include: {
                                messages: true,
                                server: true,
                                ticket: {
                                    include: {
                                        creator: {
                                            select: { discordId: true, username: true, tag: true, avatar: true }
                                        },
                                        contributors: {
                                            select: { discordId: true }
                                        },
                                        verifications: {
                                            select: { verifier: { select: { discordId: true } }, createdAt: true }
                                        }
                                    }
                                },
                                users: true,
                                verifications: true
                            }
                        })
                        if (!fullTranscript)
                            await channel.send("Couldn't fetch full transcript data?")
                        else {
                            const { ticket } = fullTranscript
                            const users: [string, number][] = []
                            fullTranscript.messages.forEach(m => {
                                const ud = users.find(u => u[0] == m.userId)
                                if (ud)
                                    ud[1] = ud[1] + 1
                                else
                                    users.push([m.userId, 1])
                            })

                            const dump = Buffer.from(JSON.stringify(fullTranscript, (k, v) => v === null ? undefined : v))
                            const files = dump.length < 1000 * 1000 * 8 ? [
                                new MessageAttachment(Buffer.from(dump), `transcript-${transcript?.slug}.json`)
                            ] : [
                                new MessageAttachment(this.createZip(dump, `transcript-${transcript?.slug}.json`), `transcript-${transcript?.slug}.zip`)
                            ]

                            await channel.send({
                                content: `Transcript for ${queued.channelName}: <${baseUrl}/transcripts/${transcript?.slug}>`,
                                embeds: [new MessageEmbed()
                                    .setAuthor({
                                        name: `${ticket.creator.username}#${ticket.creator.tag}`,
                                        iconURL: (ticket.creator.avatar && `https://cdn.discordapp.com/avatars/${ticket.creator.discordId}/${ticket.creator.avatar}.png`) || "https://cdn.discordapp.com/attachments/247122362942619649/980958465566572604/unknown.png"
                                    })
                                    .setDescription(`[Full transcript](${baseUrl}/transcripts/${transcript?.slug}) (${fullTranscript.messages.length} messages by ${users.length} users)`)
                                    .addField("Ticket Name", ticket.name, true)
                                    .addField("Type", ticketTypes[ticket.type]?.name ?? ticket.type, true)
                                    .addField("Status", ticket.status, true)
                                    .addField("Users in transcript", users
                                        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                                        .slice(0, 10)
                                        .map(r => `${r[1]} - <@${r[0]}>`)
                                        .join("\n"), true )
                                    .addField("Verifications", ticket.verifications.map(v => `<@${v.verifier.discordId}> ${displayTimestamp(v.createdAt)}`).join("\n") || "Wasn't verified", true)
                                    .addField("Contributors", ticket.contributors.map(c => `<@${c.discordId}>`).join(", ") || "No contributors added", true)
                                ],
                                files
                            })
                        }
                    }
                } catch (error) {
                    Logger.error("Error while sending log", error)
                }

            if (queued.endAction == EndingAction.DELETE) {
                await this.prisma.ticket.update({
                    where: { channelId: queued.channelId },
                    data: { status: TicketStatus.DELETED }
                })
                await channel.delete(`Deleted with transcript - ${transcript?.slug}`)
            } else {
                await updateMessage(queued.botChannelId, queued.botReplyId, new MessageEmbed()
                    .setTitle("Created transcript!")
                    .setDescription(`:wicked: ${transcript?.slug} - Fetched ${fetched} messages!`)
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

    private createZip(dump: Buffer, name: string): Buffer {
        const zip = new AdmZip()
        zip.addFile(name, dump)
        return zip.toBuffer()
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

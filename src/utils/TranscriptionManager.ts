import { BaseGuildTextChannel, GuildMember, Message } from "discord.js"
import { getLogger } from "log4js"
import TiBotClient from "../TiBotClient"
import { DBUser } from "./Types"

const Logger = getLogger("transcriber")
export default class TranscriptionManager {
    client: TiBotClient

    constructor(client: TiBotClient) {
        this.client = client
    }

    public async startTranscript(channel: BaseGuildTextChannel, reply: Message, upTo: string | undefined, latest: string, transcriber: GuildMember) {
        const response = await this.client.prisma.queuedTranscript.create({
            data: {
                channelId: channel.id,
                channelName: channel.name,
                latest,
                upTo,
                transcriber: await this.connectUser(transcriber),
                botReplyId: reply.id
            }
        })
        Logger.info(response)
    }

    private async connectUser(member: GuildMember): Promise<{
        connectOrCreate: {
            where: { id: string }
            create: DBUser
        }
    }> {
        return {
            connectOrCreate: {
                where: {
                    id: member.id
                },
                create: {
                    id: member.id,
                    roleColor: member.displayHexColor,
                    nickname: member.nickname,
                    username: member.user.username,
                    tag: member.user.discriminator,
                    avatar: member.avatar,
                    bot: member.user.bot,
                    verified: (await member.user.fetchFlags()).has("VERIFIED_BOT"),
                }
            }
        }
    }
}

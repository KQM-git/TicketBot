import { ThreadChannel } from "discord.js"
import * as channelDelete from "./channelDelete"

export async function handle(channel: ThreadChannel): Promise<void> {
    return channelDelete.handle(channel)
}

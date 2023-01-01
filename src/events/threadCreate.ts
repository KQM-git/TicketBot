import { ThreadChannel } from "discord.js"

export async function handle(thread: ThreadChannel, newThread: boolean): Promise<void> {
    if (!newThread) return
    if (!thread) return

    if (thread.parentId == "1033144852310929488")
        await thread.send({
            content: "<@141941251350986752> - A new infographic request has been made",
            allowedMentions: {
                users: ["141941251350986752"]
            }
        })
}

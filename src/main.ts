import log4js from "log4js"
import TiBotClient from "./TiBotClient"
import fs from "fs"
import { join } from "path"

log4js.configure({
    appenders: {
        file: { type: "dateFile", filename: "./logs/tibot", alwaysIncludePattern: true, backups: 31, compress: true },
        out: { type: "stdout" },
    }, categories: {
        default: { appenders: ["file", "out"], level: "debug" }
    }
})
const Logger = log4js.getLogger("main")

const client = new TiBotClient()
if (!fs.existsSync(join(__dirname, "./data/config.json"))) {
    Logger.error("Config does not exist!")
} else {
    client.init().catch(e => Logger.error(e))
}

export default client

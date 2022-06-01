import { MessageActionRow, MessageButton } from "discord.js"
import { TicketType } from "./Types"

export const buttons = {
    CLOSE: new MessageButton()
        .setLabel("Close")
        .setCustomId("close")
        .setEmoji("🔒")
        .setStyle("DANGER"),
    OPEN: new MessageButton()
        .setCustomId("open")
        .setLabel("Open")
        .setEmoji("🔓")
        .setStyle("SECONDARY"),
    VERIFY: new MessageButton()
        .setCustomId("verify")
        .setLabel("Verify")
        .setEmoji("✅")
        .setStyle("PRIMARY"),
    TRANSCRIPT: new MessageButton()
        .setCustomId("transcript")
        .setLabel("Transcript")
        .setEmoji("📑")
        .setStyle("SECONDARY"),
    RENAME: new MessageButton()
        .setLabel("Rename")
        .setCustomId("rename")
        .setEmoji("✏️")
        .setStyle("SECONDARY"),
    GUIDE_LINK: new MessageButton()
        .setLabel("Guide Guidelines")
        .setURL("https://docs.google.com/document/d/1hZ0bNmMy1t5R8TOF1v8mcuzQpR0BgJD5pKY2T_t6uh0/edit?usp=sharing")
        .setStyle("LINK")
}

const ROLE_LIBSUB = "980899762054254593"
const ROLE_GUIDESUBS = "980899740029956106"
const ROLE_CONTRIBUTOR = "980899054177374268"
const ROLE_THEORYCRAFTER = "980898982316351578"
const ROLE_SCHOLAR = "980899103049383936"
const ROLE_STAFF = "980899219235807302"

const CATEGORY_GUIDES = "980838140099039272"
const CATEGORY_OPEN_SUBS = "980837799076958310"
const CATEGORY_FOR_REVIEW = "980837820929294367"
const CATEGORY_PUBLISHING = "980838078300164096"
const CATEGORY_STAFF_TICKETS = "980926469737963530"

const CHANNEL_NEW_TICKETS = "981316199185014806"
const CHANNEL_TRANSCRIPTS = "980924167648079892"

export const ticketTypes: Record<string, TicketType> = {
    libsubs: {
        id: "libsubs",
        name: "Library Submission",
        emoji: "🔖",
        style: "PRIMARY",
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If this ticket was created by accident or it can be deleted, you can use \`/delete\` within the first 5 minutes, otherwise ask a Scholar.
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button; the ticket will automatically be moved to be reviewed.
- The ticket will be scrapped if: No activity >1 week or open for >1 month.`,
            embeds: [{
                title: "Write-up Format",
                description: `**Theory/Finding/Bug:** Title of your submission

**Evidence:** Explanations with calculations and/or YouTube/Imgur proofs

**Significance:** Conclusion`,
                color: "#A758BF"
            }],
            components: [
                new MessageActionRow().addComponents(
                    buttons.CLOSE,
                    buttons.RENAME
                ),
            ]
        },
        creationRoles: [ROLE_LIBSUB],
        manageRoles: [ROLE_SCHOLAR],
        verifyRoles: [ROLE_THEORYCRAFTER],
        defaultCategory: CATEGORY_OPEN_SUBS,
        closeCategory: CATEGORY_FOR_REVIEW,
        verifications: 1,
        verifiedCategory: CATEGORY_PUBLISHING,
        verifiedRole: ROLE_CONTRIBUTOR,
        dumpChannel: CHANNEL_TRANSCRIPTS,
        creationChannel: CHANNEL_NEW_TICKETS,
        dinkDonk: {
            time: 7 * 24 * 60 * 1000,
            message: "<a:dinkdonk:981687794000879696> This channel hasn't been active in the past week!"
        }
    },
    guide: {
        id: "guide",
        name: "Guide Submission",
        emoji: "📔",
        style: "SUCCESS",
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- Name it appropriately with \`/rename <ticket name>\`
- When done ping <@235719068726853632> to begin the review process.`,
            embeds: [{
                title: "Guide Guidelines",
                description: "Here are the KQM Guide standards if you are interested. These are not enforced at the moment but it is heavily encouraged you follow them.",
                color: "#A758BF"
            }],
            components: [
                new MessageActionRow().addComponents(
                    buttons.GUIDE_LINK,
                    buttons.CLOSE
                )
            ]
        },
        creationRoles: [ROLE_GUIDESUBS],
        manageRoles: [ROLE_SCHOLAR],
        verifyRoles: [ROLE_THEORYCRAFTER],
        defaultCategory: CATEGORY_GUIDES,
        verifications: 2,
        dumpChannel: CHANNEL_TRANSCRIPTS,
        creationChannel: CHANNEL_NEW_TICKETS
    },
    staff: {
        id: "staff",
        name: "Staff Ticket",
        emoji: "🐒",
        creationRoles: [ROLE_STAFF],
        manageRoles: [ROLE_STAFF],
        defaultCategory: CATEGORY_STAFF_TICKETS,
        opening: {
            content: " - This is a staff ticket"
        },
        style: "DANGER"
    }
}

export const menus: {
    name: string
    value: string
    title: string
    desc: string
    ticketTypes: TicketType[]
}[] = [{
    name: "Theorycrafting Tickets",
    value: "TC",
    title: "Theorycrafting Ticket",
    desc: `Welcome, Theorycrafter. Click on one of the buttons below to open a ticket.

**Library Submissions:** To submit an entry into the library
**Guide Ticket:** For guide submissions

Please read the ticket guidelines above before opening a ticket.`,
    ticketTypes: [ticketTypes.libsubs, ticketTypes.guide]
}, {
    name: "Staff Tickets",
    value: "ST",
    title: "Staff Tasks",
    desc: "Click below to create a task",
    ticketTypes: [ticketTypes.staff]
}]

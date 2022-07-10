import { MessageActionRow, MessageButton } from "discord.js"
import { TicketType, VerifierType } from "./Types"
import config from "../data/config.json"

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

export const ROLE = config.production ? {
    LIBSUB: "953173415836147792",
    GUIDESUBS: "939413668553179147",
    CONTRIBUTOR: "764838634280845312",
    WET: "845508406579691530",
    THEORYCRAFTER: "896043474699317259",
    TC_STAFF: [
        "810550138552320010", // Scholar
        "903791926162100256", // Editor
        "975990552812204032", // Monke
        "873486216782299137", // Mod
    ],
    STAFF: [
        "953164120952283206", // Pillar Staff
        "822707646393745409", // Pillar Vice Head
        "819165586889506868", // The Trades
        "810410368622395392", // Keqing's Key
    ],
    ADMIN: "810410368622395392",
    ADMIN_LIKE: [
        "953166494789926962", // Pillar Head
        "822707646393745409", // Pillar Vice Head
        "810410368622395392", // Keqing's Key
        "995096399983149078", // Emissary
    ],
    GUIDE_VERIFICATION_PING: "945105638839705630",
    CALCS_VERIFICATION_PING: "989266525280145478",
    BLACKLIST: [
        "839680495453077534", // Coffin
        "771259671671078913", // Muted
    ],
    FEIYUN: "840649229021085736",
    FEIYUN_ADMIN: "841871289894305793"
} : {
    LIBSUB: "980899762054254593",
    GUIDESUBS: "980899740029956106",
    CONTRIBUTOR: "980899054177374268",
    WET: "980899325779537990",
    THEORYCRAFTER: "980898982316351578",
    TC_STAFF: [
        "980899103049383936", // Scholar
        "981973618760228944", // Editor
    ],
    STAFF: ["980899219235807302"],
    ADMIN: "980899219235807302",
    ADMIN_LIKE: [ "980899219235807302" ],
    GUIDE_VERIFICATION_PING: "984490976817066046",
    CALCS_VERIFICATION_PING: "984490976817066046",
    BLACKLIST: [
        "987118008910610444", // Coffin
    ],
    FEIYUN: "981973618760228944", // SAME AS EDITOR,
    FEIYUN_ADMIN: "980899219235807302" // SAME AS STAFF
}

export const CATEGORY = config.production ? {
    GUIDES: "953147741415018526",
    TC_PROJECT: "953342753557868604",
    OPEN_SUBS: "953155656125411419",
    FOR_REVIEW: "953148307771883530",
    PUBLISHING: "953175594911289354",
    STAFF_TICKETS: "953156640604041216",
    STAFF_CLOSED: "953416056549015552",
    FEIYUN_PROJECTS: "946636283667681331",
    FEIYUN_CLOSED: "844652678591152128",
} : {
    GUIDES: "980838140099039272",
    TC_PROJECT: "980837799076958310",
    OPEN_SUBS: "980837799076958310",
    FOR_REVIEW: "980837820929294367",
    PUBLISHING: "980838078300164096",
    STAFF_TICKETS: "980926469737963530",
    STAFF_CLOSED: "982768252033835058",
    FEIYUN_PROJECTS: "980926469737963530",
    FEIYUN_CLOSED: "982768252033835058",
}

export const CHANNEL = config.production ? {
    NEW_TICKETS: "988565627943931934",
    TC_TRANSCRIPTS: "945097851195777054",
    THEORYHUNT: "782067573276672061",
    STAFF_TRANSCRIPTS: "812974281461596221",
    FEIYUN_TRANSCRIPTS: "954151143842398260"
} : {
    NEW_TICKETS: "981316199185014806",
    TC_TRANSCRIPTS: "980924167648079892",
    THEORYHUNT: "994320734308552775",
    STAFF_TRANSCRIPTS: "986748960041467954",
    FEIYUN_TRANSCRIPTS: "986748960041467954"
}

export const TheoryhuntSettings = {
    channel: CHANNEL.THEORYHUNT,
    manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
}

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
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button below; the ticket will automatically be moved to be reviewed.
- To add contributors to your ticket you can use \`/contributor add <user>\`.
- The ticket will be scrapped if: no activity >1 week or open for >1 month.`,
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
                )
            ]
        },
        creationRoles: [ROLE.LIBSUB, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: CATEGORY.OPEN_SUBS,
        closeCategory: CATEGORY.FOR_REVIEW,
        muteOwnerOnClose: true,
        verifications: [{
            type: VerifierType.DEFAULT,
            required: 2,
            roles: [ROLE.THEORYCRAFTER],
            button: {
                label: "Verify",
                emoji: "✅",
                style: "PRIMARY"
            }
        }],
        verifiedCategory: CATEGORY.PUBLISHING,
        verifiedRoles: [ROLE.CONTRIBUTOR],
        dumpChannel: CHANNEL.TC_TRANSCRIPTS,
        creationChannel: CHANNEL.NEW_TICKETS,
        dinkDonk: {
            time: 7 * 24 * 3600 * 1000,
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
            pingUsers: ["235719068726853632"],
            components: [
                new MessageActionRow().addComponents(
                    buttons.GUIDE_LINK,
                    buttons.CLOSE
                )
            ]
        },
        creationRoles: [ROLE.GUIDESUBS, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        blacklistNames: [{
            regex: /Shikanoin|Heizou/i,
            message: "Guide Submissions for new characters are banned in the first week of the characters release.",
            until: new Date("2022-07-20T03:00:00Z")
        }],
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: CATEGORY.GUIDES,
        verifications: [{
            type: VerifierType.GUIDE,
            required: 2,
            roles: [ROLE.THEORYCRAFTER],
            dinkDonk: {
                time: 24 * 3600 * 1000,
                message: `<@&${ROLE.GUIDE_VERIFICATION_PING}> - This guide is ready for guide verification`,
                roles: [ROLE.GUIDE_VERIFICATION_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: "Ping guide verifiers",
                    style: "DANGER"
                }
            },
            button: {
                label: "Verify guide",
                emoji: "✅",
                style: "PRIMARY"
            }
        }, {
            type: VerifierType.CALCS,
            required: 1,
            roles: [ROLE.THEORYCRAFTER],
            dinkDonk: {
                time: 24 * 3600 * 1000,
                message: `<@&${ROLE.CALCS_VERIFICATION_PING}> - This guide is ready for calc verification`,
                roles: [ROLE.CALCS_VERIFICATION_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: "Ping calc verifiers",
                    style: "DANGER"
                }
            },
            button: {
                label: "Verify calcs",
                emoji: "✅",
                style: "PRIMARY"
            }
        }],
        dumpChannel: CHANNEL.TC_TRANSCRIPTS,
        creationChannel: CHANNEL.NEW_TICKETS,
        dinkDonk: {
            time: 7 * 24 * 3600 * 1000,
            message: "<a:dinkdonk:981687794000879696> This channel hasn't been active in the past week!"
        }
    },
    tcproject: {
        id: "tcproject",
        name: "TC Project",
        emoji: "🔖",
        style: "PRIMARY",
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If this ticket was created by accident or it can be deleted, you can use \`/delete\` within the first 5 minutes, otherwise ask a Scholar.
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button below; the ticket will automatically be moved to be reviewed.
- To add contributors to your ticket you can use \`/contributor add <user>\`.`,
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
                )
            ]
        },
        creationRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: CATEGORY.TC_PROJECT,
        verifications: [{
            type: VerifierType.DEFAULT,
            required: 2,
            roles: [ROLE.THEORYCRAFTER],
            button: {
                label: "Verify",
                emoji: "✅",
                style: "PRIMARY"
            }
        }],
        verifiedCategory: CATEGORY.PUBLISHING,
        verifiedRoles: [ROLE.CONTRIBUTOR],
        dumpChannel: CHANNEL.TC_TRANSCRIPTS,
        creationChannel: CHANNEL.NEW_TICKETS
    },
    theoryhunt: {
        id: "theoryhunt",
        name: "Theoryhunt",
        emoji: "🔖",
        style: "PRIMARY",
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If this ticket was created by accident or it can be deleted, you can use \`/delete\` within the first 5 minutes, otherwise ask a Scholar.
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button below; the ticket will automatically be moved to be reviewed.
- To add contributors to your ticket you can use \`/contributor add <user>\`.
- The ticket will be scrapped if: no activity >1 week or open for >1 month.`,
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
                )
            ]
        },
        creationRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: CATEGORY.OPEN_SUBS,
        closeCategory: CATEGORY.FOR_REVIEW,
        muteOwnerOnClose: true,
        verifications: [{
            type: VerifierType.DEFAULT,
            required: 2,
            roles: [ROLE.THEORYCRAFTER],
            button: {
                label: "Verify",
                emoji: "✅",
                style: "PRIMARY"
            }
        }],
        verifiedCategory: CATEGORY.PUBLISHING,
        verifiedRoles: [ROLE.WET],
        dumpChannel: CHANNEL.TC_TRANSCRIPTS,
        creationChannel: CHANNEL.NEW_TICKETS,
        dinkDonk: {
            time: 7 * 24 * 3600 * 1000,
            message: "<a:dinkdonk:981687794000879696> This channel hasn't been active in the past week!"
        }
    },
    staff: {
        id: "staff",
        name: "Staff Ticket",
        emoji: "🐒",
        style: "SECONDARY",
        creationRoles: ROLE.STAFF,
        manageRoles: ROLE.STAFF,
        defaultCategory: CATEGORY.STAFF_TICKETS,
        closeCategory: CATEGORY.STAFF_CLOSED,
        opening: {
            content: ` - This is a staff ticket.

- To add people to this ticket, use \`/add <user or role>\`
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If you are done with this ticket, type \`/close\` or click the button below.`,
            components: [
                new MessageActionRow().addComponents(
                    buttons.CLOSE,
                    buttons.RENAME
                )
            ]
        },
        dumpChannel: CHANNEL.STAFF_TRANSCRIPTS,
        randomDefaultSlug: true
    },
    feiyun: {
        id: "feiyun",
        name: "Feiyun Ticket",
        emoji: "📹",
        style: "PRIMARY",
        creationRoles: [ROLE.FEIYUN],
        manageRoles: [ROLE.FEIYUN_ADMIN],
        defaultCategory: CATEGORY.FEIYUN_PROJECTS,
        closeCategory: CATEGORY.FEIYUN_CLOSED,
        opening: {
            content: " - Welcome. Please use this channel to work on your project and ping the relevant QC roles when done.",
            components: [
                new MessageActionRow().addComponents(
                    buttons.CLOSE,
                    buttons.RENAME
                )
            ]
        },
        dumpChannel: CHANNEL.FEIYUN_TRANSCRIPTS,
        randomDefaultSlug: true
    }
}

export const menus: {
    name: string
    value: string
    content?: string
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
    content: `**⏬ UwU what's this**
1. **Pillar Staff** and **The Trades** can use this to create a ticket/channel in Staff Tasks, for unique channel discussions / proposals / brainstorming.
→ Task system is better suited for large undertakings: like the KQM speedrun, wikia, etc.
2. For your sanity, mute the category, please.
<https://media.discordapp.net/attachments/763589418086432778/821235562589192213/unknown.png>

**⏬ Adding a member or a role to the ticket**
Newly created tickets are only visible to the person who opened it (and the admins).
For anyone else you want to add in, you can use \`/add <person or role>\` in the channel.`,
    title: "Staff Tasks",
    desc: "Click below to create a task",
    ticketTypes: [ticketTypes.staff]
}, {
    name: "Feiyun Tickets",
    value: "FY",
    title: "Projects",
    desc: "Click below to create a new project",
    ticketTypes: [ticketTypes.feiyun]
}]

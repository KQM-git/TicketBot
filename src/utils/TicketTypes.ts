import { ActionRowBuilder, AllowedThreadTypeForTextChannel, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Snowflake, TextInputStyle } from "discord.js"
import config from "../data/config.json"
import { TicketButton, TicketType, VerifierType } from "./Types"

export const buttons = {
    CLOSE: new ButtonBuilder()
        .setLabel("Close")
        .setCustomId("close")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
    OPEN: new ButtonBuilder()
        .setCustomId("open")
        .setLabel("Open")
        .setEmoji("🔓")
        .setStyle(ButtonStyle.Secondary),
    TRANSCRIPT: new ButtonBuilder()
        .setCustomId("transcript")
        .setLabel("Transcript")
        .setEmoji("📑")
        .setStyle(ButtonStyle.Secondary),
    RENAME: new ButtonBuilder()
        .setLabel("Rename")
        .setCustomId("rename")
        .setEmoji("✏️")
        .setStyle(ButtonStyle.Secondary),
    GI_GUIDE_STANDARD: new ButtonBuilder()
        .setLabel("Guide Standards")
        .setURL("https://docs.google.com/document/d/1MN1g59oB64_D2XjPhguBB88y7zdlkQ_rlNYVpJvFdfQ/")
        .setStyle(ButtonStyle.Link),
    GI_GUIDE_SKELETON: new ButtonBuilder()
        .setLabel("Guide Skeleton")
        .setURL("https://docs.google.com/document/d/1i_ftnpyJfLMTKSbHqDNPk6_oX8UlDhwVOsJUN2wk0vE/")
        .setStyle(ButtonStyle.Link),
    GI_GUIDE_SPELLING_AND_CAPITALIZATION: new ButtonBuilder()
        .setLabel("Spelling & Capitalization")
        .setURL("https://docs.google.com/document/d/1bZQYdfh7HMIUzCb0m11RTFHF62sL7VFKH235hm8oZwU/")
        .setStyle(ButtonStyle.Link),
    GI_QUICK_GUIDE_STANDARD: new ButtonBuilder()
        .setLabel("Quick Guide Standards")
        .setURL("https://docs.google.com/document/d/e/2PACX-1vSWwwAcfLm80kUQzePM07kXUXTy2Z6u9Luf_K8_9NdCwGlaXqySuQPWm2xZwLvQ-C4L6mtapu0p3DH1/pub")
        .setStyle(ButtonStyle.Link),
    GI_QUICK_GUIDE_SKELETON: new ButtonBuilder()
        .setLabel("Quick Guide Template")
        .setURL("https://docs.google.com/document/d/14uatnD-WeTA_gXgul3chPb6U--o0EJWUfLbK7elm7vE/")
        .setStyle(ButtonStyle.Link),
    GI_BULLETIN_STANDARD: new ButtonBuilder()
        .setLabel("Bulletin Standards")
        .setURL("https://docs.google.com/document/d/1HhCu-ysKLun75QpxY4WaC5Iadi412yOWBbk5H5vMs3k/")
        .setStyle(ButtonStyle.Link),
    GI_BULLETIN_SKELETON: new ButtonBuilder()
        .setLabel("Bulletin Template")
        .setURL("https://docs.google.com/document/d/16ke82bZ8Cr-DBvuD7RkO6-2jgLWbKJzp4gDyGuDdGTY/")
        .setStyle(ButtonStyle.Link),
    HSR_GUIDE_STANDARD: new ButtonBuilder()
        .setLabel("Guide Standards")
        .setURL("https://docs.google.com/document/d/1-ALCQKIMRthcSxryuOphmXbZhFTzzSBy6j9y6AR1deo/")
        .setStyle(ButtonStyle.Link),
}

const GI_ROLE = config.production ? {
    LIBSUB: "953173415836147792",
    GUIDESUBS: "939413668553179147",
    WET: "845508406579691530",
    THEORYCRAFTER: "896043474699317259",
    FEIYUN: "840649229021085736",
    FEIYUN_ADMIN: "841871289894305793"
} : {
    LIBSUB: "980899762054254593",
    GUIDESUBS: "980899740029956106",
    WET: "980899325779537990",
    THEORYCRAFTER: "980898982316351578",
    FEIYUN: "981973618760228944", // SAME AS EDITOR,
    FEIYUN_ADMIN: "980899219235807302" // SAME AS STAFF
}

const HSR_ROLE = {
    SUBS: "1099762139020918924",
    QC_VERIF_PING: "1103837646117163008",
    TC_VERIF_PING: "1103834692605706280",
    EDATING: "1100933761648033862", // Test server
    EDATING_ADMIN: "1095455723506380831",
}

export const ROLE = config.type == "GI" ? config.production ? {
    // Genshin Production
    TC_STAFF: [
        "1011040674247889026", // TC Staff
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
    BLACKLIST: [
        // "839680495453077534", // Coffin
        "771259671671078913", // Muted
    ],
    CONTRIBUTOR: "764838634280845312",
    GUIDE_VERIFICATION_PING: "945105638839705630",
    CALCS_VERIFICATION_PING: "989266525280145478",
} : {
    // Test server
    TC_STAFF: [
        "980899103049383936", // Scholar
        "981973618760228944", // Editor
    ],
    STAFF: ["980899219235807302"],
    ADMIN: "980899219235807302",
    ADMIN_LIKE: ["980899219235807302"],
    BLACKLIST: [
        "987118008910610444", // Coffin
    ],
    CONTRIBUTOR: "980899054177374268",
    GUIDE_VERIFICATION_PING: "984490976817066046",
    CALCS_VERIFICATION_PING: "984490976817066046",
} : {
    // HSR Production
    TC_STAFF: [
        "1094788736715341944", // TC Mod
        "1090846911101145138", // TC
    ],
    STAFF: ["1089341501764542484"], // Staff
    ADMIN: "1089339955509215273",
    ADMIN_LIKE: [
        "1089339955509215273", // Aeon
        "1089368868306288691", // Key
    ],
    BLACKLIST: [
        "1090818029639717005", // Muted
    ],
    CONTRIBUTOR: "1099763950352093224", // TC Contributor
    GUIDE_VERIFICATION_PING: HSR_ROLE.QC_VERIF_PING,
    CALCS_VERIFICATION_PING: "1103841029746073670",
}

const CATEGORY = config.type == "GI" ? config.production ? {
    // GI KQM
    GUIDES: "953147741415018526",
    QUICK_GUIDES: "1034590774555328603",
    TC_PROJECT: "953342753557868604",
    OPEN_SUBS: "953155656125411419",
    FOR_REVIEW: "953148307771883530",
    PUBLISHING: "953175594911289354",
    STAFF_TICKETS: "953156640604041216",
    STAFF_CLOSED: "953416056549015552",
    FEIYUN_PROJECTS: "946636283667681331",
    FEIYUN_DONE: "999767676924735568"
} : {
    // TESTING
    GUIDES: "980838140099039272",
    QUICK_GUIDES: "980838140099039272",
    TC_PROJECT: "980837799076958310",
    OPEN_SUBS: "980837799076958310",
    FOR_REVIEW: "980837820929294367",
    PUBLISHING: "980838078300164096",
    STAFF_TICKETS: "980926469737963530",
    STAFF_CLOSED: "982768252033835058",
    FEIYUN_PROJECTS: "980926469737963530",
    FEIYUN_DONE: "980838078300164096"
} : {
    // HSR
    GUIDES: "1099761128122359959",
    QUICK_GUIDES: "1099761128122359959",
    TC_PROJECT: "1099761981336080454",
    OPEN_SUBS: "1099761028348264488",
    FOR_REVIEW: "1099762096448749580",
    PUBLISHING: "1099762543578316940",
    STAFF_TICKETS: "1099762656853901402",
    STAFF_CLOSED: "1099762824005292114",
    FEIYUN_PROJECTS: "1108623583976095835", // HSR test server
    FEIYUN_DONE: "1126362861736820746"
}

const CHANNEL = config.type == "GI" ? config.production ? {
    // GI KQM
    NEW_TICKETS: "988565627943931934",
    TC_TRANSCRIPTS: "945097851195777054",
    THEORYHUNT: "782067573276672061",
    STAFF_TRANSCRIPTS: "812974281461596221",
    FEIYUN_TRANSCRIPTS: "954151143842398260",
    FEIYUN_FEED: "999763136984924211",
    CALC_REQUEST: "1001597332716003548"
} : {
    // TESTING
    NEW_TICKETS: "981316199185014806",
    TC_TRANSCRIPTS: "980924167648079892",
    THEORYHUNT: "994320734308552775",
    STAFF_TRANSCRIPTS: "986748960041467954",
    FEIYUN_TRANSCRIPTS: "986748960041467954",
    FEIYUN_FEED: "981316199185014806",
    CALC_REQUEST: "994320734308552775"
} : {
    // HSR
    NEW_TICKETS: "1099763077492244491",
    TC_TRANSCRIPTS: "1099763396045451324",
    THEORYHUNT: "1099763353741693080",
    STAFF_TRANSCRIPTS: "1099763282975400037",
    FEIYUN_TRANSCRIPTS: "1237093253627772990",
    FEIYUN_FEED: "0",
    CALC_REQUEST: "0"
}

export const TheoryhuntSettings = {
    channel: CHANNEL.THEORYHUNT,
    manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
    message: config.type == "GI" ? "<@&855509799335493692> <:keqgrab:1011631839569518643>" : "",
    pingable: config.type == "GI" ? ["855509799335493692"] : [],
}

export const ticketTypes: Record<string, TicketType> = {
    libsubs: {
        id: "libsubs",
        name: "Library Submission",
        emoji: "🔖",
        style: ButtonStyle.Primary,
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If this ticket was created by accident or it can be deleted, you can use \`/delete\` within the first 5 minutes, otherwise ask ${config.type == "GI" ? "a Scholar" : "an Astral Navigator"}.
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button below; the ticket will automatically be moved to be reviewed.
- To add contributors to your ticket you can use \`/contributor add <user>\`.
- The ticket will be scrapped if: no activity >1 week or open for >1 month.`,
            embeds: [new EmbedBuilder()
                .setTitle("Write-up Format")
                .setDescription(`**Theory/Finding/Bug:** Title of your submission

**Evidence:** Explanations with calculations and/or YouTube/Imgur proofs

**Significance:** Conclusion`)
                .setColor("#A758BF")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.CLOSE,
                    buttons.RENAME
                )
            ]
        },
        creationRoles: [GI_ROLE.LIBSUB, HSR_ROLE.SUBS, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: CATEGORY.OPEN_SUBS,
        closeCategory: CATEGORY.FOR_REVIEW,
        muteOwnerOnClose: true,
        verifications: [{
            type: VerifierType.DEFAULT,
            required: 2,
            roles: [GI_ROLE.THEORYCRAFTER],
            button: {
                label: "Verify",
                emoji: "✅",
                style: ButtonStyle.Primary
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
        style: ButtonStyle.Success,
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- Name it appropriately with \`/rename <ticket name>\`${config.type == "GI" ? `
- When done ping <@&903791926162100256> to begin the review process.` : ""}`,
            embeds: [new EmbedBuilder()
                .setTitle("Guide Guidelines")
                .setDescription(config.type == "GI" ?
                // GI
                    `**[Guide Standards](https://docs.google.com/document/d/1MN1g59oB64_D2XjPhguBB88y7zdlkQ_rlNYVpJvFdfQ/)**
Entails what KQM looks for in terms of quality for guides hosted on our website. These standards are enforced, and it is expected that authors follow them closely.

**[Guide Skeleton](https://docs.google.com/document/d/1i_ftnpyJfLMTKSbHqDNPk6_oX8UlDhwVOsJUN2wk0vE/)**
A general template for what a KQM-hosted guide should look like. Use this as a reference for what elements and sections should be in your guide.

**[KQM Spelling & Capitalization Standards](https://docs.google.com/document/d/1bZQYdfh7HMIUzCb0m11RTFHF62sL7VFKH235hm8oZwU/)**
A reference document for spelling and capitalization standards in KQM guides.` :
                // HSR
                    `**[Guide Standards](https://docs.google.com/document/d/1-ALCQKIMRthcSxryuOphmXbZhFTzzSBy6j9y6AR1deo/)**
Entails what KQM looks for in terms of quality for guides hosted on our website. These standards are enforced, and it is expected that authors follow them closely.`)
                .setColor("#A758BF")
            ],
            components: [
                config.type == "GI" ? new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.GI_GUIDE_STANDARD,
                    buttons.GI_GUIDE_SKELETON,
                    buttons.GI_GUIDE_SPELLING_AND_CAPITALIZATION,
                    buttons.CLOSE
                ) : new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.HSR_GUIDE_STANDARD,
                    buttons.CLOSE
                )
            ]
        },
        lockout: 7 * 24 * 3600 * 1000,
        creationRoles: [GI_ROLE.GUIDESUBS, HSR_ROLE.SUBS, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        blacklistNames: [{
            regex: /Collei|Thighnari|Dori/i,
            message: "Guide Submissions for new characters are banned in the first week of the characters release.",
            until: new Date("2022-08-31T03:00:00Z")
        }],
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: CATEGORY.GUIDES,
        verifications: [{
            type: VerifierType.GUIDE_GRAMMAR,
            required: 2,
            roles: [GI_ROLE.THEORYCRAFTER],
            dinkDonk: {
                time: 24 * 3600 * 1000,
                message: `<@&${ROLE.GUIDE_VERIFICATION_PING}> - This guide is ready for guide verification`,
                roles: [ROLE.GUIDE_VERIFICATION_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: config.type == "GI" ? "Ping guide verifiers" : "Ping QC verifiers",
                    style: ButtonStyle.Danger
                }
            },
            button: {
                label: "Verify guide readability/grammar",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }, {
            type: VerifierType.GUIDE_TC,
            required: 2,
            roles: [GI_ROLE.THEORYCRAFTER],
            dinkDonk: config.type == "HSR" ? {
                time: 24 * 3600 * 1000,
                message: `<@&${HSR_ROLE.TC_VERIF_PING}> - This guide is ready for TC content verification`,
                roles: [HSR_ROLE.TC_VERIF_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: "Ping TC content verifiers",
                    style: ButtonStyle.Danger
                }
            } : undefined,
            button: {
                label: "Verify guide TC content",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }, {
            type: VerifierType.CALCS,
            required: 1,
            roles: [GI_ROLE.THEORYCRAFTER],
            dinkDonk: {
                time: 24 * 3600 * 1000,
                message: `<@&${ROLE.CALCS_VERIFICATION_PING}> - This guide is ready for calc verification`,
                roles: [ROLE.CALCS_VERIFICATION_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: "Ping calc verifiers",
                    style: ButtonStyle.Danger
                }
            },
            button: {
                label: "Verify calcs",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }],
        dumpChannel: CHANNEL.TC_TRANSCRIPTS,
        creationChannel: CHANNEL.NEW_TICKETS,
        dinkDonk: {
            time: 7 * 24 * 3600 * 1000,
            message: "<a:dinkdonk:981687794000879696> This channel hasn't been active in the past week!"
        }
    },
    quick_guide: {
        id: "quick_guide",
        name: "Quick Guide Submission",
        emoji: "📔",
        style: ButtonStyle.Success,
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- Name it appropriately with \`/rename <ticket name>\`${config.type == "GI" ? `
- When done ping <@&903791926162100256> to begin the review process.` : ""}`,
            embeds: [new EmbedBuilder()
                .setTitle("Quick Guide Guidelines")
                .setDescription(config.type == "GI" ?
                // GI
                    `**[Quick Guide Standards](https://docs.google.com/document/d/e/2PACX-1vSWwwAcfLm80kUQzePM07kXUXTy2Z6u9Luf_K8_9NdCwGlaXqySuQPWm2xZwLvQ-C4L6mtapu0p3DH1/pub)**
What KQM looks for in terms of quality for Quick Guides. These standards are enforced.

**[Quick Guide Template](https://docs.google.com/document/d/14uatnD-WeTA_gXgul3chPb6U--o0EJWUfLbK7elm7vE/)**
A template for Quick Guide structure, which should be followed closely.

**[KQM Spelling & Capitalization Standards](https://docs.google.com/document/d/1bZQYdfh7HMIUzCb0m11RTFHF62sL7VFKH235hm8oZwU/)**
A reference document for spelling and capitalization standards in KQM guides.` :
                // HSR
                    `**[Guide Standards](https://docs.google.com/document/d/1-ALCQKIMRthcSxryuOphmXbZhFTzzSBy6j9y6AR1deo/)**
Entails what KQM looks for in terms of quality for guides hosted on our website. These standards are enforced, and it is expected that authors follow them closely.`)
                .setColor("#A758BF")
            ],
            components: [
                config.type == "GI" ? new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.GI_QUICK_GUIDE_STANDARD,
                    buttons.GI_QUICK_GUIDE_SKELETON,
                    buttons.GI_GUIDE_SPELLING_AND_CAPITALIZATION,
                    buttons.CLOSE
                ) : new ActionRowBuilder<ButtonBuilder>().addComponents(
                    // buttons.HSR_GUIDE_STANDARD,
                    buttons.CLOSE
                )
            ]
        },
        lockout: 1 * 24 * 3600 * 1000,
        creationRoles: [GI_ROLE.GUIDESUBS, HSR_ROLE.SUBS, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: CATEGORY.QUICK_GUIDES,
        verifications: [{
            type: VerifierType.GUIDE_GRAMMAR,
            required: 1,
            roles: [GI_ROLE.THEORYCRAFTER],
            dinkDonk: {
                time: 24 * 3600 * 1000,
                message: `<@&${ROLE.GUIDE_VERIFICATION_PING}> - This guide is ready for guide verification`,
                roles: [ROLE.GUIDE_VERIFICATION_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: config.type == "GI" ? "Ping guide verifiers" : "Ping QC verifiers",
                    style: ButtonStyle.Danger
                }
            },
            button: {
                label: "Verify guide readability/grammar",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }, {
            type: VerifierType.GUIDE_TC,
            required: 1,
            roles: [GI_ROLE.THEORYCRAFTER],
            dinkDonk: config.type == "HSR" ? {
                time: 24 * 3600 * 1000,
                message: `<@&${HSR_ROLE.TC_VERIF_PING}> - This guide is ready for TC content verification`,
                roles: [HSR_ROLE.TC_VERIF_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: "Ping TC content verifiers",
                    style: ButtonStyle.Danger
                }
            } : undefined,
            button: {
                label: "Verify guide TC content",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }],
        dumpChannel: CHANNEL.TC_TRANSCRIPTS,
        creationChannel: CHANNEL.NEW_TICKETS,
        dinkDonk: {
            time: 7 * 24 * 3600 * 1000,
            message: "<a:dinkdonk:981687794000879696> This channel hasn't been active in the past week!"
        },
        tags: { // TODO config is for GI
            OPEN: ["1034603107126104246"],
            CLOSED: ["1036274863444336650"],
            VERIFIED: ["1034603193239359508"],
        }
    },
    tcproject: {
        id: "tcproject",
        name: "TC Project",
        emoji: "🔖",
        style: ButtonStyle.Primary,
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If this ticket was created by accident or it can be deleted, you can use \`/delete\` within the first 5 minutes, otherwise ask ${config.type == "GI" ? "a Scholar" : "an Astral Navigator"}.
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button below; the ticket will automatically be moved to be reviewed.
- To add contributors to your ticket you can use \`/contributor add <user>\`.`,
            embeds: [new EmbedBuilder()
                .setTitle("Write-up Format")
                .setDescription(`**Theory/Finding/Bug:** Title of your submission

**Evidence:** Explanations with calculations and/or YouTube/Imgur proofs

**Significance:** Conclusion`)
                .setColor("#A758BF")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
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
            roles: [GI_ROLE.THEORYCRAFTER],
            button: {
                label: "Verify",
                emoji: "✅",
                style: ButtonStyle.Primary
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
        style: ButtonStyle.Primary,
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- You can rename your ticket with \`/rename <ticket name>\` or with the button below
- If this ticket was created by accident or it can be deleted, you can use \`/delete\` within the first 5 minutes, otherwise ask a ${config.type == "GI" ? "a Scholar" : "an Astral Navigator"}.
- When you are ready to submit the ticket, compile everything into one message following the format below and pin it. Then type \`/close\` or click the button below; the ticket will automatically be moved to be reviewed.
- To add contributors to your ticket you can use \`/contributor add <user>\`.
- The ticket will be scrapped if: no activity >1 week or open for >1 month.`,
            embeds: [new EmbedBuilder()
                .setTitle("Write-up Format")
                .setDescription(`**Theory/Finding/Bug:** Title of your submission

**Evidence:** Explanations with calculations and/or YouTube/Imgur proofs

**Significance:** Conclusion`)
                .setColor("#A758BF")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
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
            roles: [GI_ROLE.THEORYCRAFTER],
            button: {
                label: "Verify",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }],
        verifiedCategory: CATEGORY.PUBLISHING,
        verifiedRoles: config.type == "GI" ? [GI_ROLE.WET] : [ROLE.CONTRIBUTOR],
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
        style: ButtonStyle.Secondary,
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
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.CLOSE,
                    buttons.RENAME
                )
            ]
        },
        dumpChannel: CHANNEL.STAFF_TRANSCRIPTS,
        randomDefaultSlug: true
    },
}
if (config.type == "GI") {
    ticketTypes.feiyun = {
        id: "feiyun",
        name: "Feiyun Ticket",
        emoji: "📹",
        style: ButtonStyle.Primary,
        creationRoles: [GI_ROLE.FEIYUN],
        manageRoles: [GI_ROLE.FEIYUN_ADMIN],
        defaultCategory: CATEGORY.FEIYUN_PROJECTS,
        verifications: [{
            type: VerifierType.DEFAULT,
            required: 1,
            roles: [GI_ROLE.FEIYUN_ADMIN],
            button: {
                label: "Verify",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }],
        verifiedCategory: CATEGORY.FEIYUN_DONE,
        opening: {
            content: " - Welcome. Please use this channel to work on your project and ping the relevant QC roles when done.",
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.RENAME
                )
            ]
        },
        dumpChannel: CHANNEL.FEIYUN_TRANSCRIPTS,
        creationChannel: CHANNEL.FEIYUN_FEED,
        randomDefaultSlug: true
    }
    ticketTypes.kqmb = {
        id: "kqmb",
        name: "KQMB Submission",
        emoji: "📔",
        style: ButtonStyle.Success,
        opening: {
            content: ` - As an author, it is your responsibility to complete the ticket

**Guidelines**
- Name it appropriately with \`/rename <ticket name>\`
- When you are ready to submit the ticket, type \`/close\` or click the button below; the ticket will automatically be tagged correctly.`,
            embeds: [new EmbedBuilder()
                .setTitle("Quick Guide Guidelines")
                .setDescription(
                    `**[KQM Bulletin Standards](https://docs.google.com/document/d/1HhCu-ysKLun75QpxY4WaC5Iadi412yOWBbk5H5vMs3k/)**
What KQM looks for in terms of quality for Bulletin articles. These standards are enforced.

**[KQM Bulletin Article Formatting Template](https://docs.google.com/document/d/16ke82bZ8Cr-DBvuD7RkO6-2jgLWbKJzp4gDyGuDdGTY/)**
A template for formatting the submitted Google Docs, which should be followed closely.

**[KQM Spelling & Capitalization Standards](https://docs.google.com/document/d/1bZQYdfh7HMIUzCb0m11RTFHF62sL7VFKH235hm8oZwU/)**
A reference document for spelling and capitalization standards in KQM guides.`
                ).setColor("#A758BF")
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.GI_BULLETIN_STANDARD,
                    buttons.GI_BULLETIN_SKELETON,
                    buttons.GI_GUIDE_SPELLING_AND_CAPITALIZATION,
                    buttons.CLOSE
                )
            ]
        },
        lockout: 1 * 24 * 3600 * 1000,
        creationRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        blacklistRoles: ROLE.BLACKLIST,
        manageRoles: [...ROLE.TC_STAFF, ROLE.ADMIN],
        defaultCategory: "1077342382451859486",
        verifications: [{
            type: VerifierType.GUIDE_GRAMMAR,
            required: 1,
            roles: [GI_ROLE.THEORYCRAFTER],
            dinkDonk: {
                time: 24 * 3600 * 1000,
                message: `<@&${ROLE.GUIDE_VERIFICATION_PING}> - This guide is ready for guide verification`,
                roles: [ROLE.GUIDE_VERIFICATION_PING],
                button: {
                    emoji: "<a:dinkdonk:981687794000879696>",
                    label: config.type == "GI" ? "Ping guide verifiers" : "Ping QC verifiers",
                    style: ButtonStyle.Danger
                }
            },
            button: {
                label: "Verify guide readability/grammar",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }, {
            type: VerifierType.GUIDE_TC,
            required: 1,
            roles: [GI_ROLE.THEORYCRAFTER],
            button: {
                label: "Verify guide TC content",
                emoji: "✅",
                style: ButtonStyle.Primary
            }
        }],
        dumpChannel: CHANNEL.STAFF_TRANSCRIPTS,
        dinkDonk: {
            time: 7 * 24 * 3600 * 1000,
            message: "<a:dinkdonk:981687794000879696> This channel hasn't been active in the past week!"
        },
        tags: { // TODO config is for GI
            OPEN: ["1077342625746649098"],
            CLOSED: ["1077345123349839924"],
            VERIFIED: ["1077342696479412294"],
        },
        randomDefaultSlug: true
    }
} else {
    ticketTypes.edating = {
        id: "edating",
        name: "Edating",
        emoji: "�",
        style: ButtonStyle.Secondary,
        creationRoles: [HSR_ROLE.EDATING],
        manageRoles: [HSR_ROLE.EDATING_ADMIN],
        defaultCategory: CATEGORY.FEIYUN_PROJECTS,
        closeCategory: CATEGORY.FEIYUN_DONE,
        verifiedCategory: CATEGORY.FEIYUN_DONE,
        opening: {
            content: "<:edating:1100144601865650267>",
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.RENAME
                )
            ]
        },
        dumpChannel: CHANNEL.FEIYUN_TRANSCRIPTS,
        randomDefaultSlug: true
    }
}

export const menus: TicketButton[] = [{
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
    name: "Calculation Requests",
    value: "CR",
    title: "Calculation Requests",
    desc: "Click below to create a new calculation request",
    ticketTypes: [{
        emoji: "📋",
        name: "Calculation Request",
        style: ButtonStyle.Success,
        customId: "template-reqcalc",
    }]
}]

if (config.type == "HSR") {
    menus.push({
        name: "Edating",
        value: "ED",
        title: "Edating",
        desc: "Click below to create a new ticket",
        ticketTypes: [ticketTypes.edating]
    })
}

export const templates: Record<string, {
    name: string
    embedTitle: string
    createThreads?: Snowflake[]
    threadType?: AllowedThreadTypeForTextChannel
    addUser?: false
    fields: {
        id: string
        inline?: true
        modalTitle: string
        embedTitle: string
        modalPlaceholder?: string
        modalDefault?: string
        type: TextInputStyle
    }[]
    threadPing?: string[]
}> = config.type == "GI" ? {
    proposal: {
        name: "Proposal",
        embedTitle: "Theorycrafting Proposal",
        fields: [{
            id: "proposal",
            modalTitle: "Proposal",
            embedTitle: "Proposal",
            modalPlaceholder: "What is the idea that you want to explore?",
            type: TextInputStyle.Short
        }, {
            id: "motivation",
            modalTitle: "Motivation",
            embedTitle: "Why are you TC'ing this?",
            modalPlaceholder: "<I like X unit> <Meta/Value Analysis>",
            type: TextInputStyle.Short
        }, {
            id: "idea",
            modalTitle: "Reasoning",
            embedTitle: "Why would this idea work? What is it competing against? What are some substitutes and alternatives that we already use?",
            modalPlaceholder: "The shield from Xinyan provides small defense but has Pyro application.",
            type: TextInputStyle.Paragraph
        }, {
            id: "what",
            modalTitle: "What do you need",
            embedTitle: "Did you want to try to calc this? What is the end goal?",
            modalPlaceholder: "<TheoryHunt> <Calc Guide> <GCsim>",
            type: TextInputStyle.Paragraph
        }]
    },
    tlr: {
        name: "TLR Topic Proposal",
        embedTitle: "TLR Topic Proposal",
        threadType: ChannelType.PrivateThread,
        createThreads: ["1076777919403282502", "982680753777299526"],
        addUser: false,
        fields: [{
            id: "topic",
            modalTitle: "Topic Title",
            embedTitle: "Topic",
            modalPlaceholder: "A short WIP title",
            type: TextInputStyle.Short
        }, {
            id: "info",
            modalTitle: "About",
            embedTitle: "Information",
            modalPlaceholder: "Information/description about the topic",
            type: TextInputStyle.Paragraph
        }]
    },
//     reqcalc: {
//         name: "Calculation Request",
//         embedTitle: "Calculation Request",
//         createThreads: [CHANNEL.CALC_REQUEST],
//         threadPing: ["975990552812204032"],
//         fields: [{
//             id: "type",
//             embedTitle: "Type of Calculation",
//             modalTitle: "Calculation Type",
//             modalPlaceholder: "Weapon / Team / etc.",
//             type: TextInputStyle.Short
//         }, {
//             id: "composition",
//             modalTitle: "Team / Character(s)",
//             embedTitle: "Composition",
//             modalPlaceholder: "List the team members and rotation video",
//             modalDefault: `- Team member 1 + Weapon + Artifact Set/Stats
// (repeat for all team members)
// (if anything is not included, up to calcer's discretion)`,
//             type: TextInputStyle.Paragraph
//         }, {
//             id: "misc",
//             modalTitle: "Misc",
//             embedTitle: "Other details",
//             modalPlaceholder: "At least purpose is required",
//             modalDefault: `- Purpose of calc (for guide, compendium, etc.)
// - Rotation (required if team calc)
// - Rotation video (required if team calc), links can be formatted like [this](https://youtu.be/dQw4w9WgXcQ)
// - Additional details (if necessary)`,
//             type: TextInputStyle.Paragraph
//         }, {
//             id: "status",
//             inline: true,
//             modalTitle: "Status",
//             embedTitle: "Status",
//             modalPlaceholder: "Open / Under verification / etc.",
//             modalDefault: "Open",
//             type: TextInputStyle.Short
//         }, {
//             id: "participants",
//             inline: true,
//             modalTitle: "Participants",
//             embedTitle: "Participants",
//             modalPlaceholder: "Participants",
//             modalDefault: "This can be you!",
//             type: TextInputStyle.Paragraph
//         }]
//     }
} : {}

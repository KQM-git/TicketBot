TiBot
=======

https://discord.com/oauth2/authorize?client_id=980553106704187402&scope=bot+applications.commands&permissions=275146419216


# Usage
## Commands
All commands are accessible via slash-commands. Some commands are accessible via buttons displayed on relevant messages. Some are also accessible via t!command, but not recommended to use.

## Getting started
Tickets can be created by using the command or by pressing the relevant button.
- `/createticket <type> <ticket name>`: Creates a ticket with the given type and name if the user has one of the roles required (`creationRoles`) to create tickets with that ticket type. The type decides in which category the channel will be created and who can manage this ticket. Base permissions are copied from the category, however the creator also gets view and manage messages permissions. The ticket might also be posted in a channel (if `creationChannel` is configured for that type), in case the ticket type has such channel defined.
- `/rename <new name>`: Renames the current ticket. Can be done by the ticket owner and by people who have one of the management roles (`manageRoles`) for that ticket type.
- `/delete`: (After clicking on a confirmation button) creates a transcript and deletes the current ticket/channel. Can be done by the ticket owner in the first 5 minutes and by people who have one of the management roles (`manageRoles`) for that ticket type.
- `/transcript [oldest message to include, defaults to first] [newest message to include, defaults to the bot response to this command] [slug, the unique tag used in URL on site, defaults to channel name or a random UUID depending on the ticket type]`: Creates a transcript of the current channel/ticket. Can be done by people who have one of the management roles (`manageRoles`) for that ticket type. Once done, it'll be posted in the `dumpChannel` for that type (if configured).
- `/close`: Closes the current ticket. Can be done by the ticket owner and by people who have one of the management roles (`manageRoles`) for that ticket type. This moves the ticket to the closed category (if `closeCategory` is set on that ticket type), disables the owner from chatting (if `muteOwnerOnClose` is configured by that ticket type). 
- `/open`: Opens the current ticket. Can be done by the ticket owner and by people who have one of the management roles (`manageRoles`) for that ticket type. This moves the ticket to the open category, clears the owner mute overwrite and clears out current verifications (if any).
- `/ticketinfo [channel]`: Checks info about a ticket linked to the current channel or a specified channel.

Open tickets that haven't received a chat message in a certain amount of time, might receive a `dinkDonk` message reminding of the ticket.

## Contributions / Verifications
The bot can automatically add a contribution role to all contributors when the ticket reaches the required amount of verifications.
- `/contributor add <user>`: Adds a user to the list of contributors. Can be done by the ticket owner and by people who have one of the management roles (`manageRoles`) for that ticket type.
- `/contributor remove <user>`: Removes a user to the list of contributors. Can be done by the ticket owner and by people who have one of the management roles (`manageRoles`) for that ticket type.
- `/verify [type]`: Verifies the current ticket. Can be done by people who haven't already verified the ticket, have one of the the management (`manageRoles`) or verification roles (`verifyRoles`) for that ticket type and while the ticket isn't already verified and isn't open. If enough `verifications` are reached, the channel will be moved to the verified category (if `verifiedCategory` is configured on the type), a role (`verifiedRole`) will be given out to all contributors and a transcript will be made of this channel.

## Access
- `/add <user/role>`: Adds a user/role from the current ticket. Useable by people with the ticket type'one of the management roles (`manageRoles`).
- `/remove <user/role>`: Removes a user/role from the current ticket. Useable by people with the ticket type'one of the management roles (`manageRoles`).

## Bot management
These commands are only available to people with "manage channel" permission in the targeted channel/category.
- `/createticketmenu <preset> [channel]`: Creates a ticket creation menu for the given preset, into the given channel (or current channel).
- `/createticketdirectory <type> [channel]`: Posts an auto-updating list of available tickets for that type, grouped by status, into the given channel (or current channel).
- `/convertticket <channel/category> <ticket type> <status>`: Converts the target channel (or all channels under that category) into tickets with the given type and status. Either new tickets are created (the original owner will be attempted to be extracted from previous bot's pinned message) or the type/status of the existing ticket will be updated.

# TODO
## Soon:tm:
- Enforce ticket template?

## Long term
- Theoryhunt managing

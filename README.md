# Backup Bot

## Description
Backup Bot is a Discord bot with one focused job: protect your server's structure. It snapshots every role and channel — including categories and permission overwrites — into a backup file, and can restore anything that's missing later by matching names. That means it still works even after a full server nuke wipes out all the original role/channel IDs, since restore rebuilds by name rather than ID.

## Installation

1. Clone the repository:

git clone https://github.com/dimmitrakic/backup-discord-bot


2. Navigate to the bot directory:

cd backup-bot


3. Install dependencies:

npm install


4. Configure environment variables:
   * Create a `.env` file in the project directory.
   * Add your bot token and permission settings:

DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
CLIENT_ID=YOUR_BOT_CLIENT_ID
GUILD_ID=YOUR_TEST_SERVER_ID
STAFF_ID=USER_ID
OWNER_ID=USER_ID


## Usage

1. Start the bot:

node index.js


2. Invite the bot to your server with Manage Roles and Manage Channels permissions.
3. Run `/backup create` to take a snapshot, `/backup list` to see saved backups, and `/backup restore` to rebuild anything missing.

## Features

* `/backup create` — snapshots every role and channel (with categories and permission overwrites) to a file.
* `/backup list` — shows available backups for the server, most recent first.
* `/backup restore` — recreates anything missing from a backup, matched by name, so existing roles/channels are left untouched.
* Commands auto-register with Discord on every startup — no separate deploy step.
* Staff/owner access controlled entirely via environment variables.

## Technologies

* [Node.js](https://nodejs.org/)
* [discord.js](https://discord.js.org/)
* [dotenv](https://www.npmjs.com/package/dotenv)

## Contributing
Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes.
4. Open a pull request describing your changes.

## License
This project is licensed under the Apache License 2.0. See the LICENSE file for details.

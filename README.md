# Backup Bot

A minimal Discord bot with exactly one feature: back up and restore a
server's roles and channels. Pulled out of a larger bot's `/backup`
command so you can run it on its own.

## Layout

```
.
├── index.js              ← main file / entry point (auto-registers the command on every boot)
├── config.js
├── package.json
├── commands/
│   └── backup.js         ← /backup create|list|restore
├── backup/
│   └── backupManager.js  ← the actual snapshot/restore logic
├── security/
│   └── permissions.js    ← staff (create/list) vs owner (restore)
└── data/backups/         ← where backup JSON files are saved (gitignored)
```

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Notes |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | From the Bot tab of your application. **Never share this or commit it.** |
| `CLIENT_ID` | ✅ | Application ID, from the General Information tab. |
| `GUILD_ID` | optional | Set while developing — the command registers instantly to one server. Remove for global (prod). |
| `STAFF_IDS` | recommended | Comma-separated user IDs allowed to run `/backup create` and `/backup list`. |
| `OWNER_IDS` | recommended | Comma-separated user IDs allowed to run `/backup restore` — a bigger blast radius than create/list, so keep this a smaller/more trusted set (or the same list, your call). |

Then just start it — the command registers itself automatically every time it boots:

```bash
npm start
```

## What it does

- **`/backup create`** (staff) — snapshots every role and channel (with categories and permission overwrites) to a JSON file in `data/backups/<guild-id>/`.
- **`/backup list`** (staff) — shows available backups for this server, most recent first.
- **`/backup restore [filename]`** (owner) — recreates anything from that snapshot that's currently **missing**, matched by **name** — existing roles/channels with the same name are left untouched. This is what makes it useful after a nuke: even though the old IDs are gone, restore rebuilds everything by name, permissions included. Defaults to the most recent backup if no filename is given.

It does **not** restore message history, emojis, webhooks, or exact role/channel ordering — structure and permissions only.

## Required bot permissions / intents

When generating the invite link in the Discord Developer Portal, enable:
- **Bot permissions:** Manage Roles, Manage Channels, Send Messages, Read Message History
- No privileged gateway intents are needed — this bot only reads/writes server structure, not messages or members.

## Notes

- Backups are stored on disk under `data/` (gitignored) and persist across restarts, but **not** across a fresh deploy if your host wipes the filesystem — download/back up that folder somewhere durable if you want long-term retention.
- `STAFF_IDS`/`OWNER_IDS` here are plain user ID lists (not Discord roles) to keep this bot dependency-free — if you'd rather gate by role, that's a small change to `security/permissions.js`.

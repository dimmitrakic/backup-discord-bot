import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChannelType } from 'discord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'backups');

function guildDir(guildId) {
  const dir = path.join(DATA_DIR, guildId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export async function createBackup(guild) {
  const roles = guild.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position,
    }));

  const categories = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ name: c.name, position: c.position }));

  const channels = guild.channels.cache
    .filter((c) => c.type !== ChannelType.GuildCategory && !c.isThread())
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      name: c.name,
      type: c.type,
      topic: c.topic ?? null,
      nsfw: c.nsfw ?? false,
      rateLimitPerUser: c.rateLimitPerUser ?? 0,
      position: c.position,
      parentName: c.parent?.name ?? null,
      permissionOverwrites: [...c.permissionOverwrites.cache.values()].map((o) => ({
        type: o.type,
        roleName: o.type === 0 ? guild.roles.cache.get(o.id)?.name ?? null : null,
        userId: o.type === 1 ? o.id : null,
        allow: o.allow.bitfield.toString(),
        deny: o.deny.bitfield.toString(),
      })),
    }));

  const backup = {
    guildId: guild.id,
    guildName: guild.name,
    createdAt: new Date().toISOString(),
    roles,
    categories,
    channels,
  };

  const filename = `${Date.now()}.json`;
  writeFileSync(path.join(guildDir(guild.id), filename), JSON.stringify(backup, null, 2), 'utf8');
  return filename;
}

export function listBackups(guildId) {
  return readdirSync(guildDir(guildId))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();
}

export function loadBackup(guildId, filename) {
  const filePath = path.join(guildDir(guildId), filename);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export async function restoreBackup(guild, backup) {
  const roleNameToId = new Map();

  for (const r of backup.roles) {
    const existing = guild.roles.cache.find((role) => role.name === r.name);
    if (existing) {
      roleNameToId.set(r.name, existing.id);
      continue;
    }
    try {
      const created = await guild.roles.create({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        mentionable: r.mentionable,
        permissions: BigInt(r.permissions),
        reason: 'Server backup restore',
      });
      roleNameToId.set(r.name, created.id);
    } catch (err) {
      console.error(`[backup] Failed to recreate role "${r.name}":`, err);
    }
  }

  const categoryNameToId = new Map();
  for (const cat of backup.categories) {
    const existing = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === cat.name);
    if (existing) {
      categoryNameToId.set(cat.name, existing.id);
      continue;
    }
    try {
      const created = await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        reason: 'Server backup restore',
      });
      categoryNameToId.set(cat.name, created.id);
    } catch (err) {
      console.error(`[backup] Failed to recreate category "${cat.name}":`, err);
    }
  }

  for (const ch of backup.channels) {
    const existing = guild.channels.cache.find((c) => c.name === ch.name && c.type === ch.type);
    if (existing) continue;

    const permissionOverwrites = ch.permissionOverwrites
      .map((o) => {
        const id = o.type === 0 ? roleNameToId.get(o.roleName) : o.userId;
        if (!id) return null;
        return { id, allow: BigInt(o.allow), deny: BigInt(o.deny), type: o.type };
      })
      .filter(Boolean);

    try {
      await guild.channels.create({
        name: ch.name,
        type: ch.type,
        topic: ch.topic ?? undefined,
        nsfw: ch.nsfw,
        rateLimitPerUser: ch.rateLimitPerUser,
        parent: ch.parentName ? categoryNameToId.get(ch.parentName) : undefined,
        permissionOverwrites,
        reason: 'Server backup restore',
      });
    } catch (err) {
      console.error(`[backup] Failed to recreate channel "${ch.name}":`, err);
    }
  }
}

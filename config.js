import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function extractId(value) {
  if (!value) return null;
  const match = value.match(/\d{15,25}/);
  return match ? match[0] : null;
}

function optionalIdList(name) {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(',')
    .map((v) => extractId(v))
    .filter(Boolean);
}

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: extractId(process.env.CLIENT_ID) ?? required('CLIENT_ID'),
  guildId: extractId(process.env.GUILD_ID),
  staffIds: optionalIdList('STAFF_IDS'),
  ownerIds: optionalIdList('OWNER_IDS'),
};


if (/["']/.test(config.token)) {
  throw new Error('[config] DISCORD_TOKEN looks like it has quotes in it — remove them from .env');
}

if (config.staffIds.length === 0 && config.ownerIds.length === 0) {
  console.warn('[config] No STAFF_IDS or OWNER_IDS configured — nobody will be able to use this bot until you set at least one.');
} else {
  console.log(`[config] Staff: ${config.staffIds.join(', ') || '(none)'} | Owners: ${config.ownerIds.join(', ') || '(none)'}`);
}

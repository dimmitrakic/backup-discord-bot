import { Client, GatewayIntentBits, Collection, MessageFlags, REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// --- Load commands ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const { default: command } = await import(pathToFileURL(path.join(commandsPath, file)));
  if (command?.data && command?.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[commands] Skipping ${file} — missing "data" or "execute" export.`);
  }
}

// --- Register commands with Discord automatically on every startup ---
// This means you never need a separate deploy step, and it also clears out
// any stale commands left behind by old bot code.
async function syncCommands() {
  const rest = new REST().setToken(config.token);
  const commands = [...client.commands.values()].map((c) => c.data.toJSON());

  try {
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`[commands] Synced ${commands.length} command(s) to guild ${config.guildId}.`);
      // Wipe any leftover GLOBAL commands from a previous setup.
      await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log(`[commands] Synced ${commands.length} command(s) globally (may take up to an hour to update everywhere).`);
    }
  } catch (err) {
    console.error('[commands] Failed to sync commands with Discord:', err);
  }
}

// --- Ready ---
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}. Serving ${client.guilds.cache.size} guild(s).`);
});

// --- Slash command handling ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[commands] Error running /${interaction.commandName}:`, err);

    // Never leak internal error details/stack traces to end users.
    const payload = { content: '❌ Something went wrong running that command.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// --- Never crash silently, never leak secrets in crash logs ---
process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception:', err);
});

await syncCommands();
client.login(config.token);

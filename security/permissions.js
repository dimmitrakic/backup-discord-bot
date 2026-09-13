import { MessageFlags } from 'discord.js';
import { config } from '../config.js';

export function isOwner(userId) {
  return config.ownerIds.includes(userId);
}

export function isStaff(userId) {
  return isOwner(userId) || config.staffIds.includes(userId);
}

export async function requireStaff(interaction) {
  if (!isStaff(interaction.user.id)) {
    await interaction.reply({
      content: '🚫 You don\'t have permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}

export async function requireOwner(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({
      content: '🚫 This command is restricted to the bot owner(s).',
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}

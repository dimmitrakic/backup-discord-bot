import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { requireStaff, requireOwner } from '../security/permissions.js';
import { createBackup, listBackups, loadBackup, restoreBackup } from '../backup/backupManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription("Back up or restore the server's channels and roles.")
    .addSubcommand((sub) => sub.setName('create').setDescription('Create a new backup of all roles and channels'))
    .addSubcommand((sub) => sub.setName('list').setDescription('List available backups'))
    .addSubcommand((sub) =>
      sub
        .setName('restore')
        .setDescription('Restore a backup — recreates anything missing (owner-only)')
        .addStringOption((opt) =>
          opt.setName('filename').setDescription('Backup filename from /backup list (defaults to latest)').setRequired(false),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!(await requireStaff(interaction))) return;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const filename = await createBackup(interaction.guild);
      await interaction.editReply(`✅ Backup created: \`${filename}\``);
      console.log(`[backup] Created by ${interaction.user.tag} (${interaction.user.id}) | File: ${filename}`);
      return;
    }

    if (sub === 'list') {
      if (!(await requireStaff(interaction))) return;
      const backups = listBackups(interaction.guild.id);
      if (backups.length === 0) {
        await interaction.reply({ content: 'No backups found. Run `/backup create` first.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply({
        content: `Available backups (most recent first):\n${backups
          .slice(0, 15)
          .map((f) => `\`${f}\``)
          .join('\n')}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'restore') {
      if (!(await requireOwner(interaction))) return;

      const filenameOption = interaction.options.getString('filename');
      const backups = listBackups(interaction.guild.id);
      const filename = filenameOption ?? backups[0];

      if (!filename) {
        await interaction.reply({ content: '❌ No backups found. Run `/backup create` first.', flags: MessageFlags.Ephemeral });
        return;
      }

      const backup = loadBackup(interaction.guild.id, filename);
      if (!backup) {
        await interaction.reply({ content: `❌ Backup \`${filename}\` not found.`, flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply(
        `⏳ Restoring from \`${filename}\`... this recreates any MISSING roles/channels (existing ones with the same name are left alone) and can take a while on larger servers.`,
      );

      await restoreBackup(interaction.guild, backup);

      await interaction.followUp({
        content: '✅ Restore complete. Check the server and re-order roles/channels if needed.',
        flags: MessageFlags.Ephemeral,
      });

      console.log(`[backup] Restored by ${interaction.user.tag} (${interaction.user.id}) | File: ${filename}`);
      return;
    }
  },
};

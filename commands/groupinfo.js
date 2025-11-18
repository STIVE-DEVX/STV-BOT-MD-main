async function groupInfoCommand(sock, chatId, msg) {
    try {
        // Récupérer les infos du groupe
        const groupMetadata = await sock.groupMetadata(chatId);

        // Photo du groupe
        let pp;
        try {
            pp = await sock.profilePictureUrl(chatId, 'image');
        } catch {
            pp = 'https://i.imgur.com/2wzGhpF.jpeg'; // Image par défaut
        }

        // Participants & Admins
        const participants = groupMetadata.participants;
        const groupAdmins = participants.filter(p => p.admin);
        const adminList = groupAdmins
            .map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`)
            .join('\n');

        // Déterminer le propriétaire du groupe
        let owner =
            groupMetadata.owner ||
            groupAdmins.find(p => p.admin === 'superadmin')?.id ||
            `${chatId.split('-')[0]}@s.whatsapp.net`;

        // Description du groupe
        const groupDesc =
            groupMetadata.desc?.toString() || 'Aucune description disponible.';

        // Message final
        const text = `
┌──「 *ℹ️ INFORMATIONS DU GROUPE* 」
│
▢ *🆔 ID du groupe :*
   • ${groupMetadata.id}
│
▢ *🏷️ Nom du groupe :*
   • ${groupMetadata.subject}
│
▢ *👥 Nombre de membres :*
   • ${participants.length}
│
▢ *👑 Propriétaire du groupe :*
   • @${owner.split('@')[0]}
│
▢ *🛡️ Administrateurs :*
${adminList || '   • Aucun administrateur trouvé'}
│
▢ *📝 Description :*
   • ${groupDesc}
└─────────────────────────
`.trim();

        // Mentionner tous les admins + owner
        const mentions = [...groupAdmins.map(v => v.id), owner];

        // Envoi du message
        await sock.sendMessage(chatId, {
            image: { url: pp },
            caption: text,
            mentions
        });

    } catch (error) {
        console.error('Erreur dans groupinfo :', error);

        await sock.sendMessage(chatId, {
            text: '❌ Impossible de récupérer les informations du groupe.'
        });
    }
}

module.exports = groupInfoCommand;
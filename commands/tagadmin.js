const isAdmin = require('../lib/stvAdmin');

async function tagNotAdminCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '⚠️ Le bot doit être admin pour utiliser cette commande.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Seuls les administrateurs peuvent utiliser la commande .tagnotadmin.' }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        const nonAdmins = participants.filter(p => !p.admin).map(p => p.id);

        if (nonAdmins.length === 0) {
            await sock.sendMessage(chatId, { text: '😊 Tous les membres sont admins, aucun membre non-admin à taguer.' }, { quoted: message });
            return;
        }

        let txt = '🔊 *Mention des membres non-admins :*\n\n';
        nonAdmins.forEach(jid => {
            txt += `@${jid.split('@')[0]}\n`;
        });

        await sock.sendMessage(chatId, { text: txt, mentions: nonAdmins }, { quoted: message });

    } catch (error) {
        console.error('Erreur dans tagnotadmin:', error);
        await sock.sendMessage(chatId, { text: '❌ Erreur lors de la mention des non-admins.' }, { quoted: message });
    }
}

module.exports = tagNotAdminCommand;
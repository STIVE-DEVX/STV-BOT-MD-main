const isAdmin = require('../lib/stvAdmin');

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '⚠️ Le bot doit être admin pour utiliser .tagall.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Seuls les administrateurs peuvent utiliser la commande .tagall.' }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: '⚠️ Aucun participant trouvé dans ce groupe.' }, { quoted: message });
            return;
        }

        let txt = '🔊 *Mention de tous les membres :*\n\n';
        participants.forEach(p => {
            txt += `@${p.id.split('@')[0]}\n`;
        });

        await sock.sendMessage(chatId, {
            text: txt,
            mentions: participants.map(p => p.id)
        });

    } catch (error) {
        console.error('Erreur dans tagall:', error);
        await sock.sendMessage(chatId, { text: '❌ Impossible de mentionner tous les membres.' });
    }
}

module.exports = tagAllCommand;
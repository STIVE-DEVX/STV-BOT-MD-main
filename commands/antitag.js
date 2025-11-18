const { setAntitag, getAntitag, removeAntitag } = require('../lib/index');
const isAdmin = require('../lib/stvAdmin');

async function handleAntitagCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```Réservé aux admins du groupe !```' }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`CONFIG ANTITAG

${prefix}antitag on        → Activer
${prefix}antitag set delete | kick
${prefix}antitag off       → Désactiver
\`\`\``;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existing = await getAntitag(chatId, 'on');
                if (existing?.enabled) {
                    await sock.sendMessage(chatId, { text: '*L’antitag est déjà activé.*' }, { quoted: message });
                    return;
                }
                const activated = await setAntitag(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: activated ? '*Antitag activé*' : '*Échec d’activation de l’antitag*' 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*Antitag désactivé*' }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*Choisissez delete ou kick*\nExemple : ${prefix}antitag set delete` 
                    }, { quoted: message });
                    return;
                }
                const mode = args[1];
                if (!['delete', 'kick'].includes(mode)) {
                    await sock.sendMessage(chatId, { 
                        text: '*Action invalide. Choisissez delete ou kick.*' 
                    }, { quoted: message });
                    return;
                }
                const updated = await setAntitag(chatId, 'on', mode);
                await sock.sendMessage(chatId, { 
                    text: updated ? `*Action antitag réglée sur ${mode}*` : '*Impossible de modifier l’action*' 
                }, { quoted: message });
                break;

            case 'get':
                const status = await getAntitag(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*Configuration Antitag :*\nStatut : ${status ? 'ON' : 'OFF'}\nAction : ${status?.action || 'Aucune'}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*Utilisez ${prefix}antitag pour voir les options.*` }, { quoted: message });
        }
    } catch (error) {
        console.error('Erreur antitag command:', error);
        await sock.sendMessage(chatId, { text: '*Erreur lors du traitement de la commande antitag*' }, { quoted: message });
    }
}


async function handleTagDetection(sock, chatId, message, senderId) {
    try {
        const config = await getAntitag(chatId, 'on');
        if (!config || !config.enabled) return;

        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        const msgText = (
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            ''
        );

        const textMentions = msgText.match(/@[\d+\s\-()~.]+/g) || [];
        const numericMentions = msgText.match(/@\d{10,}/g) || [];

        const uniqueNumbers = new Set();
        numericMentions.forEach(m => {
            const found = m.match(/@(\d+)/);
            if (found) uniqueNumbers.add(found[1]);
        });

        const countRealMentions = mentionedJids.length;
        const countNumeric = uniqueNumbers.size;

        const total = Math.max(countRealMentions, countNumeric);

        if (total >= 3) {
            const meta = await sock.groupMetadata(chatId);
            const participants = meta.participants || [];
            const threshold = Math.ceil(participants.length * 0.5);

            const numericFlood = countNumeric >= 10 || (countNumeric >= 5 && countNumeric >= threshold);

            if (total >= threshold || numericFlood) {
                const action = config.action || 'delete';

                if (action === 'delete') {
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });

                    await sock.sendMessage(chatId, { text: '⚠️ *Tagall détecté — message supprimé.*' }, { quoted: message });
                } 
                
                else if (action === 'kick') {
                    await sock.sendMessage(chatId, {
                        delete: {
                            remoteJid: chatId,
                            fromMe: false,
                            id: message.key.id,
                            participant: senderId
                        }
                    });

                    await sock.groupParticipantsUpdate(chatId, [senderId], "remove");

                    await sock.sendMessage(chatId, {
                        text: `🚫 *Tagall détecté !*\n@${senderId.split('@')[0]} a été expulsé.`,
                        mentions: [senderId]
                    }, { quoted: message });
                }
            }
        }

    } catch (error) {
        console.error('Erreur détection tag:', error);
    }
}

module.exports = {
    handleAntitagCommand,
    handleTagDetection
};
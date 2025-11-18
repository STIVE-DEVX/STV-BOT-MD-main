const { setAntiBadword, getAntiBadword, removeAntiBadword, incrementWarningCount, resetWarningCount } = require('../lib/index');
const fs = require('fs');
const path = require('path');

// Charger la configuration antibadword
function loadAntibadwordConfig(groupId) {
    try {
        const configPath = path.join(__dirname, '../data/userGroupData.json');
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const data = JSON.parse(fs.readFileSync(configPath));
        return data.antibadword?.[groupId] || {};
    } catch (error) {
        console.error('❌ Erreur lors du chargement de la configuration antibadword :', error.message);
        return {};
    }
}

async function handleAntiBadwordCommand(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `*CONFIGURATION ANTIBADWORD*\n\n*.antibadword on*\nActiver l’antibadword\n\n*.antibadword set <action>*\nAction : delete / kick / warn\n\n*.antibadword off*\nDésactiver l’antibadword dans ce groupe`
        }, { quoted: message });
    }

    if (match === 'on') {
        const existingConfig = await getAntiBadword(chatId, 'on');
        if (existingConfig?.enabled) {
            return sock.sendMessage(chatId, { text: '*L’antibadword est déjà activé dans ce groupe*' });
        }
        await setAntiBadword(chatId, 'on', 'delete');
        return sock.sendMessage(chatId, { text: '*Antibadword activé ✔️ — utilisez .antibadword set <action> pour configurer l’action*' }, { quoted: message });
    }

    if (match === 'off') {
        const config = await getAntiBadword(chatId, 'on');
        if (!config?.enabled) {
            return sock.sendMessage(chatId, { text: '*L’antibadword est déjà désactivé dans ce groupe*' }, { quoted: message });
        }
        await removeAntiBadword(chatId);
        return sock.sendMessage(chatId, { text: '*Antibadword désactivé pour ce groupe*' }, { quoted: message });
    }

    if (match.startsWith('set')) {
        const action = match.split(' ')[1];
        if (!action || !['delete', 'kick', 'warn'].includes(action)) {
            return sock.sendMessage(chatId, { text: '*Action invalide. Choisissez : delete, kick ou warn*' }, { quoted: message });
        }
        await setAntiBadword(chatId, 'on', action);
        return sock.sendMessage(chatId, { text: `*Action antibadword définie sur : ${action}*` }, { quoted: message });
    }

    return sock.sendMessage(chatId, { text: '*Commande invalide. Utilisez .antibadword pour voir l’aide.*' }, { quoted: message });
}

async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
    const config = loadAntibadwordConfig(chatId);
    if (!config.enabled) return;

    if (!chatId.endsWith('@g.us')) return;
    if (message.key.fromMe) return;

    const antiBadwordConfig = await getAntiBadword(chatId, 'on');
    if (!antiBadwordConfig?.enabled) {
        console.log('Antibadword pas activé');
        return;
    }

    const cleanMessage = userMessage.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const badWords = [ /* liste complète inchangée */ ];

    const messageWords = cleanMessage.split(' ');
    let containsBadWord = false;

    for (const word of messageWords) {
        if (word.length < 2) continue;

        if (badWords.includes(word)) {
            containsBadWord = true;
            break;
        }

        for (const badWord of badWords) {
            if (badWord.includes(' ') && cleanMessage.includes(badWord)) {
                containsBadWord = true;
                break;
            }
        }
        if (containsBadWord) break;
    }

    if (!containsBadWord) return;

    const groupMetadata = await sock.groupMetadata(chatId);
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = groupMetadata.participants.find(p => p.id === botId);
    if (!bot?.admin) return;

    const participant = groupMetadata.participants.find(p => p.id === senderId);
    if (participant?.admin) return;

    try {
        await sock.sendMessage(chatId, { delete: message.key });
    } catch (err) {
        console.error('Erreur suppression message :', err);
        return;
    }

    switch (antiBadwordConfig.action) {
        case 'delete':
            await sock.sendMessage(chatId, {
                text: `*@${senderId.split('@')[0]} les insultes sont interdites ici !*`,
                mentions: [senderId]
            });
            break;

        case 'kick':
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} a été expulsé pour avoir utilisé des mots interdits.*`,
                    mentions: [senderId]
                });
            } catch (error) {
                console.error('Erreur kick :', error);
            }
            break;

        case 'warn':
            const warningCount = await incrementWarningCount(chatId, senderId);
            if (warningCount >= 3) {
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    await resetWarningCount(chatId, senderId);
                    await sock.sendMessage(chatId, {
                        text: `*@${senderId.split('@')[0]} expulsé après 3 avertissements.*`,
                        mentions: [senderId]
                    });
                } catch (error) {
                    console.error('Erreur kick après avertissements :', error);
                }
            } else {
                await sock.sendMessage(chatId, {
                    text: `*@${senderId.split('@')[0]} avertissement ${warningCount}/3*`,
                    mentions: [senderId]
                });
            }
            break;
    }
}

module.exports = {
    handleAntiBadwordCommand,
    handleBadwordDetection
};
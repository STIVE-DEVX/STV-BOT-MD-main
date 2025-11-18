const isAdmin = require('../lib/stvAdmin');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function downloadMediaMessage(message, mediaType) {
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const filePath = path.join(tempDir, `${Date.now()}.${mediaType}`);
    fs.writeFileSync(filePath, buffer);

    return filePath;
}

async function hideTagCommand(sock, chatId, senderId, messageText, replyMessage, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❗ Le bot doit être administrateur pour exécuter cette commande.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❗ Seuls les administrateurs peuvent utiliser *~.hidetag*.' }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        // Liste des membres non-admins
        const nonAdmins = participants
            .filter(p => !p.admin)
            .map(p => p.id);

        let content = {};

        // Si le message répond à un média
        if (replyMessage) {

            if (replyMessage.imageMessage) {
                const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image');
                content = {
                    image: { url: filePath },
                    caption: messageText || replyMessage.imageMessage.caption || '',
                    mentions: nonAdmins
                };
            }

            else if (replyMessage.videoMessage) {
                const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video');
                content = {
                    video: { url: filePath },
                    caption: messageText || replyMessage.videoMessage.caption || '',
                    mentions: nonAdmins
                };
            }

            else if (replyMessage.documentMessage) {
                const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document');
                content = {
                    document: { url: filePath },
                    fileName: replyMessage.documentMessage.fileName,
                    caption: messageText || '',
                    mentions: nonAdmins
                };
            }

            else if (replyMessage.conversation) {
                content = {
                    text: replyMessage.conversation,
                    mentions: nonAdmins
                };
            }

            else if (replyMessage.extendedTextMessage) {
                content = {
                    text: replyMessage.extendedTextMessage.text,
                    mentions: nonAdmins
                };
            }

            if (Object.keys(content).length > 0) {
                await sock.sendMessage(chatId, content);
            }
        }

        // Si aucun média n'est répondu → message simple
        else {
            await sock.sendMessage(chatId, {
                text: messageText || 'Tag envoyé aux membres (hors admins).',
                mentions: nonAdmins
            });
        }

    } catch (err) {
        console.error('Erreur dans .hidetag :', err);
        await sock.sendMessage(chatId, { text: '❌ Une erreur est survenue lors du hide tag.' });
    }
}

module.exports = hideTagCommand;
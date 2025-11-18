const isAdmin = require('../lib/stvAdmin');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Téléchargement de médias
async function downloadMediaMessage(message, mediaType) {
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    const filePath = path.join(__dirname, '../temp/', `${Date.now()}.${mediaType}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

// Commande tag normale
async function tagCommand(sock, chatId, senderId, messageText, replyMessage, message) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: '⚠️ Le bot doit être admin pour utiliser cette commande.' }, { quoted: message });
        return;
    }

    if (!isSenderAdmin) {
        // Sticker anti-spam si non-admin essaie
        const stickerPath = './assets/sticktag.webp';
        if (fs.existsSync(stickerPath)) {
            const stickerBuffer = fs.readFileSync(stickerPath);
            await sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: message });
        }
        return;
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = groupMetadata.participants;
    const mentionedJidList = participants.map(p => p.id);

    // Si la commande répond à un message
    if (replyMessage) {
        let msgContent = {};

        if (replyMessage.imageMessage) {
            const filePath = await downloadMediaMessage(replyMessage.imageMessage, 'image');
            msgContent = {
                image: { url: filePath },
                caption: messageText || replyMessage.imageMessage.caption || '',
                mentions: mentionedJidList
            };
        } 
        
        else if (replyMessage.videoMessage) {
            const filePath = await downloadMediaMessage(replyMessage.videoMessage, 'video');
            msgContent = {
                video: { url: filePath },
                caption: messageText || replyMessage.videoMessage.caption || '',
                mentions: mentionedJidList
            };
        }

        else if (replyMessage.conversation || replyMessage.extendedTextMessage) {
            msgContent = {
                text: replyMessage.conversation || replyMessage.extendedTextMessage.text,
                mentions: mentionedJidList
            };
        }

        else if (replyMessage.documentMessage) {
            const filePath = await downloadMediaMessage(replyMessage.documentMessage, 'document');
            msgContent = {
                document: { url: filePath },
                fileName: replyMessage.documentMessage.fileName,
                caption: messageText || '',
                mentions: mentionedJidList
            };
        }

        if (Object.keys(msgContent).length > 0) {
            await sock.sendMessage(chatId, msgContent);
        }

    } else {
        await sock.sendMessage(chatId, {
            text: messageText || '👥 Voici la mention du groupe :',
            mentions: mentionedJidList
        });
    }
}

module.exports = tagCommand;
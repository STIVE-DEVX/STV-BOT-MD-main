const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const webp = require('node-webpmux');
const crypto = require('crypto');

async function takeCommand(sock, chatId, message, args) {
    try {
        // Vérifier si l’utilisateur répond à un sticker
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted?.stickerMessage) {
            await sock.sendMessage(chatId, { 
                text: '❌ Réponds à un sticker avec :\n\n.take <nom_du_pack>' 
            });
            return;
        }

        // Récupérer le nom du pack ou utiliser le nom par défaut
        const packname = args.join(' ') || 'STV BOT MD';

        try {
            // Télécharger le sticker
            const stickerBuffer = await downloadMediaMessage(
                {
                    key: message.message.extendedTextMessage.contextInfo.stanzaId,
                    message: quoted,
                    messageType: 'stickerMessage'
                },
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!stickerBuffer) {
                await sock.sendMessage(chatId, { text: '❌ Impossible de télécharger le sticker.' });
                return;
            }

            // Charger le sticker avec webpmux
            const img = new webp.Image();
            await img.load(stickerBuffer);

            // Créer les métadonnées EXIF
            const json = {
                'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
                'sticker-pack-name': packname,
                'emojis': ['🔥']
            };

            const exifHeader = Buffer.from([
                0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
                0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x16, 0x00, 0x00, 0x00
            ]);

            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
            const exif = Buffer.concat([exifHeader, jsonBuffer]);

            exif.writeUIntLE(jsonBuffer.length, 14, 4);

            // Appliquer les métadonnées
            img.exif = exif;

            // Exporter le sticker final
            const finalBuffer = await img.save(null);

            // Envoyer le nouveau sticker
            await sock.sendMessage(chatId, { 
                sticker: finalBuffer 
            }, { quoted: message });

        } catch (error) {
            console.error('Erreur lors du traitement du sticker :', error);
            await sock.sendMessage(chatId, { text: '❌ Une erreur est survenue lors du traitement du sticker.' });
        }

    } catch (error) {
        console.error('Erreur dans la commande take :', error);
        await sock.sendMessage(chatId, { text: '❌ Une erreur interne est survenue.' });
    }
}

module.exports = takeCommand;
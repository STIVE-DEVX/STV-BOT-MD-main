const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');
const webp = require('node-webpmux');
const crypto = require('crypto');

async function stickerCommand(sock, chatId, message) {
    const messageToQuote = message;
    let targetMessage = message;

    // If user replied to media
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedInfo = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: {
                remoteJid: chatId,
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant
            },
            message: quotedInfo.quotedMessage
        };
    }

    // Detect media
    const mediaMessage =
        targetMessage.message?.imageMessage ||
        targetMessage.message?.videoMessage ||
        targetMessage.message?.documentMessage;

    if (!mediaMessage) {
        await sock.sendMessage(chatId, {
            text: 'Veuillez répondre à une image/vidéo avec *.sticker* ou envoyer une image/vidéo avec *.sticker* en légende.',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'STV BOT MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: messageToQuote });
        return;
    }

    try {
        // Download
        const mediaBuffer = await downloadMediaMessage(
            targetMessage,
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );

        if (!mediaBuffer) {
            await sock.sendMessage(chatId, {
                text: 'Impossible de télécharger le média. Réessayez.',
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'STV BOT MD',
                        serverMessageId: -1
                    }
                }
            });
            return;
        }

        // Prepare temp files
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const tempInput = path.join(tmpDir, `temp_${Date.now()}`);
        const tempOutput = path.join(tmpDir, `sticker_${Date.now()}.webp`);
        fs.writeFileSync(tempInput, mediaBuffer);

        const isAnimated =
            mediaMessage.mimetype?.includes('gif') ||
            mediaMessage.mimetype?.includes('video') ||
            mediaMessage.seconds > 0;

        // FFmpeg command
        const ffmpegCommand = isAnimated
            ? `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`
            : `ffmpeg -i "${tempInput}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 -compression_level 6 "${tempOutput}"`;

        // Execute
        await new Promise((resolve, reject) => {
            exec(ffmpegCommand, (err) => err ? reject(err) : resolve());
        });

        let webpBuffer = fs.readFileSync(tempOutput);

        // Insert sticker metadata (EXIF)
        const img = new webp.Image();
        await img.load(webpBuffer);

        const json = {
            "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
            "sticker-pack-name": settings.packname || "STV BOT MD",
            "emojis": ["🛰️"] // emoji modifié
        };

        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2A, 0x00,
            0x08, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x41, 0x57,
            0x07, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x16, 0x00,
            0x00, 0x00
        ]);

        const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([exifAttr, jsonBuffer]);
        exif.writeUIntLE(jsonBuffer.length, 14, 4);

        img.exif = exif;
        const finalBuffer = await img.save(null);

        // Send sticker
        await sock.sendMessage(chatId, { sticker: finalBuffer }, { quoted: messageToQuote });

        // Cleanup
        fs.unlinkSync(tempInput);
        fs.unlinkSync(tempOutput);

    } catch (e) {
        console.error(e);
        await sock.sendMessage(chatId, {
            text: "Erreur lors de la création du sticker.",
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'STV BOT MD',
                    serverMessageId: -1
                }
            }
        });
    }
}

module.exports = stickerCommand;
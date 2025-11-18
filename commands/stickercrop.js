// stickercrop.js
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const webp = require('node-webpmux');
const crypto = require('crypto');
const settings = require('../settings');

async function stickercropCommand(sock, chatId, message) {
    const messageToQuote = message;

    let targetMessage = message;
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const q = message.message.extendedTextMessage.contextInfo;
        targetMessage = {
            key: { remoteJid: chatId, id: q.stanzaId, participant: q.participant },
            message: q.quotedMessage
        };
    }

    const mediaMessage = targetMessage.message?.imageMessage || targetMessage.message?.videoMessage || targetMessage.message?.stickerMessage || targetMessage.message?.documentMessage;
    if (!mediaMessage) {
        await sock.sendMessage(chatId, { text: '⚠️ Répondez à une image/vidéo/autocollant avec .crop.' }, { quoted: messageToQuote });
        return;
    }

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tempInput = path.join(tmpDir, `crop_in_${Date.now()}`);
    const tempOutput = path.join(tmpDir, `crop_out_${Date.now()}.webp`);

    try {
        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
        if (!mediaBuffer || !mediaBuffer.length) throw new Error('Téléchargement impossible');

        fs.writeFileSync(tempInput, mediaBuffer);

        const mimetype = mediaMessage.mimetype || '';
        const isAnimated = mimetype.includes('gif') || mimetype.includes('video') || (mediaMessage.seconds && mediaMessage.seconds > 0);
        const fileSizeKB = mediaBuffer.length / 1024;
        const isLargeFile = fileSizeKB > 5000;

        let ffmpegCmd;
        if (isAnimated) {
            if (isLargeFile) {
                ffmpegCmd = `ffmpeg -y -i "${tempInput}" -t 2 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=8" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 30 -b:v 100k "${tempOutput}"`;
            } else {
                ffmpegCmd = `ffmpeg -y -i "${tempInput}" -t 3 -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,fps=12" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 50 -b:v 150k "${tempOutput}"`;
            }
        } else {
            ffmpegCmd = `ffmpeg -y -i "${tempInput}" -vf "crop=min(iw\\,ih):min(iw\\,ih),scale=512:512,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 "${tempOutput}"`;
        }

        await runCmd(ffmpegCmd);

        if (!fs.existsSync(tempOutput)) throw new Error('FFmpeg n’a pas créé le fichier de sortie');

        let webpBuffer = fs.readFileSync(tempOutput);

        // Si > ~1MB on laisse mais on avertit en log, tentative de réduction déjà faite
        if (webpBuffer.length > 1000 * 1024) {
            console.warn('Sticker final > 1MB, envoi quand même (peut échouer selon WhatsApp)');
        }

        // Ajouter métadonnées
        const img = new webp.Image();
        await img.load(webpBuffer);

        const meta = {
            'sticker-pack-id': crypto.randomBytes(16).toString('hex'),
            'sticker-pack-name': settings.packname || 'STV BOT MD',
            'emojis': settings.stickerEmoji ? [settings.stickerEmoji] : ['✂️']
        };

        const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
        const jsonBuf = Buffer.from(JSON.stringify(meta), 'utf8');
        const exif = Buffer.concat([exifAttr, jsonBuf]);
        exif.writeUIntLE(jsonBuf.length, 14, 4);
        img.exif = exif;

        const finalBuffer = await img.save(null);

        await sock.sendMessage(chatId, { sticker: finalBuffer }, { quoted: messageToQuote });

    } catch (error) {
        console.error('Erreur stickercrop:', error);
        await sock.sendMessage(chatId, { text: '❌ Échec du recadrage. Essaie avec une autre image.' }, { quoted: messageToQuote });
    } finally {
        try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch {}
        try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch {}
    }
}

function runCmd(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve({ stdout, stderr });
        });
    });
}

module.exports = stickercropCommand;
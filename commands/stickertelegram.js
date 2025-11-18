// stickertelegram.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const webp = require('node-webpmux');
const settings = require('../settings');

const BOT_TOKEN = process.env.TG_BOT_TOKEN || ''; // Remplace par ton token si besoin

async function stickerTelegramCommand(sock, chatId, msg) {
    try {
        const text = msg.message?.conversation?.trim() || msg.message?.extendedTextMessage?.text?.trim() || '';
        const args = text.split(' ').slice(1);
        if (!args[0]) {
            await sock.sendMessage(chatId, { text: '⚠️ Indique l’URL du pack Telegram. Exemple: .tg https://t.me/addstickers/MonPack' }, { quoted: msg });
            return;
        }

        const url = args[0];
        if (!url.match(/https:\/\/t.me\/addstickers\/([A-Za-z0-9_]+)/)) {
            await sock.sendMessage(chatId, { text: "❌ URL invalide. Utilise un lien du type https://t.me/addstickers/NOM_DU_PACK" }, { quoted: msg });
            return;
        }

        if (!BOT_TOKEN) {
            await sock.sendMessage(chatId, { text: "❌ Token Telegram non configuré. Définis la variable d'environnement TG_BOT_TOKEN ou modifie le fichier." }, { quoted: msg });
            return;
        }

        const packName = url.replace('https://t.me/addstickers/', '').trim();
        // Récupère les stickers
        const getPack = `https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(packName)}`;
        const res = await fetch(getPack);
        if (!res.ok) throw new Error(`Telegram API erreur ${res.status}`);
        const pack = await res.json();
        if (!pack.ok || !pack.result) throw new Error('Pack introuvable');

        const stickers = pack.result.stickers || [];
        await sock.sendMessage(chatId, { text: `📦 Pack trouvé: ${pack.result.name} — ${stickers.length} autocollants. Téléchargement en cours...` }, { quoted: msg });

        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        let success = 0;
        for (let i = 0; i < stickers.length; i++) {
            try {
                const s = stickers[i];
                const fileInfoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${s.file_id}`);
                if (!fileInfoRes.ok) continue;
                const fileInfo = await fileInfoRes.json();
                const filePath = fileInfo.result?.file_path;
                if (!filePath) continue;

                const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
                const imgRes = await fetch(fileUrl);
                if (!imgRes.ok) continue;
                const buffer = await imgRes.buffer();

                const inPath = path.join(tmpDir, `tg_${Date.now()}_${i}`);
                const outPath = path.join(tmpDir, `tg_out_${Date.now()}_${i}.webp`);
                fs.writeFileSync(inPath, buffer);

                const isAnimated = s.is_animated || s.is_video;
                const ffmpegCmd = isAnimated
                    ? `ffmpeg -y -i "${inPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 "${outPath}"`
                    : `ffmpeg -y -i "${inPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba" -c:v libwebp -preset default -loop 0 -vsync 0 -pix_fmt yuva420p -quality 75 "${outPath}"`;

                await runCmd(ffmpegCmd);

                if (!fs.existsSync(outPath)) continue;
                const webpBuffer = fs.readFileSync(outPath);

                // Ajouter métadonnées
                const img = new webp.Image();
                await img.load(webpBuffer);
                const meta = {
                    'sticker-pack-id': crypto.randomBytes(16).toString('hex'),
                    'sticker-pack-name': settings.packname || 'STV BOT MD',
                    'emojis': s.emoji ? [s.emoji] : ['🤖']
                };
                const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
                const jsonBuf = Buffer.from(JSON.stringify(meta), 'utf8');
                const exif = Buffer.concat([exifAttr, jsonBuf]);
                exif.writeUIntLE(jsonBuf.length, 14, 4);
                img.exif = exif;
                const finalBuf = await img.save(null);

                await sock.sendMessage(chatId, { sticker: finalBuf });
                success++;

                try { fs.unlinkSync(inPath); } catch {}
                try { fs.unlinkSync(outPath); } catch {}

                // petit délai pour éviter les limites
                await new Promise(r => setTimeout(r, 800));
            } catch (e) {
                console.error('Erreur traitement sticker Telegram:', e);
                continue;
            }
        }

        await sock.sendMessage(chatId, { text: `✅ Téléchargés ${success}/${stickers.length} autocollants.` }, { quoted: msg });

    } catch (error) {
        console.error('Erreur stickertelegram:', error);
        await sock.sendMessage(chatId, { text: '❌ Échec du traitement du pack Telegram. Vérifie l’URL / token.' }, { quoted: msg });
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

module.exports = stickerTelegramCommand;
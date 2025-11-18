const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// Vérifier si c’est un groupe et si l’utilisateur + bot sont admins
async function ensureGroupAndAdmin(sock, chatId, senderId) {
    const isGroup = chatId.endsWith('@g.us');
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: '❌ Cette commande ne peut être utilisée que dans un groupe.' });
        return { ok: false };
    }

    const isAdmin = require('../lib/stvAdmin');
    const adminStatus = await isAdmin(sock, chatId, senderId);

    if (!adminStatus.isBotAdmin) {
        await sock.sendMessage(chatId, { text: '❌ Le bot doit être administrateur pour utiliser cette commande.' });
        return { ok: false };
    }
    if (!adminStatus.isSenderAdmin) {
        await sock.sendMessage(chatId, { text: '❌ Seuls les administrateurs du groupe peuvent utiliser cette commande.' });
        return { ok: false };
    }

    return { ok: true };
}

// Modifier la description du groupe
async function setGroupDescription(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;

    const desc = (text || '').trim();
    if (!desc) {
        await sock.sendMessage(chatId, { text: '✏️ Utilisation : .setgdesc <nouvelle description>' }, { quoted: message });
        return;
    }

    try {
        await sock.groupUpdateDescription(chatId, desc);
        await sock.sendMessage(chatId, { text: '✅ Description du groupe mise à jour avec succès.' }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Impossible de modifier la description du groupe.' }, { quoted: message });
    }
}

// Modifier le nom du groupe
async function setGroupName(sock, chatId, senderId, text, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;

    const name = (text || '').trim();
    if (!name) {
        await sock.sendMessage(chatId, { text: '✏️ Utilisation : .setgname <nouveau nom>' }, { quoted: message });
        return;
    }

    try {
        await sock.groupUpdateSubject(chatId, name);
        await sock.sendMessage(chatId, { text: '✅ Nom du groupe mis à jour avec succès.' }, { quoted: message });
    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Impossible de modifier le nom du groupe.' }, { quoted: message });
    }
}

// Modifier la photo du groupe
async function setGroupPhoto(sock, chatId, senderId, message) {
    const check = await ensureGroupAndAdmin(sock, chatId, senderId);
    if (!check.ok) return;

    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const img = quotedMsg?.imageMessage || quotedMsg?.stickerMessage;

    if (!img) {
        await sock.sendMessage(chatId, { text: '📸 Répondez à une *image* ou un *sticker* avec : .setgpp' }, { quoted: message });
        return;
    }

    try {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const stream = await downloadContentFromMessage(img, 'image');
        let buffer = Buffer.alloc(0);

        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const filePath = path.join(tmpDir, `gpp_${Date.now()}.jpg`);
        fs.writeFileSync(filePath, buffer);

        await sock.updateProfilePicture(chatId, { url: filePath });

        try { fs.unlinkSync(filePath); } catch {}

        await sock.sendMessage(chatId, { text: '✅ Photo de profil du groupe mise à jour avec succès.' }, { quoted: message });

    } catch (e) {
        await sock.sendMessage(chatId, { text: '❌ Impossible de changer la photo du groupe.' }, { quoted: message });
    }
}

module.exports = {
    setGroupDescription,
    setGroupName,
    setGroupPhoto
};
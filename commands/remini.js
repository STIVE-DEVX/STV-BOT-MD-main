const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { uploadImage } = require('../lib/uploadImage');

// Récupération image (quoted ou message direct)
async function getQuotedOrOwnImageUrl(sock, message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    // Image citée
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        const buffer = Buffer.concat(await streamToBuffer(stream));
        return await uploadImage(buffer);
    }

    // Image envoyée directement
    if (message.message?.imageMessage) {
        const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
        const buffer = Buffer.concat(await streamToBuffer(stream));
        return await uploadImage(buffer);
    }

    return null;
}

// Convertir flux en buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return chunks;
}

// Validation URL
function isValidUrl(str) {
    try { new URL(str); return true; }
    catch { return false; }
}

// Commande Remini
async function reminiCommand(sock, chatId, message, args) {
    try {
        let imageUrl = null;

        // URL fournie
        if (args.length > 0) {
            const url = args.join(' ');
            if (!isValidUrl(url)) {
                return sock.sendMessage(chatId, {
                    text: '❌ URL invalide.\n\nExemple : `.remini https://exemple.com/photo.jpg`'
                }, { quoted: message });
            }
            imageUrl = url;
        } else {
            imageUrl = await getQuotedOrOwnImageUrl(sock, message);
            if (!imageUrl) {
                return sock.sendMessage(chatId, {
                    text: '📸 *Commande Remini AI – Amélioration d’image*\n\nUtilisation :\n• `.remini <url>`\n• Répondre à une image avec `.remini`\n• Envoyer une image + `.remini`'
                }, { quoted: message });
            }
        }

        // API Remini
        const apiUrl = `https://api.princetechn.com/api/tools/remini?apikey=prince_tech_api_azfsbshfb&url=${encodeURIComponent(imageUrl)}`;

        const response = await axios.get(apiUrl, {
            timeout: 60000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.data?.success || !response.data?.result?.image_url) {
            throw new Error('Invalid API response');
        }

        // Télécharger image améliorée
        const enhanced = await axios.get(response.data.result.image_url, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        await sock.sendMessage(chatId, {
            image: enhanced.data,
            caption: '✨ *Image améliorée avec succès !*\n\n🔧 _Généré par STV BOT MD_'
        }, { quoted: message });

    } catch (err) {
        console.error('Erreur Remini :', err.message);

        let msg = '❌ Impossible d’améliorer cette image.';

        if (err.response?.status === 429) msg = '⏳ Trop de requêtes. Réessayez plus tard.';
        if (err.response?.status === 400) msg = '❌ Image invalide ou URL incorrecte.';
        if (err.response?.status === 500) msg = '🛠️ Erreur serveur Remini.';
        if (err.code === 'ECONNABORTED') msg = '⏰ La requête a expiré. Réessayez.';
        if (err.message.includes('ENOTFOUND')) msg = '🌐 Problème réseau.';
        
        await sock.sendMessage(chatId, { text: msg }, { quoted: message });
    }
}

module.exports = { reminiCommand };
const fetch = require('node-fetch');

async function handleSsCommand(sock, chatId, message, match) {
    if (!match) {
        await sock.sendMessage(chatId, {
            text: `🖼️ *OUTIL DE SCREENSHOT*\n\n`.trim() +
            `📌 Commandes :\n`.trim() +
            `• .ss <url>\n• .ssweb <url>\n• .screenshot <url>\n\n` +
            `Permet de capturer un screenshot de n'importe quel site.\n\n` +
            `Exemple :\n.ss https://google.com`,
            quoted: message
        });
        return;
    }

    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        const url = match.trim();

        if (!/^https?:\/\//i.test(url)) {
            return sock.sendMessage(chatId, {
                text: '❌ Veuillez fournir une URL valide commençant par http:// ou https://',
                quoted: message
            });
        }

        const apiUrl = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}&theme=light&device=desktop`;
        const response = await fetch(apiUrl, { headers: { 'accept': '*/*' } });

        if (!response.ok) {
            throw new Error(`Status: ${response.status}`);
        }

        const imageBuffer = await response.buffer();

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `📸 Screenshot de :\n${url}`
        }, { quoted: message });

    } catch (error) {
        console.error('❌ Erreur screenshot :', error);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de prendre une capture d’écran.\n\n*Causes possibles :*\n• URL invalide\n• Le site bloque les captures\n• Site hors service\n• API temporairement indisponible',
            quoted: message
        });
    }
}

module.exports = { handleSsCommand };
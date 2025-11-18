const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

async function ttsCommand(sock, chatId, text, message, language = 'en') {
    if (!text) {
        await sock.sendMessage(chatId, { text: 'Veuillez fournir un texte pour la conversion TTS.' });
        return;
    }

    const fileName = `tts-${Date.now()}.mp3`;
    const filePath = path.join(__dirname, '..', 'assets', fileName);

    const gtts = new gTTS(text, language);
    gtts.save(filePath, async function (err) {
        if (err) {
            await sock.sendMessage(chatId, { text: 'Erreur lors de la génération du fichier audio TTS.' });
            return;
        }

        await sock.sendMessage(chatId, {
            audio: { url: filePath },
            mimetype: 'audio/mpeg'
        }, { quoted: message });

        fs.unlinkSync(filePath);
    });
}

module.exports = ttsCommand;
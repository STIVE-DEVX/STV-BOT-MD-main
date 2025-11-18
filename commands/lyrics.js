const fetch = require('node-fetch');

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(
            chatId,
            { text: '🎵 Veuillez entrer le nom d’une chanson pour obtenir les paroles.\nExemple : *lyrics Shape of You*' },
            { quoted: message }
        );
        return;
    }

    try {
        // Appel API lyricsapi.fly.dev
        const apiUrl = `https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(songTitle)}`;
        const res = await fetch(apiUrl);

        if (!res.ok) {
            throw new Error(await res.text());
        }

        const data = await res.json();
        const lyrics = data?.result?.lyrics;

        if (!lyrics) {
            await sock.sendMessage(
                chatId,
                { text: `❌ Désolé, je n’ai trouvé aucune parole pour : *${songTitle}*.` },
                { quoted: message }
            );
            return;
        }

        // Gestion de la limite WhatsApp
        const maxChars = 4096;
        const output = lyrics.length > maxChars
            ? lyrics.slice(0, maxChars - 3) + '...'
            : lyrics;

        await sock.sendMessage(
            chatId,
            { text: `🎤 *Paroles de :* ${songTitle}\n\n${output}` },
            { quoted: message }
        );

    } catch (error) {
        console.error('Erreur dans lyricsCommand :', error);

        await sock.sendMessage(
            chatId,
            { text: `❌ Une erreur est survenue lors de la récupération des paroles pour : *${songTitle}*.` },
            { quoted: message }
        );
    }
}

module.exports = { lyricsCommand };
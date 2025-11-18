const axios = require('axios');

async function spotifyCommand(sock, chatId, message) {
    try {
        const rawText =
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const used = (rawText || '').split(/\s+/)[0] || '.spotify';
        const query = rawText.slice(used.length).trim();

        if (!query) {
            await sock.sendMessage(chatId, {
                text: '🎵 *Utilisation :*\n.spotifiy <titre/artiste/mots-clés>\n\nExemple :\n.spotify con calma'
            }, { quoted: message });
            return;
        }

        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(apiUrl, {
            timeout: 20000,
            headers: { 'user-agent': 'Mozilla/5.0' }
        });

        if (!data?.status || !data?.result) {
            throw new Error('Aucun résultat Spotify.');
        }

        const r = data.result;
        const audioUrl = r.audio;

        if (!audioUrl) {
            await sock.sendMessage(chatId, {
                text: '❌ Aucun audio téléchargeable trouvé pour ta recherche.',
            }, { quoted: message });
            return;
        }

        const caption = `🎵 *${r.title || r.name || 'Titre inconnu'}*\n👤 Artiste : ${r.artist || 'Inconnu'}\n⏱ Durée : ${r.duration || 'N/A'}\n🔗 Lien : ${r.url || ''}`;

        if (r.thumbnails) {
            await sock.sendMessage(chatId, {
                image: { url: r.thumbnails },
                caption
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text: caption }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName: `${(r.title || r.name || 'spotify_track').replace(/[\\/:*?"<>|]/g, '')}.mp3`
        }, { quoted: message });

    } catch (error) {
        console.error('[SPOTIFY] Erreur:', error?.message || error);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de récupérer l’audio Spotify. Réessaie plus tard.'
        }, { quoted: message });
    }
}

module.exports = spotifyCommand;
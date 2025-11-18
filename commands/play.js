const yts = require('yt-search');
const axios = require('axios');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "❓ *Quelle musique veux-tu télécharger ?*\nExemple : `.play shape of you`"
            });
        }

        // Recherche YouTube
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Aucun résultat trouvé pour ta recherche."
            });
        }

        const video = videos[0];

        // Vérification durée minimale 30 secondes
        if (video.seconds < 30) {
            return await sock.sendMessage(chatId, { 
                text: `⚠️ La vidéo trouvée est trop courte.\n⏳ *Durée minimale : 30 secondes*\nDurée trouvée : ${video.timestamp}`
            });
        }

        await sock.sendMessage(chatId, {
            text: "⏳ *Téléchargement en cours... veuillez patienter*"
        });

        const urlYt = video.url;

        // Téléchargement via API
        const response = await axios.get(`https://apis-keith.vercel.app/download/dlmp3?url=${urlYt}`);
        const data = response.data;

        if (!data || !data.status || !data.result || !data.result.downloadUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Impossible de récupérer l'audio. Réessaie plus tard."
            });
        }

        const audioUrl = data.result.downloadUrl;
        const title = data.result.title;

        // Envoi du fichier MP3
        await sock.sendMessage(
            chatId,
            {
                audio: { url: audioUrl },
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`
            },
            { quoted: message }
        );

    } catch (error) {
        console.error('Erreur play command :', error);
        await sock.sendMessage(chatId, { 
            text: "❌ Le téléchargement a échoué. Réessaie plus tard."
        });
    }
}

module.exports = playCommand;

/* Powered by STV BOT MD */
const { ttdl } = require("ruhend-scraper");
const axios = require('axios');

// Stocker les IDs déjà traités pour éviter les doublons
const processedMessages = new Set();

async function tiktokCommand(sock, chatId, message) {
    try {
        // Éviter double traitement
        if (processedMessages.has(message.key.id)) {
            return;
        }

        processedMessages.add(message.key.id);

        // Nettoyage après 5 min
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;

        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "Veuillez fournir un lien TikTok."
            });
        }

        // Extraction du lien
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "Veuillez fournir un lien TikTok valide."
            });
        }

        // Vérification des formats TikTok
        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\//,
            /https?:\/\/(?:vm\.)?tiktok\.com\//,
            /https?:\/\/(?:vt\.)?tiktok\.com\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/@/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\//
        ];

        const isValidUrl = tiktokPatterns.some(pattern => pattern.test(url));

        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ Lien TikTok invalide. Veuillez fournir un lien correct."
            });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        });

        try {
            // API SIPUTZX
            const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;

            let videoUrl = null;
            let audioUrl = null;
            let title = null;

            // Tentative API
            try {
                const response = await axios.get(apiUrl, { 
                    timeout: 15000,
                    headers: {
                        'accept': '*/*',
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                if (response.data && response.data.status && response.data.data) {
                    if (response.data.data.urls && Array.isArray(response.data.data.urls)) {
                        videoUrl = response.data.data.urls[0];
                        title = response.data.data.metadata?.title || "Vidéo TikTok";
                    } else if (response.data.data.video_url) {
                        videoUrl = response.data.data.video_url;
                        title = response.data.data.metadata?.title || "Vidéo TikTok";
                    } else {
                        throw new Error("Aucune URL vidéo trouvée dans la réponse API.");
                    }
                }
            } catch (apiError) {
                console.error(`Échec API Siputzx : ${apiError.message}`);
            }

            // Fallback ttdl si nécessaire
            if (!videoUrl) {
                try {
                    let downloadData = await ttdl(url);
                    if (downloadData?.data?.length > 0) {
                        const mediaData = downloadData.data;
                        for (let i = 0; i < Math.min(20, mediaData.length); i++) {
                            const media = mediaData[i];
                            const mediaUrl = media.url;

                            if (/\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || media.type === 'video') {
                                await sock.sendMessage(chatId, {
                                    video: { url: mediaUrl },
                                    mimetype: "video/mp4",
                                    caption: "📥 Téléchargé par STV-BOT-MD"
                                }, { quoted: message });
                            } else {
                                await sock.sendMessage(chatId, {
                                    image: { url: mediaUrl },
                                    caption: "📥 Téléchargé par STV-BOT-MD"
                                }, { quoted: message });
                            }
                        }
                        return;
                    }
                } catch (ttdlError) {
                    console.error("Échec ttdl :", ttdlError.message);
                }
            }

            // Si une URL est trouvée
            if (videoUrl) {
                try {
                    const videoResponse = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        maxContentLength: 100 * 1024 * 1024,
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Accept': 'video/mp4,video/*'
                        }
                    });

                    const videoBuffer = Buffer.from(videoResponse.data);

                    const caption = title
                        ? `📥 Téléchargé par STV-BOT-MD\n\n🎬 Titre : ${title}`
                        : "📥 Téléchargé par STV-BOT-MD";

                    await sock.sendMessage(chatId, {
                        video: videoBuffer,
                        mimetype: "video/mp4",
                        caption: caption
                    }, { quoted: message });

                    return;

                } catch (downloadError) {
                    console.error("Erreur téléchargement buffer :", downloadError.message);
                }
            }

            return await sock.sendMessage(chatId, { 
                text: "❌ Impossible de télécharger la vidéo TikTok. Réessaie plus tard."
            }, { quoted: message });

        } catch (error) {
            console.error('Erreur TikTok :', error);
            await sock.sendMessage(chatId, { 
                text: "Une erreur est survenue. Réessaie plus tard."
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Erreur commande TikTok :', error);
        await sock.sendMessage(chatId, { 
            text: "Erreur interne. Merci de réessayer."
        }, { quoted: message });
    }
}

module.exports = tiktokCommand;
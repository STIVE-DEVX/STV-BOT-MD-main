const { igdl } = require("ruhend-scraper");

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

// Extract unique media (simple deduplication)
function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();

    for (const media of mediaData) {
        if (!media.url) continue;

        if (!seenUrls.has(media.url)) {
            seenUrls.add(media.url);
            uniqueMedia.push(media);
        }
    }
    return uniqueMedia;
}

async function instagramCommand(sock, chatId, message) {
    try {
        // Prevent duplicate processing
        if (processedMessages.has(message.key.id)) return;
        processedMessages.add(message.key.id);

        // Auto-clean after 5 min
        setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

        // Extract text from message
        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        if (!text) {
            return await sock.sendMessage(chatId, {
                text: "⚠️ *Veuillez envoyer un lien Instagram valide.*"
            });
        }

        // Instagram URL patterns
        const instagramPatterns = [
            /https?:\/\/(?:www\.)?instagram\.com\//i,
            /https?:\/\/(?:www\.)?instagr\.am\//i,
            /instagram\.com\/(p|reel|tv)\//i
        ];

        const isValidUrl = instagramPatterns.some((pattern) => pattern.test(text));

        if (!isValidUrl) {
            return await sock.sendMessage(chatId, {
                text: "❌ *Le lien fourni n’est pas un lien Instagram valide.*"
            });
        }

        // React with loading
        await sock.sendMessage(chatId, {
            react: { text: "🔄", key: message.key }
        });

        // Fetch media info
        const downloadData = await igdl(text);

        if (!downloadData?.data?.length) {
            return await sock.sendMessage(chatId, {
                text: "❌ *Impossible de récupérer les médias. Le post est peut-être privé.*"
            });
        }

        // Remove duplicates
        const mediaList = extractUniqueMedia(downloadData.data).slice(0, 20);

        if (!mediaList.length) {
            return await sock.sendMessage(chatId, {
                text: "❌ *Aucun média exploitable trouvé.*"
            });
        }

        // Send each media
        for (let i = 0; i < mediaList.length; i++) {
            try {
                const media = mediaList[i];
                const url = media.url;

                const isVideo =
                    /\.(mp4|mov|avi|mkv|webm)$/i.test(url) ||
                    media.type === "video" ||
                    text.includes("/reel/") ||
                    text.includes("/tv/");

                if (isVideo) {
                    await sock.sendMessage(
                        chatId,
                        {
                            video: { url },
                            mimetype: "video/mp4",
                            caption: "📥 *Téléchargé par STV BOT MD*"
                        },
                        { quoted: message }
                    );
                } else {
                    await sock.sendMessage(
                        chatId,
                        {
                            image: { url },
                            caption: "📥 *Téléchargé par STV BOT MD*"
                        },
                        { quoted: message }
                    );
                }

                // Small delay to avoid flood
                if (i < mediaList.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 800));
                }
            } catch (err) {
                console.error(`Erreur en téléchargeant le média ${i + 1}:`, err);
                // Continue with next one
            }
        }
    } catch (err) {
        console.error("Erreur instagramCommand:", err);
        await sock.sendMessage(chatId, {
            text: "❌ *Une erreur interne est survenue. Réessayez ultérieurement.*"
        });
    }
}

module.exports = instagramCommand;
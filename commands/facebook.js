const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || 
                     message.message?.extendedTextMessage?.text;

        const url = text.split(" ").slice(1).join(" ").trim();

        // Vérification présence lien
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "Veuillez fournir un lien Facebook.\nExemple : .fb https://www.facebook.com/..."
            }, { quoted: message });
        }

        // Vérifier si c'est un lien Facebook
        if (!url.includes("facebook.com")) {
            return await sock.sendMessage(chatId, {
                text: "❌ Ceci n'est pas un lien Facebook valide."
            }, { quoted: message });
        }

        // Indiquer chargement
        await sock.sendMessage(chatId, {
            react: { text: "🔄", key: message.key }
        });

        // Résolution des liens courts
        let resolvedUrl = url;
        try {
            const res = await axios.get(url, {
                timeout: 20000,
                maxRedirects: 10,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const possible = res?.request?.res?.responseUrl;
            if (possible) resolvedUrl = possible;

        } catch { /* ignorer erreurs */ }

        // Fonction API Hanggts
        async function fetchFromApi(u) {
            const apiUrl = `https://api.hanggts.xyz/download/facebook?url=${encodeURIComponent(u)}`;
            
            try {
                const response = await axios.get(apiUrl, {
                    timeout: 20000,
                    maxRedirects: 5,
                    validateStatus: s => s >= 200 && s <= 500,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                if (response.data) return response.data;

            } catch (e) {
                console.log("Erreur API Hanggts:", e.message);
            }

            throw new Error("API non fonctionnelle");
        }

        // Essayer lien résolu puis original
        let data;
        try {
            data = await fetchFromApi(resolvedUrl);
        } catch {
            data = await fetchFromApi(url);
        }

        let fbvid = null;
        let title = "Vidéo Facebook";

        // Tentatives d'extraction
        const d = data;

        if (d.result?.media) {
            fbvid = d.result.media.video_hd || d.result.media.video_sd;
            title = d.result.info?.title || title;
        }

        if (!fbvid && d.result?.url) fbvid = d.result.url;
        if (!fbvid && d.url) fbvid = d.url;
        if (!fbvid && d.download) fbvid = d.download;
        if (!fbvid && d.video?.url) fbvid = d.video.url;

        if (!fbvid) {
            return await sock.sendMessage(chatId, {
                text: "❌ Impossible de récupérer la vidéo.\n\nCauses possibles :\n• Vidéo privée\n• Lien invalide\n• Non disponible"
            }, { quoted: message });
        }

        // Envoi via URL
        try {
            await sock.sendMessage(chatId, {
                video: { url: fbvid },
                mimetype: "video/mp4",
                caption: `🎬 *Vidéo Facebook*\n\nTitre : ${title}\n\nTéléchargé via STV BOT MD`
            }, { quoted: message });

            return;

        } catch (urlError) {
            console.log("Méthode URL échouée :", urlError.message);
        }

        // Méthode fallback → Télécharger en local
        try {
            const tmpDir = path.join(process.cwd(), "tmp");
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

            const filePath = path.join(tmpDir, `fb_${Date.now()}.mp4`);

            const videoResponse = await axios({
                url: fbvid,
                method: "GET",
                responseType: "stream",
                timeout: 60000
            });

            const writer = fs.createWriteStream(filePath);
            videoResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            // Envoi du fichier
            await sock.sendMessage(chatId, {
                video: { url: filePath },
                mimetype: "video/mp4",
                caption: `🎬 *Vidéo Facebook*\n\nTitre : ${title}\n\nTéléchargé via STV BOT MD`
            }, { quoted: message });

            // Supprimer fichier
            fs.unlinkSync(filePath);

        } catch (error) {
            console.error("Erreur finale :", error);
            await sock.sendMessage(chatId, {
                text: "❌ Erreur lors du téléchargement : " + error.message
            }, { quoted: message });
        }

    } catch (error) {
        console.error("Erreur Facebook :", error);
        await sock.sendMessage(chatId, {
            text: "❌ Une erreur s'est produite. Détails : " + error.message
        }, { quoted: message });
    }
}

module.exports = facebookCommand;
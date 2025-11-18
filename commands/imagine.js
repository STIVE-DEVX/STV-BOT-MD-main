const axios = require('axios');

async function imagineCommand(sock, chatId, message) {
    try {
        // Récupération correcte du texte
        let promptRaw =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            "";

        promptRaw = promptRaw.trim();

        // Extraction du prompt après ".imagine"
        const imagePrompt = promptRaw.replace(/^\.imagine/i, "").trim();

        if (!imagePrompt) {
            await sock.sendMessage(chatId, {
                text: "⚠️ *Veuillez entrer une description pour générer une image.*\nExemple :\n`.imagine un coucher de soleil futuriste`"
            }, { quoted: message });
            return;
        }

        // Message de traitement
        await sock.sendMessage(chatId, {
            text: "🎨 *Génération de votre image... Merci de patienter.*"
        }, { quoted: message });

        // Amélioration du prompt
        const enhancedPrompt = enhancePrompt(imagePrompt);

        // Requête API
        const url = `https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(enhancedPrompt)}`;

        const response = await axios.get(url, { responseType: "arraybuffer" });

        const imageBuffer = Buffer.from(response.data);

        // Envoi de l'image générée
        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `🎨 *Image générée pour :* "${imagePrompt}"`
        }, { quoted: message });

    } catch (error) {
        console.error("Error in imagineCommand:", error);

        await sock.sendMessage(chatId, {
            text: "❌ *Impossible de générer l’image pour le moment.*\nRéessayez plus tard."
        }, { quoted: message });
    }
}

// Amélioration automatique du prompt
function enhancePrompt(prompt) {
    const enhancements = [
        "high quality",
        "detailed",
        "masterpiece",
        "ultra realistic",
        "8k resolution",
        "sharp focus",
        "cinematic lighting",
        "professional photography",
        "hyper detailed textures"
    ];

    const selected = enhancements
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);

    return `${prompt}, ${selected.join(", ")}`;
}

module.exports = imagineCommand;
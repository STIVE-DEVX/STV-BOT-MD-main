const moment = require('moment-timezone');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function githubCommand(sock, chatId, message) {
    try {
        // Ton GitHub est vide → message personnalisé
        const githubUrl = "https://github.com/"; 
        const repoName = "Aucun dépôt disponible pour STV BOT MD";

        let txt = `*乂  STV BOT MD - GITHUB 乂*\n\n`;
        txt += `👤 *Créateur* : STIVO TECH\n`;
        txt += `📱 *Chaîne WhatsApp* : https://whatsapp.com/channel/0029Vb6nKuV8vd1M1iBlWe2l\n`;
        txt += `▶️ *YouTube* : https://youtube.com/@techstivo2\n\n`;

        txt += `📦 *Dépôt GitHub :*\n`;
        txt += `➤ ${repoName}\n`;
        txt += `➤ Lien : ${githubUrl}\n\n`;
        txt += `💡 *Astuce* : Ajoute un dépôt pour permettre l'installation du bot via GitHub.\n`;
        
        // Image locale
        const imgPath = path.join(__dirname, '../assets/bot_image.jpg');
        const imgBuffer = fs.readFileSync(imgPath);

        await sock.sendMessage(
            chatId, 
            { image: imgBuffer, caption: txt },
            { quoted: message }
        );

    } catch (error) {
        console.error("Erreur GitHub :", error);
        await sock.sendMessage(chatId, { 
            text: "❌ Une erreur est survenue lors de l'accès au dépôt GitHub." 
        }, { quoted: message });
    }
}

module.exports = githubCommand;
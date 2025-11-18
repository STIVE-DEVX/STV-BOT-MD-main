const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╔══════════════════════════════════╗
      🤖 *${settings.botName || 'STV BOT MD'}*
        Premium Cyber Edition
      Version : *${settings.version || '1.0'}*
      Créateur : *${settings.botOwner || 'STIVO TECH'}*
╚══════════════════════════════════╝

📌 *MENU DES COMMANDES*
────────────────────────────

╭─◆【 COMMANDES GÉNÉRALES 】◆─╮
│ • .menu – Affiche le menu
│ • .ping – Vérifie la vitesse
│ • .tts <texte> – Convertit en audio
│ • .attp <texte> – Sticker animé
│ • .lyrics <titre> – Paroles musique
│ • .groupinfo – Infos du groupe
│ • .vv – Voir l’ID utilisateur
│ • .trt <txt> <lang> – Traduction
│ • .jid – JID du message
│ • .url – Raccourcir un lien
╰────────────────────────────╯

╭─◆【 COMMANDES ADMIN 】◆─╮
│ • .promote / .demote @user  
│ • .mute / .unmute  
│ • .delete / .del  
│ • .kick @user  
│ • .warn / .warnings  
│ • .antilink / .antitag  
│ • .clear / .tag / .tagall  
│ • .welcome / .goodbye  
│ • .resetlink / .setgname  
│ • .setgpp (répondre à une image)  
╰────────────────────────────╯

╭─◆【 COMMANDES OWNER 】◆─╮
│ • .mode public/private  
│ • .update / .setpp  
│ • .autoreact / .autostatus  
│ • .autotyping / .autoread  
│ • .anticall / .clearsession  
│ • .pmblocker / .setmention  
╰────────────────────────────╯

╭─◆【 IMAGE & STICKERS 】◆─╮
│ • .simage – Image → Sticker
│ • .sticker – Image → Sticker normal
│ • .removebg – Retirer fond  
│ • .remini – Améliorer qualité  
│ • .tgsticker – Sticker Telegram  
│ • .meme – Générer un meme  
│ • .take – Prendre un sticker  
│ • .emojimix – Fusion emojis  
╰────────────────────────────╯

╭─◆【 JEUX 🎮 】◆─╮
│ • .tictactoe @user  
│ • .answer  
╰────────────────────────────╯

╭─◆【 IA / INTELLIGENCE ARTIFICIELLE 】◆─╮
│ • .gpt  
│ • .gemini  
│ • .imagine  
╰────────────────────────────╯

🌟 **COMMANDES PREMIUM**
────────────────────────────
*(Uniquement pour utilisateurs Premium ou Owner)*

╭─◆【 PREMIUM 】◆─╮
│ • .premiumcheck – Vérifier Premium
│ • .addprem @user – Ajouter Premium  
│ • .delprem @user – Retirer Premium  
│ • .gpt4 <question> – IA avancée  
│ • .dalle <prompt> – Images HD IA  
│ • .aivoice <texte> – Voix IA  
│ • .mediahd <lien> – Téléchargement HD  
╰────────────────────────────╯

🔰 SYSTEME : STV CYBER OS 
🧠 POWERED BY : STIVO TECH™
`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');

        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);

            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage
            }, { quoted: message });

        } else {
            await sock.sendMessage(chatId, { text: helpMessage });
        }

    } catch (error) {
        console.error('Erreur Help Command :', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;
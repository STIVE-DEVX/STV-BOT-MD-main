const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const isOwnerOrSudo = require('../lib/stvOwner');

async function setProfilePicture(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;

        // Vérification propriétaire
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Cette commande est réservée au propriétaire du bot !*' 
            });
            return;
        }

        // Vérifier si l'utilisateur répond à une image
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ *Veuillez répondre à une image avec la commande .setpp !*' 
            });
            return;
        }

        const imageMessage = quoted.imageMessage;
        if (!imageMessage) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Le message répondu ne contient pas d’image valide !*' 
            });
            return;
        }

        // Création du dossier temporaire si nécessaire
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // Téléchargement de l'image
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const imagePath = path.join(tmpDir, `profile_${Date.now()}.jpg`);
        fs.writeFileSync(imagePath, buffer);

        // Mise à jour de la photo de profil du bot
        await sock.updateProfilePicture(sock.user.id, { url: imagePath });

        // Suppression du fichier temporaire
        fs.unlinkSync(imagePath);

        await sock.sendMessage(chatId, { 
            text: '✅ *Photo de profil du bot mise à jour avec succès !*' 
        });

    } catch (error) {
        console.error('Erreur setpp :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ *Impossible de mettre à jour la photo de profil !*' 
        });
    }
}

module.exports = setProfilePicture;
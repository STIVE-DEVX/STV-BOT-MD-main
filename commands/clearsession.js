const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/stvOwner');

// Informations du bot pour les messages transférés
const channelInfo = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'STV BOT MD',
            serverMessageId: -1
        }
    }
};

async function clearSessionCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        // Vérification des permissions
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ Cette commande est réservée au propriétaire du bot.',
                ...channelInfo
            });
            return;
        }

        // Dossier session
        const sessionDir = path.join(__dirname, '../session');

        if (!fs.existsSync(sessionDir)) {
            await sock.sendMessage(chatId, { 
                text: '⚠️ Dossier de session introuvable !',
                ...channelInfo
            });
            return;
        }

        let filesCleared = 0;
        let errors = 0;
        let errorDetails = [];

        // Message initial
        await sock.sendMessage(chatId, { 
            text: '🧹 Optimisation des fichiers de session...',
            ...channelInfo
        });

        const files = fs.readdirSync(sessionDir);

        // Statistiques
        let appStateSyncCount = 0;
        let preKeyCount = 0;

        for (const file of files) {
            if (file.startsWith('app-state-sync-')) appStateSyncCount++;
            if (file.startsWith('pre-key-')) preKeyCount++;
        }

        // Suppression des fichiers
        for (const file of files) {
            // On ne touche pas à creds.json
            if (file === 'creds.json') continue;

            try {
                const filePath = path.join(sessionDir, file);
                fs.unlinkSync(filePath);
                filesCleared++;
            } catch (error) {
                errors++;
                errorDetails.push(`❌ Impossible de supprimer ${file}: ${error.message}`);
            }
        }

        // Message final
        let message = `✅ *Nettoyage de la session effectué avec succès !*\n\n` +
                      `📊 *Statistiques :*\n` +
                      `• Fichiers supprimés : ${filesCleared}\n` +
                      `• Fichiers "app-state-sync" : ${appStateSyncCount}\n` +
                      `• Fichiers "pre-key" : ${preKeyCount}\n`;

        if (errors > 0) {
            message += `\n⚠️ *Erreurs rencontrées :* ${errors}\n${errorDetails.join('\n')}`;
        }

        await sock.sendMessage(chatId, { 
            text: message,
            ...channelInfo
        });

    } catch (error) {
        console.error('❌ Erreur dans clearsession :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Impossible de nettoyer la session.',
            ...channelInfo
        });
    }
}

module.exports = clearSessionCommand;
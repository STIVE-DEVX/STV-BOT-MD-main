/**
 * STV BOT MD - A WhatsApp Bot
 * Autotyping Command - Affiche un faux statut "d’écriture"
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/stvOwner');

// Path pour stocker la configuration
const configPath = path.join(__dirname, '..', 'data', 'autotyping.json');

// Initialisation du fichier si inexistant
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Activation/désactivation
async function autotypingCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande est réservée au propriétaire du bot !',
            });
            return;
        }

        // Récupération des arguments
        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                    message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || [];

        const config = initConfig();

        if (args.length > 0) {
            const action = args[0].toLowerCase();

            if (action === 'on') config.enabled = true;
            else if (action === 'off') config.enabled = false;
            else {
                await sock.sendMessage(chatId, { text: '❌ Option invalide ! Utilise : .autotyping on/off' });
                return;
            }
        } else {
            config.enabled = !config.enabled;
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await sock.sendMessage(chatId, {
            text: `✅ Auto-typing ${config.enabled ? 'activé' : 'désactivé'} !`,
        });
        
    } catch (error) {
        console.error('Erreur autotyping :', error);
        await sock.sendMessage(chatId, { text: '❌ Une erreur est survenue !' });
    }
}

// Vérification si activé
function isAutotypingEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch {
        return false;
    }
}

// Typing automatique sur message utilisateur
async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);

            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(r => setTimeout(r, 500));

            await sock.sendPresenceUpdate('composing', chatId);

            const typingDelay = Math.max(3000, Math.min(8000, userMessage.length * 150));
            await new Promise(r => setTimeout(r, typingDelay));

            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(r => setTimeout(r, 1500));

            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch (error) {
            console.error('Erreur auto-typing message :', error);
            return false;
        }
    }
    return false;
}

// Typing après commande
async function showTypingAfterCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(r => setTimeout(r, 1000));
            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch (error) {
            console.error('Erreur auto-typing command :', error);
            return false;
        }
    }
    return false;
}

module.exports = {
    autotypingCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    showTypingAfterCommand
};
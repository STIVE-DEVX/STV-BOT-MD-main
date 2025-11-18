/**
 * STV BOT MD - Commande Auto-Lecture
 * Cette commande permet d'activer ou désactiver la lecture automatique des messages
 */

const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/stvOwner');

// Chemin du fichier de configuration
const configPath = path.join(__dirname, '..', 'data', 'autoread.json');

// Création du fichier s'il n'existe pas
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// Commande .autoread
async function autoreadCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande est réservée au propriétaire du bot.',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'STV BOT MD',
                        serverMessageId: -1
                    }
                }
            });
            return;
        }

        // Récupération des arguments
        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                    message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || 
                    [];

        const config = initConfig();
        
        // Gestion des actions
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Option invalide ! Utilise : .autoread on/off',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363161513685998@newsletter',
                            newsletterName: 'STV BOT MD',
                            serverMessageId: -1
                        }
                    }
                });
                return;
            }
        } else {
            // Inversion de l'état actuel
            config.enabled = !config.enabled;
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        await sock.sendMessage(chatId, {
            text: `✅ Auto-lecture ${config.enabled ? 'activée' : 'désactivée'} !`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'STV BOT MD',
                    serverMessageId: -1
                }
            }
        });
        
    } catch (error) {
        console.error('Erreur dans la commande autoread :', error);
        await sock.sendMessage(chatId, {
            text: '❌ Une erreur est survenue lors du traitement de la commande.',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'STV BOT MD',
                    serverMessageId: -1
                }
            }
        });
    }
}

// Vérifie si l'auto-lecture est activée
function isAutoreadEnabled() {
    try {
        const config = initConfig();
        return config.enabled;
    } catch {
        return false;
    }
}

// Vérifie si le bot est mentionné
function isBotMentionedInMessage(message, botNumber) {
    if (!message.message) return false;

    const messageTypes = [
        'extendedTextMessage', 'imageMessage', 'videoMessage', 'stickerMessage',
        'documentMessage', 'audioMessage', 'contactMessage', 'locationMessage'
    ];

    for (const type of messageTypes) {
        if (message.message[type]?.contextInfo?.mentionedJid) {
            const mentions = message.message[type].contextInfo.mentionedJid;
            if (mentions.some(jid => jid === botNumber)) return true;
        }
    }

    const textContent = 
        message.message.conversation || 
        message.message.extendedTextMessage?.text ||
        message.message.imageMessage?.caption ||
        message.message.videoMessage?.caption || '';

    if (textContent) {
        const botUsername = botNumber.split('@')[0];
        if (textContent.includes(`@${botUsername}`)) return true;

        const botNames = [global.botname?.toLowerCase(), 'bot', 'stv', 'stv bot md'];
        const words = textContent.toLowerCase().split(/\s+/);
        if (botNames.some(name => words.includes(name))) return true;
    }

    return false;
}

// Gère l'auto-lecture
async function handleAutoread(sock, message) {
    if (isAutoreadEnabled()) {
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        const isBotMentioned = isBotMentionedInMessage(message, botNumber);

        if (isBotMentioned) return false;

        const key = { 
            remoteJid: message.key.remoteJid, 
            id: message.key.id, 
            participant: message.key.participant 
        };

        await sock.readMessages([key]);
        return true;
    }
    return false;
}

module.exports = {
    autoreadCommand,
    isAutoreadEnabled,
    isBotMentionedInMessage,
    handleAutoread
};
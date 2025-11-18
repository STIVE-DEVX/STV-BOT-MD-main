const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/stvOwner');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'STV BOT MD',
            serverMessageId: -1
        }
    }
};

// Path to store auto status configuration
const configPath = path.join(__dirname, '../data/autoStatus.json');

// Initialize config file if it doesn't exist
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled: false, 
        reactOn: false 
    }));
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ Cette commande est réservée au propriétaire du bot.',
                ...channelInfo
            });
            return;
        }

        let config = JSON.parse(fs.readFileSync(configPath));

        if (!args || args.length === 0) {
            const status = config.enabled ? 'activé' : 'désactivé';
            const reactStatus = config.reactOn ? 'activées' : 'désactivées';
            await sock.sendMessage(chatId, { 
                text: `🔄 *Paramètres Auto-Statut*\n\n📱 *Lecture automatique des statuts:* ${status}\n💫 *Réactions auto:* ${reactStatus}\n\n*Commandes:*\n.autostatus on - Activer\n.autostatus off - Désactiver\n.autostatus react on - Activer réactions\n.autostatus react off - Désactiver réactions`,
                ...channelInfo
            });
            return;
        }

        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text: '✅ Lecture automatique des statuts *activée*.',
                ...channelInfo
            });

        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text: '❌ Lecture automatique des statuts *désactivée*.',
                ...channelInfo
            });

        } else if (command === 'react') {

            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Spécifie : .autostatus react on/off',
                    ...channelInfo
                });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();

            if (reactCommand === 'on') {
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text: '💫 Réactions automatiques *activées*!',
                    ...channelInfo
                });

            } else if (reactCommand === 'off') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text: '❌ Réactions automatiques *désactivées*!',
                    ...channelInfo
                });

            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Option invalide. Utilise : .autostatus react on/off',
                    ...channelInfo
                });
            }

        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Commande invalide.\nUtilise :\n.autostatus on/off\n.autostatus react on/off',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Erreur autostatus :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Une erreur est survenue lors de la gestion des statuts.',
            ...channelInfo
        });
    }
}

function isAutoStatusEnabled() {
    try {
        return JSON.parse(fs.readFileSync(configPath)).enabled;
    } catch {
        return false;
    }
}

function isStatusReactionEnabled() {
    try {
        return JSON.parse(fs.readFileSync(configPath)).reactOn;
    } catch {
        return false;
    }
}

async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled()) return;

        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );

    } catch (error) {
        console.error('Erreur réaction statut :', error.message);
    }
}

async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) return;

        await new Promise(r => setTimeout(r, 1000));

        if (status.messages?.length > 0) {
            const msg = status.messages[0];
            if (msg.key?.remoteJid === 'status@broadcast') {
                await sock.readMessages([msg.key]);
                await reactToStatus(sock, msg.key);
                return;
            }
        }

        if (status.key?.remoteJid === 'status@broadcast') {
            await sock.readMessages([status.key]);
            await reactToStatus(sock, status.key);
            return;
        }

        if (status.reaction?.key.remoteJid === 'status@broadcast') {
            await sock.readMessages([status.reaction.key]);
            await reactToStatus(sock, status.reaction.key);
            return;
        }

    } catch (error) {
        console.error('Erreur auto-status :', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};
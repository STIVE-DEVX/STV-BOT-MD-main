const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');
const isAdmin = require('../lib/stvAdmin');
const { isSudo } = require('../lib/index');

async function unbanCommand(sock, chatId, message) {
    // Restrictions : dans les groupes → admin ; en privé → owner/sudo
    const isGroup = chatId.endsWith('@g.us');
    if (isGroup) {
        const senderId = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Veuillez mettre le bot admin pour utiliser .unban', ...channelInfo }, { quoted: message });
            return;
        }
        if (!isSenderAdmin && !message.key.fromMe) {
            await sock.sendMessage(chatId, { text: 'Seuls les admins du groupe peuvent utiliser .unban', ...channelInfo }, { quoted: message });
            return;
        }
    } else {
        const senderId = message.key.participant || message.key.remoteJid;
        const senderIsSudo = await isSudo(senderId);
        if (!message.key.fromMe && !senderIsSudo) {
            await sock.sendMessage(chatId, { text: 'Seul le owner/sudo peut utiliser .unban en message privé', ...channelInfo }, { quoted: message });
            return;
        }
    }

    let userToUnban;
    
    // Vérifier les mentions
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToUnban = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Vérifier si réponse à un message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToUnban = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToUnban) {
        await sock.sendMessage(chatId, { 
            text: 'Veuillez mentionner un utilisateur ou répondre à son message pour le débannir !', 
            ...channelInfo 
        }, { quoted: message });
        return;
    }

    try {
        const bannedUsers = JSON.parse(fs.readFileSync('./data/banned.json'));
        const index = bannedUsers.indexOf(userToUnban);
        if (index > -1) {
            bannedUsers.splice(index, 1);
            fs.writeFileSync('./data/banned.json', JSON.stringify(bannedUsers, null, 2));
            
            await sock.sendMessage(chatId, { 
                text: `Utilisateur ${userToUnban.split('@')[0]} débanni avec succès !`,
                mentions: [userToUnban],
                ...channelInfo 
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `${userToUnban.split('@')[0]} n'est pas banni !`,
                mentions: [userToUnban],
                ...channelInfo 
            });
        }
    } catch (error) {
        console.error('Erreur dans la commande unban :', error);
        await sock.sendMessage(chatId, { text: 'Échec lors du débannissement de l’utilisateur !', ...channelInfo }, { quoted: message });
    }
}

module.exports = unbanCommand;
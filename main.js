// 🧹 Correctif pour ENOSPC / débordement du dossier temp dans les hébergeurs
const fs = require('fs');
const path = require('path');

// Redirection du stockage temporaire hors du dossier système /tmp
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Nettoyeur automatique toutes les 3 heures
setInterval(() => {
  fs.readdir(customTemp, (err, files) => {
    if (err) return;
    for (const file of files) {
      const filePath = path.join(customTemp, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
          fs.unlink(filePath, () => {});
        }
      });
    }
  });
  console.log('🧹 Dossier temporaire nettoyé automatiquement');
}, 3 * 60 * 60 * 1000);

const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/stvBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/utils');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/stvOwner');
const { autotypingCommand, isAutotypingEnabled, handleAutotypingForMessage, handleAutotypingForCommand, showTypingAfterCommand } = require('./commands/autotyping');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');

// Import des commandes
const helpCommand = require('./commands/help');
const pingCommand = require('./commands/ping');
const ttsCommand = require('./commands/tts');
const attpCommand = require('./commands/attp');
const { lyricsCommand } = require('./commands/lyrics');
const groupInfoCommand = require('./commands/groupinfo');
const urlCommand = require('./commands/url');
const { handleTranslateCommand } = require('./commands/translate');

// COMMANDES ADMIN
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const deleteCommand = require('./commands/delete');
const kickCommand = require('./commands/kick');
const warnCommand = require('./commands/warn');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const clearCommand = require('./commands/clear');
const tagCommand = require('./commands/tag');
const tagAllCommand = require('./commands/tagall');
const hideTagCommand = require('./commands/hidetag');
const resetlinkCommand = require('./commands/resetlink');
const { setGroupName, setGroupPhoto } = require('./commands/groupmanage');
const { welcomeCommand, handleJoinEvent } = require('./commands/Bienvenue');
const { goodbyeCommand, handleLeaveEvent } = require('./commands/aurevoir');

// COMMANDES OWNER
const ownerCommand = require('./commands/owner');
const updateCommand = require('./commands/update');
const setProfilePicture = require('./commands/setpp');
const pmblockerCommand = require('./commands/pmblocker');

// IMAGE & STICKER
const simageCommand = require('./commands/simage');
const stickerCommand = require('./commands/stickers');
const { reminiCommand } = require('./commands/remini');
const stickerTelegramCommand = require('./commands/stickertelegram');
const takeCommand = require('./commands/take');

// JEUX
const { tictactoeCommand, handleTicTacToeMove } = require('./commands/tictactoe');

// INTELLIGENCE ARTIFICIELLE
const aiCommand = require('./commands/ai');
const imagineCommand = require('./commands/imagine');

// RÉPERTOIRE / GIT
const githubCommand = require('./commands/github');

// AUTRES UTILITÉS
const viewOnceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const settingsCommand = require('./commands/settings');

// Paramètres globaux
global.packname = settings.packname;
global.author = settings.author;
global.channelLink = "https://whatsapp.com/channel/0029Vb6nKuV8vd1M1iBlWe2l";
global.ytch = "STIVO TECH 🌹";

// Ajouter ceci en haut de main.js avec les autres configurations globales
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

async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;

        const message = messages[0];
        if (!message?.message) return;

        // Gérer la fonction de lecture automatique
        await handleAutoread(sock, message);

        // Stocker le message pour l’anti-suppression
        if (message.message) {
            storeMessage(sock, message);
        }

        // Gérer la suppression de message
        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = await isSudo(senderId);
        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);

        // Gérer les réponses des boutons
        if (message.message?.buttonsResponseMessage) {
            const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
            const chatId = message.key.remoteJid;
            
            if (buttonId === 'channel') {
                await sock.sendMessage(chatId, { 
                    text: '📢 *Rejoins notre chaîne :*\nhttps://whatsapp.com/channel/0029Vb6nKuV8vd1M1iBlWe2l' 
                }, { quoted: message });
                return;
            } else if (buttonId === 'owner') {
                const ownerCommand = require('./commands/owner');
                await ownerCommand(sock, chatId);
                return;
            } else if (buttonId === 'support') {
                await sock.sendMessage(chatId, { 
                    text: `🔗 *Support*\n\nhttps://chat.whatsapp.com/EI2b0MzijLU9WJBaew9A9Q` 
                }, { quoted: message });
                return;
            }
        }

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            message.message?.buttonsResponseMessage?.selectedButtonId?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        // Préserver le message brut pour les commandes comme .tag
         const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        // Log uniquement l’usage des commandes
        if (userMessage.startsWith('.')) {
            console.log(`📝 Commande utilisée dans ${isGroup ? 'groupe' : 'privé'} : ${userMessage}`);
        }

        // Lire le mode du bot (public/privé)
        let isPublic = true;
        try {
            const data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
            if (typeof data.isPublic === 'boolean') isPublic = data.isPublic;
        } catch (error) {
            console.error('Erreur lors de la vérification du mode d’accès :', error);
        }

        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // Vérifier si l’utilisateur est banni (sauf pour .unban)
        if (isBanned(senderId) && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, {
                    text: '❌ Vous êtes banni de l’utilisation du bot. Contactez un admin pour être débanni.',
                    ...channelInfo
                });
            }
            return;
        }

        // Détection de mouvement du jeu (TicTacToe)
        if (/^[1-9]$/.test(userMessage) || userMessage.toLowerCase() === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        if (!message.key.fromMe) incrementMessageCount(chatId, senderId);

        // Vérification des insultes et antilink (toujours actifs en groupe)
        if (isGroup) {
            if (userMessage) {
                await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            }
            await Antilink(message, sock);
        }

        // Blocage des privés (PM Blocker)
        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const pmState = readPmBlockerState();
                if (pmState.enabled) {
                    await sock.sendMessage(chatId, { 
                        text: pmState.message || 'Les messages privés sont désactivés. Veuillez contacter le propriétaire via un groupe.' 
                    });
                    await new Promise(r => setTimeout(r, 1500));
                    try { await sock.updateBlockStatus(chatId, 'block'); } catch (e) { }
                    return;
                }
            } catch (e) { }
        }

        // Si ce n’est PAS une commande "."
        if (!userMessage.startsWith('.')) {
            // Afficher "en train d’écrire" si activé
            await handleAutotypingForMessage(sock, chatId, userMessage);

            if (isGroup) {
                // Antitag et détection de mentions
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);

                // Chatbot actif seulement en mode public ou owner/sudo
                if (isPublic || isOwnerOrSudoCheck) {
                    await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                }
            }
            return;
        }

        // Mode privé : seuls owner/sudo autorisés à utiliser les commandes
        if (!isPublic && !isOwnerOrSudoCheck) return;

        // Liste commandes admin
        const adminCommands = [
            '.mute', '.unmute', '.ban', '.unban', '.promote', '.demote', '.kick',
            '.tagall', '.tagnotadmin', '.hidetag', '.antilink', '.antitag',
            '.setgdesc', '.setgname', '.setgpp'
        ];
        const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

        // Commandes du propriétaire
        const Ownercommand = [
            '.mode', '.autostatus', '.antidelete', '.cleartmp', '.setpp',
            '.clearsession', '.areact', '.autoreact', '.autotyping', '.autoread', '.pmblocker'
        ];
        const isOwnerCommand = ownerCommands.some(cmd => userMessage.startsWith(cmd));

        let isSenderAdmin = false;
        let isBotAdmin = false;

        // Vérifier si admin (seulement pour les commandes admin)
        if (isGroup && isAdminCommand) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: 'Veuillez mettre le bot admin pour utiliser ces commandes.', 
                    ...channelInfo 
                }, { quoted: message });
                return;
            }

            if (
                userMessage.startsWith('.mute') ||
                userMessage === '.unmute' ||
                userMessage.startsWith('.ban') ||
                userMessage.startsWith('.unban') ||
                userMessage.startsWith('.promote') ||
                userMessage.startsWith('.demote')
            ) {
                if (!isSenderAdmin && !message.key.fromMe) {
                    await sock.sendMessage(chatId, {
                        text: 'Désolé, seules les administrateurs du groupe peuvent utiliser cette commande.',
                        ...channelInfo
                    }, { quoted: message });
                    return;
                }
            }
        }

        // Vérification statut owner pour commandes owner
        if (isOwnerCommand) {
            if (!message.key.fromMe && !senderIsOwnerOrSudo) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Cette commande est réservée au propriétaire ou sudo !' 
                }, { quoted: message });
                return;
            }
        }

        // Exécution des commandes  
let commandExecuted = false;  

switch (true) {  

    case userMessage === '.simage': {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage?.stickerMessage) {
            await simageCommand(sock, quotedMessage, chatId);
        } else {
            await sock.sendMessage(chatId, { 
                text: 'Veuillez répondre à un sticker avec la commande .simage pour le convertir en image.',
                ...channelInfo
            }, { quoted: message });
        }
        commandExecuted = true;
        break;
    }

    case userMessage.startsWith('.kick'):
        const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await kickCommand(sock, chatId, senderId, mentionedJidListKick, message);
        break;

    case userMessage.startsWith('.mute'): {
        const parts = userMessage.trim().split(/\s+/);
        const muteArg = parts[1];
        const muteDuration = muteArg !== undefined ? parseInt(muteArg, 10) : undefined;

        if (muteArg !== undefined && (isNaN(muteDuration) || muteDuration <= 0)) {
            await sock.sendMessage(chatId, { 
                text: 'Veuillez entrer un nombre valide de minutes, ou utiliser .mute seul pour mute immédiatement.',
                ...channelInfo
            }, { quoted: message });
        } else {
            await muteCommand(sock, chatId, senderId, message, muteDuration);
        }
        break;
    }

    case userMessage === '.unmute':
        await unmuteCommand(sock, chatId, senderId);
        break;

        }
        await banCommand(sock, chatId, message);
        break;

    case userMessage.startsWith('.unban'):
        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            await sock.sendMessage(chatId, { text: 'Seul owner/sudo peut utiliser .unban en privé.' }, { quoted: message });
            break;
        }
        await unbanCommand(sock, chatId, message);
        break;

    case userMessage === '.help' || userMessage === '.menu' || userMessage === '.bot' || userMessage === '.list':
        await helpCommand(sock, chatId, message, global.channelLink);
        commandExecuted = true;
        break;

    case userMessage === '.stickers' || userMessage === '.s':
        await stickerCommand(sock, chatId, message);
        commandExecuted = true;
        break;

    case userMessage.startsWith('.warnings'):
        const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await warningsCommand(sock, chatId, mentionedJidListWarnings);
        break;

    case userMessage.startsWith('.warn'):
        const mentionedJidListWarn = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        await warnCommand(sock, chatId, senderId, mentionedJidListWarn, message);
        break;

    case userMessage.startsWith('.tts'):
        const text = userMessage.slice(4).trim();
        await ttsCommand(sock, chatId, text, message);
        break;

    case userMessage.startsWith('.delete') || userMessage.startsWith('.del'):
        await deleteCommand(sock, chatId, message, senderId);
        break;

    case userMessage.startsWith('.attp'):
        await attpCommand(sock, chatId, message);
        break;

    case userMessage === '.settings':
        await settingsCommand(sock, chatId, message);
        break;

    case userMessage.startsWith('.mode'):
        ...
        break;

    case userMessage.startsWith('.pmblocker'):
        ...
        break;

    case userMessage.startsWith('.ttt') || userMessage.startsWith('.tictactoe'):
        const tttText = userMessage.split(' ').slice(1).join(' ');
        await tictactoeCommand(sock, chatId, senderId, tttText);
        break;
}
      
      case userMessage.startsWith('.move'):
    const position = parseInt(userMessage.split(' ')[1]);
    if (isNaN(position)) {
        await sock.sendMessage(chatId, { text: 'Veuillez donner un numéro de position valide pour le morpion.', ...channelInfo }, { quoted: message });
    } else {
        tictactoeMove(sock, chatId, senderId, position);
    }
break;

case userMessage.startsWith('.lyrics'):
    const songTitle = userMessage.split(' ').slice(1).join(' ');
    await lyricsCommand(sock, chatId, songTitle, message);
break;

case userMessage.startsWith('.take') || userMessage.startsWith('.steal'):
{
    const isSteal = userMessage.startsWith('.steal');
    const sliceLen = isSteal ? 6 : 5;
    const takeArgs = rawText.slice(sliceLen).trim().split(' ');
    await takeCommand(sock, chatId, message, takeArgs);
}
break;

case userMessage.startsWith('.Bienvenue'):
    if (isGroup) {
        if (!isSenderAdmin) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
        }

        if (isSenderAdmin || message.key.fromMe) {
            await welcomeCommand(sock, chatId, message);
        } else {
            await sock.sendMessage(chatId, { text: 'Désolé, seuls les administrateurs du groupe peuvent utiliser cette commande.', ...channelInfo }, { quoted: message });
        }

    } else {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
    }
break;

case userMessage.startsWith('.aurevoir'):
    if (isGroup) {
        if (!isSenderAdmin) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
        }

        if (isSenderAdmin || message.key.fromMe) {
            await goodbyeCommand(sock, chatId, message);
        } else {
            await sock.sendMessage(chatId, { text: 'Désolé, seuls les administrateurs du groupe peuvent utiliser cette commande.', ...channelInfo }, { quoted: message });
        }

    } else {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
    }
break;

case userMessage === '.clear':
    if (isGroup) await clearCommand(sock, chatId);
break;

case userMessage.startsWith('.promote'):
    const mentionedJidListPromote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    await promoteCommand(sock, chatId, mentionedJidListPromote, message);
break;

case userMessage.startsWith('.demote'):
    const mentionedJidListDemote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    await demoteCommand(sock, chatId, mentionedJidListDemote, message);
break;

case userMessage === '.ping':
    await pingCommand(sock, chatId, message);
break;

case userMessage.startsWith('.Bienvenue'):
case userMessage.startsWith('.aurevoir'):

break;

case userMessage.startsWith('.antibadword'):
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
        return;
    }

    const adminStatus = await isAdmin(sock, chatId, senderId);
    isSenderAdmin = adminStatus.isSenderAdmin;
    isBotAdmin = adminStatus.isBotAdmin;

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: '*Le bot doit être administrateur pour utiliser cette fonctionnalité*', ...channelInfo }, { quoted: message });
        return;
    }

    await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
break;

case userMessage.startsWith('.chatbot'):
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
        return;
    }

    const chatbotAdminStatus = await isAdmin(sock, chatId, senderId);
    if (!chatbotAdminStatus.isSenderAdmin && !message.key.fromMe) {
        await sock.sendMessage(chatId, { text: '*Seuls les admins ou le propriétaire du bot peuvent utiliser cette commande*', ...channelInfo }, { quoted: message });
        return;
    }

    const match = userMessage.slice(8).trim();
    await handleChatbotCommand(sock, chatId, message, match);
break;

case userMessage.startsWith('.groupinfo'):
case userMessage.startsWith('.infogp'):
case userMessage.startsWith('.infogrupo'):
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes !', ...channelInfo }, { quoted: message });
        return;
    }
    await groupInfoCommand(sock, chatId, message);
break;

case userMessage === '.resetlink' || userMessage === '.revoke' || userMessage === '.anularlink':
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes !', ...channelInfo }, { quoted: message });
        return;
    }
    await resetlinkCommand(sock, chatId, senderId);
break;

case userMessage === '.staff' || userMessage === '.admins' || userMessage === '.listadmin':
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes !', ...channelInfo }, { quoted: message });
        return;
    }
    await staffCommand(sock, chatId, message);
break;

        case userMessage.startsWith('.move'):
    const position = parseInt(userMessage.split(' ')[1]);
    if (isNaN(position)) {
        await sock.sendMessage(chatId, { text: 'Veuillez donner un numéro de position valide pour le morpion.', ...channelInfo }, { quoted: message });
    } else {
        tictactoeMove(sock, chatId, senderId, position);
    }
break;

case userMessage.startsWith('.lyrics'):
    const songTitle = userMessage.split(' ').slice(1).join(' ');
    await lyricsCommand(sock, chatId, songTitle, message);
break;

case userMessage.startsWith('.take') || userMessage.startsWith('.steal'):
{
    const isSteal = userMessage.startsWith('.steal');
    const sliceLen = isSteal ? 6 : 5;
    const takeArgs = rawText.slice(sliceLen).trim().split(' ');
    await takeCommand(sock, chatId, message, takeArgs);
}
break;

case userMessage.startsWith('.Bienvenue 🥰'):
    if (isGroup) {
        if (!isSenderAdmin) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
        }

        if (isSenderAdmin || message.key.fromMe) {
            await welcomeCommand(sock, chatId, message);
        } else {
            await sock.sendMessage(chatId, { text: 'Désolé, seuls les administrateurs du groupe peuvent utiliser cette commande.', ...channelInfo }, { quoted: message });
        }

    } else {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
    }
break;

case userMessage.startsWith('.aurevoir 👋'):
    if (isGroup) {
        if (!isSenderAdmin) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
        }

        if (isSenderAdmin || message.key.fromMe) {
            await goodbyeCommand(sock, chatId, message);
        } else {
            await sock.sendMessage(chatId, { text: 'Désolé, seuls les administrateurs du groupe peuvent utiliser cette commande.', ...channelInfo }, { quoted: message });
        }

    } else {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
    }
break;

case userMessage === '.clear':
    if (isGroup) await clearCommand(sock, chatId);
break;

case userMessage.startsWith('.promote'):
    const mentionedJidListPromote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    await promoteCommand(sock, chatId, mentionedJidListPromote, message);
break;

case userMessage.startsWith('.demote'):
    const mentionedJidListDemote = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    await demoteCommand(sock, chatId, mentionedJidListDemote, message);
break;

case userMessage === '.ping':
    await pingCommand(sock, chatId, message);
break;

case userMessage.startsWith('.Bienvenue 🥰'):
case userMessage.startsWith('.aurevoir 👋'):
// (Déjà gérés plus haut)
break;

case userMessage.startsWith('.antibadword'):
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
        return;
    }

    const adminStatus = await isAdmin(sock, chatId, senderId);
    isSenderAdmin = adminStatus.isSenderAdmin;
    isBotAdmin = adminStatus.isBotAdmin;

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: '*Le bot doit être administrateur pour utiliser cette fonctionnalité*', ...channelInfo }, { quoted: message });
        return;
    }

    await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
break;

case userMessage.startsWith('.chatbot'):
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.', ...channelInfo }, { quoted: message });
        return;
    }

    const chatbotAdminStatus = await isAdmin(sock, chatId, senderId);
    if (!chatbotAdminStatus.isSenderAdmin && !message.key.fromMe) {
        await sock.sendMessage(chatId, { text: '*Seuls les admins ou le propriétaire du bot peuvent utiliser cette commande*', ...channelInfo }, { quoted: message });
        return;
    }

    const match = userMessage.slice(8).trim();
    await handleChatbotCommand(sock, chatId, message, match);
break;

case userMessage.startsWith('.groupinfo'):
case userMessage.startsWith('.infogp'):
case userMessage.startsWith('.infogrupo'):
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes !', ...channelInfo }, { quoted: message });
        return;
    }
    await groupInfoCommand(sock, chatId, message);
break;

case userMessage === '.resetlink' || userMessage === '.revoke' || userMessage === '.anularlink':
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes !', ...channelInfo }, { quoted: message });
        return;
    }
    await resetlinkCommand(sock, chatId, senderId);
break;

case userMessage === '.staff' || userMessage === '.admins' || userMessage === '.listadmin':
    if (!isGroup) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes !', ...channelInfo }, { quoted: message });
        return;
    }
    await staffCommand(sock, chatId, message);
break;
       
case userMessage.startsWith('.ytcomment'):
{
    const parts = userMessage.trim().split(/\s+/);
    const args = ['youtube-comment', ...parts.slice(1)];
    await miscCommand(sock, chatId, message, args);
}
break;

case userMessage.startsWith('.comrade'):
case userMessage.startsWith('.gay'):
case userMessage.startsWith('.verre'):
case userMessage.startsWith('.prison'):
case userMessage.startsWith('.passé'):
case userMessage.startsWith('.déclenché'):
{
    const parts = userMessage.trim().split(/\s+/);
    const sub = userMessage.slice(1).split(/\s+/)[0];
    const args = [sub, ...parts.slice(1)];
    await miscCommand(sock, chatId, message, args);
}
break;

case userMessage.startsWith('.update'):
{
    const parts = rawText.trim().split(/\s+/);
    const zipArg = parts[1] && parts[1].startsWith('http') ? parts[1] : '';
    await updateCommand(sock, chatId, message, zipArg);
}
commandExecuted = true;
break;

case userMessage.startsWith('.removebg') || userMessage.startsWith('.rmbg') || userMessage.startsWith('.nobg'):
await removebgCommand.exec(sock, message, userMessage.split(' ').slice(1));
break;

case userMessage.startsWith('.remini') || userMessage.startsWith('.enhance') || userMessage.startsWith('.upscale'):
await reminiCommand(sock, chatId, message, userMessage.split(' ').slice(1));
break;

// Afficher le statut "écriture..." après une commande
if (commandExecuted !== false) {
    await showTypingAfterCommand(sock, chatId);
}

// Fonction pour gérer la commande .groupjid
async function groupJidCommand(sock, chatId, message) {
    const groupJid = message.key.remoteJid;

    if (!groupJid.endsWith('@g.us')) {
        return await sock.sendMessage(chatId, {
            text: "❌ Cette commande ne peut être utilisée que dans un groupe."
        });
    }

    await sock.sendMessage(chatId, {
        text: `120363403510418305@g.us: ${groupJid}`
    }, {
        quoted: message
    });
}

if (userMessage.startsWith('.')) {
    await addCommandReaction(sock, message);
}

} catch (error) {
    console.error('❌ Erreur dans le gestionnaire de message :', error.message);
    if (chatId) {
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de traiter la commande !',
            ...channelInfo
        });
    }
}
}

async function handleGroupParticipantUpdate(sock, update) {
try {
    const { id, participants, action, author } = update;

    if (!id.endsWith('@g.us')) return;

    let isPublic = true;
    try {
        const modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
        if (typeof modeData.isPublic === 'boolean') isPublic = modeData.isPublic;
    } catch (e) {}

    if (action === 'promote') {
        if (!isPublic) return;
        await handlePromotionEvent(sock, id, participants, author);
        return;
    }

    if (action === 'demote') {
        if (!isPublic) return;
        await handleDemotionEvent(sock, id, participants, author);
        return;
    }

    if (action === 'add') {
        await handleJoinEvent(sock, id, participants);
    }

    if (action === 'remove') {
        await handleLeaveEvent(sock, id, participants);
    }

} catch (error) {
    console.error('Erreur dans handleGroupParticipantUpdate :', error);
}
}

module.exports = {
handleMessages,
handleGroupParticipantUpdate,
handleStatus: async (sock, status) => {
    await handleStatusUpdate(sock, status);
}
};
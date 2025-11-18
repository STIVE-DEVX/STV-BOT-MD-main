const { handleWelcome } = require('../lib/bienvenue');
const { isWelcomeOn, getWelcome } = require('../lib/index');
const { channelInfo } = require('../lib/messageConfig');
const fetch = require('node-fetch');

async function welcomeCommand(sock, chatId, message, match) {
    // Vérifie si c'est un groupe
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'Cette commande ne peut être utilisée que dans les groupes.' });
        return;
    }

    // Récupération du texte
    const text = message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '';
    const matchText = text.split(' ').slice(1).join(' ');

    await handleWelcome(sock, chatId, message, matchText);
}

async function handleJoinEvent(sock, id, participants) {
    // Vérifie si le welcome est activé
    const isWelcomeEnabled = await isWelcomeOn(id);
    if (!isWelcomeEnabled) return;

    // Message personnalisé si existe
    const customMessage = await getWelcome(id);

    // Informations du groupe
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || 'Aucune description disponible.';

    // Pour chaque nouveau membre
    for (const participant of participants) {
        try {
            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const user = participantString.split('@')[0];

            // Nom d'affichage
            let displayName = user;
            try {
                const contact = await sock.getBusinessProfile(participantString);
                if (contact && contact.name) {
                    displayName = contact.name;
                } else {
                    const groupParticipants = groupMetadata.participants;
                    const userParticipant = groupParticipants.find(p => p.id === participantString);
                    if (userParticipant && userParticipant.name) {
                        displayName = userParticipant.name;
                    }
                }
            } catch {
                console.log('Impossible de récupérer le nom, utilisation du numéro.');
            }

            // Préparation du message
            let finalMessage;
            if (customMessage) {
                // Remplacement des variables
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{description}/g, groupDesc);
            } else {
                // Message par défaut
                const now = new Date();
                const timeString = now.toLocaleString('fr-FR', {
                    month: '2-digit',
                    day: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                finalMessage = 
`╭╼━≪•𝙽𝙾𝚄𝚅𝙴𝙰𝚄 𝙼𝙴𝙼𝙱𝚁𝙴•≫━╾╮
┃𝙱𝙸𝙴𝙽𝚅𝙴𝙽𝚄𝙴 : @${displayName} 👋
┃Membres : #${groupMetadata.participants.length}
┃Heure : ${timeString} ⏰
╰━━━━━━━━━━━━━━━╯

*@${displayName}* bienvenue dans *${groupName}* 🎉
*Description du groupe :*
${groupDesc}

> *🛠️ STV BOT MD — Créé par STIVO TECH*
> WhatsApp Channel : https://whatsapp.com/channel/0029Vb6nKuV8vd1M1iBlWe2l`;
            }

            // Tentative d'envoi de l'image de bienvenue
            try {
                let profilePicUrl = `https://img.pyrocdn.com/dbKUgahg.png`;

                try {
                    const profilePic = await sock.profilePictureUrl(participantString, 'image');
                    if (profilePic) profilePicUrl = profilePic;
                } catch {
                    console.log('Impossible de récupérer la pp, image par défaut.');
                }

                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming3?type=join&textcolor=green&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;

                const response = await fetch(apiUrl);

                if (response.ok) {
                    const buffer = await response.buffer();

                    await sock.sendMessage(id, {
                        image: buffer,
                        caption: finalMessage,
                        mentions: [participantString],
                        ...channelInfo
                    });

                    continue;
                }
            } catch {
                console.log('Image non disponible, envoi message texte.');
            }

            // Message texte si image impossible
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantString],
                ...channelInfo
            });

        } catch (error) {
            console.error('Erreur welcome :', error);

            const participantString = typeof participant === 'string' ? participant : (participant.id || participant.toString());
            const fallbackMessage = customMessage ?
                customMessage.replace(/{user}/g, `@${participantString.split('@')[0]}`) :
                `Bienvenue @${participantString.split('@')[0]} dans ${groupName} ! 🎉`;

            await sock.sendMessage(id, {
                text: fallbackMessage,
                mentions: [participantString],
                ...channelInfo
            });
        }
    }
}

module.exports = { welcomeCommand, handleJoinEvent };
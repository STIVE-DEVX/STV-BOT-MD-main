const { handleGoodbye } = require('../lib/bienvenue');
const { isGoodByeOn, getGoodbye } = require('../lib/index');
const fetch = require('node-fetch');

async function goodbyeCommand(sock, chatId, message, match) {
    // Vérifier si c'est un groupe
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: '❗ Cette commande ne peut être utilisée que dans les groupes.' });
        return;
    }

    // Extraire le texte après la commande
    const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        '';

    const matchText = text.split(' ').slice(1).join(' ');

    await handleGoodbye(sock, chatId, message, matchText);
}

async function handleLeaveEvent(sock, id, participants) {
    // Vérifier si le système d'aurevoir est activé
    const enabled = await isGoodByeOn(id);
    if (!enabled) return;

    // Récupérer le message aurevoir personnalisé
    const customMessage = await getGoodbye(id);

    // Infos du groupe
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupParticipants = groupMetadata.participants;

    for (const participant of participants) {
        try {
            const participantStr =
                typeof participant === 'string'
                    ? participant
                    : (participant.id || participant.toString());

            const userNumber = participantStr.split('@')[0];

            // Récupération du nom d'affichage
            let displayName = userNumber;
            try {
                const contact = await sock.onWhatsApp(participantStr);
                if (contact?.[0]?.notify) displayName = contact[0].notify;

                const pInfo = groupParticipants.find(p => p.id === participantStr);
                if (pInfo?.name) displayName = pInfo.name;

            } catch (err) {
                console.log("Nom introuvable, utilisation du numéro.");
            }

            // Construire message final
            let finalMessage;
            if (customMessage) {
                finalMessage = customMessage
                    .replace(/{user}/g, `@${displayName}`)
                    .replace(/{group}/g, groupName);
            } else {
                finalMessage = `👋 *@${displayName}* a quitté **${groupName}**.`;
            }

            // Tentative d’envoi d’une image
            try {
                let profilePicUrl = 'https://img.pyrocdn.com/dbKUgahg.png'; // avatar par défaut
                try {
                    const pp = await sock.profilePictureUrl(participantStr, 'image');
                    if (pp) profilePicUrl = pp;
                } catch (e) {}

                const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming1?type=leave&textcolor=red&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupParticipants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;

                const response = await fetch(apiUrl);

                if (response.ok) {
                    const img = await response.buffer();

                    await sock.sendMessage(id, {
                        image: img,
                        caption: finalMessage,
                        mentions: [participantStr]
                    });

                    continue;
                }
            } catch (errImg) {
                console.log("Échec génération image → envoi message simple");
            }

            // Fallback : envoyer message texte
            await sock.sendMessage(id, {
                text: finalMessage,
                mentions: [participantStr]
            });

        } catch (err) {
            console.error("Erreur : ", err);

            const participantStr =
                typeof participant === 'string'
                    ? participant
                    : (participant.id || participant.toString());

            const fallback = customMessage
                ? customMessage.replace(/{user}/g, `@${participantStr.split('@')[0]}`)
                : `👋 Au revoir @${participantStr.split('@')[0]} !`;

            await sock.sendMessage(id, {
                text: fallback,
                mentions: [participantStr]
            });
        }
    }
}

module.exports = { goodbyeCommand, handleLeaveEvent };
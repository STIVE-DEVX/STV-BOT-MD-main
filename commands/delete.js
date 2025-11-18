const isAdmin = require('../lib/stvAdmin');
const store = require('../lib/magasin_leger');

async function deleteCommand(sock, chatId, message, senderId) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, {
                text: '❌ Je dois être administrateur pour supprimer des messages.'
            }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, {
                text: '❌ Seuls les administrateurs peuvent utiliser la commande `.delete`.'
            }, { quoted: message });
            return;
        }

        // Texte de la commande
        const textMsg =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

        const parts = textMsg.trim().split(/\s+/);
        let countArg = null;

        // Vérifier si un nombre est fourni
        if (parts.length > 1) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num) && num > 0) {
                countArg = Math.min(num, 50);
            }
        }

        const ctxInfo = message.message?.extendedTextMessage?.contextInfo || {};
        const repliedParticipant = ctxInfo.participant || null;
        const mentioned = Array.isArray(ctxInfo.mentionedJid)
            ? ctxInfo.mentionedJid[0]
            : null;

        // Déterminer la valeur par défaut
        if (countArg === null && repliedParticipant) {
            countArg = 1;
        } else if (countArg === null && mentioned) {
            countArg = 1;
        } else if (countArg === null) {
            await sock.sendMessage(chatId, {
                text:
`❌ Veuillez préciser le nombre de messages à supprimer.

📌 *Exemples d'utilisation :*
• *.del 5* → Supprime les 5 derniers messages du groupe  
• *.del 3 @user* → Supprime les 3 derniers messages de l’utilisateur  
• *(répondre à un message) .del* → Supprime le message ciblé`
            }, { quoted: message });
            return;
        }

        // Déterminer l'utilisateur ciblé
        let targetUser = null;
        let repliedMsgId = null;
        let deleteGroupMessages = false;

        if (repliedParticipant && ctxInfo.stanzaId) {
            targetUser = repliedParticipant;
            repliedMsgId = ctxInfo.stanzaId;
        } else if (mentioned) {
            targetUser = mentioned;
        } else {
            deleteGroupMessages = true; // supprimer messages du groupe
        }

        const chatMessages = Array.isArray(store.messages[chatId])
            ? store.messages[chatId]
            : [];

        const toDelete = [];
        const seenIds = new Set();

        // Suppression des messages du groupe
        if (deleteGroupMessages) {
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
                const m = chatMessages[i];

                if (!seenIds.has(m.key.id)) {
                    if (
                        !m.message?.protocolMessage &&
                        !m.key.fromMe &&
                        m.key.id !== message.key.id
                    ) {
                        toDelete.push(m);
                        seenIds.add(m.key.id);
                    }
                }
            }
        } else {
            // Si on répond à un message → supprimer celui-là d’abord
            if (repliedMsgId) {
                const found = chatMessages.find(
                    (m) =>
                        m.key.id === repliedMsgId &&
                        (m.key.participant || m.key.remoteJid) === targetUser
                );

                if (found) {
                    toDelete.push(found);
                    seenIds.add(found.key.id);
                } else {
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: repliedMsgId,
                                participant: repliedParticipant
                            }
                        });
                        countArg = Math.max(0, countArg - 1);
                    } catch {}
                }
            }

            // Supprimer messages supplémentaires de cet utilisateur
            for (let i = chatMessages.length - 1; i >= 0 && toDelete.length < countArg; i--) {
                const m = chatMessages[i];
                const participant = m.key.participant || m.key.remoteJid;

                if (
                    participant === targetUser &&
                    !seenIds.has(m.key.id) &&
                    !m.message?.protocolMessage
                ) {
                    toDelete.push(m);
                    seenIds.add(m.key.id);
                }
            }
        }

        if (toDelete.length === 0) {
            await sock.sendMessage(chatId, {
                text: deleteGroupMessages
                    ? '⚠️ Aucun message récent à supprimer dans le groupe.'
                    : '⚠️ Aucun message récent trouvé pour cet utilisateur.'
            }, { quoted: message });
            return;
        }

        // Suppression réelle
        for (const m of toDelete) {
            try {
                const participant = deleteGroupMessages
                    ? (m.key.participant || m.key.remoteJid)
                    : targetUser;

                await sock.sendMessage(chatId, {
                    delete: {
                        remoteJid: chatId,
                        fromMe: false,
                        id: m.key.id,
                        participant
                    }
                });

                await new Promise(r => setTimeout(r, 250));
            } catch {}
        }

    } catch (err) {
        console.error('Erreur deleteCommand:', err);
        await sock.sendMessage(chatId, {
            text: '❌ Une erreur est survenue lors de la suppression.'
        }, { quoted: message });
    }
}

module.exports = deleteCommand;
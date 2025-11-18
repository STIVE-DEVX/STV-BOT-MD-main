const { isAdmin } = require('../lib/stvAdmin');

// Commande de promotion manuelle
async function promoteCommand(sock, chatId, mentionedJids, message) {
    let usersToPromote = [];

    // Mentions directes
    if (mentionedJids && mentionedJids.length > 0) {
        usersToPromote = mentionedJids;
    }
    // Réponse à un message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        usersToPromote = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (usersToPromote.length === 0) {
        return sock.sendMessage(chatId, {
            text: '⚠️ Veuillez mentionner un utilisateur ou répondre à son message pour le promouvoir.'
        }, { quoted: message });
    }

    try {
        await sock.groupParticipantsUpdate(chatId, usersToPromote, "promote");

        // Récupération des noms
        const usernames = usersToPromote.map(jid => `@${jid.split('@')[0]}`);

        // Promoteur
        const promoterJid = message.key.participant || sock.user.id;

        const promotionMsg =
            `🎉 *PROMOTION DANS LE GROUPE*\n\n` +
            `👥 *Utilisateur(s) promu(s) :*\n${usernames.map(n => `• ${n}`).join('\n')}\n\n` +
            `👑 *Promu par :* @${promoterJid.split('@')[0]}\n` +
            `📅 *Date :* ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, {
            text: promotionMsg,
            mentions: [...usersToPromote, promoterJid]
        });

    } catch (err) {
        console.error('Erreur promotion :', err);
        await sock.sendMessage(chatId, {
            text: '❌ Impossible de promouvoir cet utilisateur.'
        });
    }
}

// Gestion automatique lors d’une promotion
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) return;

        const users = participants.map(jid =>
            `@${(typeof jid === 'string' ? jid : jid.id).split('@')[0]}`
        );

        let authorJid = author
            ? (typeof author === 'string' ? author : author.id)
            : null;

        const promotionMsg =
            `🎉 *PROMOTION AUTOMATIQUE*\n\n` +
            `👥 *Utilisateurs promus :*\n${users.map(u => `• ${u}`).join('\n')}\n\n` +
            `👑 *Promu par :* ${authorJid ? '@' + authorJid.split('@')[0] : 'Système'}\n` +
            `📅 *Date :* ${new Date().toLocaleString()}`;

        await sock.sendMessage(groupId, {
            text: promotionMsg,
            mentions: [...participants, authorJid].filter(Boolean)
        });

    } catch (err) {
        console.error('Erreur promotion auto :', err);
    }
}

module.exports = { promoteCommand, handlePromotionEvent };
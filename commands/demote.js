const isAdmin = require('../lib/stvAdmin');

// ======= COMMAND: DEMOTE ======= //
async function demoteCommand(sock, chatId, mentionedJids, message) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: '❌ Cette commande ne fonctionne que dans les groupes.' });
        }

        const sender = message.key.participant || message.key.remoteJid;
        const admin = await isAdmin(sock, chatId, sender);

        if (!admin.isBotAdmin) {
            return sock.sendMessage(chatId, { text: '❌ Le bot doit être administrateur pour utiliser cette commande.' });
        }
        if (!admin.isSenderAdmin) {
            return sock.sendMessage(chatId, { text: '❌ Seuls les administrateurs peuvent rétrograder des membres.' });
        }

        // Trouver l’utilisateur ciblé
        let users = [];

        if (mentionedJids?.length > 0) {
            users = mentionedJids;
        } else if (message?.message?.extendedTextMessage?.contextInfo?.participant) {
            users = [message.message.extendedTextMessage.contextInfo.participant];
        }

        if (users.length === 0) {
            return sock.sendMessage(chatId, { text: '❌ Mentionnez un utilisateur ou répondez à son message.' });
        }

        // Action
        await sock.groupParticipantsUpdate(chatId, users, "demote");

        const usernames = users.map(j => `@${j.split('@')[0]}`);
        const senderTag = `@${sender.split('@')[0]}`;

        const txt =
`*『 RÉTROGRADATION 』*

👤 *Utilisateur(s) rétrogradé(s) :*
${usernames.map(u => `• ${u}`).join('\n')}

👑 *Rétrogradé par :* ${senderTag}
📅 *Date :* ${new Date().toLocaleString()}`;

        await sock.sendMessage(chatId, {
            text: txt,
            mentions: [...users, sender]
        });

    } catch (error) {
        console.error('Erreur demoteCommand:', error);
        sock.sendMessage(chatId, {
            text: '❌ Impossible de rétrograder cet utilisateur. Vérifiez les permissions.'
        });
    }
}



// ======= EVENT: AUTO DEMOTE DETECTION ======= //
async function handleDemotionEvent(sock, groupId, participants, author) {
    try {
        if (!Array.isArray(participants) || participants.length === 0) return;

        // Formattage des tags
        const demoted = participants.map(j =>
            `@${(typeof j === 'string' ? j : j.id).split('@')[0]}`
        );

        const mentions = participants.map(j =>
            typeof j === 'string' ? j : j.id
        );

        let demotedBy = 'Système';
        if (author) {
            const auth = typeof author === 'string' ? author : author.id;
            demotedBy = `@${auth.split('@')[0]}`;
            mentions.push(auth);
        }

        const txt =
`*『 RÉTROGRADATION 』*

👤 *Utilisateur(s) rétrogradé(s) :*
${demoted.map(n => `• ${n}`).join('\n')}

👑 *Rétrogradé par :* ${demotedBy}
📅 *Date :* ${new Date().toLocaleString()}`;

        await sock.sendMessage(groupId, {
            text: txt,
            mentions
        });

    } catch (error) {
        console.error('Erreur handleDemotionEvent:', error);
    }
}

module.exports = { demoteCommand, handleDemotionEvent };
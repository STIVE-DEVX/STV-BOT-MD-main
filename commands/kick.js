const isAdmin = require('../lib/stvAdmin');

async function kickCommand(sock, chatId, senderId, mentionedJids, message) {

    // Vérifie si la commande vient du propriétaire du bot
    const isOwner = message.key.fromMe;

    if (!isOwner) {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❗Veuillez d’abord donner les droits administrateur au bot.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '❗Seuls les admins peuvent utiliser la commande .kick.' }, { quoted: message });
            return;
        }
    }

    let usersToKick = [];

    // Mention
    if (mentionedJids && mentionedJids.length > 0) {
        usersToKick = mentionedJids;
    }
    // Reply
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        usersToKick = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (usersToKick.length === 0) {
        await sock.sendMessage(chatId, {
            text: '⚠️ Veuillez mentionner un utilisateur ou répondre à son message pour l’expulser.'
        }, { quoted: message });
        return;
    }

    // Identifiants du bot
    const botId = sock.user?.id || "";
    const botPhone = botId.split('@')[0];

    const metadata = await sock.groupMetadata(chatId);
    const participants = metadata.participants || [];

    // Empêche de kick le bot
    const isTryingToKickBot = usersToKick.some(jid => {
        const userPhone = jid.split('@')[0];
        return (
            jid === botId ||
            userPhone === botPhone ||
            participants.some(p => p.id === botId && p.id === jid)
        );
    });

    if (isTryingToKickBot) {
        await sock.sendMessage(chatId, {
            text: "🤖 Je ne peux pas m’expulser moi-même."
        }, { quoted: message });
        return;
    }

    try {
        // Expulsion
        await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");

        const usernames = usersToKick.map(jid => `@${jid.split('@')[0]}`);

        await sock.sendMessage(chatId, {
            text: `🚫 Utilisateur expulsé : ${usernames.join(', ')}`,
            mentions: usersToKick
        });

    } catch (error) {
        console.error("Erreur kick :", error);
        await sock.sendMessage(chatId, {
            text: "❌ Échec de l’expulsion. Essayez encore."
        }, { quoted: message });
    }
}

module.exports = kickCommand;
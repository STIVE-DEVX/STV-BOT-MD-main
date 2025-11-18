const settings = require('../settings');
const { addSudo, removeSudo, getSudoList } = require('../lib/index');
const isOwnerOrSudo = require('../lib/stvOwner');

// Récupération d'un JID (mention ou numéro dans le texte)
function extractMentionedJid(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];

    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const match = text.match(/\b(\d{7,15})\b/);

    if (match) return match[1] + '@s.whatsapp.net';
    return null;
}

async function sudoCommand(sock, chatId, message) {
    const senderJid = message.key.participant || message.key.remoteJid;
    const isOwner = message.key.fromMe || await isOwnerOrSudo(senderJid, sock, chatId);

    // Récupération du texte brut
    const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const args = rawText.trim().split(' ').slice(1);
    const sub = (args[0] || '').toLowerCase();

    // Message d’usage
    if (!sub || !['add', 'del', 'remove', 'list'].includes(sub)) {
        await sock.sendMessage(
            chatId,
            { 
                text: '📌 *Utilisation des commandes sudo :*\n\n' +
                      '🟢 *.sudo add <@user|numéro>* – Ajouter un sudo\n' +
                      '🔴 *.sudo del <@user|numéro>* – Retirer un sudo\n' +
                      '📜 *.sudo list* – Voir les sudo'
            },
            { quoted: message }
        );
        return;
    }

    // Liste des sudo
    if (sub === 'list') {
        const list = await getSudoList();

        if (list.length === 0) {
            await sock.sendMessage(chatId, { text: '📭 Aucun utilisateur sudo n’a été ajouté.' }, { quoted: message });
            return;
        }

        const txt = list.map((j, i) => `➡️ ${i + 1}. ${j}`).join('\n');
        await sock.sendMessage(chatId, { text: `👑 *Liste des Sudo STV BOT MD :*\n\n${txt}` }, { quoted: message });
        return;
    }

    // Vérifie si l’utilisateur est bien owner
    if (!isOwner) {
        await sock.sendMessage(
            chatId,
            { text: '❌ *Seul le propriétaire du bot peut ajouter ou retirer un sudo !*\n\n➡️ Utilise *.sudo list* pour consulter la liste.' },
            { quoted: message }
        );
        return;
    }

    // Extraction du JID ciblé
    const targetJid = extractMentionedJid(message);
    if (!targetJid) {
        await sock.sendMessage(
            chatId,
            { text: '⚠️ Merci de *mentionner l’utilisateur* ou *écrire son numéro*.' },
            { quoted: message }
        );
        return;
    }

    // Ajout d’un sudo
    if (sub === 'add') {
        const ok = await addSudo(targetJid);

        await sock.sendMessage(
            chatId,
            { text: ok ? `✅ *Utilisateur ajouté comme sudo :* ${targetJid}` : '❌ Impossible d’ajouter cet utilisateur.' },
            { quoted: message }
        );
        return;
    }

    // Suppression d’un sudo
    if (sub === 'del' || sub === 'remove') {
        const ownerJid = settings.ownerNumber + '@s.whatsapp.net';

        if (targetJid === ownerJid) {
            await sock.sendMessage(chatId, { text: '⚠️ *Impossible de retirer le propriétaire !*' }, { quoted: message });
            return;
        }

        const ok = await removeSudo(targetJid);

        await sock.sendMessage(
            chatId,
            { text: ok ? `🗑️ *Utilisateur retiré :* ${targetJid}` : '❌ Impossible de retirer cet utilisateur.' },
            { quoted: message }
        );
        return;
    }
}

module.exports = sudoCommand;
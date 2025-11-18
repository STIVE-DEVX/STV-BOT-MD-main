async function resetlinkCommand(sock, chatId, senderId) {
    try {
        // Récupération des informations du groupe
        const groupMetadata = await sock.groupMetadata(chatId);

        // Vérifier si l'utilisateur est admin
        const isAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(senderId);

        // Vérifier si le bot est admin
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isBotAdmin = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
            .includes(botId);

        if (!isAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Seuls les administrateurs peuvent utiliser cette commande !*' 
            });
            return;
        }

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Le bot doit être administrateur pour réinitialiser le lien du groupe !*' 
            });
            return;
        }

        // Réinitialisation du lien du groupe
        const newCode = await sock.groupRevokeInvite(chatId);

        // Envoi du nouveau lien
        await sock.sendMessage(chatId, {
            text: `✅ *Lien du groupe réinitialisé avec succès !*\n\n🔗 *Nouveau lien :*\nhttps://chat.whatsapp.com/${newCode}`
        });

    } catch (error) {
        console.error('Erreur resetlink :', error);
        await sock.sendMessage(chatId, {
            text: '❌ *Échec de la réinitialisation du lien du groupe !*'
        });
    }
}

module.exports = resetlinkCommand;
const clearCommand = async (sock, chatId) => {
    try {
        // Effet "en train d'écrire"
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        
        // Envoi du message initial
        const msg = await sock.sendMessage(chatId, { 
            text: '🧹 Nettoyage des messages du bot...' 
        });

        // Suppression du message envoyé
        await sock.sendMessage(chatId, { 
            delete: msg.key 
        });

    } catch (error) {
        console.error('❌ Erreur clearCommand :', error);
        
        await sock.sendMessage(chatId, { 
            text: '⚠️ Une erreur est survenue lors du nettoyage.' 
        });
    }
};

module.exports = { clearCommand };
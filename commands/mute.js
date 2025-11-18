const isAdmin = require('../lib/stvAdmin');

async function muteCommand(sock, chatId, senderId, message, durationInMinutes) {

    // Vérification admin
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(
            chatId,
            { text: '❗ Veuillez d’abord accorder les droits administrateur au bot.' },
            { quoted: message }
        );
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(
            chatId,
            { text: '❗ Seuls les administrateurs du groupe peuvent utiliser la commande *mute*.' },
            { quoted: message }
        );
        return;
    }

    try {
        // Mode annonce (silence du groupe)
        await sock.groupSettingUpdate(chatId, 'announcement');

        if (durationInMinutes !== undefined && durationInMinutes > 0) {
            const durationInMilliseconds = durationInMinutes * 60 * 1000;

            await sock.sendMessage(
                chatId,
                { text: `🔇 Le groupe a été mis en sourdine pendant *${durationInMinutes} minute(s)*.` },
                { quoted: message }
            );

            // Programmation du déverrouillage
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(chatId, 'not_announcement');
                    await sock.sendMessage(
                        chatId,
                        { text: '🔊 Le groupe a été réactivé.' }
                    );
                } catch (unmuteError) {
                    console.error('Erreur lors de la réactivation du groupe :', unmuteError);
                }
            }, durationInMilliseconds);

        } else {
            await sock.sendMessage(
                chatId,
                { text: '🔇 Le groupe a été mis en sourdine.' },
                { quoted: message }
            );
        }

    } catch (error) {
        console.error('Erreur mute/unmute :', error);

        await sock.sendMessage(
            chatId,
            { text: '❌ Une erreur est survenue lors de la mise en sourdine du groupe.' },
            { quoted: message }
        );
    }
}

module.exports = muteCommand;
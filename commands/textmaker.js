const mumaker = require('mumaker');

// Informations du canal
const channelInfo = {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363161513685998@newsletter',
        newsletterName: 'STV BOT MD',
        serverMessageId: -1
    }
};

// Templates de messages
const messageTemplates = {
    error: (msg) => ({
        text: msg,
        contextInfo: channelInfo
    }),
    success: (text, imageUrl) => ({
        image: { url: imageUrl },
        caption: "GÉNÉRÉ PAR STV BOT MD",
        contextInfo: channelInfo
    })
};

async function textmakerCommand(sock, chatId, message, q, type) {
    try {
        if (!q) {
            return await sock.sendMessage(
                chatId,
                messageTemplates.error("❌ Veuillez ajouter un texte.\nExemple : `.matrix STV`")
            );
        }

        const text = q.split(' ').slice(1).join(' ');

        if (!text) {
            return await sock.sendMessage(
                chatId,
                messageTemplates.error("❌ Texte manquant.\nExemple : `.fire STV`")
            );
        }

        let result;

        try {
            switch (type) {

                case 'matrix':
                    result = await mumaker.ephoto(
                        "https://en.ephoto360.com/matrix-text-effect-154.html",
                        text
                    );
                    break;

                case 'fire':
                    result = await mumaker.ephoto(
                        "https://en.ephoto360.com/flame-lettering-effect-372.html",
                        text
                    );
                    break;

                case 'hacker':
                    result = await mumaker.ephoto(
                        "https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html",
                        text
                    );
                    break;

                case '1917':
                    result = await mumaker.ephoto(
                        "https://en.ephoto360.com/1917-style-text-effect-523.html",
                        text
                    );
                    break;

                default:
                    return await sock.sendMessage(
                        chatId,
                        messageTemplates.error(
                            "❌ Commande invalide.\nCommandes disponibles : matrix, fire, hacker, 1917"
                        )
                    );
            }

            if (!result || !result.image) {
                throw new Error("Aucune image générée depuis l'API.");
            }

            await sock.sendMessage(
                chatId,
                messageTemplates.success(text, result.image)
            );

        } catch (err) {
            console.error("Erreur API TextMaker →", err);
            await sock.sendMessage(
                chatId,
                messageTemplates.error(`❌ Erreur pendant la génération : ${err.message}`)
            );
        }

    } catch (err) {
        console.error("Erreur textmakerCommand →", err);
        await sock.sendMessage(
            chatId,
            messageTemplates.error("❌ Une erreur interne s’est produite.")
        );
    }
}

module.exports = textmakerCommand;
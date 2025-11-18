const settings = require('../settings');

async function ownerCommand(sock, chatId, message) {
    if (!settings.botOwner || !settings.ownerNumber) {
        await sock.sendMessage(
            chatId,
            { text: "❌ Les informations du propriétaire du bot ne sont pas configurées correctement." },
            { quoted: message }
        );
        return;
    }

    const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${settings.botOwner}
TEL;waid=${settings.ownerNumber}:${settings.ownerNumber}
END:VCARD
`;

    await sock.sendMessage(chatId, {
        contacts: {
            displayName: settings.botOwner,
            contacts: [{ vcard }]
        }
    }, { quoted: message });
}

module.exports = ownerCommand;
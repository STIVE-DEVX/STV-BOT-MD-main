async function unmuteCommand(sock, chatId) {
    await sock.groupSettingUpdate(chatId, 'not_announcement'); // Rouvrir le groupe à tous
    await sock.sendMessage(chatId, { text: 'Le groupe a été réactivé (dé-mute).' });
}

module.exports = unmuteCommand;
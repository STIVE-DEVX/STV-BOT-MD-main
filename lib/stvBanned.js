const fs = require('fs');
const path = require('path');

const bannedFile = path.join(__dirname, '../data/banned.json');

function isBanned(userId) {
    try {
        // Vérifie si le fichier existe
        if (!fs.existsSync(bannedFile)) {
            fs.writeFileSync(bannedFile, JSON.stringify([]));
            return false;
        }

        const bannedUsers = JSON.parse(fs.readFileSync(bannedFile, 'utf8'));

        // Empêche une erreur si le fichier est corrompu
        if (!Array.isArray(bannedUsers)) return false;

        return bannedUsers.includes(userId);
    } catch (error) {
        console.error('Error checking banned status:', error);
        return false;
    }
}

module.exports = { isBanned };
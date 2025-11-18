const fs = require('fs');
const path = require('path');

// Chemin vers le fichier contenant les paramètres AntiLink
const antilinkFilePath = path.join(__dirname, '../data', 'antilinkSettings.json');

// Charger les paramètres AntiLink
function loadAntilinkSettings() {
    if (fs.existsSync(antilinkFilePath)) {
        const data = fs.readFileSync(antilinkFilePath);
        return JSON.parse(data);
    }
    return {};
}

// Sauvegarder les paramètres AntiLink
function saveAntilinkSettings(settings) {
    fs.writeFileSync(antilinkFilePath, JSON.stringify(settings, null, 2));
}

// Définir le statut AntiLink pour un groupe
function setAntilinkSetting(groupId, type) {
    const settings = loadAntilinkSettings();
    settings[groupId] = type;
    saveAntilinkSettings(settings);
}

// Obtenir le statut AntiLink d’un groupe
function getAntilinkSetting(groupId) {
    const settings = loadAntilinkSettings();
    return settings[groupId] || 'off';
}

module.exports = {
    setAntilinkSetting,
    getAntilinkSetting
};
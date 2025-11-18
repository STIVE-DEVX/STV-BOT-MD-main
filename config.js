require('dotenv').config();

// 🌐 APIs encore utiles et compatibles avec ton bot
global.APIs = {
    xteam: 'https://api.xteam.xyz',
    lol: 'https://api.lolhuman.xyz',
    neoxr: 'https://api.neoxr.my.id',
    zenz: 'https://zenzapis.xyz',
    fgmods: 'https://api-fgmods.ddns.net'
};

// 🔑 Clés API correspondantes
global.APIKeys = {
    'https://api.xteam.xyz': 'd90a9e986e18778b',
    'https://api.lolhuman.xyz': '85faf717d0545d14074659ad',
    'https://api.neoxr.my.id': 'yourkey',
    'https://zenzapis.xyz': 'yourkey',
    'https://api-fgmods.ddns.net': 'fg-dylux'
};

// ⚠️ Config globale
module.exports = {
    WARN_COUNT: 4,
    APIs: global.APIs,
    APIKeys: global.APIKeys
};
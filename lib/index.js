const fs = require('fs');
const path = require('path');

// Charger le fichier JSON (utilisateurs + groupes)
function loadUserGroupData() {
    try {
        const dataPath = path.join(__dirname, '../data/userGroupData.json');

        // Si le fichier n'existe pas → création
        if (!fs.existsSync(dataPath)) {
            const defaultData = {
                antibadword: {},
                antilink: {},
                welcome: {},
                goodbye: {},
                chatbot: {},
                warnings: {},
                sudo: []
            };

            fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }

        return JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur/groupe :', error);
        return {
            antibadword: {},
            antilink: {},
            welcome: {},
            goodbye: {},
            chatbot: {},
            warnings: {}
        };
    }
}

// Sauvegarder les données
function saveUserGroupData(data) {
    try {
        const dataPath = path.join(__dirname, '../data/userGroupData.json');

        // Vérifier/définir le dossier
        const dir = path.dirname(dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        return true;

    } catch (error) {
        console.error('Erreur lors de la sauvegarde des données :', error);
        return false;
    }
}

/* ==========================
   🔗 ANTI-LINK
   ========================== */
async function setAntilink(groupId, type, action) {
    try {
        const data = loadUserGroupData();
        if (!data.antilink) data.antilink = {};

        data.antilink[groupId] = {
            enabled: type === 'on',
            action: action || 'delete'
        };

        saveUserGroupData(data);
        return true;

    } catch (error) {
        console.error('Erreur setAntilink :', error);
        return false;
    }
}

async function getAntilink(groupId, type) {
    try {
        const data = loadUserGroupData();
        if (!data.antilink || !data.antilink[groupId]) return null;

        return type === 'on' ? data.antilink[groupId] : null;

    } catch (error) {
        console.error('Erreur getAntilink :', error);
        return null;
    }
}

async function removeAntilink(groupId) {
    try {
        const data = loadUserGroupData();

        if (data.antilink && data.antilink[groupId]) {
            delete data.antilink[groupId];
            saveUserGroupData(data);
        }
        return true;

    } catch (error) {
        console.error('Erreur removeAntilink :', error);
        return false;
    }
}

/* ==========================
   🏷️ ANTI-TAG
   ========================== */
async function setAntitag(groupId, type, action) {
    try {
        const data = loadUserGroupData();
        if (!data.antitag) data.antitag = {};

        data.antitag[groupId] = {
            enabled: type === 'on',
            action: action || 'delete'
        };

        saveUserGroupData(data);
        return true;

    } catch (error) {
        console.error('Erreur setAntitag :', error);
        return false;
    }
}

async function getAntitag(groupId, type) {
    try {
        const data = loadUserGroupData();
        if (!data.antitag || !data.antitag[groupId]) return null;

        return type === 'on' ? data.antitag[groupId] : null;

    } catch (error) {
        console.error('Erreur getAntitag :', error);
        return null;
    }
}

async function removeAntitag(groupId) {
    try {
        const data = loadUserGroupData();

        if (data.antitag?.[groupId]) {
            delete data.antitag[groupId];
            saveUserGroupData(data);
        }
        return true;

    } catch (error) {
        console.error('Erreur removeAntitag :', error);
        return false;
    }
}

/* ==========================
   ⚠️ WARN SYSTEM
   ========================== */
async function incrementWarningCount(groupId, userId) {
    try {
        const data = loadUserGroupData();

        if (!data.warnings[groupId]) data.warnings[groupId] = {};
        if (!data.warnings[groupId][userId]) data.warnings[groupId][userId] = 0;

        data.warnings[groupId][userId]++;
        saveUserGroupData(data);

        return data.warnings[groupId][userId];

    } catch (error) {
        console.error('Erreur incrementWarningCount :', error);
        return 0;
    }
}

async function resetWarningCount(groupId, userId) {
    try {
        const data = loadUserGroupData();

        if (data.warnings[groupId]?.[userId]) {
            data.warnings[groupId][userId] = 0;
            saveUserGroupData(data);
        }
        return true;

    } catch (error) {
        console.error('Erreur resetWarningCount :', error);
        return false;
    }
}

/* ==========================
   👑 SUDO USERS
   ========================== */
async function isSudo(userId) {
    try {
        const data = loadUserGroupData();
        return data.sudo?.includes(userId) || false;

    } catch (error) {
        console.error('Erreur isSudo :', error);
        return false;
    }
}

async function addSudo(userJid) {
    try {
        const data = loadUserGroupData();
        if (!data.sudo.includes(userJid)) {
            data.sudo.push(userJid);
            saveUserGroupData(data);
        }
        return true;

    } catch (error) {
        console.error('Erreur addSudo :', error);
        return false;
    }
}

async function removeSudo(userJid) {
    try {
        const data = loadUserGroupData();
        const idx = data.sudo.indexOf(userJid);

        if (idx !== -1) {
            data.sudo.splice(idx, 1);
            saveUserGroupData(data);
        }

        return true;

    } catch (error) {
        console.error('Erreur removeSudo :', error);
        return false;
    }
}

async function getSudoList() {
    try {
        const data = loadUserGroupData();
        return Array.isArray(data.sudo) ? data.sudo : [];

    } catch (error) {
        console.error('Erreur getSudoList :', error);
        return [];
    }
}

/* ==========================
   👋 WELCOME SYSTEM
   ========================== */
async function addWelcome(jid, enabled, message) {
    try {
        const data = loadUserGroupData();
        if (!data.wwelcome) data.welcome = {};

        data.welcome[jid] = {
            enabled: enabled,
            message: message || '👋 Bienvenue {user} dans {group} !',
            channelId: '120363161513685998@newsletter'
        };

        saveUserGroupData(data);
        return true;

    } catch (error) {
        console.error('Erreur addWelcome :', error);
        return false;
    }
}

async function delWelcome(jid) {
    try {
        const data = loadUserGroupData();

        if (data.welcome?.[jid]) {
            delete data.welcome[jid];
            saveUserGroupData(data);
        }

        return true;

    } catch (error) {
        console.error('Erreur delWelcome :', error);
        return false;
    }
}

async function isWelcomeOn(jid) {
    try {
        const data = loadUserGroupData();
        return data.welcome?.[jid]?.enabled || false;

    } catch (error) {
        console.error('Erreur isWelcomeOn :', error);
        return false;
    }
}

async function getWelcome(jid) {
    try {
        const data = loadUserGroupData();
        return data.welcome?.[jid]?.message || null;

    } catch (error) {
        console.error('Erreur getWelcome :', error);
        return null;
    }
}

/* ==========================
   👋 GOODBYE SYSTEM
   ========================== */
async function addGoodbye(jid, enabled, message) {
    try {
        const data = loadUserGroupData();
        if (!data.goodbye) data.goodbye = {};

        data.goodbye[jid] = {
            enabled: enabled,
            message: message || '👋 Au revoir {user} !',
            channelId: '120363161513685998@newsletter'
        };

        saveUserGroupData(data);
        return true;

    } catch (error) {
        console.error('Erreur addGoodbye :', error);
        return false;
    }
}

async function delGoodBye(jid) {
    try {
        const data = loadUserGroupData();

        if (data.goodbye?.[jid]) {
            delete data.goodbye[jid];
            saveUserGroupData(data);
        }

        return true;

    } catch (error) {
        console.error('Erreur delGoodBye :', error);
        return false;
    }
}

async function isGoodByeOn(jid) {
    try {
        const data = loadUserGroupData();
        return data.goodbye?.[jid]?.enabled || false;

    } catch (error) {
        console.error('Erreur isGoodByeOn :', error);
        return false;
    }
}

async function getGoodbye(jid) {
    try {
        const data = loadUserGroupData();
        return data.goodbye?.[jid]?.message || null;

    } catch (error) {
        console.error('Erreur getGoodbye :', error);
        return null;
    }
}

/* ==========================
   😈 ANTI-BADWORD
   ========================== */
async function setAntiBadword(groupId, type, action) {
    try {
        const data = loadUserGroupData();
        if (!data.antibadword) data.antibadword = {};

        data.antibadword[groupId] = {
            enabled: type === 'on',
            action: action || 'delete'
        };

        saveUserGroupData(data);
        return true;

    } catch (error) {
        console.error('Erreur setAntiBadword :', error);
        return false;
    }
}

async function getAntiBadword(groupId, type) {
    try {
        const data = loadUserGroupData();

        if (!data.antibadword?.[groupId]) return null;

        return type === 'on' ? data.antibadword[groupId] : null;

    } catch (error) {
        console.error('Erreur getAntiBadword :', error);
        return null;
    }
}

async function removeAntiBadword(groupId) {
    try {
        const data = loadUserGroupData();

        if (data.antibadword?.[groupId]) {
            delete data.antibadword[groupId];
            saveUserGroupData(data);
        }

        return true;

    } catch (error) {
        console.error('Erreur removeAntiBadword :', error);
        return false;
    }
}

/* ==========================
   🤖 CHATBOT GROUP
   ========================== */
async function setChatbot(groupId, enabled) {
    try {
        const data = loadUserGroupData();

        data.chatbot[groupId] = { enabled };
        saveUserGroupData(data);

        return true;

    } catch (error) {
        console.error('Erreur setChatbot :', error);
        return false;
    }
}

async function getChatbot(groupId) {
    try {
        const data = loadUserGroupData();
        return data.chatbot[groupId] || null;

    } catch (error) {
        console.error('Erreur getChatbot :', error);
        return null;
    }
}

async function removeChatbot(groupId) {
    try {
        const data = loadUserGroupData();

        if (data.chatbot?.[groupId]) {
            delete data.chatbot[groupId];
            saveUserGroupData(data);
        }

        return true;

    } catch (error) {
        console.error('Erreur removeChatbot :', error);
        return false;
    }
}

/* ==========================
   EXPORT
   ========================== */
module.exports = {
    setAntilink,
    getAntilink,
    removeAntilink,

    setAntitag,
    getAntitag,
    removeAntitag,

    incrementWarningCount,
    resetWarningCount,

    isSudo,
    addSudo,
    removeSudo,
    getSudoList,

    addWelcome,
    delWelcome,
    isWelcomeOn,
    getWelcome,

    addGoodbye,
    delGoodBye,
    isGoodByeOn,
    getGoodbye,

    setAntiBadword,
    getAntiBadword,
    removeAntiBadword,

    setChatbot,
    getChatbot,
    removeChatbot
};
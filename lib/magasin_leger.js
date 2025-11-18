const fs = require('fs');
const STORE_FILE = './baileys_store.json';

// Configuration : conserver les 20 derniers messages par chat (modifiable dans settings.js)
let MAX_MESSAGES = 20;

// Charger configuration depuis settings.js si présent
try {
    const settings = require('../settings.js');
    if (settings.maxStoreMessages && typeof settings.maxStoreMessages === 'number') {
        MAX_MESSAGES = settings.maxStoreMessages;
    }
} catch (e) {
    // settings.js absent → utiliser valeur par défaut
}

const store = {
    messages: {},
    contacts: {},
    chats: {},

    // Charger les données du store
    readFromFile(filePath = STORE_FILE) {
        try {
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                this.contacts = data.contacts || {};
                this.chats = data.chats || {};
                this.messages = data.messages || {};

                // Convertir ancien format si nécessaire
                this.cleanupData();
            }
        } catch (e) {
            console.warn('⚠️ Impossible de lire le store :', e.message);
        }
    },

    // Sauvegarder les données du store
    writeToFile(filePath = STORE_FILE) {
        try {
            const data = JSON.stringify({
                contacts: this.contacts,
                chats: this.chats,
                messages: this.messages
            });

            fs.writeFileSync(filePath, data);
        } catch (e) {
            console.warn('⚠️ Impossible d’écrire le store :', e.message);
        }
    },

    // Nettoyage et conversion d'ancien format
    cleanupData() {
        if (!this.messages) return;

        Object.keys(this.messages).forEach(jid => {
            const chatMsg = this.messages[jid];

            // Ancien format → convertir en tableau
            if (typeof chatMsg === 'object' && !Array.isArray(chatMsg)) {
                const converted = Object.values(chatMsg);
                this.messages[jid] = converted.slice(-MAX_MESSAGES);
            }
        });
    },

    // Bind aux événements Baileys
    bind(ev) {
        ev.on('messages.upsert', ({ messages }) => {
            messages.forEach(msg => {
                const jid = msg.key?.remoteJid;
                if (!jid) return;

                if (!this.messages[jid]) {
                    this.messages[jid] = [];
                }

                this.messages[jid].push(msg);

                // Retirer les anciens messages selon la limite
                if (this.messages[jid].length > MAX_MESSAGES) {
                    this.messages[jid] = this.messages[jid].slice(-MAX_MESSAGES);
                }
            });
        });

        ev.on('contacts.update', contacts => {
            contacts.forEach(contact => {
                if (contact.id) {
                    this.contacts[contact.id] = {
                        id: contact.id,
                        name: contact.notify || contact.name || ''
                    };
                }
            });
        });

        ev.on('chats.set', chats => {
            this.chats = {};
            chats.forEach(chat => {
                this.chats[chat.id] = {
                    id: chat.id,
                    subject: chat.subject || ''
                };
            });
        });
    },

    // Charger un message spécifique en mémoire
    async loadMessage(jid, id) {
        return this.messages[jid]?.find(m => m.key.id === id) || null;
    },

    // Statistiques du store
    getStats() {
        let totalMessages = 0;

        Object.values(this.messages).forEach(msgList => {
            if (Array.isArray(msgList)) {
                totalMessages += msgList.length;
            }
        });

        return {
            messages: totalMessages,
            contacts: Object.keys(this.contacts).length,
            chats: Object.keys(this.chats).length,
            maxMessagesPerChat: MAX_MESSAGES
        };
    }
};

module.exports = store;
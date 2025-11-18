const fs = require('fs');
const path = require('path');

// Liste d’emojis pour les réactions aux commandes
const commandEmojis = ['⏳'];

// Chemin pour stocker l’état des auto-réactions
const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// Charger l’état des auto-réactions
function loadAutoReactionState() {
    try {
        if (fs.existsSync(USER_GROUP_DATA)) {
            const data = JSON.parse(fs.readFileSync(USER_GROUP_DATA));
            return data.autoReaction || false;
        }
    } catch (error) {
        console.error('Erreur lors du chargement de l’état des auto-réactions :', error);
    }
    return false;
}

// Sauvegarder l’état des auto-réactions
function saveAutoReactionState(state) {
    try {
        const data = fs.existsSync(USER_GROUP_DATA) 
            ? JSON.parse(fs.readFileSync(USER_GROUP_DATA))
            : { groups: [], chatbot: {} };
        
        data.autoReaction = state;
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l’état des auto-réactions :', error);
    }
}

// Stockage interne de l’état
let isAutoReactionEnabled = loadAutoReactionState();

function getRandomEmoji() {
    return commandEmojis[0];
}

// Ajouter une réaction sur un message de commande
async function addCommandReaction(sock, message) {
    try {
        if (!isAutoReactionEnabled || !message?.key?.id) return;
        
        const emoji = getRandomEmoji();
        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout d’une réaction :', error);
    }
}

// Gérer la commande .areact
async function handleAreactCommand(sock, chatId, message, isOwner) {
    try {
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ Cette commande est réservée au propriétaire du bot !',
                quoted: message
            });
            return;
        }

        const args = message.message?.conversation?.split(' ') || [];
        const action = args[1]?.toLowerCase();

        if (action === 'on') {
            isAutoReactionEnabled = true;
            saveAutoReactionState(true);
            await sock.sendMessage(chatId, { 
                text: '✅ Les auto-réactions ont été activées globalement.',
                quoted: message
            });
        } else if (action === 'off') {
            isAutoReactionEnabled = false;
            saveAutoReactionState(false);
            await sock.sendMessage(chatId, { 
                text: '✅ Les auto-réactions ont été désactivées globalement.',
                quoted: message
            });
        } else {
            const currentState = isAutoReactionEnabled ? 'activées' : 'désactivées';
            await sock.sendMessage(chatId, { 
                text: `Les auto-réactions sont actuellement **${currentState}** globalement.\n\nUtilisation :\n.areact on  → Activer les auto-réactions\n.areact off → Désactiver les auto-réactions`,
                quoted: message
            });
        }
    } catch (error) {
        console.error('Erreur lors du traitement de la commande areact :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Une erreur s’est produite lors du contrôle des auto-réactions.',
            quoted: message
        });
    }
}

module.exports = {
    addCommandReaction,
    handleAreactCommand
};
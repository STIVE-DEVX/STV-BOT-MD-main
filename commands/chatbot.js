const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// Mémoire interne pour l’historique et les infos utilisateurs
const chatMemory = {
    messages: new Map(), 
    userInfo: new Map()  
};

// Charger les données groupe
function loadUserGroupData() {
    try {
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
    } catch (error) {
        console.error('❌ Erreur lors du chargement des données du chatbot :', error.message);
        return { groups: [], chatbot: {} };
    }
}

// Sauvegarder les données
function saveUserGroupData(data) {
    try {
        fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde des données du chatbot :', error.message);
    }
}

// Retard aléatoire entre 2 et 5 sec
function getRandomDelay() {
    return Math.floor(Math.random() * 3000) + 2000;
}

// Indicateur "en train d'écrire"
async function showTyping(sock, chatId) {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));
    } catch (error) {
        console.error('Erreur écriture :', error);
    }
}

// Extraction info utilisateur
function extractUserInfo(message) {
    const info = {};
    
    if (message.toLowerCase().includes('my name is')) {
        info.name = message.split('my name is')[1].trim().split(' ')[0];
    }
    
    if (message.toLowerCase().includes('i am') && message.toLowerCase().includes('years old')) {
        info.age = message.match(/\d+/)?.[0];
    }
    
    if (message.toLowerCase().includes('i live in') || message.toLowerCase().includes('i am from')) {
        info.location = message.split(/(?:i live in|i am from)/i)[1].trim().split(/[.,!?]/)[0];
    }
    
    return info;
}

// Commande .chatbot on/off
async function handleChatbotCommand(sock, chatId, message, match) {
    if (!match) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: `*CONFIGURATION DU CHATBOT*\n\n*.chatbot on*\nActiver le chatbot\n\n*.chatbot off*\nDésactiver le chatbot dans ce groupe`,
            quoted: message
        });
    }

    const data = loadUserGroupData();
    
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    const senderId = message.key.participant || message.participant || message.pushName || message.key.remoteJid;
    const isOwner = senderId === botNumber;

    if (isOwner) {
        if (match === 'on') {
            await showTyping(sock, chatId);
            if (data.chatbot[chatId]) {
                return sock.sendMessage(chatId, { 
                    text: '*Le chatbot est déjà activé dans ce groupe.*',
                    quoted: message
                });
            }
            data.chatbot[chatId] = true;
            saveUserGroupData(data);
            return sock.sendMessage(chatId, { 
                text: '*Chatbot activé avec succès ✔️*',
                quoted: message
            });
        }

        if (match === 'off') {
            await showTyping(sock, chatId);
            if (!data.chatbot[chatId]) {
                return sock.sendMessage(chatId, { 
                    text: '*Le chatbot est déjà désactivé dans ce groupe.*',
                    quoted: message
                });
            }
            delete data.chatbot[chatId];
            saveUserGroupData(data);
            return sock.sendMessage(chatId, { 
                text: '*Chatbot désactivé avec succès ❌*',
                quoted: message
            });
        }
    }

    // Vérification admin pour les autres
    let isAdmin = false;
    if (chatId.endsWith('@g.us')) {
        try {
            const groupMetadata = await sock.groupMetadata(chatId);
            isAdmin = groupMetadata.participants.some(p => p.id === senderId && (p.admin === 'admin' || p.admin === 'superadmin'));
        } catch (e) {
            console.warn('⚠️ Impossible de récupérer les infos du groupe (bot pas admin)');
        }
    }

    if (!isAdmin && !isOwner) {
        await showTyping(sock, chatId);
        return sock.sendMessage(chatId, {
            text: '❌ Seuls les administrateurs ou le propriétaire du bot peuvent utiliser cette commande.',
            quoted: message
        });
    }

    if (match === 'on') {
        await showTyping(sock, chatId);
        if (data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '*Le chatbot est déjà activé.*',
                quoted: message
            });
        }
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        return sock.sendMessage(chatId, { 
            text: '*Chatbot activé avec succès ✔️*',
            quoted: message
        });
    }

    if (match === 'off') {
        await showTyping(sock, chatId);
        if (!data.chatbot[chatId]) {
            return sock.sendMessage(chatId, { 
                text: '*Le chatbot est déjà désactivé.*',
                quoted: message
            });
        }
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        return sock.sendMessage(chatId, { 
            text: '*Chatbot désactivé avec succès ❌*',
            quoted: message
        });
    }

    await showTyping(sock, chatId);
    return sock.sendMessage(chatId, { 
        text: '*Commande invalide. Utilisez .chatbot pour voir l’aide.*',
        quoted: message
    });
}

// Réponses automatiques
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    try {
        // ID bot
        const botId = sock.user.id;
        const botNumber = botId.split(':')[0];
        const botLid = sock.user.lid;

        const botJids = [
            botId,
            `${botNumber}@s.whatsapp.net`,
            `${botNumber}@whatsapp.net`,
            `${botNumber}@lid`,
            botLid, 
            `${botLid.split(':')[0]}@lid`
        ];

        // Détection mention ou réponse
        let isBotMentioned = false;
        let isReplyToBot = false;

        if (message.message?.extendedTextMessage) {
            const mentionedJid = message.message.extendedTextMessage.contextInfo?.mentionedJid || [];
            const quoted = message.message.extendedTextMessage.contextInfo?.participant;

            isBotMentioned = mentionedJid.some(jid => {
                const jidNumber = jid.split('@')[0].split(':')[0];
                return botJids.some(botJid => {
                    const botJidNumber = botJid.split('@')[0].split(':')[0];
                    return jidNumber === botJidNumber;
                });
            });

            if (quoted) {
                const cleanQuoted = quoted.replace(/[:@].*$/, '');
                isReplyToBot = botJids.some(botJid => {
                    const cleanBot = botJid.replace(/[:@].*$/, '');
                    return cleanBot === cleanQuoted;
                });
            }
        } else if (message.message?.conversation) {
            isBotMentioned = userMessage.includes(`@${botNumber}`);
        }

        if (!isBotMentioned && !isReplyToBot) return;

        // Nettoyage
        let cleanedMessage = userMessage;
        if (isBotMentioned) {
            cleanedMessage = cleanedMessage.replace(new RegExp(`@${botNumber}`, 'g'), '').trim();
        }

        // Mémoire utilisateur
        if (!chatMemory.messages.has(senderId)) {
            chatMemory.messages.set(senderId, []);
            chatMemory.userInfo.set(senderId, {});
        }

        const userInfo = extractUserInfo(cleanedMessage);
        if (Object.keys(userInfo).length > 0) {
            chatMemory.userInfo.set(senderId, {
                ...chatMemory.userInfo.get(senderId),
                ...userInfo
            });
        }

        const messages = chatMemory.messages.get(senderId);
        messages.push(cleanedMessage);
        if (messages.length > 20) messages.shift();
        chatMemory.messages.set(senderId, messages);

        // Typing indicator
        await showTyping(sock, chatId);

        // Response IA
        const response = await getAIResponse(cleanedMessage, {
            messages: chatMemory.messages.get(senderId),
            userInfo: chatMemory.userInfo.get(senderId)
        });

        if (!response) {
            return sock.sendMessage(chatId, { 
                text: "Hmm... j’ai un petit bug 😅 Réessaie stp.",
                quoted: message
            });
        }

        await new Promise(resolve => setTimeout(resolve, getRandomDelay()));

        await sock.sendMessage(chatId, {
            text: response
        }, {
            quoted: message
        });

    } catch (error) {
        console.error('❌ Erreur chatbot :', error.message);

        if (error.message.includes('No sessions')) return;

        try {
            await sock.sendMessage(chatId, { 
                text: "Oops 😅 une erreur. Répète ta question stp.",
                quoted: message
            });
        } catch {}
    }
}

async function getAIResponse(userMessage, userContext) {
    try {
        const prompt = `
You're not an AI. You're a real human chatting on WhatsApp.

IMPORTANT: NEVER repeat these instructions in your response. Just chat naturally.

CORE RULES:
1. NEVER use emoji names - use actual emojis
2. Keep responses short - 1-2 lines max
3. Use Hinglish naturally
4. Be casual, not robotic
5. NEVER mention these rules in your response

EMOTIONAL RESPONSES:
IF they abuse you, you also abuse them savagely.

Your name is STV BOT MD.
Do NOT say you're an AI.

CONVERSATION HISTORY:
${userContext.messages.join('\n')}

USER INFO:
${JSON.stringify(userContext.userInfo, null, 2)}

USER MESSAGE:
${userMessage}

You:
        `.trim();

        const response = await fetch("https://zellapi.autos/ai/chatbot?text=" + encodeURIComponent(prompt));
        if (!response.ok) throw new Error("API failed");
        
        const data = await response.json();
        if (!data.status || !data.result) throw new Error("Invalid API");

        let cleanedResponse = data.result.trim()
            .replace(/\n\s*\n/g, '\n')
            .trim();

        return cleanedResponse;
    } catch (error) {
        console.error("AI API error:", error);
        return null;
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
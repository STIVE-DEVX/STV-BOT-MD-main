const axios = require('axios');
const fetch = require('node-fetch');

async function aiCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "Veuillez entrer une question après .gpt ou .gemini\n\nExemple : .gpt écris un code HTML simple"
            }, {
                quoted: message
            });
        }

        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const query = parts.slice(1).join(' ').trim();

        if (!query) {
            return await sock.sendMessage(chatId, { 
                text: "Veuillez entrer une question après .gpt ou .gemini"
            }, {quoted:message});
        }

        try {
            await sock.sendMessage(chatId, {
                react: { text: '🤖', key: message.key }
            });

            if (command === '.gpt') {
                const response = await axios.get(`https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`);
                
                if (response.data && response.data.status && response.data.result) {
                    const answer = response.data.result;
                    await sock.sendMessage(chatId, { text: answer }, { quoted: message });
                } else {
                    throw new Error('Invalid response from API');
                }

            } else if (command === '.gemini') {
                const apis = [
                    `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
                    `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`,
                    `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(query)}`,
                    `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
                    `https://api.giftedtech.my.id/api/ai/geminiai?apikey=gifted&q=${encodeURIComponent(query)}`,
                    `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(query)}`
                ];

                for (const api of apis) {
                    try {
                        const response = await fetch(api);
                        const data = await response.json();

                        if (data.message || data.data || data.answer || data.result) {
                            const answer = data.message || data.data || data.answer || data.result;
                            await sock.sendMessage(chatId, { text: answer }, { quoted: message });
                            return;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                throw new Error('All Gemini APIs failed');
            }

        } catch (error) {
            await sock.sendMessage(chatId, {
                text: "❌ Impossible d'obtenir une réponse. Réessayez plus tard.",
                contextInfo: {
                    mentionedJid: [message.key.participant || message.key.remoteJid],
                    quotedMessage: message.message
                }
            }, { quoted: message });
        }
    } catch (error) {
        await sock.sendMessage(chatId, {
            text: "❌ Une erreur est survenue. Réessayez plus tard.",
            contextInfo: {
                mentionedJid: [message.key.participant || message.key.remoteJid],
                quotedMessage: message.message
            }
        }, { quoted: message });
    }
}

module.exports = aiCommand;
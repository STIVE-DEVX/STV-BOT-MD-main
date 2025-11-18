const axios = require('axios');
const { sleep } = require('../lib/utils');

async function pairCommand(sock, chatId, message, q) {
    try {
        if (!q) {
            return await sock.sendMessage(chatId, {
                text: "Veuillez fournir un numéro WhatsApp valide.\n\nExemple : *.pair 23765895XXXX*",
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'STV BOT MD',
                        serverMessageId: -1
                    }
                }
            });
        }

        // Nettoyage et vérification des numéros
        const numbers = q.split(',')
            .map((v) => v.replace(/[^0-9]/g, ''))
            .filter((v) => v.length > 5 && v.length < 20);

        if (numbers.length === 0) {
            return await sock.sendMessage(chatId, {
                text: "❌ Numéro invalide ! Veuillez utiliser le bon format.",
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'STV BOT MD',
                        serverMessageId: -1
                    }
                }
            });
        }

        for (const number of numbers) {
            const whatsappID = number + '@s.whatsapp.net';
            const result = await sock.onWhatsApp(whatsappID);

            if (!result[0]?.exists) {
                return await sock.sendMessage(chatId, {
                    text: "❌ Ce numéro n'est pas enregistré sur WhatsApp.",
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363161513685998@newsletter',
                            newsletterName: 'STV BOT MD',
                            serverMessageId: -1
                        }
                    }
                });
            }

            await sock.sendMessage(chatId, {
                text: "Veuillez patienter pendant la génération du code...",
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'STV BOT MD',
                        serverMessageId: -1
                    }
                }
            });

            try {
                const response = await axios.get(`https://knight-bot-paircode.onrender.com/code?number=${number}`);

                if (response.data && response.data.code) {
                    const code = response.data.code;

                    if (code === "Service Unavailable") {
                        throw new Error('Service Unavailable');
                    }

                    await sleep(5000);

                    await sock.sendMessage(chatId, {
                        text: `✅ *Voici votre code de connexion :* ${code}\n\nUtilisez-le dans WhatsApp pour finaliser la connexion.`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363161513685998@newsletter',
                                newsletterName: 'STV BOT MD',
                                serverMessageId: -1
                            }
                        }
                    });
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (apiError) {
                console.error('API Error:', apiError);

                const errorMessage =
                    apiError.message === 'Service Unavailable'
                    ? "⚠️ Le service est actuellement indisponible. Veuillez réessayer plus tard."
                    : "❌ Impossible de générer le code pour l’instant. Veuillez réessayer plus tard.";

                await sock.sendMessage(chatId, {
                    text: errorMessage,
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363161513685998@newsletter',
                            newsletterName: 'STV BOT MD',
                            serverMessageId: -1
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error(error);
        await sock.sendMessage(chatId, {
            text: "❌ Une erreur s'est produite. Veuillez réessayer plus tard.",
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'STV BOT MD',
                    serverMessageId: -1
                }
            }
        });
    }
}

module.exports = pairCommand;
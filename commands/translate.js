const fetch = require('node-fetch');

async function handleTranslateCommand(sock, chatId, message, match) {
    try {
        // Afficher "en train d'écrire"
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        let textToTranslate = '';
        let lang = '';

        // Vérifier si l'utilisateur répond à un message
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMessage) {
            // Récupérer texte du message cité
            textToTranslate = quotedMessage.conversation || 
                            quotedMessage.extendedTextMessage?.text || 
                            quotedMessage.imageMessage?.caption || 
                            quotedMessage.videoMessage?.caption || 
                            '';

            // Langue récupérée dans la commande
            lang = match.trim();
        } else {
            // Si message direct : analyse des arguments
            const args = match.trim().split(' ');
            if (args.length < 2) {
                return sock.sendMessage(chatId, {
                    text: `*TRADUCTEUR*

Utilisation :
1️⃣ Répondre à un message avec : *.translate <lang>* ou *.trt <lang>*  
2️⃣ Ou taper : *.translate <texte> <lang>* ou *.trt <texte> <lang>*

Exemples :
.translate hello fr  
.trt bonjour en  

Codes langues :
fr - Français  
en - Anglais  
es - Espagnol  
de - Allemand  
it - Italien  
pt - Portugais  
ru - Russe  
ja - Japonais  
ko - Coréen  
zh - Chinois  
ar - Arabe  
hi - Hindi`,
                    quoted: message
                });
            }

            // Dernier argument = langue
            lang = args.pop();
            // Le reste = texte
            textToTranslate = args.join(' ');
        }

        if (!textToTranslate) {
            return sock.sendMessage(chatId, {
                text: '❌ Aucun texte trouvé à traduire. Réponds à un message ou ajoute du texte.',
                quoted: message
            });
        }

        // Essai des différentes API
        let translatedText = null;
        let error = null;

        // API 1 : Google Translate
        try {
            const response = await fetch(
                `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(textToTranslate)}`
            );
            if (response.ok) {
                const data = await response.json();
                if (data?.[0]?.[0]?.[0]) {
                    translatedText = data[0][0][0];
                }
            }
        } catch (e) {
            error = e;
        }

        // API 2 : MyMemory
        if (!translatedText) {
            try {
                const response = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${lang}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data?.responseData?.translatedText) {
                        translatedText = data.responseData.translatedText;
                    }
                }
            } catch (e) {
                error = e;
            }
        }

        // API 3 : Dreaded API
        if (!translatedText) {
            try {
                const response = await fetch(
                    `https://api.dreaded.site/api/translate?text=${encodeURIComponent(textToTranslate)}&lang=${lang}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data?.translated) {
                        translatedText = data.translated;
                    }
                }
            } catch (e) {
                error = e;
            }
        }

        if (!translatedText) {
            throw new Error('Toutes les API de traduction ont échoué');
        }

        // Envoyer la traduction
        await sock.sendMessage(chatId, {
            text: `${translatedText}`,
        }, {
            quoted: message
        });

    } catch (error) {
        console.error('❌ Erreur dans la commande translate :', error);
        await sock.sendMessage(chatId, {
            text: `❌ Impossible de traduire le texte. Réessayez plus tard.

Utilisation :
1️⃣ Répondre à un message avec : *.translate <lang>* ou *.trt <lang>*  
2️⃣ Ou taper : *.translate <texte> <lang>* ou *.trt <texte> <lang>*`,
            quoted: message
        });
    }
}

module.exports = {
    handleTranslateCommand
};
const { addWelcome, delWelcome, isWelcomeOn, addGoodbye, delGoodBye, isGoodByeOn } = require('../lib/index');
const { delay } = require('@whiskeysockets/baileys');

async function handleWelcome(sock, chatId, message, match) {
    if (!match) {
        return sock.sendMessage(chatId, {
            text: `📥 *Configuration du message de bienvenue*\n\n✅ *.welcome on* — Activer les messages de bienvenue\n🛠️ *.welcome set Votre message personnalisé* — Définir un message personnalisé\n🚫 *.welcome off* — Désactiver les messages de bienvenue\n\n*Variables disponibles :*\n• {user} - Mentionne le nouveau membre\n• {group} - Affiche le nom du groupe\n• {description} - Affiche la description du groupe`,
            quoted: message
        });
    }

    const [command, ...args] = match.split(' ');
    const lowerCommand = command.toLowerCase();
    const customMessage = args.join(' ');

    if (lowerCommand === 'on') {
        if (await isWelcomeOn(chatId)) {
            return sock.sendMessage(chatId, { text: '⚠️ Les messages de bienvenue sont *déjà activés*.', quoted: message });
        }
        await addWelcome(chatId, true, 'Bienvenue {user} dans {group} ! 🎉');
        return sock.sendMessage(chatId, { text: '✅ Messages de bienvenue *activés*. Utilisez *.welcome set [votre message]* pour personnaliser.', quoted: message });
    }

    if (lowerCommand === 'off') {
        if (!(await isWelcomeOn(chatId))) {
            return sock.sendMessage(chatId, { text: '⚠️ Les messages de bienvenue sont *déjà désactivés*.', quoted: message });
        }
        await delWelcome(chatId);
        return sock.sendMessage(chatId, { text: '✅ Messages de bienvenue *désactivés* pour ce groupe.', quoted: message });
    }

    if (lowerCommand === 'set') {
        if (!customMessage) {
            return sock.sendMessage(chatId, { text: '⚠️ Veuillez fournir un message personnalisé. Exemple : *.welcome set Bienvenue dans le groupe !*', quoted: message });
        }
        await addWelcome(chatId, true, customMessage);
        return sock.sendMessage(chatId, { text: '✅ Message de bienvenue personnalisé *défini avec succès*.', quoted: message });
    }

    return sock.sendMessage(chatId, {
        text: `❌ Commande invalide. Utilisez :\n*.welcome on* - Activer\n*.welcome set [message]* - Personnaliser\n*.welcome off* - Désactiver`,
        quoted: message
    });
}

async function handleGoodbye(sock, chatId, message, match) {
    const lower = match?.toLowerCase();

    if (!match) {
        return sock.sendMessage(chatId, {
            text: `📤 *Configuration du message d’au revoir*\n\n✅ *.goodbye on* — Activer les messages d’au revoir\n🛠️ *.goodbye set Votre message personnalisé* — Définir un message d’au revoir\n🚫 *.goodbye off* — Désactiver les messages d’au revoir\n\n*Variables disponibles :*\n• {user} - Mentionne le membre qui quitte\n• {group} - Affiche le nom du groupe`,
            quoted: message
        });
    }

    if (lower === 'on') {
        if (await isGoodByeOn(chatId)) {
            return sock.sendMessage(chatId, { text: '⚠️ Les messages d’au revoir sont *déjà activés*.', quoted: message });
        }
        await addGoodbye(chatId, true, 'Au revoir {user} 👋');
        return sock.sendMessage(chatId, { text: '✅ Messages d’au revoir *activés*. Utilisez *.goodbye set [votre message]* pour personnaliser.', quoted: message });
    }

    if (lower === 'off') {
        if (!(await isGoodByeOn(chatId))) {
            return sock.sendMessage(chatId, { text: '⚠️ Les messages d’au revoir sont *déjà désactivés*.', quoted: message });
        }
        await delGoodBye(chatId);
        return sock.sendMessage(chatId, { text: '✅ Messages d’au revoir *désactivés* pour ce groupe.', quoted: message });
    }

    if (lower.startsWith('set ')) {
        const customMessage = match.substring(4);
        if (!customMessage) {
            return sock.sendMessage(chatId, { text: '⚠️ Veuillez fournir un message personnalisé. Exemple : *.goodbye set À bientôt !*', quoted: message });
        }
        await addGoodbye(chatId, true, customMessage);
        return sock.sendMessage(chatId, { text: '✅ Message d’au revoir personnalisé *défini avec succès*.', quoted: message });
    }

    return sock.sendMessage(chatId, {
        text: `❌ Commande invalide. Utilisez :\n*.goodbye on* - Activer\n*.goodbye set [message]* - Personnaliser\n*.goodbye off* - Désactiver`,
        quoted: message
    });
}

module.exports = { handleWelcome, handleGoodbye };
// Ce code gère les messages de bienvenue et d’au revoir dans un groupe WhatsApp via la librairie Baileys.
const fs = require('fs');
const isOwnerOrSudo = require('../lib/stvOwner');

const PMBLOCKER_PATH = './data/pmblocker.json';

// Lire l'état actuel
function readState() {
    try {
        if (!fs.existsSync(PMBLOCKER_PATH)) {
            return { 
                enabled: false, 
                message: '⚠️ Les messages privés sont bloqués !\nVous ne pouvez pas écrire en DM au bot. Merci de le contacter uniquement dans un groupe.'
            };
        }

        const raw = fs.readFileSync(PMBLOCKER_PATH, 'utf8');
        const data = JSON.parse(raw || '{}');

        return {
            enabled: !!data.enabled,
            message: typeof data.message === 'string' && data.message.trim() 
                ? data.message 
                : '⚠️ Les messages privés sont bloqués !\nVous ne pouvez pas écrire en DM au bot.'
        };
    } catch {
        return { 
            enabled: false, 
            message: '⚠️ Les messages privés sont bloqués !\nVous ne pouvez pas écrire en DM au bot.'
        };
    }
}

// Écrire un nouvel état
function writeState(enabled, message) {
    try {
        if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
        
        const current = readState();
        const payload = {
            enabled: !!enabled,
            message: typeof message === 'string' && message.trim() 
                ? message 
                : current.message
        };

        fs.writeFileSync(PMBLOCKER_PATH, JSON.stringify(payload, null, 2));
    } catch {}
}

// Commande PMBLOCKER
async function pmblockerCommand(sock, chatId, message, args) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

    // Vérification propriétaire
    if (!message.key.fromMe && !isOwner) {
        await sock.sendMessage(chatId, { 
            text: '❌ Seul le propriétaire du bot peut utiliser cette commande.' 
        }, { quoted: message });
        return;
    }

    const argStr = (args || '').trim();
    const [sub, ...rest] = argStr.split(' ');
    const state = readState();

    // Menu
    if (!sub || !['on', 'off', 'status', 'setmsg'].includes(sub.toLowerCase())) {
        await sock.sendMessage(
            chatId,
            { 
                text: `📛 *PMBLOCKER — Commande Propriétaire*\n
.pmblocker on — Activer le blocage DM  
.pmblocker off — Désactiver le blocage  
.pmblocker status — Voir l'état actuel  
.pmblocker setmsg <texte> — Modifier le message d'avertissement`
            },
            { quoted: message }
        );
        return;
    }

    // Status
    if (sub.toLowerCase() === 'status') {
        await sock.sendMessage(
            chatId, 
            { text: `📌 *État du PM Blocker :* ${state.enabled ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ'}\n\n📨 *Message actuel :*\n${state.message}` },
            { quoted: message }
        );
        return;
    }

    // Modification du message
    if (sub.toLowerCase() === 'setmsg') {
        const newMsg = rest.join(' ').trim();

        if (!newMsg) {
            await sock.sendMessage(chatId, { text: 'Usage : .pmblocker setmsg <votre message>' }, { quoted: message });
            return;
        }

        writeState(state.enabled, newMsg);

        await sock.sendMessage(chatId, { 
            text: '✅ Message du PM Blocker mis à jour.' 
        }, { quoted: message });

        return;
    }

    // Activation / désactivation
    const enable = sub.toLowerCase() === 'on';
    writeState(enable);

    await sock.sendMessage(
        chatId, 
        { text: `⚙️ PM Blocker est maintenant *${enable ? 'ACTIVÉ 🟢' : 'DÉSACTIVÉ 🔴'}*.` },
        { quoted: message }
    );
}

module.exports = { pmblockerCommand, readState };
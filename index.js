/**
 * STV BOT MD - Un Bot WhatsApp
 * Copyright (c) 2024 STIVO TECH
 * 
 * Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier
 * selon les termes de la licence MIT.
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/metaSticker')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/utils')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
// Utilisation d'un magasin léger persistant au lieu de makeInMemoryStore (compat across versions)
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// Import du magasin léger
const store = require('./lib/magasin_leger')

// Initialisation du magasin
store.readFromFile()
const settings = require('./settings')

// Définir le lien de la chaîne global à partir des settings (si présent)
global.channel = settings.channelLink || "https://whatsapp.com/channel/0029Vb6nKuV8vd1M1iBlWe2l"

// Écrire le magasin régulièrement (intervalle configuré dans settings)
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Optimisation mémoire - forcer la collecte des ordures (si disponible)
setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Collecte des ordures effectuée')
    }
}, 60_000) // toutes les 1 minute

// Surveillance mémoire - redémarrer si la RAM devient trop élevée
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('⚠️ RAM trop élevée (>400MB), redémarrage du bot...')
        process.exit(1) // le panel redémarrera automatiquement
    }
}, 30_000) // vérification toutes les 30 secondes

let phoneNumber = "237670450009"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

// Nom du bot et emoji thème (utilisés pour l'affichage)
global.botname = "STV BOT MD"
global.themeemoji = "•"
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

// Crée l'interface readline seulement si l'environnement est interactif
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        // En environnement non-interactif, utiliser ownerNumber depuis settings
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}


async function startXeonBotInc() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        })

        // Sauvegarder les identifiants quand ils sont mis à jour
        XeonBotInc.ev.on('creds.update', saveCreds)

    store.bind(XeonBotInc.ev)

    // Gestion des messages
    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, chatUpdate);
                return;
            }
            // En mode privé, bloquer uniquement les messages non-groupe (autoriser les groupes pour modération)
            // Remarque : XeonBotInc.public n'est pas synchronisé, donc on vérifie le mode dans main.js
            // Cette vérification est conservée pour compatibilité, elle bloque principalement les DMs
            if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                if (!isGroup) return // Bloquer les DMs en mode privé, mais autoriser les groupes
            }
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

            // Vider le cache de retry pour éviter la montée en mémoire
            if (XeonBotInc?.msgRetryCounterCache) {
                XeonBotInc.msgRetryCounterCache.clear()
            }

            try {
                await handleMessages(XeonBotInc, chatUpdate, true)
            } catch (err) {
                console.error("Erreur dans handleMessages :", err)
                // N'essayer d'envoyer un message d'erreur que si nous avons un chatId valide
                if (mek.key && mek.key.remoteJid) {
                    await XeonBotInc.sendMessage(mek.key.remoteJid, {
                        text: '❌ Une erreur est survenue lors du traitement de votre message.',
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363161513685998@newsletter',
                                newsletterName: 'STV BOT MD',
                                serverMessageId: -1
                            }
                        }
                    }).catch(console.error);
                }
            }
        } catch (err) {
            console.error("Erreur dans messages.upsert :", err)
        }
    })

    // Ajout de handlers pour de meilleures fonctionnalités
    XeonBotInc.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    XeonBotInc.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = XeonBotInc.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    // Récupérer le nom (groupe ou contact) de façon conviviale
    XeonBotInc.getName = (jid, withoutContact = false) => {
        id = XeonBotInc.decodeJid(jid)
        withoutContact = XeonBotInc.withoutContact || withoutContact
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
            XeonBotInc.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    XeonBotInc.public = true

    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    // Gestion du pairing code (code d'appairage)
    if (pairingCode && !XeonBotInc.authState.creds.registered) {
        if (useMobile) throw new Error('Impossible d\'utiliser le code d\'appairage avec l\'API mobile')

        let phoneNumber
        if (!!global.phoneNumber) {
            phoneNumber = global.phoneNumber
        } else {
            phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Veuillez entrer votre numéro WhatsApp 😍\nFormat : 237670478009 (sans + ni espaces) : `)))
        }

        // Nettoyer le numéro de téléphone - supprimer tout caractère non numérique
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

        // Valider le numéro avec awesome-phonenumber
        const pn = require('awesome-phonenumber');
        if (!pn('+' + phoneNumber).isValid()) {
            console.log(chalk.red('Numéro invalide. Veuillez entrer votre numéro international complet (ex: 15551234567 pour US, 447911123456 pour UK, etc.) sans + ni espaces.'));
            process.exit(1);
        }

        setTimeout(async () => {
            try {
                let code = await XeonBotInc.requestPairingCode(phoneNumber)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(chalk.black(chalk.bgGreen(`Votre code d'appairage : `)), chalk.black(chalk.white(code)))
                console.log(chalk.yellow(`\nVeuillez saisir ce code dans votre application WhatsApp :\n1. Ouvrir WhatsApp\n2. Aller dans Paramètres > Appareils connectés\n3. Appuyer sur "Lier un appareil"\n4. Saisir le code affiché ci-dessus`))
            } catch (error) {
                console.error('Erreur lors de la demande du code d\'appairage :', error)
                console.log(chalk.red('Échec de la génération du code d\'appairage. Vérifiez votre numéro et réessayez.'))
            }
        }, 3000)
    }

    // Gestion de la connexion
    XeonBotInc.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect, qr } = s
        
        if (qr) {
            console.log(chalk.yellow('📱 QR Code généré. Veuillez le scanner avec WhatsApp.'))
        }
        
        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Connexion à WhatsApp en cours...'))
        }
        
        if (connection == "open") {
            console.log(chalk.magenta(` `))
            console.log(chalk.yellow(`🌿Connecté à => ` + JSON.stringify(XeonBotInc.user, null, 2)))

            try {
                const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';

try {
    await XeonBotInc.sendMessage(botNumber, {
        text: `🤖 STV BOT MD est connecté avec succès !

⏰ Heure : ${new Date().toLocaleString()}
✅ Statut : En ligne et prêt.

📢 Rejoignez la chaîne officielle :
https://whatsapp.com/channel/0029Vb6nKuV8vd1M1iBlWe2l`,
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

} catch (error) {
    console.error('Erreur lors de l\'envoi du message de connexion :', error.message);
}

            await delay(1999)
            console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || 'STV BOT MD'} ]`)}\n\n`))
            console.log(chalk.cyan(`< ================================================== >`))
            console.log(chalk.magenta(`\n${global.themeemoji || 'https://whatsapp.com/channel/0029Vb6nKuV8vd1M1iBlWe2l'} CHAÎNE WHATSAPP : ${global.channel}`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB : STIVO TECH`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} PROPRIÉTAIRE : STIVO TECH`))
            console.log(chalk.magenta(`${global.themeemoji || '237672667958'} NUMÉRO OWNER : ${owner}`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} CRÉDIT : STIVO TECH`))
            console.log(chalk.green(`${global.themeemoji || '•'} 🤖 STV BOT MD connecté avec succès ! ✅`))
            console.log(chalk.blue(`Version du bot : ${settings.version}`))
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
            const statusCode = lastDisconnect?.error?.output?.statusCode
            
            console.log(chalk.red(`Connexion fermée en raison de ${lastDisconnect?.error}, reconnexion prévue : ${shouldReconnect}`))
            
            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                try {
                    rmSync('./session', { recursive: true, force: true })
                    console.log(chalk.yellow('Dossier de session supprimé. Veuillez vous ré-authentifier.'))
                } catch (error) {
                    console.error('Erreur lors de la suppression de la session :', error)
                }
                console.log(chalk.red('Session déconnectée. Veuillez vous reconnecter.'))
            }
            
            if (shouldReconnect) {
                console.log(chalk.yellow('Reconnexion...'))
                await delay(5000)
                startXeonBotInc()
            }
        }
    })

    // Suivre les appelants récemment notifiés pour éviter le spam
    const antiCallNotified = new Set();

    // Gestion anti-appel : bloquer les appelants quand activé
    XeonBotInc.ev.on('call', async (calls) => {
        try {
            const { readState: readAnticallState } = require('./commands/anticall');
            const state = readAnticallState();
            if (!state.enabled) return;
            for (const call of calls) {
                const callerJid = call.from || call.peerJid || call.chatId;
                if (!callerJid) continue;
                try {
                    // Première étape : tenter de rejeter l'appel si supporté
                    try {
                        if (typeof XeonBotInc.rejectCall === 'function' && call.id) {
                            await XeonBotInc.rejectCall(call.id, callerJid);
                        } else if (typeof XeonBotInc.sendCallOfferAck === 'function' && call.id) {
                            await XeonBotInc.sendCallOfferAck(call.id, callerJid, 'reject');
                        }
                    } catch {}

                    // Notifier l'appelant une seule fois dans une courte fenêtre
                    if (!antiCallNotified.has(callerJid)) {
                        antiCallNotified.add(callerJid);
                        setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                        await XeonBotInc.sendMessage(callerJid, { text: '📵 Le système anti-appel est activé.\nVotre appel a été rejeté et vous serez bloqué.' });
                    }
                } catch {}
                // Ensuite : bloquer après un court délai pour garantir le traitement
                setTimeout(async () => {
                    try { await XeonBotInc.updateBlockStatus(callerJid, 'block'); } catch {}
                }, 800);
            }
        } catch (e) {
            // ignorer les erreurs ici
        }
    });

    XeonBotInc.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipantUpdate(XeonBotInc, update);
    });

    XeonBotInc.ev.on('messages.upsert', async (m) => {
        if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
            await handleStatus(XeonBotInc, m);
        }
    });

    XeonBotInc.ev.on('status.update', async (status) => {
        await handleStatus(XeonBotInc, status);
    });

    XeonBotInc.ev.on('messages.reaction', async (status) => {
        await handleStatus(XeonBotInc, status);
    });

    return XeonBotInc
    } catch (error) {
        console.error('Erreur dans startXeonBotInc :', error)
        await delay(5000)
        startXeonBotInc()
    }
}


// Démarrer le bot avec gestion des erreurs
startXeonBotInc().catch(error => {
    console.error('Erreur fatale :', error)
    process.exit(1)
})
process.on('uncaughtException', (err) => {
    console.error('Exception non capturée :', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Rejet non géré :', err)
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Mise à jour ${__filename}`))
    delete require.cache[file]
    require(file)
})
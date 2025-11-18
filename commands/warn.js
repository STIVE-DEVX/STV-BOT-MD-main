const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/stvAdmin');

const databaseDir = path.join(process.cwd(), 'data');
const warningsPath = path.join(databaseDir, 'warnings.json');

function initializeWarningsFile() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }

    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}), 'utf8');
    }
}

async function warnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        initializeWarningsFile();

        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: 'Cette commande ne peut être utilisée que dans les groupes !'
            });
            return;
        }

        try {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Erreur : le bot doit être admin pour utiliser cette commande.'
                });
                return;
            }

            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Erreur : seuls les admins peuvent utiliser la commande warn.'
                });
                return;
            }
        } catch (adminError) {
            console.error('Erreur admin :', adminError);
            await sock.sendMessage(chatId, { 
                text: '❌ Erreur : assurez-vous que le bot est admin.'
            });
            return;
        }

        let userToWarn;

        if (mentionedJids && mentionedJids.length > 0) {
            userToWarn = mentionedJids[0];
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToWarn = message.message.extendedTextMessage.contextInfo.participant;
        }

        if (!userToWarn) {
            await sock.sendMessage(chatId, { 
                text: '❌ Veuillez mentionner un utilisateur ou répondre à son message.'
            });
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            let warnings = {};
            try {
                warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
            } catch {
                warnings = {};
            }

            if (!warnings[chatId]) warnings[chatId] = {};
            if (!warnings[chatId][userToWarn]) warnings[chatId][userToWarn] = 0;

            warnings[chatId][userToWarn]++;
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

            const warningMessage =
                `*『 AVERTISSEMENT 』*\n\n` +
                `👤 *Utilisateur averti:* @${userToWarn.split('@')[0]}\n` +
                `⚠️ *Nombre d'avertissements:* ${warnings[chatId][userToWarn]}/3\n` +
                `👑 *Averti par:* @${senderId.split('@')[0]}\n\n` +
                `📅 *Date:* ${new Date().toLocaleString()}`;

            await sock.sendMessage(chatId, { 
                text: warningMessage,
                mentions: [userToWarn, senderId]
            });

            if (warnings[chatId][userToWarn] >= 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await sock.groupParticipantsUpdate(chatId, [userToWarn], "remove");

                delete warnings[chatId][userToWarn];
                fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

                const kickMessage =
                    `*『 EXPULSION AUTOMATIQUE 』*\n\n` +
                    `@${userToWarn.split('@')[0]} a été expulsé après 3 avertissements ! ⚠️`;

                await sock.sendMessage(chatId, { 
                    text: kickMessage,
                    mentions: [userToWarn]
                });
            }

        } catch (error) {
            console.error('Erreur warn :', error);
            await sock.sendMessage(chatId, { 
                text: '❌ Impossible d’avertir cet utilisateur.'
            });
        }

    } catch (error) {
        console.error('Erreur warn :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Erreur système.'
        });
    }
}

module.exports = warnCommand;
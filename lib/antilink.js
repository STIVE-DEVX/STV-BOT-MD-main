const { isJidGroup } = require('@whiskeysockets/baileys');
const { getAntilink, incrementWarningCount, resetWarningCount, isSudo } = require('../lib/index');
const isAdmin = require('../lib/stvAdmin');
const config = require('../config');

const WARN_COUNT = config.WARN_COUNT || 4;

/**
 * Vérifie si une chaîne contient une URL.
 *
 * @param {string} str - La chaîne à vérifier.
 * @returns {boolean} - True si la chaîne contient une URL, sinon false.
 */
function containsURL(str) {
	const urlRegex = /(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/i;
	return urlRegex.test(str);
}

/**
 * Gère la fonctionnalité Antilink pour les groupes.
 *
 * @param {object} msg - Le message à traiter.
 * @param {object} sock - Le socket utilisé pour envoyer les messages.
 */
async function Antilink(msg, sock) {
	const jid = msg.key.remoteJid;
	if (!isJidGroup(jid)) return;

	const SenderMessage = msg.message?.conversation || 
						 msg.message?.extendedTextMessage?.text || '';
	if (!SenderMessage || typeof SenderMessage !== 'string') return;

	const sender = msg.key.participant;
	if (!sender) return;
	
	// Ignorer si admin ou sudo
	try {
		const { isSenderAdmin } = await isAdmin(sock, jid, sender);
		if (isSenderAdmin) return;
	} catch (_) {}
	const senderIsSudo = await isSudo(sender);
	if (senderIsSudo) return;

	if (!containsURL(SenderMessage.trim())) return;
	
	const antilinkConfig = await getAntilink(jid, 'on');
	if (!antilinkConfig) return;

	const action = antilinkConfig.action;
	
	try {
		// Supprimer le message d'abord
		await sock.sendMessage(jid, { delete: msg.key });

		switch (action) {
			case 'delete':
				await sock.sendMessage(jid, { 
					text: `\`\`\`@${sender.split('@')[0]} les liens ne sont pas autorisés ici.\`\`\``,
					mentions: [sender] 
				});
				break;

			case 'kick':
				await sock.groupParticipantsUpdate(jid, [sender], 'remove');
				await sock.sendMessage(jid, {
					text: `\`\`\`@${sender.split('@')[0]} a été expulsé pour avoir envoyé un lien.\`\`\``,
					mentions: [sender]
				});
				break;

			case 'warn':
				const warningCount = await incrementWarningCount(jid, sender);
				if (warningCount >= WARN_COUNT) {
					await sock.groupParticipantsUpdate(jid, [sender], 'remove');
					await resetWarningCount(jid, sender);
					await sock.sendMessage(jid, {
						text: `\`\`\`@${sender.split('@')[0]} a été expulsé après ${WARN_COUNT} avertissements.\`\`\``,
						mentions: [sender]
					});
				} else {
					await sock.sendMessage(jid, {
						text: `\`\`\`@${sender.split('@')[0]} avertissement ${warningCount}/${WARN_COUNT} pour avoir envoyé un lien.\`\`\``,
						mentions: [sender]
					});
				}
				break;
		}
	} catch (error) {
		console.error('Error in Antilink:', error);
	}
}

module.exports = { Antilink };
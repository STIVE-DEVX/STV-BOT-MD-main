// isAdmin.js

async function isAdmin(sock, chatId, senderId) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];

        // Extract bot ID & number
        const botId = sock.user?.id || '';
        const botLid = sock.user?.lid || '';

        const botNumber = botId.split(/[:@]/)[0];
        const botLidNumeric = botLid.split(/[:@]/)[0];
        const botIdBase = botId.split('@')[0];
        const botLidBase = botLid.split('@')[0];

        // Extract sender info
        const senderNumber = senderId.split(/[:@]/)[0];
        const senderBase = senderId.split('@')[0];

        // Check admin status for bot
        const isBotAdmin = participants.some(p => {
            const pId = (p.id || '').split('@')[0];
            const pLid = (p.lid || '').split('@')[0];
            const pPhone = (p.phoneNumber || '').split('@')[0];
            const pLidNumeric = pLid.split(':')[0];

            const matchBot =
                botId === p.id ||
                botId === p.lid ||
                botLid === p.lid ||
                botLidNumeric === pLidNumeric ||
                botLidBase === pLid ||
                botNumber === pPhone ||
                botNumber === pId ||
                botIdBase === pPhone ||
                botIdBase === pId;

            return matchBot && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        // Check admin status for sender
        const isSenderAdmin = participants.some(p => {
            const pId = (p.id || '').split('@')[0];
            const pLid = (p.lid || '').split('@')[0];
            const pPhone = (p.phoneNumber || '').split('@')[0];

            const matchSender =
                senderId === p.id ||
                senderId === p.lid ||
                senderNumber === pPhone ||
                senderNumber === pId ||
                senderBase === pPhone ||
                senderBase === pId ||
                senderBase === pLid;

            return matchSender && (p.admin === 'admin' || p.admin === 'superadmin');
        });

        return { isSenderAdmin, isBotAdmin };

    } catch (err) {
        console.error('❌ Error in isAdmin:', err);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;
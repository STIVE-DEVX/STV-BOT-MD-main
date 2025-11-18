const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/stvOwner');

// Function to clear a single directory
function clearDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            return { success: true, message: `Directory not found: ${dirPath}`, count: 0 };
        }

        const files = fs.readdirSync(dirPath);
        let deletedCount = 0;

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            try {
                const stat = fs.lstatSync(filePath);
                if (stat.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(filePath);
                }
                deletedCount++;
            } catch (err) {
                console.error(`Error deleting ${filePath}:`, err);
            }
        }

        return { 
            success: true, 
            message: `Cleared ${deletedCount} files in ${path.basename(dirPath)}`, 
            count: deletedCount 
        };

    } catch (error) {
        console.error('Error in clearDirectory:', error);
        return { 
            success: false, 
            message: `Failed to clear ${path.basename(dirPath)}`, 
            count: 0 
        };
    }
}

// Function to clear tmp & temp
async function clearTmpDirectory() {
    const tmpDir = path.join(process.cwd(), 'tmp');
    const tempDir = path.join(process.cwd(), 'temp');

    const resultTmp = clearDirectory(tmpDir);
    const resultTemp = clearDirectory(tempDir);

    const success = resultTmp.success && resultTemp.success;

    return {
        success,
        message: `${resultTmp.message} | ${resultTemp.message}`,
        count: (resultTmp.count || 0) + (resultTemp.count || 0)
    };
}

// Manual command
async function clearTmpCommand(sock, chatId, msg) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command is only available for the owner!' 
            });
            return;
        }

        const result = await clearTmpDirectory();

        await sock.sendMessage(chatId, { 
            text: result.success 
                ? `✅ ${result.message}`
                : `❌ ${result.message}`
        });

    } catch (error) {
        console.error('Error in cleartmp command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ An unexpected error occurred while clearing temporary files.' 
        });
    }
}

// Automatic clearing every 6 hours
function startAutoClear() {
    const runClear = async () => {
        const result = await clearTmpDirectory();
        if (!result.success) {
            console.error(`[Auto Clear] Error: ${result.message}`);
        }
    };

    // Run immediately
    runClear();

    // Schedule every 6 hours
    setInterval(runClear, 6 * 60 * 60 * 1000);
}

// Start auto clear
startAutoClear();

module.exports = clearTmpCommand;
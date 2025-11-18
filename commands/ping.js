const os = require('os');
const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}j `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

// 📌 Fonction pour obtenir l'utilisation CPU
function getCpuUsage() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;

    cpus.forEach(cpu => {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        idle += cpu.times.idle;
        irq += cpu.times.irq;
    });

    const total = user + nice + sys + idle + irq;
    const usage = ((total - idle) / total) * 100;

    return usage.toFixed(2);
}

async function pingCommand(sock, chatId, message) {
    try {
        const start = Date.now();
        await sock.sendMessage(chatId, { text: '🔄 Test en cours...' }, { quoted: message });
        const end = Date.now();
        const ping = Math.round((end - start) / 2);

        const uptimeFormatted = formatTime(process.uptime());
        const ramUsed = (os.totalmem() - os.freemem()) / 1024 / 1024;
        const ramTotal = os.totalmem() / 1024 / 1024;
        const cpuUsage = getCpuUsage();

        const botInfo = `
┏━━〔 ⚡ STV BOT MD ⚡ 〕━━┓
┃ 📡 *Ping* : ${ping} ms
┃ ⏱️ *Uptime* : ${uptimeFormatted}
┃ 💽 *RAM* : ${ramUsed.toFixed(1)} / ${ramTotal.toFixed(1)} MB
┃ 🧠 *CPU* : ${cpuUsage}%
┃ 🏷️ *Version* : v${settings.version}
┗━━━━━━━━━━━━━━━━━━━━━━┛`.trim();

        await sock.sendMessage(chatId, { text: botInfo }, { quoted: message });

    } catch (error) {
        console.error('Erreur ping :', error);
        await sock.sendMessage(chatId, { text: '❌ Impossible d’obtenir le statut du bot.' });
    }
}

module.exports = pingCommand;
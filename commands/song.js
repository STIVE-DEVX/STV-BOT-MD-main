const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

async function getIzumiDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://izumiiiiiiii.dpdns.org/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi (url) n’a pas retourné de lien de téléchargement');
}

async function getIzumiDownloadByQuery(query) {
    const apiUrl = `https://izumiiiiiiii.dpdns.org/downloader/youtube-play?query=${encodeURIComponent(query)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.download) return res.data.result;
    throw new Error('Izumi (query) n’a pas retourné de lien de téléchargement');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return {
            download: res.data.dl,
            title: res.data.title,
            thumbnail: res.data.thumb
        };
    }
    throw new Error('Okatsu n’a pas retourné de lien de téléchargement');
}

async function songCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const arg = text.split(' ').slice(1).join(' ').trim();
        if (!arg) {
            await sock.sendMessage(chatId, { text: 'Usage : .song <nom de la chanson ou lien YouTube>' }, { quoted: message });
            return;
        }

        let video;
        if (arg.includes('youtube.com') || arg.includes('youtu.be')) {
            video = { url: arg, title: arg, thumbnail: '' };
        } else {
            const search = await yts(arg);
            if (!search || !search.videos || search.videos.length === 0) {
                await sock.sendMessage(chatId, { text: 'Aucun résultat trouvé.' }, { quoted: message });
                return;
            }
            video = search.videos[0];
        }

        // Informer l'utilisateur
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail || '' },
            caption: `🎵 Téléchargement : *${video.title}*\n⏱ Durée : ${video.timestamp || 'inconnue'}`
        }, { quoted: message });

        // Essayer les différentes sources: Izumi (url), Izumi (query), Okatsu fallback
        let audioData;
        try {
            audioData = await getIzumiDownloadByUrl(video.url);
        } catch (e1) {
            try {
                audioData = await getIzumiDownloadByQuery(video.title || arg);
            } catch (e2) {
                audioData = await getOkatsuDownloadByUrl(video.url);
            }
        }

        const audioUrl = audioData.download || audioData.dl || audioData.url;
        const fileName = `${(audioData.title || video.title || 'song').replace(/[\\\/:*?"<>|]/g, '')}.mp3`;

        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            fileName,
            ptt: false
        }, { quoted: message });

    } catch (err) {
        console.error('Erreur commande song :', err);
        await sock.sendMessage(chatId, { text: '❌ Échec du téléchargement de la chanson.' }, { quoted: message });
    }
}

module.exports = songCommand;
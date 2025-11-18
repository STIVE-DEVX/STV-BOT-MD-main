/**
 * ============================================================
 *  STV BOT MD - Module YouTube Downloader
 * ------------------------------------------------------------
 *  Développé pour STIVO TECH 
 *  Copyright (c) 2025
 *
 *  Licence : MIT
 *
 *  Crédits :
 *  - Baileys Library par @kzegeh
 *  - ytdl-core, youtube-yts, node-youtube-music
 *  - Implémentation inspirée de divers projets Open Source
 * ============================================================
 */

const ytdl = require('@distube/ytdl-core');
const yts = require('youtube-yts');
const readline = require('readline');
const ffmpeg = require('fluent-ffmpeg');
const NodeID3 = require('node-id3');
const fs = require('fs');
const { fetchBuffer } = require("./myfunc2");
const ytM = require('node-youtube-music');
const { randomBytes } = require('crypto');
const path = require('path');

// Regex ID YouTube
const ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;

class YTDownloader {
    constructor() {
        this.tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(this.tmpDir)) {
            fs.mkdirSync(this.tmpDir, { recursive: true });
        }
    }

    /** Vérifie si un lien est un lien YouTube */
    static isYTUrl = (url) => ytIdRegex.test(url);

    /** Récupère l'ID de la vidéo YouTube */
    static getVideoID = (url) => {
        if (!this.isYTUrl(url)) throw new Error("Ceci n'est pas une URL YouTube valide.");
        return ytIdRegex.exec(url)[1];
    }

    /** Écrit les métadonnées ID3 dans l'audio */
    static WriteTags = async (filePath, Metadata) => {
        NodeID3.write({
            title: Metadata.Title,
            artist: Metadata.Artist,
            originalArtist: Metadata.Artist,
            image: {
                mime: 'jpeg',
                type: { id: 3, name: 'front cover' },
                imageBuffer: (await fetchBuffer(Metadata.Image)).buffer,
                description: `Cover de ${Metadata.Title}`,
            },
            album: Metadata.Album,
            year: Metadata.Year || ''
        }, filePath);
    }

    /** Recherche YouTube */
    static search = async (query, options = {}) => {
        const search = await yts.search({ query, hl: 'fr', gl: 'FR', ...options });
        return search.videos;
    }

    /** Recherche musique détaillée */
    static searchTrack = (query) => {
        return new Promise(async (resolve, reject) => {
            try {
                const ytMusic = await ytM.searchMusics(query);
                const result = ytMusic.map(track => ({
                    isYtMusic: true,
                    title: `${track.title} - ${track.artists.map(a => a.name).join(' ')}`,
                    artist: track.artists.map(a => a.name).join(' '),
                    id: track.youtubeId,
                    url: 'https://youtu.be/' + track.youtubeId,
                    album: track.album,
                    duration: {
                        seconds: track.duration.totalSeconds,
                        label: track.duration.label,
                    },
                    image: track.thumbnailUrl.replace('w120-h120', 'w600-h600'),
                }));
                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    }

    /** Télécharge une musique + tags */
    static downloadMusic = async (query) => {
        try {
            const getTrack = Array.isArray(query) ? query : await this.searchTrack(query);
            const search = getTrack[0];

            const videoInfo = await ytdl.getInfo("https://www.youtube.com/watch?v=" + search.id);

            const stream = ytdl(search.id, {
                filter: 'audioonly',
                quality: 140
            });

            const songPath = `./XeonMedia/audio/${randomBytes(3).toString('hex')}.mp3`;

            const file = await new Promise(resolve => {
                ffmpeg(stream)
                    .audioFrequency(44100)
                    .audioChannels(2)
                    .audioBitrate(128)
                    .audioCodec('libmp3lame')
                    .audioQuality(5)
                    .toFormat('mp3')
                    .save(songPath)
                    .on('end', () => resolve(songPath));
            });

            await this.WriteTags(file, {
                Title: search.title,
                Artist: search.artist,
                Image: search.image,
                Album: search.album,
                Year: videoInfo.videoDetails.publishDate.split('-')[0]
            });

            return {
                meta: search,
                path: file,
                size: fs.statSync(songPath).size
            };
        } catch (err) {
            throw new Error(err);
        }
    }

    /** Obtenir info vidéo MP4 */
    static mp4 = async (query, quality = 134) => {
        try {
            if (!query) throw new Error("Lien YouTube requis.");
            const videoId = this.isYTUrl(query) ? this.getVideoID(query) : query;

            const videoInfo = await ytdl.getInfo("https://www.youtube.com/watch?v=" + videoId);
            const format = ytdl.chooseFormat(videoInfo.formats, {
                format: quality,
                filter: 'videoandaudio'
            });

            return {
                title: videoInfo.videoDetails.title,
                thumb: videoInfo.videoDetails.thumbnails.slice(-1)[0],
                date: videoInfo.videoDetails.publishDate,
                duration: videoInfo.videoDetails.lengthSeconds,
                channel: videoInfo.videoDetails.ownerChannelName,
                quality: format.qualityLabel,
                contentLength: format.contentLength,
                description: videoInfo.videoDetails.description,
                videoUrl: format.url
            };
        } catch (err) {
            throw err;
        }
    }

    /** Télécharge une vidéo en mp3 simple */
    async mp3(url) {
        try {
            const info = await ytdl.getInfo(url);
            const fileName = `${Date.now()}.mp3`;
            const filePath = path.join(this.tmpDir, fileName);

            return new Promise((resolve, reject) => {
                const stream = ytdl(url, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                });

                ffmpeg(stream)
                    .audioBitrate(128)
                    .toFormat('mp3')
                    .save(filePath)
                    .on('end', () => {
                        resolve({
                            path: filePath,
                            meta: {
                                title: info.videoDetails.title,
                                thumbnail: info.videoDetails.thumbnails[0].url
                            }
                        });
                    })
                    .on('error', reject);
            });
        } catch (err) {
            console.error("Erreur lors du téléchargement MP3 :", err);
            throw err;
        }
    }
}

module.exports = new YTDownloader();
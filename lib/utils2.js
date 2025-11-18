/**
 * STV BOT MD-  WhatsApp
 * Copyright (c) 2024m5 Tech STIVO
 * 
 * Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier
 * selon les termes de la licence MIT.
 * 
 * Crédits :
 * - Bibliothèque Baileys par @adiwajshing
 * - Implémentations et inspirations diverses
 */

const axios = require("axios")
const cheerio = require("cheerio")
const { resolve } = require("path")
const util = require("util")
let BodyForm = require('form-data')
let { fromBuffer } = require('file-type')
let fs = require('fs')
const child_process = require('child_process')
const ffmpeg = require('fluent-ffmpeg')

const { unlink } = require('fs').promises

// Attente asynchrone simple
exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Récupère du JSON via GET
exports.fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}

// Récupère un buffer (arraybuffer) depuis une URL
exports.fetchBuffer = async (url, options) => {
	try {
		options ? options : {}
		const res = await axios({
			method: "GET",
			url,
			headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (err) {
		return err
	}
}

// Convertit WebP en MP4 via ezgif (retourne l'URL résultat)
exports.webp2mp4File = async (pathFile) => {
	return new Promise((resolve, reject) => {
		 const form = new BodyForm()
		 form.append('new-image-url', '')
		 form.append('new-image', fs.createReadStream(pathFile))
		 axios({
			  method: 'post',
			  url: 'https://s6.ezgif.com/webp-to-mp4',
			  data: form,
			  headers: {
				   'Content-Type': `multipart/form-data; boundary=${form._boundary}`
			  }
		 }).then(({ data }) => {
			  const bodyFormThen = new BodyForm()
			  const $ = cheerio.load(data)
			  const file = $('input[name="file"]').attr('value')
			  bodyFormThen.append('file', file)
			  bodyFormThen.append('convert', "Convert WebP to MP4!")
			  axios({
				   method: 'post',
				   url: 'https://ezgif.com/webp-to-mp4/' + file,
				   data: bodyFormThen,
				   headers: {
						'Content-Type': `multipart/form-data; boundary=${bodyFormThen._boundary}`
				   }
			  }).then(({ data }) => {
				   const $ = cheerio.load(data)
				   const result = 'https:' + $('div#output > p.outfile > video > source').attr('src')
				   resolve({
						status: true,
						message: "Créé par Tech STIVO",
						result: result
				   })
			  }).catch(reject)
		 }).catch(reject)
	})
}

// Récupère l'URL complète d'une page (GET simple)
exports.fetchUrl = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}

// Récupère la version Web WhatsApp (utilitaire)
exports.WAVersion = async () => {
    let get = await exports.fetchUrl("https://web.whatsapp.com/check-update?version=1&platform=web")
    let version = [get.currentVersion.replace(/[.]/g, ", ")]
    return version
}

exports.getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'gi'))
}

exports.isNumber = (number) => {
    const int = parseInt(number)
    return typeof int === 'number' && !isNaN(int)
}

// Téléverse un fichier sur telegra.ph et retourne l'URL
exports.TelegraPh = (Path) =>{
	return new Promise (async (resolve, reject) => {
		if (!fs.existsSync(Path)) return reject(new Error("Fichier introuvable"))
		try {
			const form = new BodyForm();
			form.append("file", fs.createReadStream(Path))
			const data = await axios({
				url: "https://telegra.ph/upload",
				method: "POST",
				headers: {
					...form.getHeaders()
				},
				data: form
			})
			return resolve("https://telegra.ph" + data.data[0].src)
		} catch (err) {
			return reject(new Error(String(err)))
		}
	})
}

const sleepy = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Convertit un buffer GIF en MP4 stocké temporairement puis renvoie le buffer MP4
// (utilise le dossier ./TechSTIVO_media/trash pour stocker temporairement)
exports.buffergif = async (image) => {
	const filename = `${Math.random().toString(36)}`
    // assurez-vous que le dossier existe : ./TechSTIVO_media/trash
    const trashDir = './TechSTIVO_media/trash'
    if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true })

	await fs.writeFileSync(`${trashDir}/${filename}.gif`, image)

    // Commande ffmpeg pour convertir en mp4
	child_process.exec(
		`ffmpeg -i ${trashDir}/${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${trashDir}/${filename}.mp4`
	)

    // petite attente pour laisser ffmpeg finir (si tu veux, on peut remplacer par un suivi de processus)
    await sleepy(4000)
  
	const bufferMp4 = await fs.readFileSync(`${trashDir}/${filename}.mp4`)
    // supprime les fichiers temporaires si possible (fire-and-forget)
    Promise.all([
      unlink(`${trashDir}/${filename}.mp4`).catch(()=>{}),
      unlink(`${trashDir}/${filename}.gif`).catch(()=>{})
    ])
	return bufferMp4
}
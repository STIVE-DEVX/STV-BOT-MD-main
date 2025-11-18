/**
 * STV BOT MD - Module d’Upload d’Images
 * Développé pour WhatsApp Bot Multi-Device
 * 
 * Ce module permet d’envoyer une image vers :
 * - qu.ax (service principal)
 * - telegra.ph (service de secours)
 * 
 * Auteur : STV BOT MD
 * Licence : MIT
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const FileType = require('file-type');
const fs = require('fs');
const path = require('path');

/**
 * Upload d’une image vers qu.ax
 * Types acceptés :
 * - image/jpeg
 * - image/jpg
 * - image/png
 * 
 * @param {Buffer} buffer — Buffer du fichier
 * @return {Promise<string>} — URL de l’image hébergée
 */
async function uploadImage(buffer) {
    try {
        // Crée un dossier tmp si inexistant
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // Détection du type de fichier
        const fileType = await FileType.fromBuffer(buffer);
        const { ext, mime } = fileType || { ext: 'png', mime: 'image/png' };
        const tempFile = path.join(tmpDir, `temp_${Date.now()}.${ext}`);

        // Enregistre le buffer en fichier temporaire
        fs.writeFileSync(tempFile, buffer);

        // Préparation du formulaire pour qu.ax
        const form = new FormData();
        form.append('files[]', fs.createReadStream(tempFile));

        // Upload vers qu.ax
        const response = await fetch('https://qu.ax/upload.php', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        // Suppression du fichier temporaire
        fs.unlinkSync(tempFile);

        const result = await response.json();

        // Si l’upload qu.ax fonctionne
        if (result && result.success) {
            return result.files[0].url;
        } else {
            // Sinon fallback vers Telegraph
            const telegraphForm = new FormData();
            telegraphForm.append('file', buffer, {
                filename: `upload.${ext}`,
                contentType: mime
            });

            const telegraphResponse = await fetch('https://telegra.ph/upload', {
                method: 'POST',
                body: telegraphForm
            });

            const img = await telegraphResponse.json();

            if (img[0]?.src) {
                return 'https://telegra.ph' + img[0].src;
            }

            throw new Error("Échec de l’upload sur qu.ax et telegraph");
        }

    } catch (error) {
        console.error('Erreur d’upload :', error);
        throw error;
    }
}

module.exports = { uploadImage };
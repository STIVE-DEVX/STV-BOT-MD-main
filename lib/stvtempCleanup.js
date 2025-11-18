const fs = require('fs');
const path = require('path');

// Utilitaire pour nettoyer les fichiers temporaires
function cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
        return;
    }
    
    fs.readdir(tempDir, (err, files) => {
        if (err) {
            console.error('❌ Erreur lors de la lecture du dossier temp :', err);
            return;
        }
        
        let cleanedCount = 0;
        const now = Date.now();
        const maxAge = 3 * 60 * 60 * 1000; // 3 heures
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                // Supprime les fichiers plus vieux que 3 heures
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            cleanedCount++;
                            console.log(`🧹 Fichier temporaire supprimé : ${file}`);
                        }
                    });
                }
            });
        });
        
        if (cleanedCount > 0) {
            console.log(`🧹 ${cleanedCount} fichiers temporaires nettoyés`);
        }
    });
}

// Nettoyage au démarrage
cleanupTempFiles();

// Nettoyage toutes les heures
setInterval(cleanupTempFiles, 60 * 60 * 1000);

module.exports = { cleanupTempFiles };
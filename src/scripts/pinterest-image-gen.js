/* eslint-disable @typescript-eslint/no-require-imports */
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// Chemin où sauvegarder (pour que ce soit servir par Next.js)
const OUTPUT_DIR = path.join(__dirname, '../../public/pins');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Génère une "Affiche" Pinterest Ultime (1000x1500)
 */
async function generatePinterestImage(postSlug, productImageUrl, title) {
    console.log(`🎨 Génération de la Masterpiece Pinterest pour: ${postSlug}`);
    
    try {
        // Dimensions standard et parfaites pour Pinterest
        const width = 1000;
        const height = 1500;
        
        // 1. Fond noir profond luxueux
        const image = new Jimp(width, height, '#0F0F0F');
        
        // 2. Récupérer l'image produit (ou une image par défaut si echec)
        let productImg;
        try {
            productImg = await Jimp.read(productImageUrl);
        } catch (e) {
            console.warn(`L'URL de l'image n'est pas accessible, utilisation de l'image de fallback.`);
            // Fallback luxury beauty image
            productImg = await Jimp.read('https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop');
        }
        
        // Couvrir la partie haute de l'affiche (1000x1000px)
        productImg.cover(1000, 1000);
        image.composite(productImg, 0, 0);

        // 3. Ajouter la typographie (texte d'accroche)
        // Utilisation de la police intégrée BOLD et BLANCHE
        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        
        // Titre - Centré dans la zone noire du bas (Y=1050)
        image.print(
            font, 
            0, 
            1050, 
            {
                text: title.toUpperCase(),
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            },
            width,
            300
        );

        // Sous-titre Call-to-action
        image.print(
            fontSmall,
            0,
            1380,
            {
                text: "✨ CLIQUER POUR DÉCOUVRIR LE SECRET ✨",
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            },
            width
        );

        // Sauvegarder dans /public/pins
        const finalPath = path.join(OUTPUT_DIR, `${postSlug}.jpg`);
        await image.writeAsync(finalPath);
        
        console.log(`✅ Image Virale Pinterest générée avec succès : /pins/${postSlug}.jpg`);
        return `/pins/${postSlug}.jpg`;

    } catch (error) {
        console.error("❌ Erreur lors de la création de l'image Pinterest:", error);
        return null; // Return null if it fails so the bot uses the basic product image
    }
}

// Permettre l'exécution direct si besoin pour test
if (require.main === module) {
    generatePinterestImage(
        'test-viral-arganor', 
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1887&auto=format&fit=crop', 
        "Les 5 Raisons Chocs D'Adopter L'Or Liquide Arganor"
    );
}

module.exports = { generatePinterestImage };

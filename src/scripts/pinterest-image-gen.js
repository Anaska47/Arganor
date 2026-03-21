const { Jimp, loadFont, HorizontalAlign, VerticalAlign } = require('jimp');
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
        
        // 1. Fond noir profond luxueux (Style Jimp v1)
        const image = new Jimp({ width, height, color: 0x0F0F0FFF });
        
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
        productImg.cover({ w: 1000, h: 1000 });
        image.composite(productImg, 0, 0);

        // 3. Ajouter la typographie (texte d'accroche)
        // Utilisation des polices Jimp v1
        const { SANS_64_WHITE, SANS_32_WHITE } = require('jimp/fonts');
        const font = await loadFont(SANS_64_WHITE);
        const fontSmall = await loadFont(SANS_32_WHITE);
        
        // Titre - Centré dans la zone noire du bas (Y=1050)
        image.print({
            font, 
            x: 0, 
            y: 1050, 
            text: {
                text: title.toUpperCase(),
                alignmentX: HorizontalAlign.CENTER,
                alignmentY: VerticalAlign.MIDDLE
            },
            maxWidth: width,
            maxHeight: 300
        });

        // Sous-titre Call-to-action
        image.print({
            font: fontSmall,
            x: 0,
            y: 1380,
            text: {
                text: "✨ CLIQUER POUR DÉCOUVRIR LE SECRET ✨",
                alignmentX: HorizontalAlign.CENTER,
                alignmentY: VerticalAlign.MIDDLE
            },
            maxWidth: width
        });

        // Sauvegarder dans /public/pins
        const finalPath = path.join(OUTPUT_DIR, `${postSlug}.jpg`);
        await image.write(finalPath);
        
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

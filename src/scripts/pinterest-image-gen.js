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
        
        // 1. Un fond élégant semi-aléatoire !
        const luxuryColors = [0x0F0F0FFF, 0x1A1A1AFF, 0x2A201CFF, 0x17231BFF, 0x2B181FFF, 0x3E2723FF, 0x263238FF, 0x1E1E24FF, 0x241715FF];
        const bgColor = luxuryColors[Math.floor(Math.random() * luxuryColors.length)];
        const image = new Jimp({ width, height, color: bgColor });
        
        // Sélection d'un modèle (layout) aléatoire pour varier le design
        // 1: Image grande, Texte bas | 2: Image moyenne, Texte grand | 3: Texte en haut, Image en bas
        const layouts = [
            { imgY: 0, imgH: 1000, textY: 1050, textH: 300, ctaY: 1380 },
            { imgY: 0, imgH: 850, textY: 900, textH: 400, ctaY: 1350 },
            { imgY: 500, imgH: 1000, textY: 50, textH: 350, ctaY: 420 }
        ];
        const layout = layouts[Math.floor(Math.random() * layouts.length)];

        // 2. Générer une image *TOTALEMENT UNIQUE*
        const randomSeed = Math.floor(Math.random() * 999999);
        const categories = ["skincare,woman", "beauty,luxury", "cosmetics,model", "spa,relax,woman", "organic,skincare"];
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const uniqueImageSource = `https://loremflickr.com/1000/${layout.imgH}/${randomCat}?random=${randomSeed}`;

        let productImg;
        try {
            productImg = await Jimp.read(uniqueImageSource);
        } catch (e) {
            console.warn(`L'URL de loremflickr n'est pas accessible, on tente l'image produit.`);
            try {
                productImg = await Jimp.read(productImageUrl);
            } catch (e2) {
                productImg = await Jimp.read('https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop');
            }
        }
        
        // Couvrir la zone allouée et placer l'image
        productImg.cover({ w: 1000, h: layout.imgH });
        image.composite(productImg, 0, layout.imgY);

        // 3. Ajouter la typographie
        const { SANS_64_WHITE, SANS_32_WHITE } = require('jimp/fonts');
        const font = await loadFont(SANS_64_WHITE);
        const fontSmall = await loadFont(SANS_32_WHITE);
        
        // Titre
        image.print({
            font, 
            x: 0, 
            y: layout.textY, 
            text: {
                text: title.toUpperCase(),
                alignmentX: HorizontalAlign.CENTER,
                alignmentY: VerticalAlign.MIDDLE
            },
            maxWidth: width,
            maxHeight: layout.textH
        });

        // Appels à l'action variés
        const catchphrases = [
            "✨ CLIQUER POUR DÉCOUVRIR LE SECRET ✨",
            "👉 LIRE L'ARTICLE COMPLET ICI",
            "❤️ ENREGISTREZ POUR PLUS TARD ❤️",
            "👇 LE PRODUIT MIRACLE EST ICI",
            "🔥 ASTUCE BEAUTÉ 100% NATURELLE 🔥",
            "🌿 DÉCOUVREZ LA ROUTINE PARFAITE 🌿"
        ];
        const ctaText = catchphrases[Math.floor(Math.random() * catchphrases.length)];

        // Sous-titre Call-to-action
        image.print({
            font: fontSmall,
            x: 0,
            y: layout.ctaY,
            text: {
                text: ctaText,
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

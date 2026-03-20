const fs = require('fs');
const path = require('path');
const { generatePinterestImage } = require('./pinterest-image-gen.js');

const POSTS_FILE = path.join(__dirname, '../data/posts.json');

async function generateAllPins() {
    console.log("🚀 Lancement du générateur massif de Pins Pinterest...");
    
    if (!fs.existsSync(POSTS_FILE)) {
        console.error("Fichier posts.json introuvable.");
        return;
    }

    const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    let updated = 0;

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        
        // Generate only if not already generated
        if (!post.pinterestImage) {
            console.log(`Traitement de l'article : ${post.title}`);
            const imagePath = await generatePinterestImage(post.slug, post.image, post.title);
            
            if (imagePath) {
                posts[i].pinterestImage = imagePath;
                updated++;
            }
        }
    }

    if (updated > 0) {
        fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
        console.log(`✅ ${updated} nouvelles affiches Pinterest générées et liées aux articles.`);
    } else {
        console.log(`ℹ️ Tous les articles ont déjà leur affiche Pinterest.`);
    }
}

generateAllPins().catch(console.error);

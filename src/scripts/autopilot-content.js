const fs = require('fs');
const path = require('path');
const { generatePinterestImage } = require('./pinterest-image-gen.js');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const POSTS_FILE = path.join(__dirname, '../data/posts.json');

// Un générateur algorithmique "ingénieux" avec plusieurs styles de rédaction
function generateSEOArticleForProduct(product, otherProduct = null) {
    const styles = [
        {
            type: 'GUIDE',
            titles: [
                `Le Guide Ultime : Comment utiliser ${product.name} comme une pro`,
                `5 Astuces Méconnues pour booster les effets de ${product.name}`,
                `${product.name} : Le secret des routines minimalistes réussies`
            ],
            intro: `Vous possédez le **${product.name}** mais vous ne savez pas comment en tirer le meilleur parti ? Ce guide est fait pour vous.`,
            outro: `En suivant ces conseils, vous maximiserez votre investissement dans ce produit ${product.brand}.`
        },
        {
            type: 'DUEL',
            titles: [
                `Match Beauté : ${product.name} vs ${otherProduct ? otherProduct.name : 'Les soins classiques'}`,
                `Pourquoi j'ai abandonné mes anciens produits pour le ${product.name}`,
                `${product.name} : Meilleure alternative naturelle du marché ?`
            ],
            intro: `Aujourd'hui, nous mettons le **${product.name}** à l'épreuve face à la concurrence. Qui sortira vainqueur ?`,
            outro: `Le verdict est sans appel : pour son prix de ${product.price}€, le ${product.name} reste imbattable.`
        },
        {
            type: 'ROUTINE',
            titles: [
                `Ma Routine du Matin 100% avec ${product.name}`,
                `Comment intégrer le ${product.name} dans votre soin hebdomadaire`,
                `3 étapes simples pour transformer votre ${product.category.toLowerCase()} avec ${product.name}`
            ],
            intro: `Une routine efficace ne doit pas être complexe. Voici comment j'utilise le **${product.name}** au quotidien.`,
            outro: `Une routine simple, efficace et surtout 100% plaisir grâce à ${product.brand}.`
        }
    ];

    const style = styles[Math.floor(Math.random() * styles.length)];
    const title = style.titles[Math.floor(Math.random() * style.titles.length)];
    const slug = title.toLowerCase().replace(/[^a-z0-9àâéèêëîïôûùç]+/g, '-').replace(/(^-|-$)/g, '');

    // Métadonnées SEO
    const metaTitle = `${title} | Arganor Beauté`;
    const metaDescription = `${style.intro.slice(0, 150)}... Découvrez notre test complet sur ${product.name}.`;
    const keywords = [product.name, product.brand, product.category, "avis", "test", "routine beauté", "comparatif"].join(', ');

    const content = `
# ${title}

${style.intro}

## Pourquoi choisir ${product.brand} aujourd'hui ?

Le marché de la cosmétique est saturé, mais **${product.name}** se démarque par sa pureté. En tant que produit phare de la gamme **${product.category}**, il répond à une demande croissante de transparence.

### Les 3 avantages clés :

- **Efficacité Redoutable** : ${product.description}
- **Engagement Éthique** : Aucun compromis sur la qualité des ingrédients.
- **Prix Juste** : Accessible au plus grand nombre.

> "L'ingéniosité de ce produit réside dans sa simplicité. On ne triche pas avec la nature, on l'apprivoise." - Camille, Experte Arganor.

## ${style.type === 'DUEL' ? "Le face à face final" : "Conseils d'utilisation experts"}

${style.type === 'ROUTINE' 
    ? `Appliquez une noisette de **${product.name}** après votre nettoyage habituel. Massez circulairement jusqu'à absorption complète.` 
    : `Contrairement aux produits chimiques, le ${product.name} travaille en profondeur sans agresser votre épiderme.`
}

${style.outro}

👉 **[Voir les avis sur ${product.name} et commander sur Amazon](/products/${product.slug})**

---
*Optimisé (Style: ${style.type}). Mots-clés : ${keywords}*
`;

    return {
        id: `auto-${Date.now()}`,
        title,
        slug,
        metaTitle,
        metaDescription,
        keywords,
        excerpt: style.intro,
        content,
        category: product.category,
        author: "Camille - Rédactrice Ingénieuse Arganor",
        publishedDate: new Date().toISOString().split('T')[0],
        image: product.image,
        relatedProductId: product.id,
        isAutopilot: true,
        style: style.type
    };
}

async function runAutopilot() {
    console.log("🚀 [Arganor Autopilot] Démarrage du générateur de contenu...");
    
    // Lire les produits et les posts existants
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const posts = fs.existsSync(POSTS_FILE) ? JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')) : [];

    // Choisir un produit aléatoire
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    console.log(`📌 Produit sélectionné pour l'article du jour : ${randomProduct.name}`);

    // Générer le post
    const newPost = generateSEOArticleForProduct(randomProduct);

    // NOUVEAU : Auto-générer l'affiche Pinterest verticale
    const pinPath = await generatePinterestImage(newPost.slug, newPost.image, newPost.title);
    if (pinPath) {
        newPost.pinterestImage = pinPath;

        // ORGANISATION MEDIA (A la demande de l'utilisateur)
        const MEDIA_DIR = path.join(__dirname, '../../media/pinterest');
        const LISTING_FILE = path.join(MEDIA_DIR, 'pinterest-listing.csv');
        if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

        const pinFilename = path.basename(pinPath);
        const sourcePath = path.join(__dirname, '../../public', pinPath);
        const destPath = path.join(MEDIA_DIR, pinFilename);
        
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            console.log(`📂 [Media] Pin copié vers ${destPath}`);
        }

        // Mise à jour du listing CSV au format Pinterest OFFICIEL
        const SITE_URL = 'https://arganor.vercel.app';
        const BOARD_NAME = 'Arganor - Beauté Naturelle';
        const LISTING_FILE = path.join(MEDIA_DIR, 'pinterest-bulk-upload.csv');
        
        const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

        const row = [
            escapeCsv(`${SITE_URL}${newPost.pinterestImage}`),
            escapeCsv(newPost.title.slice(0, 100)),
            escapeCsv(newPost.metaDescription.slice(0, 500)),
            escapeCsv(`${SITE_URL}/blog/${newPost.slug}`),
            escapeCsv(BOARD_NAME),
            escapeCsv(newPost.publishedDate),
            escapeCsv(newPost.keywords.replace(/,/g, ' ')),
            '""', // Video title (REQUIS)
            '""', // Thumbnail
            '""', // Section
            escapeCsv(newPost.title.slice(0, 500)) // Image alt text
        ];

        const csvContent = row.join(',');

        if (fs.existsSync(LISTING_FILE)) {
            fs.appendFileSync(LISTING_FILE, '\n' + csvContent);
        } else {
            const header = 'Media URL,Title,Description,Link,Pinterest board,Publish date,Keywords,Video title,Thumbnail,Section,Image alt text\n';
            fs.writeFileSync(LISTING_FILE, header + csvContent);
        }
        console.log(`📊 [Media] Listing mis à jour au format valide Pinterest.`);
    }

    posts.unshift(newPost); // Ajouter au début

    // Sauvegarder
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    console.log(`✅ Article généré et sauvegardé avec succès : "${newPost.title}"`);
    console.log(`🌟 Ce blog post travaillera en arrière-plan pour votre SEO 24h/24 !`);
}

runAutopilot().catch(console.error);

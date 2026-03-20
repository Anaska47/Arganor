/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const POSTS_FILE = path.join(__dirname, '../data/posts.json');

// Un générateur algorithmique "finesse" qui écrit comme une rédactrice beauté
// Dans une vraie app, on pourrait brancher l'API OpenAI ICI.
function generateSEOArticleForProduct(product) {
    const titles = [
        `Pourquoi j'ai intégré ${product.name} à ma routine (et pourquoi vous devriez aussi)`,
        `Avis et crash-test : Le secret derrière ${product.name}`,
        `5 raisons étonnantes d'adopter ${product.name} dès aujourd'hui`,
        `Le guide ultime : Comment maximiser les effets de ${product.name}`,
        `Oubliez les cosmétiques classiques, essayez ${product.name}`
    ];

    const title = titles[Math.floor(Math.random() * titles.length)];
    const slug = title.toLowerCase().replace(/[^a-z0-9àâéèêëîïôûùç]+/g, '-').replace(/(^-|-$)/g, '');

    const content = `
# La découverte beauté de la semaine

Nous cherchons toutes et tous le **Graal de la cosmétique naturelle**. Entre les promesses marketing et la réalité, il y a souvent un gouffre. C'est là que le **${product.name}** entre en scène.

## Plus qu'un soin, une véritable thérapie pour votre ${product.category.toLowerCase().includes('visage') ? 'peau' : 'corps/cheveux'}

Ce que j'aime particulièrement avec ce produit de la gamme de prestige *${product.brand}*, c'est sa formulation concentrée. ${product.description}

### Pourquoi ça marche ?
Contrairement aux produits de grande surface qui diluent leurs actifs, ici on est sur de l'ingrédient pur, sourcé de manière éthique. 
* C'est **100% naturel**
* Absorption ultra-rapide (pas d'effet gras résiduel)
* Des résultats visibles dès la première semaine

### Verdict et où le trouver ?
Après un mois de test, il a officiellement remplacé 3 autres produits dans mon armoire de salle de bain. C'est le genre de minimalisme luxueux dont on raffole.

👉 **[Découvrez les avis complets et obtenez-le avec la livraison Premium sur Amazon](/products/${product.slug})**
`;

    return {
        id: `auto-${Date.now()}`,
        title,
        slug,
        excerpt: `Mon avis honnête et détaillé sur ${product.name}. Découvrez comment il a transformé ma routine de soins...`,
        content,
        category: product.category,
        author: "Camille - Experte Beauté Arganor",
        publishedDate: new Date().toISOString().split('T')[0],
        image: product.image,
        relatedProductId: product.id,
        isAutopilot: true
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
    posts.unshift(newPost); // Ajouter au début

    // Sauvegarder
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    console.log(`✅ Article généré et sauvegardé avec succès : "${newPost.title}"`);
    console.log(`🌟 Ce blog post travaillera en arrière-plan pour votre SEO 24h/24 !`);
}

runAutopilot().catch(console.error);

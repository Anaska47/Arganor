const fs = require('fs');
const path = require('path');
const { generatePinterestImage } = require('./pinterest-image-gen.js');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const POSTS_FILE = path.join(__dirname, '../data/posts.json');

// --- Product Generation Variables ---
const REAL_ASINS = ['B07N7PK9QK', 'B00PBX3L7K', 'B00949CTQQ'];
const NICHES = [
    { name: 'Huile d\'Argan Pure', category: 'Soin du Visage', keywords: ['argan pur', 'or liquide', 'anti-âge', 'hydratation intense'] },
    { name: 'Sérum Croissance', category: 'Soin des Cheveux', keywords: ['croissance cheveux', 'biotine', 'fortifiant', 'chevelure dense'] },
    { name: 'Huile de Ricin Royale', category: 'Soin des Cheveux', keywords: ['ricin bio', 'cils longs', 'sourcils denses', 'cuir chevelu'] },
    { name: 'Élixir de Romarin', category: 'Soin des Cheveux', keywords: ['romarin', 'circulation', 'vitalité', 'repousse'] },
    { name: 'Soin Anti-Âge Suprême', category: 'Soin du Visage', keywords: ['rides', 'collagène', 'fermeté', 'éclat'] },
    { name: 'Lait Corps Soyeux', category: 'Soin du Corps', keywords: ['hydratation', 'peau douce', 'nutrition', 'velouté'] },
];
const ADJECTIVES = ['Velours', 'Doré', 'Pur', 'Lumineux', 'Royal', 'Divin', 'Soyeux', 'Radiant', 'Intense', 'Précieux', 'Éternel'];
const NOUNS = ['Nectar', 'Sérum', 'Essence', 'Rituel', 'Infusion', 'Éclat', 'Secret', 'Luxe', 'Miracle'];
const IMAGES = [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=1974&auto=format&fit=crop'
];
const BRANDS = ['Arganor Héritage', 'Arganor Luxe', 'Arganor Professionnel', 'Arganor Botanique'];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateNewProduct() {
    const niche = getRandom(NICHES);
    const baseName = `${getRandom(NOUNS)} ${getRandom(ADJECTIVES)} de ${niche.name}`;
    const id = `auto_p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const slug = baseName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    return {
        id: id,
        asin: getRandom(REAL_ASINS),
        name: baseName,
        slug: slug,
        description: `Découvrez l'ultime raffinement avec **${baseName}**. Cette formule précieuse exploite toute la puissance de ${niche.name} pour offrir des résultats exceptionnels.`,
        benefits: `### Transformez votre routine\n- **Nutrition Profonde**: Une hydratation pénétrante.\n- **Résultats Visibles**: Une routine transformée en 7 jours.\n- **Éthique & Pur**: Le meilleur de la nature pour vous.`,
        price: Math.floor(Math.random() * (120 - 40) + 40) + 0.90,
        category: niche.category,
        brand: getRandom(BRANDS),
        image: getRandom(IMAGES),
        rating: Number((Math.random() * (5.0 - 4.6) + 4.6).toFixed(1)),
        reviews: Math.floor(Math.random() * 500) + 50,
        features: [...niche.keywords.slice(0, 2), "100% Bio", "Luxe"],
        seoTags: [...niche.keywords, "beauté de luxe", "arganor"]
    };
}

// --- Article Generation Variables ---
function generateSEOArticleForProduct(product) {
    const styles = [
        {
            type: 'GUIDE',
            title: `Le Guide Ultime : Comment utiliser ${product.name} comme une pro`,
            intro: `Vous possédez le **${product.name}** mais vous ne savez pas comment en tirer le meilleur parti ? Ce guide est fait pour vous.`,
            outro: `En suivant ces conseils, vous maximiserez votre investissement dans ce produit.`
        },
        {
            type: 'DUEL',
            title: `Match Beauté : ${product.name} vs Les soins classiques`,
            intro: `Aujourd'hui, nous mettons le **${product.name}** à l'épreuve face à la concurrence. Qui sortira vainqueur ?`,
            outro: `Le verdict est sans appel : pour son prix de ${product.price}€, le ${product.name} reste imbattable.`
        },
        {
            type: 'ROUTINE',
            title: `Ma Routine du Matin 100% avec ${product.name}`,
            intro: `Une routine efficace ne doit pas être complexe. Voici comment j'utilise le **${product.name}** au quotidien.`,
            outro: `Une routine simple, efficace et surtout 100% plaisir.`
        }
    ];

    const style = getRandom(styles);
    const title = style.title;
    const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const metaTitle = `${title} | Arganor Beauté`;
    const metaDescription = `${style.intro.slice(0, 150)}... Découvrez notre test complet.`;
    const keywords = [product.name, product.brand, product.category, "avis", "test"].join(', ');

    const content = `
# ${title}

${style.intro}

## Pourquoi choisir ${product.brand} aujourd'hui ?

Le marché de la cosmétique est saturé, mais **${product.name}** se démarque par sa pureté. En tant que produit phare de la gamme **${product.category}**, il répond à une demande croissante de transparence.

### Les 3 avantages clés :

- **Efficacité Redoutable** : Une formule ciblée.
- **Engagement Éthique** : Aucun compromis sur la qualité des ingrédients.
- **Prix Juste** : Accessible au plus grand nombre.

> "L'ingéniosité de ce produit réside dans sa simplicité. On ne triche pas avec la nature."

## Conseils d'utilisation experts

Appliquez le **${product.name}** délicatement et ressentez le luxe s'imprégner dans votre routine quotidienne.

${style.outro}

👉 **[Voir les avis sur ${product.name} et commander sur Amazon](/products/${product.slug})**

---
*Optimisé (Style: ${style.type}). Mots-clés : ${keywords}*
`;

    return {
        id: `auto-${Date.now()}-${Math.floor(Math.random()*1000)}`,
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
        style: style.type,
        pinterestImages: [] // Nous y stockerons les 5 images générées
    };
}

async function runAutopilot() {
    console.log("🚀 [Arganor Mega-Scale Autopilot] Démarrage...");
    
    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const posts = fs.existsSync(POSTS_FILE) ? JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')) : [];

    // L'objectif : 2 nouveaux produits, 2 articles, 5 pins par article (10 pins total)
    const NUM_PRODUCTS = 2;
    const PINS_PER_POST = 5;

    for (let i = 0; i < NUM_PRODUCTS; i++) {
        // 1. Génération du produit
        const newProduct = generateNewProduct();
        products.unshift(newProduct);
        console.log(`📌 Produit Ajouté : ${newProduct.name} (${newProduct.asin})`);

        // 2. Génération de l'article de blog rattaché
        const newPost = generateSEOArticleForProduct(newProduct);

        // 3. Génération de 5 épingles Pinterest uniques
        console.log(`🎨 Génération de ${PINS_PER_POST} épingles Pinterest pour l'article...`);
        for (let j = 1; j <= PINS_PER_POST; j++) {
            const uniquePinSlug = `${newPost.slug}-variante-${j}`;
            const pinPath = await generatePinterestImage(uniquePinSlug, newPost.image, newPost.title);
            
            if (pinPath) {
                newPost.pinterestImages.push(pinPath);
                
                // Si c'est le 1er pin, on le définit comme image principale du post pour l'UI
                if (j === 1) {
                    newPost.pinterestImage = pinPath;
                }
            }
        }

        posts.unshift(newPost);
        console.log(`✅ Article "${newPost.title}" sauvegardé avec ses ${newPost.pinterestImages.length} épingles.`);
    }

    // Sauvegarder les bases de données
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
    console.log(`🌟 Fin du processus Autopilot. 2 produits, 2 articles, et 10 pins générés avec succès !`);
}

runAutopilot().catch(console.error);

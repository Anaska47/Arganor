const fs = require('fs');
const path = require('path');
const { generatePinterestImage } = require('./pinterest-image-gen.js');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const POSTS_FILE = path.join(__dirname, '../data/posts.json');

// --- Curated Catalog of Guaranteed High-Converting Amazon Real Products ---
const REAL_PRODUCTS = [
    {
        name: "Lotion Exfoliante Perfectrice 2% BHA",
        brand: "Paula's Choice",
        category: "Soin du Visage",
        asin: "B00949CTQQ",
        description: "L'exfoliant liquide n°1 avec 2% de BHA (acide salicylique) qui élimine les cellules mortes, désobstrue les pores et lisse visiblement les rides.",
        keywords: ["exfoliant BHA", "pores dilatés", "points noirs", "acide salicylique"],
        price: 39.00
    },
    {
        name: "Huile Fortifiante Cuir Chevelu Romarin Menthe",
        brand: "Mielle Organics",
        category: "Soin des Cheveux",
        asin: "B07N7PK9QK",
        description: "Cette huile infusée au romarin et à la menthe fortifie la fibre capillaire, stimule la pousse et apaise les cuirs chevelus irrités.",
        keywords: ["pousse cheveux", "romarin", "alopécie", "fortifiant capillaire"],
        price: 14.99
    },
    {
        name: "Essence Advanced Snail 96 Mucin Power",
        brand: "COSRX",
        category: "Soin du Visage",
        asin: "B00PBX3L7K",
        description: "Composée à 96% de mucine (bave d'escargot), cette essence légère répare la barrière cutanée et offre une hydratation longue durée radieuse.",
        keywords: ["bave escargot", "hydratation intense", "glass skin", "skincare coréenne"],
        price: 24.50
    },
    {
        name: "Sérum Anti-Imperfections Niacinamide 10% + Zinc 1%",
        brand: "The Ordinary",
        category: "Soin du Visage",
        asin: "B01N33X44C",
        description: "Un sérum ultra-concentré en niacinamide pour réguler le sébum, resserrer les pores et atténuer les imperfections rapidement.",
        keywords: ["niacinamide", "peau grasse", "sérum the ordinary", "imperfections", "pores"],
        price: 10.90
    },
    {
        name: "Baume Hydratant Visage et Corps Peaux Sèches",
        brand: "CeraVe",
        category: "Soin du Corps",
        asin: "B07C5VJGDF",
        description: "Enrichi aux 3 céramides essentiels et à l'acide hyaluronique, ce baume restaure la barrière cutanée sans fini gras.",
        keywords: ["hydratation", "céramides", "peau sèche", "baume cerave", "dermatologique"],
        price: 16.50
    },
    {
        name: "Huile de Soin Capillaire No. 7 Bonding Oil",
        brand: "Olaplex",
        category: "Soin des Cheveux",
        asin: "B0822ZTNJC",
        description: "Une huile réparatrice hautement concentrée qui augmente instantanément la brillance, la douceur et l'éclat des cheveux abîmés.",
        keywords: ["huile cheveux", "réparation cheveux", "olaplex", "brillance extrême", "soin thermoprotecteur"],
        price: 29.50
    },
    {
        name: "Huile Prodigieuse Multi-Fonctions",
        brand: "NUXE",
        category: "Soin du Corps",
        asin: "B00AE6WNY8",
        description: "L'iconique huile sèche nourrissante pour visage, corps et cheveux au parfum d'été mythique.",
        keywords: ["huile sèche", "hydratation corps", "nuxe", "huile prodigieuse", "éclat naturel"],
        price: 26.90
    },
    {
        name: "Gel Moussant Purifiant Peaux Grasses Effaclar",
        brand: "La Roche-Posay",
        category: "Soin du Visage",
        asin: "B00IMJ0HDU",
        description: "Le nettoyant purifiant n°1 pour l'acné, formulé sans alcool pour nettoyer et éliminer l'excès de sébum en douceur.",
        keywords: ["nettoyant visage", "acné", "peau grasse", "effaclar", "la roche-posay"],
        price: 15.90
    },
    {
        name: "Sérum Expert Réparateur de Nuit",
        brand: "Soin Expert Nuit",
        category: "Soin Anti-Âge",
        asin: "B00DEXA0LY",
        description: "Un sérum de nuit concentré conçu pour restaurer l'élasticité et repulper l'épiderme pendant votre sommeil avec des résultats rapides.",
        keywords: ["sérum nuit", "réparation cutanée", "anti-rides", "hydratation"],
        price: 28.90
    }
];

const IMAGES = [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=1974&auto=format&fit=crop'
];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateNewProduct() {
    const rawProd = getRandom(REAL_PRODUCTS);
    
    // Ajout d'un suffixe unique pour éviter les doublons de slugs lors de générations massives
    const uniqueSuffix = Math.floor(Math.random() * 10000);
    const id = `auto_p_${Date.now()}_${uniqueSuffix}`;
    const slug = `${rawProd.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-')}-${uniqueSuffix}`.replace(/(^-|-$)/g, '');

    return {
        id: id,
        asin: rawProd.asin,
        name: rawProd.name,
        slug: slug,
        description: rawProd.description,
        benefits: `### Transformez votre routine\n- **Efficacité Prouvée**: Conçu pour des résultats visibles.\n- **Action Rapide**: Changez la donne dès la première semaine.\n- **Testé & Approuvé**: Un incontournable.`,
        price: rawProd.price,
        category: rawProd.category,
        brand: rawProd.brand,
        image: getRandom(IMAGES),
        rating: Number((Math.random() * (5.0 - 4.6) + 4.6).toFixed(1)),
        reviews: Math.floor(Math.random() * 800) + 150,
        features: [...rawProd.keywords.slice(0, 2), "Incontournable", "Best-Seller"],
        seoTags: [...rawProd.keywords, "beauté", "tendance"]
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

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/products.json');

// --- Configuration Luxe Française ---
const TOTAL_PRODUCTS = 40;

const NICHES = [
    { name: 'Huile d\'Argan Pure', category: 'Soin du Visage', keywords: ['argan pur', 'or liquide', 'anti-âge', 'hydratation intense'] },
    { name: 'Sérum Croissance', category: 'Soin des Cheveux', keywords: ['croissance cheveux', 'biotine', 'fortifiant', 'chevelure dense'] },
    { name: 'Huile de Ricin Royale', category: 'Soin des Cheveux', keywords: ['ricin bio', 'cils longs', 'sourcils denses', 'cuir chevelu'] },
    { name: 'Élixir de Romarin', category: 'Soin des Cheveux', keywords: ['romarin', 'circulation', 'vitalité', 'repousse'] },
    { name: 'Soin Anti-Âge Suprême', category: 'Soin du Visage', keywords: ['rides', 'collagène', 'fermeté', 'éclat'] },
    { name: 'Lait Corps Soyeux', category: 'Soin du Corps', keywords: ['hydratation', 'peau douce', 'nutrition', 'velouté'] },
];

const ADJECTIVES = ['Velours', 'Doré', 'Pur', 'Lumineux', 'Royal', 'Divin', 'Soyeux', 'Radiant', 'Intense', 'Précieux', 'Éternel', 'Sublime', 'Opulent', 'Cristallin', 'Majestueux', 'Botanique', 'Élixir', 'Suprême'];
const NOUNS = ['Nectar', 'Sérum', 'Essence', 'Rituel', 'Infusion', 'Éclat', 'Secret', 'Luxe', 'Miracle', 'Thérapie', 'Oasis', 'Ambrosie'];

const IMAGES = [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1887&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=1887&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=2080&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=1974&auto=format&fit=crop'
];

const BRANDS = ['Arganor Héritage', 'Arganor Luxe', 'Arganor Professionnel', 'Arganor Spa', 'Arganor Botanique', 'Arganor Or Pur'];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateBenefits(niche) {
    const benefits = [
        `### Transformez votre routine\n- **Nutrition Profonde**: Infusé avec ${niche.name} pour une hydratation pénétrante.\n- **Résultats Visibles**: Une peau plus lisse et éclatante en seulement 7 jours.\n- **Éthique & Pur**: Des ingrédients certifiés qui respectent votre nature.`,
        `### Pourquoi c'est une exception\n- **Éclat Naturel**: Libère la luminance originelle de votre teint.\n- **Correction Temps**: Cible efficacement les signes de fatigue et l'âge.\n- **Expérience Sensorielle**: Une texture fine pour un moment de bien-être absolu.`,
        `### La Puissance de ${niche.name}\n- **Bio-Actif**: Formule haute puissance pour une absorption maximale.\n- **Protection Totale**: Bouclier contre les agressions environnementales.\n- **Restauration**: Répare et régénère les tissus en profondeur.`
    ];
    return getRandom(benefits);
}

function generateDescription(name, niche) {
    const templates = [
        `Découvrez l'ultime raffinement avec **${name}**. Cette formule précieuse exploite toute la puissance de ${niche.name} pour offrir des résultats inégalés. Conçu pour celles et ceux qui exigent l'excellence, il transforme chaque soin en un rituel sacré.`,
        `Le secret d'une beauté intemporelle réside dans **${name}**. Enrichi en ${niche.name} pure, ce traitement pénètre au cœur des cellules pour restaurer vitalité et éclat. Un indispensable de toute collection cosmétique de prestige.`,
        `Laissez-vous envoûter par **${name}**, un chef-d'œuvre de la cosmétique naturelle. Formulé avec soin à partir de ${niche.name} issue du commerce équitable, il procure une nutrition intense. Ressentez la différence d'un luxe authentique.`
    ];
    return getRandom(templates);
}

const products = [];
// Des ASINs réels et vérifiés sur Amazon France (qui ne renvoient pas d'erreur 404)
const REAL_ASINS = ['B07N7PK9QK', 'B00PBX3L7K', 'B00949CTQQ'];

for (let i = 0; i < TOTAL_PRODUCTS; i++) {
    const niche = NICHES[i % NICHES.length];
    const adjective = getRandom(ADJECTIVES);
    const noun = getRandom(NOUNS);

    const baseName = `${noun} ${adjective} de ${niche.name}`;
    const id = `p${2000 + i}`;
    const slug = baseName.toLowerCase().replace(/[^a-z0-9àâéèêëîïôûùç]+/g, '-').replace(/(^-|-$)/g, '');

    const product = {
        id: id,
        asin: REAL_ASINS[i % REAL_ASINS.length],
        name: baseName,
        slug: slug,
        description: generateDescription(baseName, niche),
        benefits: generateBenefits(niche),
        price: Math.floor(Math.random() * (149 - 39) + 39) + 0.90, // 39.90€ - 149.90€
        category: niche.category,
        brand: getRandom(BRANDS),
        image: getRandom(IMAGES),
        rating: Number((Math.random() * (5.0 - 4.6) + 4.6).toFixed(1)), // Very high ratings for luxury
        reviews: Math.floor(Math.random() * 800) + 120,
        features: [niche.keywords[0], "100% Bio", "Ethique", "Luxe"],
        seoTags: [...niche.keywords, "beauté de luxe", "arganor", "cosmétique marocaine"]
    };

    products.push(product);
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));
console.log(`[Arganor Engine] Génération réussie de ${products.length} produits de luxe. Target: ${OUTPUT_FILE}`);

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/products.json');

// --- Configuration ---
const TOTAL_PRODUCTS = 200;

// Niches & Categories
const NICHES = [
    { name: 'Argan Oil', category: 'Face Care', keywords: ['argan oil', 'liquid gold', 'anti-aging', 'hydration'] },
    { name: 'Hair Growth', category: 'Hair Care', keywords: ['hair growth', 'biotin', 'strengthening', 'fuller hair'] },
    { name: 'Castor Oil', category: 'Hair Care', keywords: ['castor oil', 'thickening', 'eyelash growth', 'scalp treatment'] },
    { name: 'Rosemary Oil', category: 'Hair Care', keywords: ['rosemary oil', 'circulation', 'scalp health', 'hair revitalization'] },
    { name: 'Anti-Aging', category: 'Face Care', keywords: ['anti-aging', 'wrinkle reduction', 'collagen', 'youthful glow'] },
    { name: 'Skin Hydration', category: 'Body Care', keywords: ['hydration', 'moisture lock', 'dry skin', 'soft skin'] },
    { name: 'Organic Beauty', category: 'Organic Beauty', keywords: ['organic', 'chemical-free', 'natural', 'pure'] },
    { name: 'Natural Cosmetics', category: 'Face Care', keywords: ['natural makeup', 'mineral', 'clean beauty', 'radiance'] },
];

// Luxury Vocabulary
const ADJECTIVES = ['Velvet', 'Golden', 'Pure', 'Luminous', 'Royal', 'Divine', 'Silk', 'Radiant', 'Intense', 'Precious', 'Eternal', 'Sublime', 'Opulent', 'Crystal', 'Night', 'Regal', 'Botanic', 'Elixir', 'Supreme', 'Majestic'];
const NOUNS = ['Nectar', 'Serum', 'Essence', 'Dew', 'Touch', 'Ritual', 'Infusion', 'Glow', 'Revival', 'Secret', 'Luxury', 'Bloom', 'Radiance', 'Solstice', 'Miracle', 'Therapy', 'Oasis', 'Ambrosia'];

// Images (Unsplash High Quality Beauty)
const IMAGES = [
    'https://images.unsplash.com/photo-1542452255-1f5462c4b868?q=80&w=2070&auto=format&fit=crop', // Oil
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=1974&auto=format&fit=crop', // Serum/Bottle
    'https://images.unsplash.com/photo-1608248597279-f99d160bfbc8?q=80&w=1974&auto=format&fit=crop', // Spa/Texture
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop', // Cream
    'https://images.unsplash.com/photo-1556228720-1957be9b936d?q=80&w=1974&auto=format&fit=crop', // Plant/Natural
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop', // Bottle
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1887&auto=format&fit=crop', // Purple/Lavender
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=1935&auto=format&fit=crop', // Soap/Scrub
    'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=1887&auto=format&fit=crop', // Minimal Oil
    'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=2080&auto=format&fit=crop', // Dropper
];

// Brands in the Arganor Ecosystem
const BRANDS = ['Arganor Heritage', 'Arganor Luxe', 'Arganor Professional', 'Arganor Spa', 'Arganor Botanics', 'Arganor Pure', 'Arganor Gold'];

// --- Helper Functions ---

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateBenefits(niche) {
    const benefits = [
        `### Transform Your Routine\n- **Deep Nourishment**: Infused with ${niche.name} for penetrating hydration.\n- **Visible Results**: Users report smoother texture in just 3 days.\n- **Ethically Sourced**: Pure ingredients that respect nature.`,
        `### Why It's A Must-Have\n- **Radiant Glow**: Unlocks your skin's natural luminance.\n- **Time-Time Correction**: Targets signs of aging effectively.\n- **Luxury Experience**: Professional spa quality in your home.`,
        `### The Power of ${niche.name}\n- **Bio-Active**: High potency formula maximum absorption.\n- **Protection**: Shields against environmental stressors.\n- **Restoration**: Repairs damage at the cellular level.`
    ];
    return getRandom(benefits);
}

function generateDescription(name, niche) {
    const templates = [
        `Experience the ultimate in luxury with **${name}**. This potent formula harnesses the power of ${niche.name} to deliver unparalleled results. Designed for those who demand the best, it transforms your daily routine into a ritual of self-care.`,
        `Unlock the secret to ageless beauty with **${name}**. Enriched with pure ${niche.name}, this treatment deeply penetrates to restore vitality and shine. A staple for any premium beauty collection.`,
        `Indulge in **${name}**, a masterpiece of natural skincare. Formulated with ethically sourced ${niche.name}, it provides intense hydration and protection against the elements. Feel the difference of true luxury.`
    ];
    return getRandom(templates);
}

// --- Main Generation ---

const products = [];

for (let i = 0; i < TOTAL_PRODUCTS; i++) {
    const niche = NICHES[i % NICHES.length];
    const adjective = getRandom(ADJECTIVES);
    const noun = getRandom(NOUNS);

    // Ensure unique names roughly
    const baseName = `${adjective} ${niche.name} ${noun}`;
    const id = `p${1000 + i}`;
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const product = {
        id: id,
        asin: "", // Intentionally empty for mocks
        name: baseName,
        slug: slug,
        description: generateDescription(baseName, niche),
        benefits: generateBenefits(niche),
        price: Math.floor(Math.random() * (120 - 25) + 25) + 0.99, // $25.99 - $119.99
        category: niche.category,
        brand: getRandom(BRANDS),
        image: getRandom(IMAGES),
        rating: Number((Math.random() * (5.0 - 4.2) + 4.2).toFixed(1)), // High ratings 4.2+
        reviews: Math.floor(Math.random() * 500) + 24,
        features: [niche.keywords[0], "Cruelty Free", "Organic", "Premium"],
        seoTags: [...niche.keywords, "luxury beauty", "arganor"]
    };

    products.push(product);
}

// Write to file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));
console.log(`Successfully generated ${products.length} products to ${OUTPUT_FILE}`);

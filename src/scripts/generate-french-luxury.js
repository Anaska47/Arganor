/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/products.json');

const {
    buildBenefits,
    buildFeatureList,
    buildSeoTags,
    findCatalogProduct,
    slugify,
} = require('./real-products-catalog.js');

function normalizeProduct(product) {
    const seed = findCatalogProduct(product);

    if (!seed) {
        return {
            ...product,
            slug: product.slug || slugify(product.name || product.id),
        };
    }

    return {
        ...product,
        asin: seed.asin,
        name: seed.name,
        brand: seed.brand,
        category: seed.category,
        description: seed.description,
        benefits: buildBenefits(seed),
        features: buildFeatureList(seed),
        seoTags: buildSeoTags(seed),
        slug: product.slug || slugify(seed.name),
        price: typeof product.price === 'number' ? product.price : seed.price,
        image: product.image || null,
        rating: typeof product.rating === 'number' ? product.rating : 4.8,
        reviews: Number.isFinite(product.reviews) ? product.reviews : 250,
    };
}

function repairCatalog() {
    const current = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    const repaired = current.map(normalizeProduct);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(repaired, null, 2));
    console.log(`[Arganor Catalog Repair] ${repaired.length} produits realignes dans ${OUTPUT_FILE}`);
}

repairCatalog();

const REAL_PRODUCTS = [
    {
        name: "Lotion Exfoliante Perfectrice 2% BHA",
        brand: "Paula's Choice",
        category: "Soin du Visage",
        asin: "B00949CTQQ",
        description:
            "Un exfoliant liquide au BHA qui aide a desobstruer les pores, lisser le grain de peau et limiter l'apparition des imperfections.",
        keywords: ["exfoliant bha", "pores", "points noirs", "acide salicylique"],
        price: 39.0,
    },
    {
        name: "Huile Fortifiante Cuir Chevelu Romarin Menthe",
        brand: "Mielle Organics",
        category: "Soin des Cheveux",
        asin: "B07N7PK9QK",
        description:
            "Une huile capillaire ciblee pour fortifier le cuir chevelu, accompagner la pousse et apporter plus de confort sur les longueurs fragilisees.",
        keywords: ["pousse cheveux", "romarin", "fortifiant capillaire", "cuir chevelu"],
        price: 14.99,
    },
    {
        name: "Essence Advanced Snail 96 Mucin Power",
        brand: "COSRX",
        category: "Soin du Visage",
        asin: "B00PBX3L7K",
        description:
            "Une essence legere riche en mucine pour soutenir l'hydratation, apaiser la peau et renforcer la barriere cutanee au quotidien.",
        keywords: ["mucine", "hydratation", "barriere cutanee", "glass skin"],
        price: 24.5,
    },
    {
        name: "Serum Anti-Imperfections Niacinamide 10% + Zinc 1%",
        brand: "The Ordinary",
        category: "Soin du Visage",
        asin: "B01N33X44C",
        description:
            "Un serum concentre en niacinamide et zinc pour aider a reguler l'exces de sebum, affiner visuellement les pores et calmer les imperfections.",
        keywords: ["niacinamide", "imperfections", "pores", "peau grasse"],
        price: 10.9,
    },
    {
        name: "Baume Hydratant Visage et Corps Peaux Seches",
        brand: "CeraVe",
        category: "Soin du Corps",
        asin: "B07C5VJGDF",
        description:
            "Un baume riche aux ceramides pour nourrir durablement la peau seche et soutenir une barriere cutanee plus confortable.",
        keywords: ["ceramides", "peau seche", "hydratation", "baume"],
        price: 16.5,
    },
    {
        name: "Huile de Soin Capillaire No. 7 Bonding Oil",
        brand: "Olaplex",
        category: "Soin des Cheveux",
        asin: "B0822ZTNJC",
        description:
            "Une huile capillaire reparatrice pour lisser la fibre, apporter de la brillance et proteger les longueurs des agressions quotidiennes.",
        keywords: ["huile cheveux", "reparation", "brillance", "thermoprotecteur"],
        price: 29.5,
    },
    {
        name: "Huile Prodigieuse Multi-Fonctions",
        brand: "NUXE",
        category: "Soin du Corps",
        asin: "B00AE6WNY8",
        description:
            "Une huile seche multi-usage pour nourrir la peau et les cheveux tout en laissant un fini satine facile a porter au quotidien.",
        keywords: ["huile seche", "corps", "cheveux", "eclat"],
        price: 26.9,
    },
    {
        name: "Gel Moussant Purifiant Peaux Grasses Effaclar",
        brand: "La Roche-Posay",
        category: "Soin du Visage",
        asin: "B00IMJ0HDU",
        description:
            "Un nettoyant visage purifiant pour aider a limiter l'exces de sebum et nettoyer la peau grasse sans l'agresser.",
        keywords: ["nettoyant visage", "effaclar", "peau grasse", "acne"],
        price: 15.9,
    },
    {
        name: "Serum Expert Reparateur de Nuit",
        brand: "Soin Expert Nuit",
        category: "Soin du Visage",
        asin: "B00DEXA0LY",
        description:
            "Un serum de nuit pense pour soutenir la regeneration cutanee, lisser la peau au reveil et renforcer le confort d'une routine du soir.",
        keywords: ["serum nuit", "reparation", "hydratation", "anti-rides"],
        price: 28.9,
    },
];

function normalizeCatalogKey(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function slugify(value) {
    return normalizeCatalogKey(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildBenefits(product) {
    return [
        "### Points forts",
        `- **Besoin cible**: ${product.keywords[0] || "routine beaute"}.`,
        `- **Usage simple**: une formule pensee pour integrer facilement une routine ${product.category.toLowerCase()}.`,
        `- **Repere clair**: ${product.brand} reste une reference connue sur ce besoin.`,
    ].join("\n");
}

function buildFeatureList(product) {
    return [...product.keywords.slice(0, 3), product.brand, "Routine ciblee"];
}

function buildSeoTags(product) {
    return [...product.keywords, product.brand.toLowerCase(), "beaute", "routine"];
}

function findCatalogProduct(candidate) {
    const asin = String(candidate?.asin || "").trim();
    if (asin) {
        const byAsin = REAL_PRODUCTS.find((product) => product.asin === asin);
        if (byAsin) {
            return byAsin;
        }
    }

    const normalizedName = normalizeCatalogKey(candidate?.name || "");
    if (!normalizedName) {
        return null;
    }

    return REAL_PRODUCTS.find((product) => normalizeCatalogKey(product.name) === normalizedName) || null;
}

module.exports = {
    REAL_PRODUCTS,
    buildBenefits,
    buildFeatureList,
    buildSeoTags,
    findCatalogProduct,
    normalizeCatalogKey,
    slugify,
};

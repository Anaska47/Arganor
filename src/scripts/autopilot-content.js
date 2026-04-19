const fs = require('fs');
const path = require('path');

const { generatePinterestImage } = require('./pinterest-image-gen.js');
const { createAutopilotRun, updateAutopilotRun } = require('./growth-machine-runs.js');
const { enqueueCompletedContent, toClusterRef } = require('./growth-machine-queue.js');
const { upsertAgentMemory } = require('./growth-machine-memory.js');
const {
    REAL_PRODUCTS,
    buildBenefits,
    buildFeatureList,
    buildSeoTags,
    slugify,
} = require('./real-products-catalog.js');

const PRODUCTS_FILE = path.join(__dirname, '../data/products.json');
const POSTS_FILE = path.join(__dirname, '../data/posts.json');
const STATUS_FILE = path.join(__dirname, '../data/autopilot-status.json');

const IMAGES = [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=1974&auto=format&fit=crop',
];

let currentRunId = null;

function writeStatus(update) {
    let current = {};

    try {
        if (fs.existsSync(STATUS_FILE)) {
            current = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
        }
    } catch {
        current = {};
    }

    fs.writeFileSync(
        STATUS_FILE,
        JSON.stringify(
            {
                ...current,
                ...update,
                lastRunAt: update.lastRunAt || current.lastRunAt || new Date().toISOString(),
            },
            null,
            2,
        ),
    );
}

function detectTriggerSource() {
    if (process.env.GITHUB_ACTIONS === 'true') {
        return 'github_actions';
    }

    if (process.env.VERCEL === '1') {
        return 'vercel_runtime';
    }

    return 'manual_script';
}

function buildWorkflowRunUrl() {
    const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const repository = process.env.GITHUB_REPOSITORY || null;
    const runId = process.env.GITHUB_RUN_ID || null;

    if (!repository || !runId) {
        return null;
    }

    return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

function getWorkflowRef() {
    return process.env.GITHUB_WORKFLOW_REF || process.env.GITHUB_WORKFLOW || null;
}

function getRunMetadata(stage) {
    return {
        stage,
        script: 'autopilot-content.js',
        githubActions: process.env.GITHUB_ACTIONS === 'true',
        workflow: process.env.GITHUB_WORKFLOW || null,
        workflowRef: getWorkflowRef(),
        workflowRunId: process.env.GITHUB_RUN_ID || null,
        workflowRunUrl: buildWorkflowRunUrl(),
        actor: process.env.GITHUB_ACTOR || null,
        eventName: process.env.GITHUB_EVENT_NAME || null,
        job: process.env.GITHUB_JOB || null,
        refName: process.env.GITHUB_REF_NAME || null,
        commitSha: process.env.GITHUB_SHA || null,
    };
}

async function writeLatestRunMemory(status, details = {}) {
    try {
        await upsertAgentMemory({
            memory_key: 'hook:autopilot:latest-run',
            memory_type: 'decision',
            source: 'autopilot-content.js',
            summary: details.summary || `Autopilot run is ${status}.`,
            last_seen_at: new Date().toISOString(),
            value: {
                status,
                runId: currentRunId,
                triggerSource: details.triggerSource || detectTriggerSource(),
                workflowRunUrl: buildWorkflowRunUrl(),
                ...details,
            },
        });
    } catch (error) {
        console.warn('[autopilot] Failed to write latest run memory:', error);
    }
}

function getRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function generateNewProduct() {
    const seed = getRandom(REAL_PRODUCTS);
    const uniqueSuffix = Math.floor(Math.random() * 10000);
    const id = `auto_p_${Date.now()}_${uniqueSuffix}`;
    const slug = `${slugify(seed.name)}-${uniqueSuffix}`.replace(/(^-|-$)/g, '');

    return {
        id,
        asin: seed.asin,
        name: seed.name,
        slug,
        description: seed.description,
        benefits: buildBenefits(seed),
        price: seed.price,
        category: seed.category,
        brand: seed.brand,
        image: getRandom(IMAGES),
        rating: Number((Math.random() * (5.0 - 4.6) + 4.6).toFixed(1)),
        reviews: Math.floor(Math.random() * 800) + 150,
        features: buildFeatureList(seed),
        seoTags: buildSeoTags(seed),
    };
}

function buildArticleBody(product, style) {
    const focus = product.features?.[0] || product.category.toLowerCase();
    const secondaryFocus = product.features?.[1] || product.brand;

    return [
        `# ${style.title}`,
        '',
        style.intro,
        '',
        '## Ce que ce produit apporte vraiment',
        '',
        `**${product.name}** attire surtout pour une promesse claire: ${product.description}`,
        `Dans une routine ${product.category.toLowerCase()}, cela aide a garder une logique simple et a eviter les etapes qui n'apportent pas grand-chose.`,
        '',
        '### Les points a retenir',
        '',
        `- **Besoin cible**: ${focus}.`,
        `- **Routine lisible**: le produit se place facilement dans une sequence deja stable.`,
        `- **Repere marque**: ${product.brand} reste associe a ${secondaryFocus.toLowerCase()}.`,
        '',
        '> "Le bon produit n est pas celui qui promet tout, mais celui qui tient correctement son role dans une routine realiste."',
        '',
        '## Comment l utiliser sans surcharger la routine',
        '',
        `Le plus efficace reste d introduire **${product.name}** progressivement. Une utilisation reguliere, associee a une routine deja claire, donne des signaux bien plus utiles qu une accumulation de soins.`,
        `Prenez le temps d observer la tolerance, la texture et la frequence ideale selon votre usage. C est cette regularite qui fait la difference sur plusieurs semaines.`,
        '',
        '## Pour qui ce choix est pertinent',
        '',
        `Ce produit a surtout du sens si votre priorite tourne autour de **${focus}**. Si votre besoin principal est ailleurs, mieux vaut rester sur une routine plus courte et comparer avec une reference plus adaptee.`,
        '',
        style.outro,
    ].join('\n');
}

function generateSEOArticleForProduct(product) {
    const styles = [
        {
            type: 'GUIDE',
            title: `Le guide pratique pour bien utiliser ${product.name}`,
            intro: `Si vous voulez tirer un vrai benefice de **${product.name}**, le plus utile reste une application reguliere et adaptee a votre routine.`,
            outro: `L essentiel n est pas d en faire trop, mais d etre constante avec une routine simple et lisible.`,
        },
        {
            type: 'DUEL',
            title: `${product.name} face aux routines classiques: que vaut-il vraiment ?`,
            intro: `Quand un produit comme **${product.name}** revient souvent dans les routines conseillees, il faut regarder concretement ce qu il apporte face aux options plus generiques.`,
            outro: `A ce niveau de prix, ${product.name} reste surtout interessant si vous cherchez un usage cible plutot qu un produit fourre-tout.`,
        },
        {
            type: 'ROUTINE',
            title: `Comment j integre ${product.name} dans une routine simple`,
            intro: `Le plus durable reste souvent une routine courte et reguliere. Voici comment **${product.name}** peut s integrer sans compliquer vos gestes du quotidien.`,
            outro: `Si le produit repond bien a votre besoin, quelques etapes bien placees suffisent largement pour voir la difference.`,
        },
    ];

    const style = getRandom(styles);
    const title = style.title;
    const slug = slugify(title);
    const metaTitle = `${title} | Arganor Beaute`;
    const metaDescription = `${style.intro.slice(0, 145)}... Retrouvez les points cles, les usages utiles et notre avis pratique.`;
    const keywords = [product.name, product.brand, product.category, 'avis', 'test'].join(', ');

    return {
        id: `auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        slug,
        metaTitle,
        metaDescription,
        keywords,
        excerpt: style.intro,
        content: buildArticleBody(product, style),
        category: product.category,
        author: 'Camille - Redactrice Arganor',
        publishedDate: new Date().toISOString().split('T')[0],
        image: product.image,
        relatedProductId: product.id,
        affiliateQuery: product.name,
        isAutopilot: true,
        style: style.type,
        pinterestImages: [],
    };
}

async function runAutopilot() {
    console.log('[Arganor Mega-Scale Autopilot] Demarrage...');
    const startedAt = new Date().toISOString();
    const triggerSource = detectTriggerSource();
    let generatedProducts = 0;
    let generatedPosts = 0;
    let generatedPins = 0;
    let queuedItems = 0;
    const completedQueueEntries = [];
    const pendingMemoryEntries = [];

    try {
        const run = await createAutopilotRun({
            trigger_source: triggerSource,
            status: 'running',
            run_label: 'autopilot-content',
            workflow_ref: getWorkflowRef(),
            commit_sha: process.env.GITHUB_SHA || null,
            started_at: startedAt,
            metadata: getRunMetadata('started'),
        });
        currentRunId = run?.id || null;
    } catch (error) {
        console.warn('[autopilot] Supabase run creation failed:', error);
        currentRunId = null;
    }

    await writeLatestRunMemory('running', {
        startedAt,
        triggerSource,
        summary: 'Autopilot generation started.',
    });

    writeStatus({
        status: 'running',
        supabaseRunId: currentRunId,
        lastRunAt: startedAt,
        triggerSource,
        workflowRunUrl: buildWorkflowRunUrl(),
        generatedProducts: 0,
        generatedPosts: 0,
        generatedPins: 0,
        message: 'Autopilot generation started.',
        errors: [],
        warnings: [],
    });

    const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const posts = fs.existsSync(POSTS_FILE) ? JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')) : [];

    const NUM_PRODUCTS = 2;
    const PINS_PER_POST = 5;

    for (let i = 0; i < NUM_PRODUCTS; i++) {
        const newProduct = generateNewProduct();
        products.unshift(newProduct);
        generatedProducts++;
        console.log(`[autopilot] Produit ajoute: ${newProduct.name} (${newProduct.asin})`);

        const newPost = generateSEOArticleForProduct(newProduct);

        console.log(`[autopilot] Generation de ${PINS_PER_POST} epingles Pinterest pour ${newPost.slug}...`);
        for (let j = 1; j <= PINS_PER_POST; j++) {
            const uniquePinSlug = `${newPost.slug}-variante-${j}`;
            const pinPath = await generatePinterestImage(uniquePinSlug, newPost.image, newPost.title);

            if (pinPath) {
                newPost.pinterestImages.push(pinPath);
                generatedPins++;

                if (j === 1) {
                    newPost.pinterestImage = pinPath;
                }
            }
        }

        posts.unshift(newPost);
        generatedPosts++;
        console.log(`[autopilot] Article "${newPost.title}" sauvegarde avec ${newPost.pinterestImages.length} epingles.`);

        const clusterRef = toClusterRef(newProduct.category);
        const queuePayload = {
            generatedBy: 'autopilot-content',
            style: newPost.style,
            productName: newProduct.name,
            productImage: newProduct.image,
            excerpt: newPost.excerpt,
            pinterestImages: newPost.pinterestImages,
            generatedPinsForPost: newPost.pinterestImages.length,
        };

        pendingMemoryEntries.push({
            label: `product:${newProduct.slug}:generation`,
            record: {
                memory_key: `product:${newProduct.slug}:generation`,
                memory_type: 'pattern',
                product_ref: newProduct.slug,
                post_ref: newPost.slug,
                cluster_ref: clusterRef,
                source: 'autopilot-content.js',
                summary: `Generated product ${newProduct.name} and linked post ${newPost.slug}.`,
                last_seen_at: new Date().toISOString(),
                value: {
                    generatedAt: startedAt,
                    productName: newProduct.name,
                    brand: newProduct.brand,
                    category: newProduct.category,
                    asin: newProduct.asin || null,
                    relatedPostRef: newPost.slug,
                    pinsGenerated: newPost.pinterestImages.length,
                },
            },
        });

        pendingMemoryEntries.push({
            label: `post:${newPost.slug}:generation`,
            record: {
                memory_key: `post:${newPost.slug}:generation`,
                memory_type: 'pattern',
                product_ref: newProduct.slug,
                post_ref: newPost.slug,
                cluster_ref: clusterRef,
                source: 'autopilot-content.js',
                summary: `Generated post ${newPost.slug} using style ${newPost.style || 'autopilot'}.`,
                last_seen_at: new Date().toISOString(),
                value: {
                    generatedAt: startedAt,
                    style: newPost.style || null,
                    title: newPost.title,
                    excerpt: newPost.excerpt,
                    relatedProductRef: newProduct.slug,
                    pinsGenerated: newPost.pinterestImages.length,
                },
            },
        });

        if (clusterRef) {
            pendingMemoryEntries.push({
                label: `cluster:${clusterRef}:generation`,
                record: {
                    memory_key: `cluster:${clusterRef}:generation`,
                    memory_type: 'pattern',
                    product_ref: newProduct.slug,
                    post_ref: newPost.slug,
                    cluster_ref: clusterRef,
                    source: 'autopilot-content.js',
                    summary: `Latest generation for cluster ${clusterRef}: ${newPost.slug}.`,
                    last_seen_at: new Date().toISOString(),
                    value: {
                        generatedAt: startedAt,
                        latestProductRef: newProduct.slug,
                        latestPostRef: newPost.slug,
                        style: newPost.style || null,
                        pinsGenerated: newPost.pinterestImages.length,
                    },
                },
            });
        }

        completedQueueEntries.push({
            kind: 'product',
            title: newProduct.name,
            topic: newProduct.name,
            intent: 'catalog_expansion',
            product_ref: newProduct.slug,
            cluster_ref: clusterRef,
            decision_reason: 'Generated automatically by autopilot-content.js',
            payload: {
                ...queuePayload,
                asin: newProduct.asin || null,
                category: newProduct.category,
            },
        });

        completedQueueEntries.push({
            kind: 'post',
            title: newPost.title,
            topic: newPost.title,
            intent: (newPost.style || 'autopilot').toLowerCase(),
            product_ref: newProduct.slug,
            post_ref: newPost.slug,
            cluster_ref: clusterRef,
            decision_reason: 'Generated automatically by autopilot-content.js',
            payload: queuePayload,
        });
    }

    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));

    for (const entry of completedQueueEntries) {
        try {
            const queueItem = await enqueueCompletedContent(entry);
            if (queueItem) {
                queuedItems++;
            }
        } catch (error) {
            console.warn(`[autopilot] Failed to write ${entry.kind} content_queue entry:`, error);
        }
    }

    for (const entry of pendingMemoryEntries) {
        try {
            await upsertAgentMemory(entry.record);
        } catch (error) {
            console.warn(`[autopilot] Failed to write ${entry.label} agent_memory entry:`, error);
        }
    }

    writeStatus({
        status: 'generated',
        supabaseRunId: currentRunId,
        lastRunAt: startedAt,
        lastSuccessAt: new Date().toISOString(),
        triggerSource,
        workflowRunUrl: buildWorkflowRunUrl(),
        generatedProducts,
        generatedPosts,
        generatedPins,
        message: `Generated ${generatedProducts} products, ${generatedPosts} posts, and ${generatedPins} pins.`,
        errors: [],
        warnings: [],
    });

    await writeLatestRunMemory('generated', {
        startedAt,
        completedAt: new Date().toISOString(),
        triggerSource,
        generatedProducts,
        generatedPosts,
        generatedPins,
        queuedItems,
        summary: `Autopilot generated ${generatedProducts} products, ${generatedPosts} posts and ${generatedPins} pins.`,
    });

    try {
        await updateAutopilotRun(currentRunId, {
            status: 'completed',
            workflow_ref: getWorkflowRef(),
            completed_at: new Date().toISOString(),
            stats: {
                generatedProducts,
                generatedPosts,
                generatedPins,
                queuedItems,
            },
            metadata: {
                ...getRunMetadata('generated'),
                validationPending: true,
            },
        });
    } catch (error) {
        console.warn('[autopilot] Supabase run completion update failed:', error);
    }

    console.log('[autopilot] Fin du processus. 2 produits, 2 articles et 10 pins generes avec succes.');
}

runAutopilot().catch(async (error) => {
    console.error('Autopilot failed:', error);
    writeStatus({
        status: 'failed',
        supabaseRunId: currentRunId,
        lastRunAt: new Date().toISOString(),
        triggerSource: detectTriggerSource(),
        workflowRunUrl: buildWorkflowRunUrl(),
        message: error instanceof Error ? error.message : String(error),
        errors: [error instanceof Error ? error.stack || error.message : String(error)],
    });

    await writeLatestRunMemory('failed', {
        completedAt: new Date().toISOString(),
        triggerSource: detectTriggerSource(),
        error: error instanceof Error ? error.stack || error.message : String(error),
        summary: error instanceof Error ? error.message : String(error),
    });

    try {
        await updateAutopilotRun(currentRunId, {
            status: 'failed',
            workflow_ref: getWorkflowRef(),
            completed_at: new Date().toISOString(),
            errors: [error instanceof Error ? error.stack || error.message : String(error)],
            metadata: getRunMetadata('generation_failed'),
        });
    } catch (supabaseError) {
        console.warn('[autopilot] Supabase run failure update failed:', supabaseError);
    }

    process.exit(1);
});

const fs = require("fs");
const path = require("path");
const { getAutopilotRun, updateAutopilotRun } = require("./growth-machine-runs.js");
const { upsertAgentMemory } = require("./growth-machine-memory.js");
const { getSupabaseClient } = require("./growth-machine-supabase.js");

const ROOT = path.join(__dirname, "../..");
const PRODUCTS_FILE = path.join(ROOT, "src/data/products.json");
const POSTS_FILE = path.join(ROOT, "src/data/posts.json");
const STATUS_FILE = path.join(ROOT, "src/data/autopilot-status.json");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://arganor.vercel.app").replace(/\/+$/, "");

const errors = [];
const warnings = [];

function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function slugifySegment(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function toClusterRef(value) {
    const cluster = slugifySegment(value);
    return cluster || null;
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function recordStatus(partial) {
    let current = {};
    try {
        current = readJson(STATUS_FILE);
    } catch {
        current = {};
    }

    fs.writeFileSync(STATUS_FILE, JSON.stringify({
        ...current,
        ...partial,
        validationAt: new Date().toISOString(),
        errors,
        warnings,
    }, null, 2));
}

function getRunIdFromStatusFile() {
    try {
        const status = readJson(STATUS_FILE);
        return status.supabaseRunId || null;
    } catch {
        return null;
    }
}

async function syncValidationResult(status, details) {
    const runId = getRunIdFromStatusFile();
    if (!runId) {
        return;
    }

    try {
        const currentRun = await getAutopilotRun(runId);
        const currentStats = asObject(currentRun?.stats);
        const currentMetadata = asObject(currentRun?.metadata);

        await updateAutopilotRun(runId, {
            status,
            completed_at: new Date().toISOString(),
            stats: {
                ...currentStats,
                ...details.stats,
                validationErrors: details.errors.length,
                validationWarnings: details.warnings.length,
            },
            errors: details.errors,
            warnings: details.warnings,
            metadata: {
                ...currentMetadata,
                stage: details.stage,
                validator: "validate-autopilot.js",
                siteUrl: SITE_URL,
                feedUrl: `${SITE_URL}/feed.xml`,
                validationAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.warn("[validate-autopilot] Supabase sync failed:", error);
    }
}

async function readAgentMemory(memoryKey) {
    try {
        const client = await getSupabaseClient();
        if (!client) {
            return null;
        }

        const { data, error } = await client
            .from("agent_memory")
            .select("memory_key, summary, value")
            .eq("memory_key", memoryKey)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data || null;
    } catch (error) {
        console.warn(`[validate-autopilot] Failed to read ${memoryKey}:`, error);
        return null;
    }
}

async function writeValidationMemory(products, posts, feedPins) {
    const validatedAt = new Date().toISOString();
    const feedHealthStatus = errors.length > 0 ? "failed" : "validated";

    try {
        await upsertAgentMemory({
            memory_key: "cluster:global:validation",
            memory_type: "constraint",
            cluster_ref: "global",
            source: "validate-autopilot.js",
            summary: errors.length > 0
                ? `Validation failed with ${errors.length} errors and ${warnings.length} warnings.`
                : `Validation passed with ${warnings.length} warnings and ${feedPins} RSS pins.`,
            last_seen_at: validatedAt,
            value: {
                validatedAt,
                status: feedHealthStatus,
                productsCount: products.length,
                postsCount: posts.length,
                feedPins,
                errors,
                warnings,
            },
        });
    } catch (error) {
        console.warn("[validate-autopilot] Failed to write global validation memory:", error);
    }

    try {
        await upsertAgentMemory({
            memory_key: "hook:rss:feed-health",
            memory_type: "constraint",
            source: "validate-autopilot.js",
            summary: errors.length > 0
                ? `RSS/feed validation failed with ${errors.length} errors and ${warnings.length} warnings.`
                : `RSS/feed validation passed with ${feedPins} pins and ${warnings.length} warnings.`,
            last_seen_at: validatedAt,
            value: {
                validatedAt,
                status: feedHealthStatus,
                feedPins,
                warningCount: warnings.length,
                errorCount: errors.length,
                feedUrl: `${SITE_URL}/feed.xml`,
                siteUrl: SITE_URL,
                errors,
                warnings,
            },
        });
    } catch (error) {
        console.warn("[validate-autopilot] Failed to write feed health memory:", error);
    }

    try {
        const currentLatestRun = await readAgentMemory("hook:autopilot:latest-run");
        const currentLatestRunValue = asObject(currentLatestRun?.value);

        await upsertAgentMemory({
            memory_key: "hook:autopilot:latest-run",
            memory_type: "decision",
            source: "validate-autopilot.js",
            summary: errors.length > 0
                ? `Autopilot validation failed with ${errors.length} errors.`
                : `Autopilot validation passed with ${feedPins} pins exposed in the feed.`,
            last_seen_at: validatedAt,
            value: {
                ...currentLatestRunValue,
                status: feedHealthStatus,
                completedAt: validatedAt,
                validatedAt,
                validationStatus: feedHealthStatus,
                feedPins,
                warningCount: warnings.length,
                errorCount: errors.length,
                feedUrl: `${SITE_URL}/feed.xml`,
            },
        });
    } catch (error) {
        console.warn("[validate-autopilot] Failed to refresh latest run memory:", error);
    }

    for (const warning of warnings) {
        const match = warning.match(/^posts\[(\d+)\] references a missing product id: (.+)\.$/);
        if (!match) {
            continue;
        }

        const index = Number.parseInt(match[1], 10);
        const missingProductId = match[2];
        const post = posts[index];
        if (!post?.slug) {
            continue;
        }

        try {
            await upsertAgentMemory({
                memory_key: `post:${post.slug}:validation`,
                memory_type: "constraint",
                post_ref: post.slug,
                cluster_ref: toClusterRef(post.category),
                source: "validate-autopilot.js",
                summary: `Validation warning: missing related product ${missingProductId}.`,
                last_seen_at: validatedAt,
                value: {
                    validatedAt,
                    status: "warning",
                    warningType: "missing_related_product",
                    missingProductId,
                    postTitle: post.title,
                },
            });
        } catch (error) {
            console.warn(`[validate-autopilot] Failed to write post validation memory for ${post.slug}:`, error);
        }
    }
}

function assertArray(name, value) {
    if (!Array.isArray(value)) {
        errors.push(`${name} must be a JSON array.`);
        return false;
    }
    return true;
}

function requireField(entity, index, field, label) {
    if (!entity[field] || typeof entity[field] !== "string") {
        errors.push(`${label}[${index}] is missing string field "${field}".`);
    }
}

function validateUnique(items, field, label) {
    const seen = new Map();
    for (const item of items) {
        const value = item[field];
        if (!value) continue;
        if (seen.has(value)) {
            errors.push(`${label} duplicate ${field}: "${value}" (${seen.get(value)} and ${item.id || item.slug}).`);
        } else {
            seen.set(value, item.id || item.slug || "unknown");
        }
    }
}

function validateImageUrl(value, label) {
    if (!value || typeof value !== "string") {
        errors.push(`${label} is missing an image URL.`);
        return;
    }

    if (/^https?:\/\//i.test(value)) {
        return;
    }

    if (!value.startsWith("/")) {
        errors.push(`${label} image must be absolute or site-root relative: ${value}`);
        return;
    }

    const localPath = path.join(ROOT, "public", value.replace(/^\/+/, ""));
    if (!fs.existsSync(localPath)) {
        errors.push(`${label} local image does not exist: ${value}`);
    }
}

function validateProducts(products) {
    products.forEach((product, index) => {
        ["id", "name", "slug", "category", "image"].forEach((field) => requireField(product, index, field, "products"));

        if (product.asin && !/^[A-Z0-9]{10}$/.test(product.asin)) {
            errors.push(`products[${index}] has invalid ASIN "${product.asin}".`);
        }

        validateImageUrl(product.image, `products[${index}]`);
    });

    validateUnique(products, "id", "products");
    validateUnique(products, "slug", "products");
}

function validatePosts(posts, products) {
    const productIds = new Set(products.map((product) => product.id));

    posts.forEach((post, index) => {
        ["id", "title", "slug", "excerpt", "content", "category", "publishedDate", "image"].forEach((field) => {
            requireField(post, index, field, "posts");
        });

        if ((post.content || "").length < 400) {
            errors.push(`posts[${index}] content is too short for SEO guardrails: ${post.slug || post.id}.`);
        }

        if (post.relatedProductId && !productIds.has(post.relatedProductId)) {
            warnings.push(`posts[${index}] references a missing product id: ${post.relatedProductId}.`);
        }

        validateImageUrl(post.image, `posts[${index}]`);

        const pinImages = Array.isArray(post.pinterestImages) && post.pinterestImages.length > 0
            ? post.pinterestImages
            : [post.pinterestImage || post.image];

        pinImages.forEach((image, pinIndex) => validateImageUrl(image, `posts[${index}].pin[${pinIndex}]`));
    });

    validateUnique(posts, "id", "posts");
    validateUnique(posts, "slug", "posts");
}

function validateRss(posts) {
    const guids = new Set();
    let feedPins = 0;

    for (const post of posts.slice(0, 50)) {
        const url = encodeURI(`${SITE_URL}/blog/${post.slug}`);
        const pinImages = Array.isArray(post.pinterestImages) && post.pinterestImages.length > 0
            ? post.pinterestImages
            : [post.pinterestImage || post.image];

        pinImages.forEach((image, index) => {
            if (!image) return;
            const guid = index > 0 ? `${url}?pin=${index}` : url;
            const imageUrl = /^https?:\/\//i.test(image) ? image : `${SITE_URL}${image}`;

            if (guids.has(guid)) {
                errors.push(`RSS duplicate guid: ${guid}`);
            }

            if (!/^https?:\/\//i.test(imageUrl)) {
                errors.push(`RSS image URL is not absolute: ${imageUrl}`);
            }

            guids.add(guid);
            feedPins += 1;
        });
    }

    if (feedPins === 0) {
        errors.push("RSS feed would expose zero pins.");
    }

    return feedPins;
}

async function main() {
    const products = readJson(PRODUCTS_FILE);
    const posts = readJson(POSTS_FILE);

    if (!assertArray("products", products) || !assertArray("posts", posts)) {
        recordStatus({ status: "failed", message: "Autopilot validation failed." });
        await syncValidationResult("failed", {
            stage: "validation_failed",
            stats: {},
            errors,
            warnings,
        });
        process.exit(1);
    }

    validateProducts(products);
    validatePosts(posts, products);
    const feedPins = validateRss(posts);
    await writeValidationMemory(products, posts, feedPins);

    if (errors.length > 0) {
        recordStatus({ status: "failed", feedPins, message: "Autopilot validation failed." });
        await syncValidationResult("failed", {
            stage: "validation_failed",
            stats: {
                productsCount: products.length,
                postsCount: posts.length,
                feedPins,
            },
            errors,
            warnings,
        });
        console.error("[validate-autopilot] Failed:");
        errors.forEach((error) => console.error(`- ${error}`));
        warnings.forEach((warning) => console.warn(`- warning: ${warning}`));
        process.exit(1);
    }

    recordStatus({ status: "validated", feedPins, message: `Autopilot validation passed with ${feedPins} RSS pins.` });
    await syncValidationResult("completed", {
        stage: "validated",
        stats: {
            productsCount: products.length,
            postsCount: posts.length,
            feedPins,
        },
        errors: [],
        warnings,
    });
    console.log(`[validate-autopilot] OK: ${products.length} products, ${posts.length} posts, ${feedPins} RSS pins.`);
    warnings.forEach((warning) => console.warn(`[validate-autopilot] warning: ${warning}`));
}

main().catch((error) => {
    console.error("[validate-autopilot] Unexpected failure:", error);
    process.exit(1);
});

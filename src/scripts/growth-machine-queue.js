const { getSupabaseClient } = require("./growth-machine-supabase.js");

function optionalText(value) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
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

async function enqueueContent(record) {
    const client = await getSupabaseClient();
    if (!client) {
        return null;
    }

    const payload = {
        kind: "post",
        status: "queued",
        priority: 0,
        payload: {},
        ...record,
        title: optionalText(record.title),
        topic: optionalText(record.topic),
        intent: optionalText(record.intent),
        product_ref: optionalText(record.product_ref),
        post_ref: optionalText(record.post_ref),
        cluster_ref: optionalText(record.cluster_ref),
        decision_reason: optionalText(record.decision_reason),
    };

    const { data, error } = await client.from("content_queue").insert(payload).select().single();

    if (error) {
        throw error;
    }

    return data;
}

async function enqueueCompletedContent(record) {
    return enqueueContent({
        status: "completed",
        processed_at: new Date().toISOString(),
        ...record,
    });
}

module.exports = {
    enqueueContent,
    enqueueCompletedContent,
    toClusterRef,
};

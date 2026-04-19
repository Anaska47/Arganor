import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { getAdminApiKey } from "@/lib/api-auth";
import { readClicksDataAsync } from "@/lib/click-tracking";
import type { Product } from "@/lib/data";
import { getAgentMemory, listAutopilotRuns } from "@/lib/growth-machine/store";
import { readRuntimePosts, readRuntimeProducts } from "@/lib/runtime-content-store";
import { hasSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PostRecord = {
    title?: string;
    slug?: string;
    publishedDate?: string | null;
    pinterestImages?: string[];
    pinterestImage?: string | null;
    image?: string | null;
};

type LocalAutopilotStatus = {
    status?: string;
    lastRunAt?: string | null;
    lastSuccessAt?: string | null;
    generatedProducts?: number;
    generatedPosts?: number;
    generatedPins?: number;
    feedPins?: number;
    message?: string;
    errors?: string[];
    warnings?: string[];
    supabaseRunId?: string | null;
    workflowRunUrl?: string | null;
    triggerSource?: string | null;
    validationAt?: string | null;
};

type Activity = {
    id: number;
    type: "sale" | "blog" | "pinterest" | "product";
    text: string;
    time: string;
    status: "success" | "info" | "warning";
};

type FeedHealth = {
    status: string;
    feedPins: number;
    warningCount: number;
    errorCount: number;
    validatedAt: string | null;
    feedUrl: string;
    memoryKey: string | null;
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://arganor.vercel.app").replace(/\/+$/, "");
const FEED_URL = `${SITE_URL}/feed.xml`;
const DATA_ROOT = path.join(process.cwd(), "src", "data");
const STATUS_FILE = path.join(DATA_ROOT, "autopilot-status.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
    try {
        if (!fs.existsSync(filePath)) {
            return fallback;
        }

        return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    } catch (error) {
        console.error(`Error reading ${path.basename(filePath)}:`, error);
        return fallback;
    }
}

function asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOrNull(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function booleanOrFalse(value: unknown): boolean {
    return value === true;
}

function timestampOrNull(value: string | null) {
    if (!value) {
        return null;
    }

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
}

function countFeedPins(posts: PostRecord[]): number {
    return posts.slice(0, 50).reduce((acc, post) => {
        if (Array.isArray(post.pinterestImages) && post.pinterestImages.length > 0) {
            return acc + post.pinterestImages.length;
        }

        return acc + (post.pinterestImage || post.image ? 1 : 0);
    }, 0);
}

function formatTime(isoDate: string) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "a l'instant";
    if (mins < 60) return `il y a ${mins} min`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;

    return new Date(isoDate).toLocaleDateString("fr-FR");
}

function chooseLatestAutopilotRun(runs: Array<Record<string, unknown>>) {
    return (
        runs.find((run) => {
            const metadata = asObject(run.metadata);
            return run.run_label === "autopilot-content" || metadata.script === "autopilot-content.js";
        }) ||
        runs[0] ||
        null
    );
}

function isLocalOnlyRun(run: Record<string, unknown> | null) {
    if (!run) {
        return false;
    }

    const metadata = asObject(run.metadata);
    const triggerSource = stringOrNull(run.trigger_source);

    if (
        booleanOrFalse(metadata.localMode) ||
        booleanOrFalse(metadata.localOnly) ||
        booleanOrFalse(metadata.dryRun)
    ) {
        return true;
    }

    return (
        triggerSource === "manual_script" &&
        !booleanOrFalse(metadata.githubActions) &&
        !stringOrNull(metadata.workflowRunId) &&
        !stringOrNull(metadata.workflowRunUrl)
    );
}

function buildAutopilotMessage(params: {
    localStatus: LocalAutopilotStatus;
    latestRun: Record<string, unknown> | null;
    feedHealth: FeedHealth;
    preferLocalValidation: boolean;
}) {
    const { localStatus, latestRun, feedHealth, preferLocalValidation } = params;
    const latestStats = asObject(latestRun?.stats);
    const generatedProducts = numberOrNull(latestStats.generatedProducts) ?? localStatus.generatedProducts ?? 0;
    const generatedPosts = numberOrNull(latestStats.generatedPosts) ?? localStatus.generatedPosts ?? 0;
    const generatedPins = numberOrNull(latestStats.generatedPins) ?? localStatus.generatedPins ?? 0;

    if (preferLocalValidation && localStatus.message) {
        return localStatus.message;
    }

    if (latestRun?.status === "failed") {
        return localStatus.message || "Le dernier run autopilot a echoue.";
    }

    if (feedHealth.status === "validated") {
        return `Dernier run valide: ${generatedProducts} produits, ${generatedPosts} articles, ${generatedPins} pins, ${feedHealth.feedPins} pins exposes dans le feed.`;
    }

    if (feedHealth.status === "failed") {
        return `Generation terminee mais validation RSS en echec (${feedHealth.errorCount} erreur(s), ${feedHealth.warningCount} warning(s)).`;
    }

    return localStatus.message || "Statut autopilot disponible.";
}

export async function GET() {
    const [products, posts] = await Promise.all([
        readRuntimeProducts<Product>(),
        readRuntimePosts<PostRecord>(),
    ]);
    const totalProducts = products.length;

    const clicksData = await readClicksDataAsync();
    const realClicks = clicksData.totalClicks || 0;
    const recentClickActivities = clicksData.recentClicks || [];

    const blogPosts = Array.isArray(posts) ? posts.length : 0;
    const rssPins = Array.isArray(posts) ? countFeedPins(posts) : 0;
    const latestPostDate = Array.isArray(posts) ? posts[0]?.publishedDate || null : null;

    const localAutopilot = readJsonFile<LocalAutopilotStatus>(STATUS_FILE, {
        status: "unknown",
        message: "No autopilot status file found.",
    });

    let latestAutopilotRun: Record<string, unknown> | null = null;
    let latestRunMemory: { memory_key?: string; summary?: string | null; value?: unknown } | null = null;
    const localFeedHealth: FeedHealth = {
        status: localAutopilot.status || "unknown",
        feedPins: localAutopilot.feedPins ?? rssPins,
        warningCount: localAutopilot.warnings?.length || 0,
        errorCount: localAutopilot.errors?.length || 0,
        validatedAt: localAutopilot.validationAt || null,
        feedUrl: FEED_URL,
        memoryKey: null,
    };
    let feedHealth = localFeedHealth;

    if (hasSupabaseServerConfig()) {
        try {
            const [runs, feedHealthMemory, latestRunMemoryEntry] = await Promise.all([
                listAutopilotRuns({ limit: 12 }),
                getAgentMemory("hook:rss:feed-health"),
                getAgentMemory("hook:autopilot:latest-run"),
            ]);

            latestAutopilotRun = chooseLatestAutopilotRun(runs as unknown as Array<Record<string, unknown>>);
            latestRunMemory = latestRunMemoryEntry || null;

            if (feedHealthMemory) {
                const value = asObject(feedHealthMemory.value);
                const supabaseFeedHealth: FeedHealth = {
                    status: stringOrNull(value.status) || feedHealth.status,
                    feedPins: numberOrNull(value.feedPins) ?? feedHealth.feedPins,
                    warningCount: numberOrNull(value.warningCount) ?? stringArray(value.warnings).length ?? feedHealth.warningCount,
                    errorCount: numberOrNull(value.errorCount) ?? stringArray(value.errors).length ?? feedHealth.errorCount,
                    validatedAt: stringOrNull(value.validatedAt) || feedHealth.validatedAt,
                    feedUrl: stringOrNull(value.feedUrl) || FEED_URL,
                    memoryKey: feedHealthMemory.memory_key,
                };
                const localFeedValidationTime = timestampOrNull(localFeedHealth.validatedAt);
                const supabaseFeedValidationTime = timestampOrNull(supabaseFeedHealth.validatedAt);
                const localFeedPins = localAutopilot.feedPins ?? rssPins;
                const repoStateLooksRestored = localFeedPins === rssPins;
                const localDevFeedMismatch =
                    process.env.NODE_ENV !== "production" && repoStateLooksRestored && supabaseFeedHealth.feedPins !== rssPins;
                const localRunFeedMismatch =
                    isLocalOnlyRun(latestAutopilotRun) && repoStateLooksRestored && supabaseFeedHealth.feedPins !== rssPins;

                feedHealth =
                    localDevFeedMismatch || localRunFeedMismatch
                        ? localFeedHealth
                        : supabaseFeedValidationTime !== null &&
                            (localFeedValidationTime === null || supabaseFeedValidationTime >= localFeedValidationTime)
                        ? supabaseFeedHealth
                        : localFeedHealth;
            }
        } catch (error) {
            console.error("Error reading Supabase autopilot telemetry:", error);
        }
    }

    const latestStats = asObject(latestAutopilotRun?.stats);
    const latestMetadata = asObject(latestAutopilotRun?.metadata);
    const latestRunMemoryValue = asObject(latestRunMemory?.value);
    const latestRunErrors = stringArray(latestAutopilotRun?.errors);
    const latestRunWarnings = stringArray(latestAutopilotRun?.warnings);
    const latestRunStatus = typeof latestAutopilotRun?.status === "string" ? latestAutopilotRun.status : null;
    const latestMemoryStatus = stringOrNull(latestRunMemoryValue.status);
    const latestMemoryStartedAt = stringOrNull(latestRunMemoryValue.startedAt);
    const latestMemoryCompletedAt = stringOrNull(latestRunMemoryValue.completedAt);
    const latestMemoryWorkflowRunUrl = stringOrNull(latestRunMemoryValue.workflowRunUrl);
    const latestMemoryTriggerSource = stringOrNull(latestRunMemoryValue.triggerSource);
    const latestMemoryGeneratedProducts = numberOrNull(latestRunMemoryValue.generatedProducts);
    const latestMemoryGeneratedPosts = numberOrNull(latestRunMemoryValue.generatedPosts);
    const latestMemoryGeneratedPins = numberOrNull(latestRunMemoryValue.generatedPins);
    const latestMemoryRunId = stringOrNull(latestRunMemoryValue.runId);
    const latestMemorySummary =
        stringOrNull(latestRunMemory?.summary) || stringOrNull(latestRunMemoryValue.summary);
    const latestRunValidationTime =
        timestampOrNull(stringOrNull(latestAutopilotRun?.completed_at)) ??
        timestampOrNull(stringOrNull(latestAutopilotRun?.started_at)) ??
        timestampOrNull(stringOrNull(latestAutopilotRun?.created_at));
    const localValidationTime = timestampOrNull(localAutopilot.validationAt || null);
    const latestRunIsLocalOnly = isLocalOnlyRun(latestAutopilotRun);
    const preferLocalValidation =
        feedHealth === localFeedHealth ||
        (localValidationTime !== null && (latestRunValidationTime === null || localValidationTime >= latestRunValidationTime));
    const useRemoteRunTelemetry = Boolean(latestAutopilotRun) && !(preferLocalValidation && latestRunIsLocalOnly);
    const memoryLooksSuccessful = ["generated", "completed", "validated"].includes(latestMemoryStatus || "");
    const effectiveWarnings = preferLocalValidation ? localAutopilot.warnings || [] : latestRunWarnings.length > 0 ? latestRunWarnings : localAutopilot.warnings || [];
    const effectiveErrors = preferLocalValidation ? localAutopilot.errors || [] : latestRunErrors.length > 0 ? latestRunErrors : localAutopilot.errors || [];
    const lastRunAt =
        (useRemoteRunTelemetry
            ? stringOrNull(latestAutopilotRun?.started_at) ||
              stringOrNull(latestAutopilotRun?.created_at)
            : null) ||
        latestMemoryStartedAt ||
        localAutopilot.lastRunAt ||
        null;
    const lastSuccessAt =
        (useRemoteRunTelemetry && latestRunStatus === "completed" ? stringOrNull(latestAutopilotRun?.completed_at) : null) ||
        (memoryLooksSuccessful ? latestMemoryCompletedAt || latestMemoryStartedAt : null) ||
        localAutopilot.lastSuccessAt ||
        null;

    const autopilot = {
        status:
            feedHealth.status === "failed"
                ? "failed"
                : preferLocalValidation
                  ? localAutopilot.status || latestRunStatus || latestMemoryStatus || "unknown"
                  : latestRunStatus || latestMemoryStatus || localAutopilot.status || "unknown",
        lastRunAt,
        lastSuccessAt,
        generatedProducts:
            preferLocalValidation
                ? localAutopilot.generatedProducts ?? latestMemoryGeneratedProducts ?? 0
                : numberOrNull(latestStats.generatedProducts) ?? latestMemoryGeneratedProducts ?? localAutopilot.generatedProducts ?? 0,
        generatedPosts:
            preferLocalValidation
                ? localAutopilot.generatedPosts ?? latestMemoryGeneratedPosts ?? 0
                : numberOrNull(latestStats.generatedPosts) ?? latestMemoryGeneratedPosts ?? localAutopilot.generatedPosts ?? 0,
        generatedPins:
            preferLocalValidation
                ? localAutopilot.generatedPins ?? latestMemoryGeneratedPins ?? 0
                : numberOrNull(latestStats.generatedPins) ?? latestMemoryGeneratedPins ?? localAutopilot.generatedPins ?? 0,
        feedPins: feedHealth.feedPins,
        message: buildAutopilotMessage({
            localStatus: localAutopilot,
            latestRun: latestAutopilotRun,
            feedHealth,
            preferLocalValidation,
        }),
        errors: effectiveErrors,
        warnings: effectiveWarnings,
        supabaseRunId:
            (useRemoteRunTelemetry ? stringOrNull(latestAutopilotRun?.id) : null) ||
            latestMemoryRunId ||
            localAutopilot.supabaseRunId ||
            null,
        workflowRunUrl:
            (useRemoteRunTelemetry ? stringOrNull(latestMetadata.workflowRunUrl) : null) ||
            latestMemoryWorkflowRunUrl ||
            localAutopilot.workflowRunUrl ||
            null,
        triggerSource:
            (useRemoteRunTelemetry ? stringOrNull(latestAutopilotRun?.trigger_source) : null) ||
            latestMemoryTriggerSource ||
            localAutopilot.triggerSource ||
            null,
        validationAt: feedHealth.validatedAt,
        warningCount: feedHealth.warningCount,
        errorCount: feedHealth.errorCount,
    };

    if ((!autopilot.message || autopilot.message === "Statut autopilot disponible.") && latestMemorySummary) {
        autopilot.message = latestMemorySummary;
    }

    const totalReviews = products.reduce((acc, product) => acc + (typeof product.reviews === "number" ? product.reviews : 0), 0);
    const avgRating = (
        products.reduce((acc, product) => acc + (typeof product.rating === "number" ? product.rating : 0), 0) / (totalProducts || 1)
    ).toFixed(1);
    const avgPrice = 35;
    const revenue = (realClicks * avgPrice * 0.05).toFixed(2);

    const clickActivities: Activity[] = recentClickActivities.map((click, index) => ({
        id: index,
        type: "sale",
        text: `Clic sur ${click.productName} (${click.source})`,
        time: formatTime(click.time),
        status: "info",
    }));

    const runActivities: Activity[] = (useRemoteRunTelemetry || !!latestMemoryStartedAt || !!lastRunAt)
        ? [
              {
                  id: 1000,
                  type: "blog",
                  text: `Run autopilot ${autopilot.status} (${autopilot.generatedPosts} article(s), ${autopilot.generatedPins} pin(s))`,
                  time: formatTime(lastRunAt || new Date().toISOString()),
                  status: autopilot.status === "failed" ? "warning" : "success",
              },
              {
                  id: 1001,
                  type: "pinterest",
                  text: `Validation feed ${feedHealth.status} - ${feedHealth.feedPins} pin(s), ${feedHealth.warningCount} warning(s)`,
                  time: formatTime(feedHealth.validatedAt || lastRunAt || new Date().toISOString()),
                  status: feedHealth.status === "failed" ? "warning" : "success",
              },
          ]
        : [];

    return NextResponse.json({
        totalProducts,
        blogPosts,
        rssPins,
        latestPostDate,
        totalReviews,
        avgRating,
        revenue,
        clicks: realClicks,
        apiKeyConfigured: !!getAdminApiKey(),
        autopilot,
        feedHealth,
        activities: [...runActivities, ...clickActivities].slice(0, 10),
        isLive: true,
    });
}

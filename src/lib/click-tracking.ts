import "server-only";

import fs from "fs";
import path from "path";

import { getAgentMemory, upsertAgentMemory } from "@/lib/growth-machine/store";
import { hasSupabaseServerConfig } from "@/lib/supabase/server";
import { detectAttributionChannel } from "@/lib/traffic-attribution";

export type ClickActivity = {
    productId: string;
    productName: string;
    source: string;
    placement: string;
    channel: string;
    campaign: string | null;
    pagePath: string | null;
    sessionId: string | null;
    time: string;
};

export type PageVisitActivity = {
    path: string;
    pageType: string;
    source: string;
    channel: string;
    campaign: string | null;
    sessionId: string | null;
    time: string;
};

export type SourceTrafficStats = {
    pageVisits: number;
    affiliateClicks: number;
    lastSeenAt: string;
    channel: string;
    campaigns: Record<string, number>;
};

export type ChannelTrafficStats = {
    pageVisits: number;
    affiliateClicks: number;
    lastSeenAt: string;
    sources: Record<string, number>;
};

export type ClicksData = {
    totalClicks: number;
    productClicks: Record<string, number>;
    recentClicks: ClickActivity[];
    totalPageVisits: number;
    recentPageVisits: PageVisitActivity[];
    sourceStats: Record<string, SourceTrafficStats>;
    channelStats: Record<string, ChannelTrafficStats>;
};

const CLICKS_PATH = path.join(process.cwd(), "src/data/clicks.json");
const CLICKS_MEMORY_KEY = "hook:track:clicks";
const MOJIBAKE_PATTERNS = [
    /\u00C3[\u0080-\u00BF]/u,
    /\u00C2[\u0080-\u00BF]/u,
    /\u00E2[\u0080-\u00BF]./u,
    /\u00F0[\u009F-\u00BF]./u,
    /\uFFFD/u,
];

function getEmptyClicks(): ClicksData {
    return {
        totalClicks: 0,
        productClicks: {},
        recentClicks: [],
        totalPageVisits: 0,
        recentPageVisits: [],
        sourceStats: {},
        channelStats: {},
    };
}

function looksLikeMojibake(value: string) {
    return MOJIBAKE_PATTERNS.some((pattern) => pattern.test(value));
}

function mojibakeScore(value: string) {
    return MOJIBAKE_PATTERNS.reduce((score, pattern) => score + (pattern.test(value) ? 1 : 0), 0);
}

export function repairTrackedText(value: string) {
    let current = value.normalize("NFC").trim();

    for (let i = 0; i < 2; i++) {
        if (!looksLikeMojibake(current)) {
            break;
        }

        const candidate = Buffer.from(current, "latin1").toString("utf8").normalize("NFC").trim();
        if (mojibakeScore(candidate) >= mojibakeScore(current)) {
            break;
        }

        current = candidate;
    }

    return current.replace(/\s+/g, " ");
}

function normalizeCountMap(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, count]) => [
            key,
            typeof count === "number" && Number.isFinite(count) ? count : 0,
        ]),
    );
}

function normalizeClickActivity(entry: Partial<ClickActivity> & { source?: string; placement?: string }) {
    const rawSource = String(entry.source || "").trim();
    const inferredPlacement =
        String(entry.placement || "").trim() ||
        (rawSource && !["direct", "pinterest", "instagram", "facebook", "google", "email", "referral", "social"].includes(rawSource)
            ? rawSource
            : "direct");
    const normalizedSource =
        rawSource && rawSource !== inferredPlacement
            ? rawSource
            : "direct";
    const channel = entry.channel || detectAttributionChannel(normalizedSource, null, null);

    return {
        productId: String(entry.productId || ""),
        productName: repairTrackedText(String(entry.productName || "")),
        source: normalizedSource,
        placement: inferredPlacement,
        channel,
        campaign: entry.campaign || null,
        pagePath: entry.pagePath || null,
        sessionId: entry.sessionId || null,
        time: String(entry.time || ""),
    };
}

function normalizePageVisitActivity(entry: Partial<PageVisitActivity>) {
    const source = String(entry.source || "direct").trim() || "direct";
    return {
        path: String(entry.path || "/").trim() || "/",
        pageType: String(entry.pageType || "other").trim() || "other",
        source,
        channel: entry.channel || detectAttributionChannel(source, null, null),
        campaign: entry.campaign || null,
        sessionId: entry.sessionId || null,
        time: String(entry.time || ""),
    };
}

function normalizeSourceStats(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).map(([source, stats]) => {
            const item = stats && typeof stats === "object" && !Array.isArray(stats) ? stats as Record<string, unknown> : {};
            return [
                source,
                {
                    pageVisits: typeof item.pageVisits === "number" && Number.isFinite(item.pageVisits) ? item.pageVisits : 0,
                    affiliateClicks:
                        typeof item.affiliateClicks === "number" && Number.isFinite(item.affiliateClicks) ? item.affiliateClicks : 0,
                    lastSeenAt: typeof item.lastSeenAt === "string" ? item.lastSeenAt : "",
                    channel:
                        typeof item.channel === "string" && item.channel.trim()
                            ? item.channel
                            : detectAttributionChannel(source, null, null),
                    campaigns: normalizeCountMap(item.campaigns),
                },
            ];
        }),
    );
}

function normalizeChannelStats(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).map(([channel, stats]) => {
            const item = stats && typeof stats === "object" && !Array.isArray(stats) ? stats as Record<string, unknown> : {};
            return [
                channel,
                {
                    pageVisits: typeof item.pageVisits === "number" && Number.isFinite(item.pageVisits) ? item.pageVisits : 0,
                    affiliateClicks:
                        typeof item.affiliateClicks === "number" && Number.isFinite(item.affiliateClicks) ? item.affiliateClicks : 0,
                    lastSeenAt: typeof item.lastSeenAt === "string" ? item.lastSeenAt : "",
                    sources: normalizeCountMap(item.sources),
                },
            ];
        }),
    );
}

function normalizeClicksData(data: Partial<ClicksData>): ClicksData {
    return {
        totalClicks: typeof data.totalClicks === "number" && Number.isFinite(data.totalClicks) ? data.totalClicks : 0,
        productClicks: normalizeCountMap(data.productClicks),
        recentClicks: Array.isArray(data.recentClicks)
            ? data.recentClicks.map((entry) => normalizeClickActivity(entry))
            : [],
        totalPageVisits:
            typeof data.totalPageVisits === "number" && Number.isFinite(data.totalPageVisits) ? data.totalPageVisits : 0,
        recentPageVisits: Array.isArray(data.recentPageVisits)
            ? data.recentPageVisits.map((entry) => normalizePageVisitActivity(entry))
            : [],
        sourceStats: normalizeSourceStats(data.sourceStats),
        channelStats: normalizeChannelStats(data.channelStats),
    };
}

export function readClicksData() {
    try {
        if (!fs.existsSync(CLICKS_PATH)) {
            return getEmptyClicks();
        }

        const parsed = JSON.parse(fs.readFileSync(CLICKS_PATH, "utf8")) as Partial<ClicksData>;
        return normalizeClicksData(parsed);
    } catch {
        return getEmptyClicks();
    }
}

export function writeClicksData(data: ClicksData) {
    const normalized = normalizeClicksData(data);
    fs.writeFileSync(CLICKS_PATH, JSON.stringify(normalized, null, 2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseClicksMemory(value: unknown) {
    if (!isRecord(value)) {
        return getEmptyClicks();
    }

    const recentClicks = Array.isArray(value.recentClicks)
        ? value.recentClicks.map((entry) => normalizeClickActivity(isRecord(entry) ? entry : {}))
        : [];
    const recentPageVisits = Array.isArray(value.recentPageVisits)
        ? value.recentPageVisits.map((entry) => normalizePageVisitActivity(isRecord(entry) ? entry : {}))
        : [];

    return normalizeClicksData({
        totalClicks: typeof value.totalClicks === "number" && Number.isFinite(value.totalClicks) ? value.totalClicks : 0,
        productClicks: normalizeCountMap(value.productClicks),
        recentClicks,
        totalPageVisits: typeof value.totalPageVisits === "number" && Number.isFinite(value.totalPageVisits) ? value.totalPageVisits : 0,
        recentPageVisits,
        sourceStats: normalizeSourceStats(value.sourceStats),
        channelStats: normalizeChannelStats(value.channelStats),
    });
}

function buildClicksSummary(data: ClicksData) {
    const latestClick = data.recentClicks[0];

    if (!latestClick) {
        return `Traffic tracked: ${data.totalClicks} affiliate clicks, ${data.totalPageVisits} page visits`;
    }

    return `Traffic tracked: ${data.totalClicks} affiliate clicks, ${data.totalPageVisits} page visits (last click: ${latestClick.productName} via ${latestClick.source}/${latestClick.placement})`;
}

function ensureSourceStats(data: ClicksData, source: string, channel: string) {
    if (!data.sourceStats[source]) {
        data.sourceStats[source] = {
            pageVisits: 0,
            affiliateClicks: 0,
            lastSeenAt: "",
            channel,
            campaigns: {},
        };
    }

    if (!data.sourceStats[source].channel) {
        data.sourceStats[source].channel = channel;
    }

    return data.sourceStats[source];
}

function ensureChannelStats(data: ClicksData, channel: string) {
    if (!data.channelStats[channel]) {
        data.channelStats[channel] = {
            pageVisits: 0,
            affiliateClicks: 0,
            lastSeenAt: "",
            sources: {},
        };
    }

    return data.channelStats[channel];
}

function incrementCount(map: Record<string, number>, key: string | null | undefined) {
    if (!key) {
        return;
    }

    map[key] = (map[key] || 0) + 1;
}

export function recordPageVisit(data: ClicksData, visit: PageVisitActivity) {
    const normalized = normalizeClicksData(data);
    const entry = normalizePageVisitActivity(visit);

    normalized.totalPageVisits += 1;
    normalized.recentPageVisits.unshift(entry);
    normalized.recentPageVisits = normalized.recentPageVisits.slice(0, 50);

    const sourceStats = ensureSourceStats(normalized, entry.source, entry.channel);
    sourceStats.pageVisits += 1;
    sourceStats.lastSeenAt = entry.time;
    incrementCount(sourceStats.campaigns, entry.campaign);

    const channelStats = ensureChannelStats(normalized, entry.channel);
    channelStats.pageVisits += 1;
    channelStats.lastSeenAt = entry.time;
    incrementCount(channelStats.sources, entry.source);

    return normalized;
}

export function recordAffiliateClick(data: ClicksData, click: ClickActivity) {
    const normalized = normalizeClicksData(data);
    const entry = normalizeClickActivity(click);

    normalized.totalClicks += 1;
    normalized.productClicks[entry.productId] = (normalized.productClicks[entry.productId] || 0) + 1;
    normalized.recentClicks.unshift(entry);
    normalized.recentClicks = normalized.recentClicks.slice(0, 50);

    const sourceStats = ensureSourceStats(normalized, entry.source, entry.channel);
    sourceStats.affiliateClicks += 1;
    sourceStats.lastSeenAt = entry.time;
    incrementCount(sourceStats.campaigns, entry.campaign);

    const channelStats = ensureChannelStats(normalized, entry.channel);
    channelStats.affiliateClicks += 1;
    channelStats.lastSeenAt = entry.time;
    incrementCount(channelStats.sources, entry.source);

    return normalized;
}

export async function readClicksDataAsync(): Promise<ClicksData> {
    if (hasSupabaseServerConfig()) {
        try {
            const memory = await getAgentMemory(CLICKS_MEMORY_KEY);
            if (memory?.value) {
                return parseClicksMemory(memory.value);
            }
        } catch (error) {
            console.error("Read clicks from Supabase failed", error);
        }
    }

    return readClicksData();
}

export async function writeClicksDataAsync(data: ClicksData): Promise<ClicksData> {
    const normalized = normalizeClicksData(data);
    let persistedRemotely = false;

    if (hasSupabaseServerConfig()) {
        try {
            await upsertAgentMemory({
                memory_key: CLICKS_MEMORY_KEY,
                memory_type: "note",
                scope_ref: "runtime:clicks",
                summary: buildClicksSummary(normalized),
                source: "api:track",
                value: normalized,
            });
            persistedRemotely = true;
        } catch (error) {
            console.error("Write clicks to Supabase failed", error);
        }
    }

    if (!persistedRemotely || process.env.NODE_ENV !== "production") {
        writeClicksData(normalized);
    }

    return normalized;
}

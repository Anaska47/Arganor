import "server-only";

import fs from "fs";
import path from "path";

import { getAgentMemory, upsertAgentMemory } from "@/lib/growth-machine/store";
import { hasSupabaseServerConfig } from "@/lib/supabase/server";

type ClickActivity = {
    productId: string;
    productName: string;
    source: string;
    time: string;
};

export type ClicksData = {
    totalClicks: number;
    productClicks: Record<string, number>;
    recentClicks: ClickActivity[];
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
    return { totalClicks: 0, productClicks: {}, recentClicks: [] };
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

function normalizeClicksData(data: ClicksData): ClicksData {
    return {
        totalClicks: Number.isFinite(data.totalClicks) ? data.totalClicks : 0,
        productClicks: data.productClicks && typeof data.productClicks === "object" ? data.productClicks : {},
        recentClicks: Array.isArray(data.recentClicks)
            ? data.recentClicks.map((entry) => ({
                  productId: String(entry.productId || ""),
                  productName: repairTrackedText(String(entry.productName || "")),
                  source: String(entry.source || "direct"),
                  time: String(entry.time || ""),
              }))
            : [],
    };
}

export function readClicksData() {
    try {
        if (!fs.existsSync(CLICKS_PATH)) {
            return getEmptyClicks();
        }

        const parsed = JSON.parse(fs.readFileSync(CLICKS_PATH, "utf8")) as ClicksData;
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

function parseClicksMemory(value: unknown): ClicksData {
    if (!isRecord(value)) {
        return getEmptyClicks();
    }

    const recentClicks = Array.isArray(value.recentClicks)
        ? value.recentClicks.map((entry) => {
              const item = isRecord(entry) ? entry : {};
              return {
                  productId: String(item.productId || ""),
                  productName: repairTrackedText(String(item.productName || "")),
                  source: String(item.source || "direct"),
                  time: String(item.time || ""),
              };
          })
        : [];

    const productClicks = isRecord(value.productClicks)
        ? Object.fromEntries(
              Object.entries(value.productClicks).map(([key, count]) => [
                  key,
                  typeof count === "number" && Number.isFinite(count) ? count : 0,
              ]),
          )
        : {};

    return normalizeClicksData({
        totalClicks: typeof value.totalClicks === "number" && Number.isFinite(value.totalClicks) ? value.totalClicks : 0,
        productClicks,
        recentClicks,
    });
}

function buildClicksSummary(data: ClicksData): string {
    const latestClick = data.recentClicks[0];

    if (!latestClick) {
        return `Clicks tracked: ${data.totalClicks}`;
    }

    return `Clicks tracked: ${data.totalClicks} (last: ${latestClick.productName} via ${latestClick.source})`;
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

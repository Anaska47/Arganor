import "server-only";

import { promises as fs } from "fs";
import path from "path";

import { getAgentMemory, upsertAgentMemory } from "@/lib/growth-machine/store";
import { hasSupabaseServerConfig } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

type RuntimeSnapshot<T> = {
    version: number;
    updatedAt: string;
    source: string;
    items: T[];
};

const DATA_ROOT = path.join(process.cwd(), "src", "data");
const POSTS_FILE_PATH = path.join(DATA_ROOT, "posts.json");
const PRODUCTS_FILE_PATH = path.join(DATA_ROOT, "products.json");

const POSTS_MEMORY_KEY = "hook:content:posts";
const PRODUCTS_MEMORY_KEY = "hook:content:products";

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildSummary(label: string, count: number, source: string): string {
    return `${label}: ${count} item(s) persisted from ${source}`;
}

async function readLocalArray<T>(filePath: string): Promise<T[]> {
    try {
        const fileContents = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(fileContents) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

async function writeLocalArray<T>(filePath: string, items: T[]): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(items, null, 2) + "\n", "utf8");
}

function parseSnapshot<T>(value: unknown): RuntimeSnapshot<T> | null {
    if (!isRecord(value) || !Array.isArray(value.items)) {
        return null;
    }

    return {
        version: typeof value.version === "number" ? value.version : 1,
        updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
        source: typeof value.source === "string" ? value.source : "unknown",
        items: value.items as T[],
    };
}

async function readRuntimeArray<T>(params: { filePath: string; memoryKey: string }): Promise<T[]> {
    if (hasSupabaseServerConfig()) {
        try {
            const memory = await getAgentMemory(params.memoryKey);
            const snapshot = parseSnapshot<T>(memory?.value);

            if (snapshot) {
                return snapshot.items;
            }
        } catch (error) {
            console.error(`Read runtime content from Supabase failed (${params.memoryKey})`, error);
        }
    }

    return readLocalArray<T>(params.filePath);
}

async function writeRuntimeArray<T>(
    params: {
        filePath: string;
        memoryKey: string;
        label: string;
    },
    items: T[],
    source: string,
): Promise<T[]> {
    const snapshot: RuntimeSnapshot<T> = {
        version: 1,
        updatedAt: new Date().toISOString(),
        source,
        items,
    };

    let persistedRemotely = false;

    if (hasSupabaseServerConfig()) {
        try {
            await upsertAgentMemory({
                memory_key: params.memoryKey,
                memory_type: "note",
                scope_ref: `runtime:${params.label.toLowerCase()}`,
                summary: buildSummary(params.label, items.length, source),
                source,
                value: snapshot as unknown as Json,
            });
            persistedRemotely = true;
        } catch (error) {
            console.error(`Write runtime content to Supabase failed (${params.memoryKey})`, error);
        }
    }

    if (!persistedRemotely || process.env.NODE_ENV !== "production") {
        await writeLocalArray(params.filePath, items);
    }

    return items;
}

export async function readRuntimePosts<T>(): Promise<T[]> {
    return readRuntimeArray<T>({
        filePath: POSTS_FILE_PATH,
        memoryKey: POSTS_MEMORY_KEY,
    });
}

export async function writeRuntimePosts<T>(items: T[], source = "runtime-content-store"): Promise<T[]> {
    return writeRuntimeArray(
        {
            filePath: POSTS_FILE_PATH,
            memoryKey: POSTS_MEMORY_KEY,
            label: "posts",
        },
        items,
        source,
    );
}

export async function appendRuntimePost<T>(item: T, source = "runtime-content-store"): Promise<T[]> {
    const items = await readRuntimePosts<T>();
    items.push(item);
    return writeRuntimePosts(items, source);
}

export async function readRuntimeProducts<T>(): Promise<T[]> {
    return readRuntimeArray<T>({
        filePath: PRODUCTS_FILE_PATH,
        memoryKey: PRODUCTS_MEMORY_KEY,
    });
}

export async function writeRuntimeProducts<T>(items: T[], source = "runtime-content-store"): Promise<T[]> {
    return writeRuntimeArray(
        {
            filePath: PRODUCTS_FILE_PATH,
            memoryKey: PRODUCTS_MEMORY_KEY,
            label: "products",
        },
        items,
        source,
    );
}

export async function appendRuntimeProduct<T>(item: T, source = "runtime-content-store"): Promise<T[]> {
    const items = await readRuntimeProducts<T>();
    items.push(item);
    return writeRuntimeProducts(items, source);
}

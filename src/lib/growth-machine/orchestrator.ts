import "server-only";

import { prepareContentDrafts } from "./content-runner";
import { prepareDrafts } from "./drafts";
import { DEFAULT_PROMPT_VERSIONS } from "./prompt-registry";
import { previewPromotion, promoteQueueItem } from "./promote";
import { reviewDrafts } from "./review";
import { enqueueStrategyBriefs } from "./strategy";
import {
    createAutopilotRun,
    listContentQueue,
    updateAutopilotRun,
    upsertPromptVersion,
    type ContentQueueRow,
} from "./store";

type RunGrowthCycleOptions = {
    seedPrompts?: boolean;
    limit?: number;
    promoteApproved?: boolean;
    promoteLimit?: number;
};

type RunGrowthCycleResult = {
    runId: string;
    promptSeedCount: number;
    briefCount: number;
    draftPackCount: number;
    contentDraftCount: number;
    reviewCount: number;
    readyToPromoteCount: number;
    promotedCount: number;
    readyQueueIds: string[];
    promotedQueueIds: string[];
};

type QueuePayload = Record<string, unknown>;

function clampLimit(value: number | undefined, fallback: number): number {
    return Math.min(Math.max(value ?? fallback, 1), 10);
}

function toPayloadObject(queueItem: ContentQueueRow): QueuePayload {
    if (queueItem.payload && typeof queueItem.payload === "object" && !Array.isArray(queueItem.payload)) {
        return queueItem.payload as QueuePayload;
    }

    return {};
}

function isReadyToPromote(queueItem: ContentQueueRow): boolean {
    const payload = toPayloadObject(queueItem);
    const review = payload.review;

    if (!review || typeof review !== "object" || Array.isArray(review)) {
        return false;
    }

    const verdict = (review as { verdict?: string }).verdict;
    return verdict === "approved" && Boolean(payload.contentDraft) && !payload.promotion;
}

export async function runGrowthCycle(options: RunGrowthCycleOptions = {}): Promise<RunGrowthCycleResult> {
    const limit = clampLimit(options.limit, 3);
    const promoteLimit = clampLimit(options.promoteLimit, limit);
    const startedAt = new Date().toISOString();
    const run = await createAutopilotRun({
        trigger_source: "manual",
        status: "running",
        run_label: "growth-machine-cycle",
        started_at: startedAt,
        metadata: {
            seedPrompts: Boolean(options.seedPrompts),
            limit,
            promoteApproved: Boolean(options.promoteApproved),
            promoteLimit,
            stage: "started",
        },
    });

    let promptSeedCount = 0;
    let briefCount = 0;
    let draftPackCount = 0;
    let contentDraftCount = 0;
    let reviewCount = 0;
    let readyToPromoteCount = 0;
    let promotedCount = 0;
    let readyQueueIds: string[] = [];
    const promotedQueueIds: string[] = [];

    try {
        if (options.seedPrompts) {
            const seededPrompts = await Promise.all(DEFAULT_PROMPT_VERSIONS.map((record) => upsertPromptVersion(record)));
            promptSeedCount = seededPrompts.length;
        }

        const strategyResult = await enqueueStrategyBriefs(limit);
        briefCount = strategyResult.queueItems.length;

        const draftResults = await prepareDrafts(limit);
        draftPackCount = draftResults.length;

        const contentResults = await prepareContentDrafts(limit);
        contentDraftCount = contentResults.length;

        const reviewResults = await reviewDrafts(limit);
        reviewCount = reviewResults.length;

        const queueItems = await listContentQueue({ limit: 100 });
        const readyItems = queueItems.filter(isReadyToPromote);
        readyQueueIds = readyItems.map((item) => item.id);
        readyToPromoteCount = readyItems.length;

        if (options.promoteApproved) {
            for (const item of readyItems.slice(0, promoteLimit)) {
                const preview = await previewPromotion(item.id);
                if (!preview.canPromote) {
                    continue;
                }

                await promoteQueueItem(item.id);
                promotedQueueIds.push(item.id);
            }

            promotedCount = promotedQueueIds.length;
        }

        await updateAutopilotRun(run.id, {
            status: "completed",
            completed_at: new Date().toISOString(),
            stats: {
                promptSeedCount,
                briefCount,
                draftPackCount,
                contentDraftCount,
                reviewCount,
                readyToPromoteCount,
                promotedCount,
            },
            metadata: {
                seedPrompts: Boolean(options.seedPrompts),
                limit,
                promoteApproved: Boolean(options.promoteApproved),
                promoteLimit,
                stage: "completed",
                readyQueueIds,
                promotedQueueIds,
            },
        });

        return {
            runId: run.id,
            promptSeedCount,
            briefCount,
            draftPackCount,
            contentDraftCount,
            reviewCount,
            readyToPromoteCount,
            promotedCount,
            readyQueueIds,
            promotedQueueIds,
        };
    } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);

        await updateAutopilotRun(run.id, {
            status: "failed",
            completed_at: new Date().toISOString(),
            errors: [message],
            stats: {
                promptSeedCount,
                briefCount,
                draftPackCount,
                contentDraftCount,
                reviewCount,
                readyToPromoteCount,
                promotedCount,
            },
            metadata: {
                seedPrompts: Boolean(options.seedPrompts),
                limit,
                promoteApproved: Boolean(options.promoteApproved),
                promoteLimit,
                stage: "failed",
                readyQueueIds,
                promotedQueueIds,
            },
        });

        throw error;
    }
}

export type { RunGrowthCycleOptions, RunGrowthCycleResult };

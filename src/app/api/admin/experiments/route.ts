import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedRequest, unauthorizedJson } from "@/lib/api-auth";
import { getErrorMessage } from "@/lib/error-format";
import {
    createExperiment,
    getExperiment,
    getExperimentByKey,
    listExperiments,
    updateExperiment,
} from "@/lib/growth-machine/store";
import type { ExperimentInsert, ExperimentRow } from "@/lib/growth-machine/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseLimit(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}

type ExperimentPostBody = {
    experimentKey?: string;
    name?: string;
    hypothesis?: string | null;
    status?: ExperimentRow["status"];
    productRef?: string | null;
    postRef?: string | null;
    clusterRef?: string | null;
    successMetric?: string | null;
    variants?: ExperimentRow["variants"];
    results?: ExperimentRow["results"];
    startedAt?: string | null;
    endedAt?: string | null;
};

type ExperimentPatchBody = ExperimentPostBody & {
    experimentId?: string;
};

function toOptionalText(value: string | null | undefined): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

function toExperimentInsert(body: ExperimentPostBody): ExperimentInsert | null {
    const experimentKey = toOptionalText(body.experimentKey);
    const name = toOptionalText(body.name);

    if (!experimentKey || !name) {
        return null;
    }

    return {
        experiment_key: experimentKey,
        name,
        hypothesis: body.hypothesis,
        status: body.status,
        product_ref: body.productRef,
        post_ref: body.postRef,
        cluster_ref: body.clusterRef,
        success_metric: body.successMetric,
        variants: body.variants,
        results: body.results,
        started_at: body.startedAt,
        ended_at: body.endedAt,
    };
}

export async function GET(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const { searchParams } = new URL(req.url);
        const experimentId = searchParams.get("id");
        const experimentKey = searchParams.get("experimentKey");

        if (experimentId) {
            const item = await getExperiment(experimentId);
            return NextResponse.json({ success: true, item });
        }

        if (experimentKey) {
            const item = await getExperimentByKey(experimentKey);
            return NextResponse.json({ success: true, item });
        }

        const status = searchParams.get("status") || undefined;
        const clusterRef = searchParams.get("clusterRef") || undefined;
        const limit = parseLimit(searchParams.get("limit"));

        const items = await listExperiments({
            status: status as ExperimentRow["status"] | undefined,
            clusterRef,
            limit,
        });

        return NextResponse.json({
            success: true,
            count: items.length,
            items,
        });
    } catch (error) {
        const message = getErrorMessage(error, "Unknown experiment error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as ExperimentPostBody;
        const record = toExperimentInsert(body);

        if (!record) {
            return NextResponse.json(
                {
                    success: false,
                    error: "experimentKey and name are required.",
                },
                { status: 400 },
            );
        }

        const item = await createExperiment(record);

        return NextResponse.json({
            success: true,
            item,
        });
    } catch (error) {
        const message = getErrorMessage(error, "Unknown experiment creation error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    if (!isAuthorizedRequest(req)) {
        return unauthorizedJson();
    }

    try {
        const body = (await req.json()) as ExperimentPatchBody;

        if (!body.experimentId) {
            return NextResponse.json(
                { success: false, error: "experimentId is required for experiment updates." },
                { status: 400 },
            );
        }

        const patch: Partial<ExperimentInsert> = {};

        if (body.experimentKey !== undefined) patch.experiment_key = body.experimentKey;
        if (body.name !== undefined) patch.name = body.name;
        if (body.hypothesis !== undefined) patch.hypothesis = body.hypothesis;
        if (body.status !== undefined) patch.status = body.status;
        if (body.productRef !== undefined) patch.product_ref = body.productRef;
        if (body.postRef !== undefined) patch.post_ref = body.postRef;
        if (body.clusterRef !== undefined) patch.cluster_ref = body.clusterRef;
        if (body.successMetric !== undefined) patch.success_metric = body.successMetric;
        if (body.variants !== undefined) patch.variants = body.variants;
        if (body.results !== undefined) patch.results = body.results;
        if (body.startedAt !== undefined) patch.started_at = body.startedAt;
        if (body.endedAt !== undefined) patch.ended_at = body.endedAt;

        const item = await updateExperiment(body.experimentId, patch);

        return NextResponse.json({
            success: true,
            item,
        });
    } catch (error) {
        const message = getErrorMessage(error, "Unknown experiment update error");
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

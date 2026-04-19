"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, Eye, FileText, ListTodo, RefreshCw, Rocket, Sparkles } from "lucide-react";

type AnyObj = Record<string, unknown>;
type QueueItem = { id: string; kind: string; status: string; priority: number; title: string | null; topic: string | null; intent: string | null; product_ref: string | null; cluster_ref: string | null; payload: AnyObj; decision_reason: string | null; created_at: string };
type Overview = { queue: { total: number; queued: number; running: number; failed: number }; runs: { total: number; completed: number; failed: number }; memory: { total: number; patterns: number; constraints: number; recentKeys: string[] }; prompts: { total: number; active: number }; experiments: { total: number; running: number } };
type AiStatus = { enabled: boolean; provider: string; model: string };
type RunItem = { id: string; run_label: string | null; trigger_source: string; status: string; cluster_ref: string | null; created_at: string; stats: unknown; errors: unknown };
type PromptItem = { id: string; module: string; prompt_key: string; version: string; status: string; updated_at: string };
type ExperimentItem = { id: string; experiment_key: string; name: string; status: string; success_metric: string | null };
type ReviewData = { verdict?: string; rationale?: string; blockingIssues?: string[]; warnings?: string[] };
type RevisionData = { attemptCount?: number; lastAttemptAt?: string; previousVerdict?: string; lastResult?: string; lastReviewedAt?: string };
type DraftData = { post?: { slug?: string; title?: string; excerpt?: string; metaDescription?: string; content?: string; category?: string }; pins?: Array<{ title?: string; description?: string; cta?: string; fileHint?: string }> };
type PromotionPreview = { canPromote: boolean; blockers: string[]; warnings: string[]; post: { slug: string; title: string; metaDescription: string; category: string } };
type StatusMessage = { type: "success" | "error" | null; message: string };

const card: CSSProperties = { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 };
const grid: CSSProperties = { display: "grid", gap: 16 };
const muted: CSSProperties = { color: "#666", fontSize: 12, lineHeight: 1.5 };
const pillBase: CSSProperties = { display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" };
const btn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #ddd", padding: "7px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#444" };

function getAdminHeaders(): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = window.localStorage.getItem("arganorAdminApiKey");
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    return headers;
}

async function fetchAdminJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, { cache: "no-store", ...init, headers: getAdminHeaders() });
    const data = (await response.json()) as { success?: boolean; error?: string } & T;
    if (!response.ok || !data.success) throw new Error(data.error || "Request failed");
    return data;
}

function formatDate(value: string | null) {
    if (!value) return "n/a";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR");
}

function statusPill(status: string): CSSProperties {
    if (["completed", "approved", "active", "running"].includes(status)) return { ...pillBase, background: "#dcfce7", color: "#166534" };
    if (["failed", "rejected", "cancelled"].includes(status)) return { ...pillBase, background: "#fee2e2", color: "#991b1b" };
    return { ...pillBase, background: "#fef3c7", color: "#92400e" };
}

function payloadValue<T>(payload: AnyObj, key: string): T | null {
    const value = payload[key];
    return value === undefined ? null : (value as T);
}

function readyToPromote(payload: AnyObj) {
    const review = payloadValue<ReviewData>(payload, "review");
    return review?.verdict === "approved" && Boolean(payload.contentDraft) && !payload.promotion;
}

function needsRevision(payload: AnyObj) {
    const review = payloadValue<ReviewData>(payload, "review");
    return review?.verdict === "needs_revision" && Boolean(payload.contentDraft);
}

function statValue(stats: unknown, key: string) {
    if (!stats || typeof stats !== "object" || Array.isArray(stats)) return 0;
    const value = (stats as AnyObj)[key];
    return typeof value === "number" ? value : 0;
}

function StatCard({ label, value, note }: { label: string; value: string | number; note: string }) {
    return <div style={card}><div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#666", fontWeight: 700 }}>{label}</div><div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: "#111" }}>{value}</div><p style={{ ...muted, margin: "8px 0 0" }}>{note}</p></div>;
}

function Panel({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
    return <div style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}><h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2><span style={{ fontSize: 11, color: "#777" }}>{meta}</span></div>{children}</div>;
}

export default function AdminGrowthClient() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [ai, setAi] = useState<AiStatus | null>(null);
    const [runs, setRuns] = useState<RunItem[]>([]);
    const [prompts, setPrompts] = useState<PromptItem[]>([]);
    const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [reviewFilter, setReviewFilter] = useState("all");
    const [clusterFilter, setClusterFilter] = useState("all");
    const [showRawJson, setShowRawJson] = useState(false);
    const [status, setStatus] = useState<StatusMessage>({ type: null, message: "" });
    const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);

    const syncItems = useCallback((nextItems: QueueItem[]) => {
        setItems(nextItems);
        setSelectedId((current) => current && nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id || null);
    }, []);

    const refreshAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [queueData, growthData, runsData, promptsData, experimentsData] = await Promise.all([
                fetchAdminJson<{ items: QueueItem[] }>("/api/admin/queue?limit=50"),
                fetchAdminJson<{ overview: Overview; ai: AiStatus }>("/api/admin/growth"),
                fetchAdminJson<{ items: RunItem[] }>("/api/admin/runs?limit=8"),
                fetchAdminJson<{ items: PromptItem[] }>("/api/admin/prompts?limit=6"),
                fetchAdminJson<{ items: ExperimentItem[] }>("/api/admin/experiments?limit=6"),
            ]);
            syncItems(queueData.items || []);
            setOverview(growthData.overview || null);
            setAi(growthData.ai || null);
            setRuns(runsData.items || []);
            setPrompts(promptsData.items || []);
            setExperiments(experimentsData.items || []);
        } catch (error) {
            setStatus({ type: "error", message: error instanceof Error ? error.message : "Erreur inattendue" });
        } finally {
            setLoading(false);
        }
    }, [syncItems]);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    const filteredItems = useMemo(() => items.filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (clusterFilter !== "all" && item.cluster_ref !== clusterFilter) return false;
        const verdict = payloadValue<ReviewData>(item.payload, "review")?.verdict;
        if (reviewFilter === "approved_only" && verdict !== "approved") return false;
        if (reviewFilter === "needs_revision" && verdict !== "needs_revision") return false;
        if (reviewFilter === "needs_review" && verdict) return false;
        return true;
    }), [items, statusFilter, reviewFilter, clusterFilter]);

    const selectedItem = useMemo(() => filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null, [filteredItems, selectedId]);
    const clusterOptions = useMemo(() => Array.from(new Set(items.map((item) => item.cluster_ref).filter(Boolean) as string[])).sort(), [items]);
    const readyItems = useMemo(() => items.filter((item) => readyToPromote(item.payload)), [items]);
    const draftPack = selectedItem ? payloadValue<AnyObj>(selectedItem.payload, "draftPack") : null;
    const draft = selectedItem ? payloadValue<DraftData>(selectedItem.payload, "contentDraft") : null;
    const review = selectedItem ? payloadValue<ReviewData>(selectedItem.payload, "review") : null;
    const revision = selectedItem ? payloadValue<RevisionData>(selectedItem.payload, "revision") : null;
    const canReviseSelected = selectedItem ? needsRevision(selectedItem.payload) : false;

    const runAction = useCallback(async (label: string, input: RequestInfo, init?: RequestInit) => {
        setBusy(label); setStatus({ type: null, message: "" });
        try {
            const data = await fetchAdminJson<{ message?: string }>(input, init);
            setStatus({ type: "success", message: data.message || `${label} termine.` });
            await refreshAll(true);
            return data;
        } catch (error) {
            setStatus({ type: "error", message: error instanceof Error ? error.message : "Erreur inattendue" });
            throw error;
        } finally {
            setBusy(null);
        }
    }, [refreshAll]);

    const actOnSelected = useCallback(async (label: string, endpoint: string) => {
        if (!selectedItem) return;
        await runAction(label, endpoint, { method: "POST", body: JSON.stringify({ queueId: selectedItem.id }) });
    }, [runAction, selectedItem]);

    const previewPromotion = useCallback(async () => {
        if (!selectedItem) return;
        setBusy("Preview promotion"); setStatus({ type: null, message: "" });
        try {
            const data = await fetchAdminJson<{ preview: PromotionPreview | null }>(`/api/admin/promote?queueId=${encodeURIComponent(selectedItem.id)}`);
            setPromotionPreview(data.preview || null);
            setStatus({ type: "success", message: "Preview promotion chargee." });
        } catch (error) {
            setStatus({ type: "error", message: error instanceof Error ? error.message : "Erreur inattendue" });
        } finally {
            setBusy(null);
        }
    }, [selectedItem]);

    const promoteSelected = useCallback(async () => {
        if (!selectedItem) return;
        await runAction("Promotion", "/api/admin/promote", { method: "POST", body: JSON.stringify({ queueId: selectedItem.id, confirmWrite: true }) });
        setPromotionPreview(null);
    }, [runAction, selectedItem]);

    if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240, gap: 10, color: "#666" }}><RefreshCw size={18} /><p>Chargement de la Growth Machine...</p></div>;

    return <div>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
            <div><h1 style={{ margin: 0 }}>Growth Machine</h1><p style={{ ...muted, margin: "6px 0 0" }}>Pilotage de la queue, des runs, des prompts, de la memoire et des promotions.</p></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button style={btn} disabled={Boolean(busy)} onClick={() => refreshAll(true)}><RefreshCw size={16} />Rafraichir</button>
                <button style={btn} disabled={Boolean(busy)} onClick={() => runAction("Seed prompts", "/api/admin/prompts", { method: "POST", body: JSON.stringify({ seedDefaults: true }) })}><Sparkles size={16} />Seed prompts</button>
                <button style={btn} disabled={Boolean(busy)} onClick={() => runAction("Cycle growth", "/api/admin/growth", { method: "POST", body: JSON.stringify({ limit: 3 }) })}><Rocket size={16} />Lancer cycle</button>
                <button style={btn} disabled={Boolean(busy)} onClick={() => runAction("Revision batch", "/api/admin/revise", { method: "POST", body: JSON.stringify({ limit: 3 }) })}><Sparkles size={16} />Relancer revisions</button>
                <button style={{ ...btn, borderColor: "#fecaca", color: "#991b1b", background: "#fff7f7" }} disabled={Boolean(busy)} onClick={() => runAction("Cycle + promote", "/api/admin/growth", { method: "POST", body: JSON.stringify({ limit: 3, promoteApproved: true, promoteLimit: 2 }) })}><Rocket size={16} />Cycle + promote</button>
            </div>
        </header>
        {status.message ? <div style={{ ...card, marginBottom: 16, padding: 14, background: status.type === "success" ? "#f0fdf4" : status.type === "error" ? "#fef2f2" : "#f9fafb", borderColor: status.type === "success" ? "#bbf7d0" : status.type === "error" ? "#fecaca" : "#e5e5e5", color: status.type === "success" ? "#166534" : status.type === "error" ? "#991b1b" : "#374151" }}>{status.message}</div> : null}
        <section style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 16 }}>
            <StatCard label="Queue" value={overview?.queue.total || items.length} note={`${overview?.queue.queued || 0} queued · ${overview?.queue.running || 0} running · ${overview?.queue.failed || 0} failed`} />
            <StatCard label="Runs" value={overview?.runs.total || runs.length} note={`${overview?.runs.completed || 0} completed · ${overview?.runs.failed || 0} failed`} />
            <StatCard label="Memoire" value={overview?.memory.total || 0} note={`${overview?.memory.patterns || 0} patterns · ${overview?.memory.constraints || 0} constraints`} />
            <StatCard label="Prompts" value={overview?.prompts.total || prompts.length} note={`${overview?.prompts.active || 0} actifs`} />
            <StatCard label="Experiences" value={overview?.experiments.total || experiments.length} note={`${overview?.experiments.running || 0} en cours`} />
            <StatCard label="IA" value={ai?.enabled ? "active" : "inactive"} note={`${ai?.provider || "openai"} · ${ai?.model || "n/a"}`} />
        </section>
        <section style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginBottom: 16 }}>
            <Panel title="Runs recents" meta={`${runs.length} charge(s)`}>{runs.length ? <div style={{ ...grid, gap: 10 }}>{runs.map((run) => <div key={run.id} style={{ border: "1px solid #ececec", borderRadius: 8, background: "#fafafa", padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}><strong style={{ fontSize: 13 }}>{run.run_label || run.trigger_source || "run"}</strong><span style={statusPill(run.status)}>{run.status}</span></div><div style={muted}>{formatDate(run.created_at)}</div><div style={muted}>briefs {statValue(run.stats, "briefCount")} · drafts {statValue(run.stats, "contentDraftCount")} · reviews {statValue(run.stats, "reviewCount")} · revisions {statValue(run.stats, "revisionCount")}</div><div style={muted}>cluster {run.cluster_ref || "general"} · erreurs {Array.isArray(run.errors) ? run.errors.length : 0}</div></div>)}</div> : <p style={muted}>Aucun run recent.</p>}</Panel>
            <Panel title="Prompt registry" meta={`${prompts.length} entree(s)`}>{prompts.length ? <div style={{ ...grid, gap: 10 }}>{prompts.map((prompt) => <div key={prompt.id} style={{ border: "1px solid #ececec", borderRadius: 8, background: "#fafafa", padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}><strong style={{ fontSize: 13 }}>{prompt.module} / {prompt.prompt_key}</strong><span style={statusPill(prompt.status)}>{prompt.status}</span></div><div style={muted}>version {prompt.version}</div><div style={muted}>{formatDate(prompt.updated_at)}</div></div>)}</div> : <p style={muted}>Aucun prompt versionne.</p>}</Panel>
            <Panel title="Experiences" meta={`${experiments.length} entree(s)`}>{experiments.length ? <div style={{ ...grid, gap: 10 }}>{experiments.map((experiment) => <div key={experiment.id} style={{ border: "1px solid #ececec", borderRadius: 8, background: "#fafafa", padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}><strong style={{ fontSize: 13 }}>{experiment.name}</strong><span style={statusPill(experiment.status)}>{experiment.status}</span></div><div style={muted}>key {experiment.experiment_key}</div><div style={muted}>{experiment.success_metric || "Aucune metrique ciblee"}</div></div>)}</div> : <p style={muted}>Aucune experience enregistree.</p>}</Panel>
            <Panel title="Memoire recente" meta={`${overview?.memory.recentKeys.length || 0} cle(s)`}>{overview?.memory.recentKeys?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{overview.memory.recentKeys.map((key) => <span key={key} style={{ display: "inline-flex", padding: "6px 10px", borderRadius: 999, background: "#f3f4f6", color: "#374151", fontSize: 11, fontWeight: 600 }}>{key}</span>)}</div> : <p style={muted}>Aucune cle recente.</p>}</Panel>
        </section>
        <div style={{ ...card, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
            <div><strong style={{ display: "block", marginBottom: 4 }}>Ready to promote</strong><p style={{ ...muted, margin: 0 }}>{readyItems.length} item(s) approuves, avec brouillon structure, sans promotion encore faite.</p></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={btn} disabled={readyItems.length === 0} onClick={() => { const next = readyItems[0]; if (next) { setSelectedId(next.id); setPromotionPreview(null); setReviewFilter("approved_only"); } }}><Sparkles size={16} />Aller au prochain approved</button>
                <button style={btn} onClick={() => setShowRawJson((current) => !current)}><Eye size={16} />{showRawJson ? "Masquer JSON" : "Afficher JSON"}</button>
            </div>
        </div>
        <div style={{ ...grid, gridTemplateColumns: "320px minmax(0,1fr)" }}>
            <aside style={card}>
                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                    <label style={muted}><span>Statut</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6 }}><option value="all">Tous</option><option value="draft">Draft</option><option value="completed">Completed</option><option value="failed">Failed</option></select></label>
                    <label style={muted}><span>Review</span><select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} style={{ width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6 }}><option value="all">Toutes</option><option value="approved_only">Approved only</option><option value="needs_revision">Needs revision</option><option value="needs_review">Sans review</option></select></label>
                    <label style={muted}><span>Cluster</span><select value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)} style={{ width: "100%", marginTop: 6, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6 }}><option value="all">Tous</option>{clusterOptions.map((cluster) => <option key={cluster} value={cluster}>{cluster}</option>)}</select></label>
                </div>
                <div style={{ ...grid, gap: 10 }}>{filteredItems.map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); setPromotionPreview(null); }} style={{ width: "100%", textAlign: "left", border: selectedId === item.id ? "1px solid #111" : "1px solid #e5e5e5", background: "#fafafa", borderRadius: 8, padding: 12, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}><strong style={{ fontSize: 13 }}>{item.title || item.topic || "Sans titre"}</strong><span style={statusPill(item.status)}>{item.status}</span></div><div style={{ fontSize: 11, color: "#777" }}>{item.cluster_ref || "general"} · prio {item.priority}</div></button>)}{filteredItems.length === 0 ? <p style={muted}>Aucun item ne correspond aux filtres.</p> : null}</div>
            </aside>
            <section style={card}>
                {selectedItem ? <>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 }}><div><h2 style={{ margin: 0 }}>{selectedItem.title || selectedItem.topic || "Queue item"}</h2><p style={{ ...muted, margin: "6px 0 0" }}>{selectedItem.decision_reason || "Aucune raison de decision enregistree."}</p></div><span style={statusPill(selectedItem.status)}>{selectedItem.status}</span></div>
                    <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
                        <div style={{ ...card, padding: 14 }}><strong>References</strong><p style={muted}>product_ref: {selectedItem.product_ref || "n/a"}</p><p style={muted}>cluster_ref: {selectedItem.cluster_ref || "n/a"}</p><p style={muted}>intent: {selectedItem.intent || "n/a"}</p><p style={muted}>cree: {formatDate(selectedItem.created_at)}</p></div>
                        <div style={{ ...card, padding: 14 }}><strong>Etat interne</strong><p style={muted}>draftPack: {draftPack ? "oui" : "non"}</p><p style={muted}>contentDraft: {draft ? "oui" : "non"}</p><p style={muted}>review: {review ? review.verdict || "oui" : "non"}</p><p style={muted}>revision attempts: {revision?.attemptCount || 0}</p><p style={muted}>promotion: {selectedItem.payload.promotion ? "oui" : "non"}</p></div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                        <button style={btn} disabled={Boolean(busy)} onClick={() => actOnSelected("Preparation draft pack", "/api/admin/drafts")}><ListTodo size={16} />Draft pack</button>
                        <button style={btn} disabled={Boolean(busy)} onClick={() => actOnSelected("Generation brouillon structure", "/api/admin/content-drafts")}><FileText size={16} />Brouillon structure</button>
                        <button style={btn} disabled={Boolean(busy)} onClick={() => actOnSelected("Review brouillon", "/api/admin/review")}><CheckCircle size={16} />Review</button>
                        <button style={btn} disabled={Boolean(busy) || !canReviseSelected} onClick={() => actOnSelected("Revision ciblee", "/api/admin/revise")}><Sparkles size={16} />Revise draft</button>
                        <button style={btn} disabled={Boolean(busy)} onClick={previewPromotion}><Eye size={16} />Preview promotion</button>
                        <button style={{ ...btn, borderColor: "#fecaca", color: "#991b1b", background: "#fff7f7" }} disabled={Boolean(busy)} onClick={promoteSelected}><Sparkles size={16} />Promote</button>
                    </div>
                    <div style={{ ...grid, gap: 12 }}>
                        <div style={{ ...card, padding: 14 }}><strong>Review</strong>{review ? <><div style={{ margin: "8px 0" }}><span style={statusPill(review.verdict || "draft")}>{review.verdict || "unknown"}</span></div><p style={muted}>{review.rationale || "Aucune rationale."}</p>{review.blockingIssues?.length ? <ul style={{ ...muted, paddingLeft: 18 }}>{review.blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}{review.warnings?.length ? <ul style={{ ...muted, paddingLeft: 18 }}>{review.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}</> : <p style={muted}>Aucune review pour cet item.</p>}</div>
                        <div style={{ ...card, padding: 14 }}><strong>Revision</strong>{revision ? <><p style={muted}><strong>Attempts:</strong> {revision.attemptCount || 0}</p><p style={muted}><strong>Derniere tentative:</strong> {formatDate(revision.lastAttemptAt || null)}</p><p style={muted}><strong>Verdict precedent:</strong> {revision.previousVerdict || "n/a"}</p><p style={muted}><strong>Dernier resultat:</strong> {revision.lastResult || "n/a"}</p><p style={muted}><strong>Derniere review:</strong> {formatDate(revision.lastReviewedAt || null)}</p></> : <p style={muted}>Aucune revision automatique enregistree pour cet item.</p>}</div>
                        <div style={{ ...card, padding: 14 }}><strong>Preview article</strong>{draft?.post ? <><p style={muted}><strong>Titre:</strong> {draft.post.title || "n/a"}</p><p style={muted}><strong>Slug:</strong> {draft.post.slug || "n/a"}</p><p style={muted}><strong>Categorie:</strong> {draft.post.category || "n/a"}</p><p style={muted}><strong>Excerpt:</strong> {draft.post.excerpt || "n/a"}</p><p style={muted}><strong>Meta:</strong> {draft.post.metaDescription || "n/a"}</p><pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, lineHeight: 1.5 }}>{draft.post.content || "Aucun contenu."}</pre></> : <p style={muted}>Aucun brouillon structure.</p>}</div>
                        <div style={{ ...card, padding: 14 }}><strong>Preview pins</strong>{draft?.pins?.length ? <div style={{ ...grid, gap: 10 }}>{draft.pins.map((pin, index) => <div key={`${pin.fileHint || "pin"}-${index}`} style={{ border: "1px solid #ececec", borderRadius: 8, background: "#fff", padding: 10 }}><p style={muted}><strong>{pin.title || `Pin ${index + 1}`}</strong></p><p style={muted}>{pin.description || "Sans description"}</p><p style={muted}><strong>CTA:</strong> {pin.cta || "n/a"}</p><p style={muted}><strong>Hint fichier:</strong> {pin.fileHint || "n/a"}</p></div>)}</div> : <p style={muted}>Aucune variante Pinterest prete.</p>}</div>
                        <div style={{ ...card, padding: 14 }}><strong>Promotion preview</strong>{promotionPreview ? <><div style={{ margin: "8px 0" }}><span style={statusPill(promotionPreview.canPromote ? "approved" : "failed")}>{promotionPreview.canPromote ? "ready" : "blocked"}</span></div><p style={muted}><strong>Titre:</strong> {promotionPreview.post.title}</p><p style={muted}><strong>Slug:</strong> {promotionPreview.post.slug}</p><p style={muted}><strong>Categorie:</strong> {promotionPreview.post.category}</p><p style={muted}><strong>Meta:</strong> {promotionPreview.post.metaDescription}</p>{promotionPreview.blockers.length ? <ul style={{ ...muted, paddingLeft: 18 }}>{promotionPreview.blockers.map((item) => <li key={item}>{item}</li>)}</ul> : null}{promotionPreview.warnings.length ? <ul style={{ ...muted, paddingLeft: 18 }}>{promotionPreview.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : null}</> : <p style={muted}>Aucune preview chargee.</p>}</div>
                        {showRawJson ? <><div style={{ ...card, padding: 14 }}><strong>Draft Pack JSON</strong><pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>{draftPack ? JSON.stringify(draftPack, null, 2) : "Aucun draft pack."}</pre></div><div style={{ ...card, padding: 14 }}><strong>Content Draft JSON</strong><pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11 }}>{draft ? JSON.stringify(draft, null, 2) : "Aucun brouillon structure."}</pre></div></> : null}
                    </div>
                </> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240, color: "#666" }}><p>Selectionne un item dans la queue pour l inspecter.</p></div>}
            </section>
        </div>
    </div>;
}

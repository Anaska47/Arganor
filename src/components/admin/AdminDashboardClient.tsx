"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, RefreshCw, Rocket, Workflow } from "lucide-react";

type ActivityItem = {
    id: number;
    type: "sale" | "blog" | "pinterest" | "product";
    text: string;
    time: string;
    status: "success" | "info" | "warning";
};

type AutopilotStats = {
    status: string;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    generatedProducts: number;
    generatedPosts: number;
    generatedPins: number;
    feedPins: number;
    message: string;
    errors: string[];
    warnings: string[];
    supabaseRunId: string | null;
    workflowRunUrl: string | null;
    triggerSource: string | null;
    validationAt: string | null;
    warningCount: number;
    errorCount: number;
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

type FunnelSource = {
    source: string;
    channel: string;
    pageVisits: number;
    affiliateClicks: number;
    conversionRate: number;
    lastSeenAt: string | null;
    topCampaigns: string[];
};

type FunnelSummary = {
    totalPageVisits: number;
    totalAffiliateClicks: number;
    socialPageVisits: number;
    socialAffiliateClicks: number;
    topSources: FunnelSource[];
};

type StatsResponse = {
    totalProducts: number;
    blogPosts: number;
    rssPins: number;
    latestPostDate: string | null;
    totalReviews: number;
    avgRating: string;
    revenue: string;
    clicks: number;
    pageVisits: number;
    funnel: FunnelSummary;
    apiKeyConfigured: boolean;
    autopilot: AutopilotStats;
    feedHealth: FeedHealth;
    activities: ActivityItem[];
    isLive: boolean;
};

type ConfigResponse = {
    apiKeyConfigured: boolean;
    requiresApiKey: boolean;
    keyStorageName: string;
};

type GrowthOverview = {
    queue: { total: number; queued: number; running: number; failed: number };
    runs: { total: number; completed: number; failed: number };
    memory: { total: number; patterns: number; constraints: number; recentKeys: string[] };
    prompts: { total: number; active: number };
    experiments: { total: number; running: number };
};

type GrowthAiStatus = {
    enabled: boolean;
    provider: string;
    model: string;
};

type GrowthResponse = {
    success: boolean;
    overview: GrowthOverview;
    ai: GrowthAiStatus;
    message?: string;
    error?: string;
};

type Banner = { tone: "success" | "warning" | "info" | "error"; text: string } | null;

const panel: CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: "0 2px 6px rgba(15,23,42,0.04)" };
const muted: CSSProperties = { color: "#6b7280", fontSize: 13, lineHeight: 1.5 };
const label: CSSProperties = { ...muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 };
const buttonBase: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 6, padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid #d1d5db", background: "#fff", color: "#111827" };

function getAdminHeaders(apiKey: string): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
    }
    return headers;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, { cache: "no-store", ...init });
    const data = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : `Request failed (${response.status})`);
    }
    return data as T;
}

function formatDate(value: string | null) {
    if (!value) return "n/a";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR");
}

function statusChip(status: string): CSSProperties {
    if (["completed", "validated", "active", "success"].includes(status)) return { background: "#dcfce7", color: "#166534" };
    if (["failed", "error"].includes(status)) return { background: "#fee2e2", color: "#991b1b" };
    if (["running", "queued"].includes(status)) return { background: "#dbeafe", color: "#1d4ed8" };
    return { background: "#fef3c7", color: "#92400e" };
}

function bannerStyle(tone: NonNullable<Banner>["tone"]): CSSProperties {
    if (tone === "success") return { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" };
    if (tone === "error") return { background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" };
    if (tone === "warning") return { background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" };
    return { background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" };
}

function MetricCard({ labelText, value, note }: { labelText: string; value: string | number; note: string }) {
    return (
        <div style={panel}>
            <div style={label}>{labelText}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: "#111827" }}>{value}</div>
            <p style={{ ...muted, margin: "8px 0 0" }}>{note}</p>
        </div>
    );
}

export default function AdminDashboardClient() {
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [growth, setGrowth] = useState<GrowthResponse | null>(null);
    const [config, setConfig] = useState<ConfigResponse | null>(null);
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<Banner>(null);
    const [growthError, setGrowthError] = useState<string | null>(null);

    const loadDashboard = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const storedApiKey = window.localStorage.getItem("arganorAdminApiKey") || "";
        setApiKey(storedApiKey);

        try {
            const [statsData, configData] = await Promise.all([
                fetchJson<StatsResponse>("/api/admin/stats"),
                fetchJson<ConfigResponse>("/api/admin/config"),
            ]);
            setStats(statsData);
            setConfig(configData);
            setGrowthError(null);

            try {
                const growthData = await fetchJson<GrowthResponse>("/api/admin/growth", {
                    headers: getAdminHeaders(storedApiKey),
                });
                setGrowth(growthData);
            } catch (error) {
                setGrowth(null);
                setGrowthError(error instanceof Error ? error.message : "Growth overview indisponible");
            }
        } catch (error) {
            setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Chargement admin impossible" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const alert = useMemo<Banner>(() => {
        if (!stats) return null;
        if (stats.feedHealth.status === "failed") {
            return { tone: "error", text: `Le feed RSS a echoue a la derniere validation (${stats.feedHealth.errorCount} erreur(s)).` };
        }
        if (stats.autopilot.status === "failed") {
            return { tone: "warning", text: "Le dernier run autopilot a echoue. Il faut verifier le workflow GitHub avant de relancer." };
        }
        if (stats.autopilot.warningCount >= 10) {
            return { tone: "warning", text: `Le feed passe, mais il remonte ${stats.autopilot.warningCount} warnings. On doit nettoyer ca avant de scaler.` };
        }
        return { tone: "success", text: "La machine est debout: on a maintenant un point de verite clair sur le run, le feed et la queue growth." };
    }, [stats]);

    const saveApiKey = useCallback(() => {
        window.localStorage.setItem("arganorAdminApiKey", apiKey.trim());
        setFeedback({ tone: "info", text: "Cle admin sauvegardee dans ce navigateur." });
        void loadDashboard(true);
    }, [apiKey, loadDashboard]);

    const runGrowth = useCallback(async (labelText: string, payload: Record<string, unknown>) => {
        if (config?.requiresApiKey && !apiKey.trim()) {
            setFeedback({ tone: "error", text: "ARGANOR_API_KEY requise pour lancer les actions growth." });
            return;
        }

        setBusy(labelText);
        try {
            const response = await fetchJson<GrowthResponse>("/api/admin/growth", {
                method: "POST",
                headers: getAdminHeaders(apiKey),
                body: JSON.stringify(payload),
            });
            setGrowth(response);
            setFeedback({ tone: "success", text: response.message || `${labelText} termine.` });
            await loadDashboard(true);
        } catch (error) {
            setFeedback({ tone: "error", text: error instanceof Error ? error.message : `${labelText} a echoue.` });
        } finally {
            setBusy(null);
        }
    }, [apiKey, config?.requiresApiKey, loadDashboard]);

    if (loading || !stats) {
        return <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 260, color: "#6b7280" }}><RefreshCw size={18} /><span>Chargement du cockpit admin...</span></div>;
    }

    return (
        <div style={{ display: "grid", gap: 20 }}>
            <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 32, color: "#111827" }}>Admin Dashboard</h1>
                    <p style={{ ...muted, margin: "8px 0 0", maxWidth: 760 }}>On centralise ici la sante du projet: contenu, autopilot, feed Pinterest et couche growth machine.</p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={buttonBase} onClick={() => loadDashboard(true)} disabled={Boolean(busy)}><RefreshCw size={16} />Rafraichir</button>
                    <a href="/admin/growth" style={{ ...buttonBase, textDecoration: "none" }}><Workflow size={16} />Ouvrir Growth</a>
                    <button style={{ ...buttonBase, background: "#111827", color: "#fff", borderColor: "#111827" }} onClick={() => runGrowth("Cycle growth", { limit: 3 })} disabled={Boolean(busy)}><Rocket size={16} />{busy === "Cycle growth" ? "Cycle..." : "Cycle growth"}</button>
                </div>
            </header>

            {alert ? <div style={{ ...panel, ...bannerStyle(alert.tone), padding: 16 }}>{alert.text}</div> : null}
            {feedback ? <div style={{ ...panel, ...bannerStyle(feedback.tone), padding: 16 }}>{feedback.text}</div> : null}

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                <MetricCard labelText="Produits" value={stats.totalProducts} note={`${stats.totalReviews} avis cumules`} />
                <MetricCard labelText="Articles" value={stats.blogPosts} note={`Dernier: ${formatDate(stats.latestPostDate)}`} />
                <MetricCard labelText="Pins feed" value={stats.feedHealth.feedPins} note={`${stats.feedHealth.status} / ${stats.feedHealth.warningCount} warning(s)`} />
                <MetricCard labelText="Visites trackees" value={stats.pageVisits} note={`${stats.funnel.socialPageVisits} depuis social`} />
                <MetricCard labelText="Clics affilies" value={stats.clicks} note={`CA estime: ${stats.revenue} EUR`} />
                <MetricCard labelText="Note moyenne" value={stats.avgRating} note={stats.isLive ? "Site en ligne" : "Site non confirme"} />
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 1fr)", gap: 16, alignItems: "start" }}>
                <div style={{ ...panel, display: "grid", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                            <div style={label}>Autopilot</div>
                            <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>Run + feed health</h2>
                        </div>
                        <span style={{ ...statusChip(stats.autopilot.status), borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>{stats.autopilot.status}</span>
                    </div>
                    <p style={{ ...muted, margin: 0 }}>{stats.autopilot.message}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                        <div><div style={label}>Dernier run</div><div style={{ marginTop: 6 }}>{formatDate(stats.autopilot.lastRunAt)}</div></div>
                        <div><div style={label}>Dernier succes</div><div style={{ marginTop: 6 }}>{formatDate(stats.autopilot.lastSuccessAt)}</div></div>
                        <div><div style={label}>Trigger</div><div style={{ marginTop: 6 }}>{stats.autopilot.triggerSource || "n/a"}</div></div>
                        <div><div style={label}>Validation</div><div style={{ marginTop: 6 }}>{formatDate(stats.autopilot.validationAt)}</div></div>
                        <div><div style={label}>Generation</div><div style={{ marginTop: 6 }}>{stats.autopilot.generatedProducts} prod / {stats.autopilot.generatedPosts} posts / {stats.autopilot.generatedPins} pins</div></div>
                        <div><div style={label}>RSS</div><div style={{ marginTop: 6 }}>{stats.feedHealth.feedPins} pins / {stats.feedHealth.errorCount} erreur(s)</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {stats.autopilot.workflowRunUrl ? <a href={stats.autopilot.workflowRunUrl} target="_blank" rel="noreferrer" style={{ ...buttonBase, textDecoration: "none" }}><ExternalLink size={16} />Workflow run</a> : null}
                        <a href={stats.feedHealth.feedUrl} target="_blank" rel="noreferrer" style={{ ...buttonBase, textDecoration: "none" }}><ExternalLink size={16} />Voir feed.xml</a>
                        <button style={{ ...buttonBase, borderColor: "#111827" }} onClick={() => runGrowth("Cycle + promote", { limit: 3, promoteApproved: true, promoteLimit: 2 })} disabled={Boolean(busy)}><Rocket size={16} />{busy === "Cycle + promote" ? "Promotion..." : "Cycle + promote"}</button>
                    </div>
                    {stats.autopilot.errors.length > 0 ? <div style={{ padding: 14, borderRadius: 8, background: "#fef2f2", color: "#991b1b" }}><strong>Erreurs</strong><ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>{stats.autopilot.errors.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                    {stats.autopilot.warnings.length > 0 ? <div style={{ padding: 14, borderRadius: 8, background: "#fffbeb", color: "#92400e" }}><strong>Warnings</strong><ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>{stats.autopilot.warnings.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                    <div style={panel}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <KeyRound size={16} />
                            <strong>Admin API key</strong>
                        </div>
                        <p style={{ ...muted, margin: "10px 0 14px" }}>
                            {config?.requiresApiKey ? "Les routes sensibles demandent une cle locale dans ce navigateur." : "Aucune cle requise en local pour le moment."}
                        </p>
                        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ARGANOR_API_KEY" style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #d1d5db", marginBottom: 10 }} />
                        <button style={buttonBase} onClick={saveApiKey}>Sauvegarder la cle</button>
                    </div>

                    <div style={panel}>
                        <div style={label}>Growth machine</div>
                        <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>Queue et memoire</h2>
                        {growth?.overview ? (
                            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    <div><strong>{growth.overview.queue.total}</strong><div style={muted}>items queue</div></div>
                                    <div><strong>{growth.overview.runs.total}</strong><div style={muted}>runs growth</div></div>
                                    <div><strong>{growth.overview.memory.total}</strong><div style={muted}>memo entries</div></div>
                                    <div><strong>{growth.overview.experiments.total}</strong><div style={muted}>experiments</div></div>
                                </div>
                                <p style={{ ...muted, margin: 0 }}>IA: {growth.ai.enabled ? `${growth.ai.provider} / ${growth.ai.model}` : "inactive"}</p>
                                <p style={{ ...muted, margin: 0 }}>Queue: {growth.overview.queue.queued} queued, {growth.overview.queue.running} running, {growth.overview.queue.failed} failed.</p>
                                {growth.overview.memory.recentKeys.length > 0 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{growth.overview.memory.recentKeys.slice(0, 4).map((item) => <span key={item} style={{ background: "#f3f4f6", borderRadius: 999, padding: "6px 10px", fontSize: 12, color: "#374151" }}>{item}</span>)}</div> : null}
                            </div>
                        ) : (
                            <div style={{ marginTop: 14, color: "#92400e", display: "grid", gap: 8 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}><AlertTriangle size={16} />Growth overview non charge.</div>
                                <div style={muted}>{growthError || "Ajoute la cle admin si la route est protegee."}</div>
                            </div>
                        )}
                    </div>

                    <div style={panel}>
                        <div style={label}>Traffic funnel</div>
                        <h2 style={{ margin: "8px 0 0", fontSize: 22 }}>Source → site → affilié</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                            <div><strong>{stats.funnel.totalPageVisits}</strong><div style={muted}>visites trackees</div></div>
                            <div><strong>{stats.funnel.totalAffiliateClicks}</strong><div style={muted}>clics affilies</div></div>
                            <div><strong>{stats.funnel.socialPageVisits}</strong><div style={muted}>visites sociales</div></div>
                            <div><strong>{stats.funnel.socialAffiliateClicks}</strong><div style={muted}>clics sociaux</div></div>
                        </div>
                        {stats.funnel.topSources.length > 0 ? (
                            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                                {stats.funnel.topSources.map((item) => (
                                    <div key={`${item.source}-${item.channel}`} style={{ border: "1px solid #ececec", borderRadius: 8, padding: 12, background: "#fafafa" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                            <strong>{item.source}</strong>
                                            <span style={{ ...statusChip(item.channel), borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>{item.channel}</span>
                                        </div>
                                        <div style={{ ...muted, marginTop: 8 }}>
                                            {item.pageVisits} visite(s) → {item.affiliateClicks} clic(s) affilié(s) · conv. {item.conversionRate}%
                                        </div>
                                        <div style={{ ...muted, marginTop: 6 }}>
                                            Dernier signal: {formatDate(item.lastSeenAt)}
                                        </div>
                                        {item.topCampaigns.length > 0 ? (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                                                {item.topCampaigns.map((campaign) => (
                                                    <span key={campaign} style={{ background: "#fff", borderRadius: 999, padding: "4px 8px", fontSize: 11, color: "#374151", border: "1px solid #e5e7eb" }}>
                                                        {campaign}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ ...muted, marginTop: 14 }}>
                                Le funnel vient d’être branché. Dès que Pinterest, Instagram ou Facebook renvoient du trafic, on verra ici les sources, campagnes et conversions vers l’affiliation.
                            </p>
                        )}
                    </div>

                    <div style={panel}>
                        <div style={label}>Recent activity</div>
                        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                            {stats.activities.length > 0 ? stats.activities.map((activity) => (
                                <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "14px 1fr auto", gap: 10, alignItems: "center" }}>
                                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: activity.status === "success" ? "#22c55e" : activity.status === "warning" ? "#f59e0b" : "#3b82f6" }} />
                                    <span>{activity.text}</span>
                                    <span style={muted}>{activity.time}</span>
                                </div>
                            )) : <div style={muted}>Aucune activite recente.</div>}
                        </div>
                    </div>

                    <div style={{ ...panel, background: "#f8fafc" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0f172a" }}><CheckCircle2 size={16} /><strong>Ce qui est deja en place</strong></div>
                        <ul style={{ ...muted, margin: "12px 0 0", paddingLeft: 18 }}>
                            <li>telemetrie des runs GitHub vers Supabase</li>
                            <li>memoire persistante pour le dernier run et la sante du feed</li>
                            <li>cockpit growth separe sur /admin/growth</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}

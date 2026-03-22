"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, Copy, CheckCircle, ExternalLink, Send, Zap } from "lucide-react";

interface PinData {
    productId: string;
    productName: string;
    title: string;
    description: string;
    link: string;
    hashtags: string[];
    imageUrl: string;
    generatedAt: string;
}

interface Product {
    id: string;
    name: string;
    brand: string;
    category: string;
    rating: number;
    reviews: number;
    price: number;
    image: string;
}

interface PublishResult {
    productName: string;
    success: boolean;
    makeResponse: string;
}

export default function AdminPinterestClient() {
    const [pins, setPins] = useState<PinData[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPin, setSelectedPin] = useState<PinData | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"preview" | "csv" | "make">("preview");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [publishing, setPublishing] = useState<string | null>(null);
    const [batchPublishing, setBatchPublishing] = useState(false);
    const [publishLog, setPublishLog] = useState<PublishResult[]>([]);
    const [showLog, setShowLog] = useState(false);

    const fetchPins = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/pinterest/export?limit=20");
            const data = await res.json();
            if (data.pins) {
                setPins(data.pins);
                setSelectedPin(data.pins[0] || null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const [apiKey, setApiKey] = useState<string>("");

    useEffect(() => {
        // Fetch the API key safely from a server config endpoint
        fetch('/api/admin/config').then(res => res.json()).then(data => {
            if (data.apiKey) setApiKey(data.apiKey);
        });
    }, []);

    useEffect(() => {
        fetchPins();
        fetch("/api/products").then(r => r.json()).then(setProducts);
    }, [fetchPins]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const downloadCSV = () => window.open("/api/pinterest/export?format=csv", "_blank");

    // Publish 1 pin to Make.com
    const publishOne = async (pin: PinData) => {
        setPublishing(pin.productId);
        try {
            const res = await fetch(`/api/pinterest/publish?productId=${pin.productId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
            });
            const data = await res.json();
            setPublishLog(prev => [{
                productName: pin.productName,
                success: data.success,
                makeResponse: data.makeResponse || "—",
            }, ...prev].slice(0, 20));
            setShowLog(true);
        } finally {
            setPublishing(null);
        }
    };

    // Publish top 5 pins to Make.com (daily batch)
    const publishBatch = async (count: number = 5) => {
        setBatchPublishing(true);
        try {
            const res = await fetch(`/api/pinterest/publish?batch=${count}`, {
                method: "POST",
                headers: { "Authorization": "Bearer ZG58DirMq40KBzV7nFmkbI9CpSNvLooOYalyR2gJuTAjch3x1" },
            });
            const data = await res.json();
            if (data.results) {
                setPublishLog(prev => [...(data.results as PublishResult[]), ...prev].slice(0, 20));
                setShowLog(true);
            }
        } finally {
            setBatchPublishing(false);
        }
    };

    const makeDescription = selectedPin
        ? `${selectedPin.description}\n\n${selectedPin.hashtags.join(" ")}`
        : "";

    if (loading) {
        return (
            <div className="pin-loading-state">
                <div className="pin-spinner"></div>
                <p>Génération de tes Pins Pinterest...</p>
            </div>
        );
    }

    return (
        <div className="pinterest-admin">

            {/* ── Header ─────────────────────────────────────────── */}
            <header className="page-header-admin flex-header">
                <div>
                    <h1 className="pin-header-title">📌 Pinterest Dashboard</h1>
                    <p className="pin-header-sub">{pins.length} Pins générés • Webhook Make.com <span className="pin-badge-live">🟢 Connecté</span></p>
                </div>
                <div className="pin-header-actions">
                    <button
                        className="btn btn-outline pin-action-btn"
                        onClick={() => publishBatch(5)}
                        disabled={batchPublishing}
                        title="Envoie les 5 produits les plus populaires à Make.com maintenant"
                    >
                        <span className="btn-label-steady" translate="no">
                            {batchPublishing && <span className="pin-mini-spinner"></span>}
                            {batchPublishing ? " Publication..." : <span><Zap size={16} style={{marginRight: '8px'}} /> Publier 5 Pins</span>}
                        </span>
                    </button>
                    <button className="btn btn-outline pin-action-btn" onClick={fetchPins}>
                        <RefreshCw size={16} /> Régénérer
                    </button>
                    <button className="btn btn-primary pin-action-btn" onClick={downloadCSV}>
                        <Download size={16} /> CSV
                    </button>
                </div>
            </header>

            {/* ── Stats ──────────────────────────────────────────── */}
            <div className="pin-stats-row">
                {[
                    { icon: "📌", value: String(pins.length), label: "Pins Prêts" },
                    { icon: "🤖", value: "Make.com", label: "Webhook Actif" },
                    { icon: "💰", value: "arganor-21", label: "Tag Affilié" },
                    { icon: "📊", value: String(publishLog.filter(l => l.success).length), label: "Publiés ce run" },
                ].map((s) => (
                    <div key={s.label} className="pin-stat-card">
                        <span className="pin-stat-icon">{s.icon}</span>
                        <div>
                            <div className="pin-stat-number">{s.value}</div>
                            <div className="pin-stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Publish Log ────────────────────────────────────── */}
            {publishLog.length > 0 && (
                <div className="publish-log-box">
                    <div className="publish-log-header" onClick={() => setShowLog(v => !v)}>
                        <span>📋 Journal de publication ({publishLog.length})</span>
                        <span>{showLog ? "▲" : "▼"}</span>
                    </div>
                    {showLog && (
                        <div className="publish-log-items">
                            {publishLog.map((l, i) => (
                                <div key={i} className={`publish-log-item ${l.success ? "success" : "error"}`}>
                                    <span className="log-dot">{l.success ? "✅" : "❌"}</span>
                                    <span className="log-name">{l.productName.slice(0, 40)}</span>
                                    <span className="log-resp">{l.makeResponse}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Main Layout ────────────────────────────────────── */}
            <div className="pinterest-main-layout">

                {/* Left: Product List */}
                <div className="pin-product-list">
                    <div className="pin-list-header">
                        <h3>Produits ({pins.length})</h3>
                        <span className="pin-list-hint">par popularité</span>
                    </div>
                    <div className="pin-list-items">
                        {pins.map((pin) => {
                            const product = products.find(p => p.id === pin.productId);
                            const isActive = selectedPin?.productId === pin.productId;
                            const isPublishing = publishing === pin.productId;
                            return (
                                <div
                                    key={pin.productId}
                                    className={`pin-list-item${isActive ? " active" : ""}`}
                                    onClick={() => { setSelectedPin(pin); setPreviewLoading(true); }}
                                >
                                    {product && (
                                        <img src={product.image} alt={product.name} className="pin-list-thumb" />
                                    )}
                                    <div className="pin-list-info">
                                        <div className="pin-list-name">
                                            {pin.productName.length > 32 ? pin.productName.slice(0, 29) + "…" : pin.productName}
                                        </div>
                                        <span className="pin-badge">{product?.category ?? "—"}</span>
                                    </div>
                                    <button
                                        className="pin-send-btn"
                                        disabled={isPublishing || batchPublishing}
                                        title="Envoyer ce Pin à Make.com maintenant"
                                        onClick={(e) => { e.stopPropagation(); publishOne(pin); }}
                                    >
                                        {isPublishing
                                            ? <span className="pin-mini-spinner"></span>
                                            : <Send size={13} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Detail Panel */}
                {selectedPin && (
                    <div className="pin-detail">

                        {/* Tabs */}
                        <div className="pin-tabs">
                            {(["preview", "make", "csv"] as const).map((t) => (
                                <button
                                    key={t}
                                    className={`pin-tab${activeTab === t ? " active" : ""}`}
                                    onClick={() => setActiveTab(t)}
                                >
                                    {t === "preview" && "🖼️ Aperçu"}
                                    {t === "make" && "🤖 Make.com"}
                                    {t === "csv" && "📋 CSV"}
                                </button>
                            ))}

                            {/* Quick Publish Button in header */}
                            <button
                                className="pin-tab-publish-btn"
                                disabled={!!publishing || batchPublishing}
                                onClick={() => publishOne(selectedPin)}
                            >
                                <span className="btn-label-steady" translate="no">
                                    {publishing === selectedPin.productId && <span className="pin-mini-spinner"></span>}
                                    {publishing === selectedPin.productId ? " Envoi..." : <span><Send size={14} style={{marginRight: '8px'}} /> Envoyer à Make.com</span>}
                                </span>
                            </button>
                        </div>

                        {/* ─ Tab: Aperçu ─ */}
                        {activeTab === "preview" && (
                            <div className="pin-preview-tab">
                                <div className="pin-preview-container">
                                    <div className="pin-image-wrapper">
                                        {previewLoading && <div className="pin-image-loader">Génération…</div>}
                                        <iframe
                                            key={selectedPin.productId}
                                            src={selectedPin.imageUrl}
                                            title="Pinterest Pin Preview"
                                            className="pin-preview-iframe"
                                            onLoad={() => setPreviewLoading(false)}
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                    <div className="pin-meta-panel">
                                        <h4 className="pin-meta-label">Titre du Pin</h4>
                                        <div className="pin-text-box">
                                            <span className="pin-text-content">{selectedPin.title}</span>
                                            <button className="copy-btn" onClick={() => copyToClipboard(selectedPin.title, "title")}>
                                                {copied === "title" ? <CheckCircle size={14} color="#22c55e" /> : <Copy size={14} />}
                                            </button>
                                        </div>

                                        <h4 className="pin-meta-label">Description</h4>
                                        <div className="pin-text-box pin-text-multiline">
                                            <span className="pin-text-content">{selectedPin.description}</span>
                                            <button className="copy-btn" onClick={() => copyToClipboard(selectedPin.description, "desc")}>
                                                {copied === "desc" ? <CheckCircle size={14} color="#22c55e" /> : <Copy size={14} />}
                                            </button>
                                        </div>

                                        <h4 className="pin-meta-label">Hashtags</h4>
                                        <div className="pin-hashtags">
                                            {selectedPin.hashtags.map(h => (
                                                <span key={h} className="pin-hashtag">{h}</span>
                                            ))}
                                        </div>

                                        <h4 className="pin-meta-label">Lien affilié</h4>
                                        <div className="pin-text-box pin-link-box">
                                            <a href={selectedPin.link} target="_blank" rel="noopener noreferrer" className="pin-link-text">
                                                {selectedPin.link}
                                            </a>
                                            <ExternalLink size={14} className="pin-link-icon" />
                                        </div>

                                        <button
                                            className="btn btn-primary pin-dl-btn"
                                            disabled={!!publishing || batchPublishing}
                                            onClick={() => publishOne(selectedPin)}
                                        >
                                            {publishing === selectedPin.productId
                                                ? "⏳ Envoi en cours..."
                                                : "📌 Publier ce Pin sur Pinterest"}
                                        </button>

                                        <a
                                            href={selectedPin.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="pin-see-html"
                                        >
                                            🖼️ Voir le Pin HTML pleine taille →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─ Tab: Make.com ─ */}
                        {activeTab === "make" && (
                            <div className="pin-make-tab">
                                <div className="make-connected-banner">
                                    <span>🟢</span>
                                    <div>
                                        <strong>Webhook Make.com connecté !</strong>
                                        <p>Tu peux publier des Pins directement depuis cette interface ou automatiser avec un Cron dans Make.com</p>
                                    </div>
                                </div>

                                <div className="make-actions-grid">
                                    <div className="make-action-card">
                                        <div className="make-action-icon">⚡</div>
                                        <h4>Publier maintenant</h4>
                                        <p>Envoyer le Pin sélectionné à Pinterest via Make.com</p>
                                        <button
                                            className="btn btn-primary"
                                            disabled={!!publishing || batchPublishing}
                                            onClick={() => publishOne(selectedPin)}
                                        >
                                            {publishing === selectedPin.productId ? "Envoi..." : "Envoyer 1 Pin →"}
                                        </button>
                                    </div>
                                    <div className="make-action-card">
                                        <div className="make-action-icon">🚀</div>
                                        <h4>Batch — Top 5</h4>
                                        <p>Envoyer les 5 produits les plus populaires en une fois</p>
                                        <button
                                            className="btn btn-primary"
                                            disabled={!!publishing || batchPublishing}
                                            onClick={() => publishBatch(5)}
                                        >
                                            {batchPublishing ? "En cours..." : "Publier 5 Pins →"}
                                        </button>
                                    </div>
                                    <div className="make-action-card">
                                        <div className="make-action-icon">📅</div>
                                        <h4>Automatisation</h4>
                                        <p>Configure un Cron dans Make.com pour publier automatiquement chaque jour</p>
                                        <div className="make-cron-info">
                                            <code>POST /api/pinterest/publish?batch=5</code>
                                            <button className="copy-btn" onClick={() => copyToClipboard(`${typeof window !== "undefined" ? window.location.origin : ""}/api/pinterest/publish?batch=5`, "cron")}>
                                                {copied === "cron" ? <CheckCircle size={13} color="#22c55e" /> : <Copy size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="make-cron-guide">
                                    <h4>⏰ Automatiser 5 Pins/jour dans Make.com</h4>
                                    <ol>
                                        <li>Dans Make.com → Nouveau scénario</li>
                                        <li>Trigger : <strong>Clock</strong> → Tous les jours à <strong>10:00</strong></li>
                                        <li>Module : <strong>HTTP → Make a request</strong></li>
                                        <li>URL : <code>{typeof window !== "undefined" ? window.location.origin : "https://arganor.vercel.app"}/api/pinterest/publish?batch=5</code></li>
                                        <li>Méthode : <strong>POST</strong> → Sauvegarder → <strong>Activer le scénario</strong> ✅</li>
                                    </ol>
                                    <p className="make-cron-result">→ 5 Pins publiés automatiquement chaque matin, 7j/7, sans rien faire ! 🎉</p>
                                </div>
                            </div>
                        )}

                        {/* ─ Tab: CSV ─ */}
                        {activeTab === "csv" && (
                            <div className="pin-csv-tab">
                                <h3 className="csv-title">📋 Export CSV — Tailwind & Buffer</h3>
                                <p className="csv-desc">Importe en masse dans Tailwind App ou Buffer pour planifier tes pins.</p>
                                <div className="csv-tools">
                                    {[
                                        { icon: "🌟", name: "Tailwind App", desc: "SmartLoop republiera tes meilleurs pins automatiquement.", url: "https://www.tailwindapp.com" },
                                        { icon: "📢", name: "Buffer", desc: "Planifie tes pins à l'avance, analyse les performances.", url: "https://buffer.com" },
                                    ].map((t) => (
                                        <div key={t.name} className="csv-tool-card">
                                            <div className="csv-tool-logo">{t.icon}</div>
                                            <h4 className="csv-tool-name">{t.name}</h4>
                                            <p className="csv-tool-desc">{t.desc}</p>
                                            <a href={t.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline csv-tool-link">Visiter →</a>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-primary csv-dl-btn" onClick={downloadCSV}>
                                    <Download size={18} /> Télécharger les {pins.length} Pins en CSV
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                .pin-loading-state { display:flex;flex-direction:column;align-items:center;justify-content:center;height:400px;gap:16px;color:#888; }
                .pin-spinner { width:40px;height:40px;border:3px solid #eee;border-top-color:#e60023;border-radius:50%;animation:_spin .8s linear infinite; }
                .pin-mini-spinner { display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:currentColor;border-radius:50%;animation:_spin .7s linear infinite; }
                @keyframes _spin { to { transform:rotate(360deg); } }

                .pin-badge-live { background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:20px;font-size:12px;font-weight:600;margin-left:8px; }
                .pin-header-title { display:flex;align-items:center;gap:10px;font-size:22px;margin:0; }
                .pin-header-sub { color:#888;margin-top:4px;font-size:13px; }
                .pin-header-actions { display:flex;gap:10px;align-items:center; }
                .pin-action-btn { display:flex;align-items:center;gap:6px;font-size:13px; }

                .pin-stats-row { display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px; }
                .pin-stat-card { background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px; }
                .pin-stat-icon { font-size:26px; }
                .pin-stat-number { font-weight:800;font-size:17px; }
                .pin-stat-label { font-size:11px;color:#888;margin-top:2px; }

                .publish-log-box { background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:20px;overflow:hidden; }
                .publish-log-header { padding:12px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;background:#f9fafb; }
                .publish-log-items { padding:8px 0;max-height:160px;overflow-y:auto; }
                .publish-log-item { display:flex;align-items:center;gap:10px;padding:6px 16px;font-size:12px; }
                .publish-log-item.success { color:#16a34a; }
                .publish-log-item.error { color:#dc2626; }
                .log-dot { font-size:14px; }
                .log-name { flex:1;font-weight:500; }
                .log-resp { color:#888;font-size:11px; }

                .pinterest-main-layout { display:grid;grid-template-columns:280px 1fr;gap:20px;min-height:600px; }

                .pin-product-list { background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;display:flex;flex-direction:column; }
                .pin-list-header { padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between; }
                .pin-list-header h3 { font-size:12px;font-weight:700;margin:0; }
                .pin-list-hint { font-size:10px;color:#888; }
                .pin-list-items { overflow-y:auto;flex:1; }
                .pin-list-item { display:flex;align-items:center;gap:9px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f5f5f5;transition:background .15s; }
                .pin-list-item:hover { background:#fdf8f0; }
                .pin-list-item.active { background:#fdf8f0;border-left:3px solid #e60023; }
                .pin-list-thumb { width:38px;height:38px;border-radius:6px;object-fit:cover;flex-shrink:0; }
                .pin-list-info { flex:1;min-width:0; }
                .pin-list-name { font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px; }
                .pin-badge { background:#fdf8f0;border:1px solid #c9973a;color:#c9973a;padding:1px 7px;border-radius:20px;font-size:10px; }
                .pin-send-btn { background:none;border:1px solid #e60023;color:#e60023;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s; }
                .pin-send-btn:hover:not(:disabled) { background:#e60023;color:#fff; }
                .pin-send-btn:disabled { opacity:.4;cursor:not-allowed; }

                .pin-detail { background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;display:flex;flex-direction:column; }
                .pin-tabs { display:flex;align-items:center;border-bottom:1px solid #e5e7eb;padding:0 12px;gap:2px; }
                .pin-tab { padding:12px 16px;background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-size:13px;font-weight:600;color:#888;transition:all .15s; }
                .pin-tab.active { color:#e60023;border-bottom-color:#e60023; }
                .pin-tab-publish-btn { margin-left:auto;display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#e60023,#ff4458);color:#fff;border:none;padding:8px 16px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:700;transition:opacity .15s; }
                .pin-tab-publish-btn:hover:not(:disabled) { opacity:.85; }
                .pin-tab-publish-btn:disabled { opacity:.5;cursor:not-allowed; }

                .pin-preview-tab { padding:18px;overflow-y:auto; }
                .pin-preview-container { display:grid;grid-template-columns:240px 1fr;gap:18px; }
                .pin-image-wrapper { width:100%;aspect-ratio:2/3;border-radius:10px;overflow:hidden;background:#f3f3f3;position:relative; }
                .pin-image-loader { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#888; }
                .pin-preview-iframe { width:100%;height:100%;border:none; }
                .pin-meta-panel { display:flex;flex-direction:column;gap:8px; }
                .pin-meta-label { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888;margin:0;margin-top:4px; }
                .pin-text-box { background:#fdf8f0;border:1px solid #e5e7eb;border-radius:7px;padding:9px 12px;font-size:12px;display:flex;align-items:flex-start;gap:6px;line-height:1.5; }
                .pin-text-multiline .pin-text-content { white-space:pre-line; }
                .pin-text-content { flex:1; }
                .pin-link-box { align-items:center; }
                .pin-link-text { flex:1;color:#c9973a;text-decoration:none;font-size:11px;word-break:break-all; }
                .pin-link-icon { flex-shrink:0;color:#888; }
                .copy-btn { background:none;border:none;cursor:pointer;color:#888;padding:0;display:flex;flex-shrink:0; }
                .copy-btn:hover { color:#c9973a; }
                .pin-hashtags { display:flex;flex-wrap:wrap;gap:5px; }
                .pin-hashtag { background:#ffeef0;color:#e60023;border:1px solid #ffc0c8;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600; }
                .pin-dl-btn { display:block;text-align:center;margin-top:6px;width:100%;cursor:pointer; }
                .pin-see-html { display:block;text-align:center;font-size:12px;color:#888;margin-top:6px;text-decoration:none; }
                .pin-see-html:hover { color:#c9973a; }

                .pin-make-tab { padding:18px;overflow-y:auto;display:flex;flex-direction:column;gap:16px; }
                .make-connected-banner { display:flex;align-items:flex-start;gap:12px;background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:16px; }
                .make-connected-banner strong { display:block;margin-bottom:4px; }
                .make-connected-banner p { font-size:13px;color:#555;margin:0; }
                .make-actions-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:14px; }
                .make-action-card { border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center; }
                .make-action-icon { font-size:28px;margin-bottom:8px; }
                .make-action-card h4 { margin:0 0 6px;font-size:13px; }
                .make-action-card p { font-size:12px;color:#888;margin:0 0 12px;line-height:1.4; }
                .make-cron-info { display:flex;align-items:center;gap:8px;background:#f9fafb;border-radius:6px;padding:6px 10px;margin-top:8px;text-align:left; }
                .make-cron-info code { font-size:10px;flex:1;word-break:break-all; }
                .make-cron-guide { background:#fdf8f0;border:1px solid #c9973a33;border-radius:10px;padding:16px; }
                .make-cron-guide h4 { margin:0 0 10px;font-size:13px; }
                .make-cron-guide ol { margin:0;padding-left:18px; }
                .make-cron-guide li { font-size:12px;color:#555;margin-bottom:6px;line-height:1.5; }
                .make-cron-guide code { background:rgba(0,0,0,.06);padding:2px 6px;border-radius:4px;font-size:11px; }
                .make-cron-result { margin:10px 0 0;font-size:13px;color:#16a34a;font-weight:600; }

                .pin-csv-tab { padding:18px; }
                .csv-title { margin:0 0 6px; }
                .csv-desc { color:#888;font-size:13px;margin-bottom:16px; }
                .csv-tools { display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:16px; }
                .csv-tool-card { border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center; }
                .csv-tool-logo { font-size:30px;margin-bottom:6px; }
                .csv-tool-name { margin:0 0 6px;font-size:13px; }
                .csv-tool-desc { font-size:12px;color:#888;margin:0 0 10px;line-height:1.4; }
                .csv-tool-link { display:inline-block;font-size:12px;text-decoration:none; }
                .csv-dl-btn { display:flex;align-items:center;justify-content:center;gap:8px;width:100%; }

                .btn-outline { background:transparent;border:1px solid #c9973a;color:#c9973a;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:background .15s;text-decoration:none;display:inline-flex;align-items:center;gap:6px; }
                .btn-outline:hover { background:#fdf8f0; }
            `}</style>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { 
    Package, 
    FileText, 
    DollarSign, 
    TrendingUp, 
    Star, 
    Users, 
    Zap,
    PlusCircle,
    RefreshCw,
    CheckCircle
} from "lucide-react";

interface Stats {
    totalProducts: number;
    blogPosts: number;
    totalReviews: number;
    avgRating: string;
    revenue: string;
    clicks: number;
    isLive: boolean;
}

interface Activity {
    id: number;
    type: "sale" | "blog" | "pinterest" | "product";
    text: string;
    time: string;
    status: "success" | "info" | "warning";
}

export default function AdminDashboardClient() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [generatingStatus, setGeneratingStatus] = useState<{type: string, status: 'loading' | 'success' | 'error' | null, message: string}>({ type: '', status: null, message: '' });

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/stats");
            const data = await res.json();
            setStats(data);
            if (data.activities && data.activities.length > 0) {
                setActivities(data.activities);
            }
        } catch (err) {
            console.error("Failed to fetch stats", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleGenerate = async (type: 'product' | 'article' | 'pin') => {
        setGeneratingStatus({ type, status: 'loading', message: 'Génération en cours...' });
        try {
            const res = await fetch("/api/admin/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type })
            });
            const data = await res.json();
            
            if (data.success) {
                setGeneratingStatus({ type, status: 'success', message: data.message });
                // Rafraîchir les stats
                fetchStats();
                setTimeout(() => setGeneratingStatus({ type: '', status: null, message: '' }), 5000);
            } else {
                setGeneratingStatus({ type, status: 'error', message: "Erreur : " + data.error });
            }
        } catch (error) {
            setGeneratingStatus({ type, status: 'error', message: "Erreur inattendue" });
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Analyse des performances d'Arganor...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-home">
            <header className="page-header-admin">
                <div className="header-top">
                    <h1 className="dashboard-title">✨ Arganor Dashboard</h1>
                    <span className="live-badge">🚀 SITE EN LIGNE (Vercel)</span>
                </div>
                <p>Tableau de bord de performance et d'affiliation.</p>
            </header>

            <div className="stats-grid">
                {/* ── Revenue Estimation ── */}
                <div className="stat-card accent-card">
                    <div className="stat-header">
                        <div className="stat-icon-bg bg-gold"><DollarSign size={20} /></div>
                    </div>
                    <div className="stat-info-main">
                        <p className="stat-label">Revenus Estimés (Amazon)</p>
                        <h3 className="stat-number">{stats?.revenue || "0.00"}€</h3>
                        <p className="stat-sub">Basé sur les {stats?.clicks} clics réels</p>
                    </div>
                </div>

                {/* ── Total Products ── */}
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-bg bg-blue"><Package size={20} /></div>
                    </div>
                    <div className="stat-info-main">
                        <p className="stat-label">Catalogue Produits</p>
                        <h3 className="stat-number">{stats?.totalProducts || 0}</h3>
                        <p className="stat-sub">Tous actifs sur le site</p>
                    </div>
                </div>

                {/* ── Clicks Estimations ── */}
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-bg bg-green"><TrendingUp size={20} /></div>
                    </div>
                    <div className="stat-info-main">
                        <p className="stat-label">Clics affiliés cumulés</p>
                        <h3 className="stat-number">{stats?.clicks || 0}</h3>
                        <p className="stat-sub">Trafic réel converti</p>
                    </div>
                </div>

                {/* ── Social Proof ── */}
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon-bg bg-red"><Star size={20} /></div>
                    </div>
                    <div className="stat-info-main">
                        <p className="stat-label">Avis Clients Importés</p>
                        <h3 className="stat-number">{stats?.totalReviews?.toLocaleString() || 0}</h3>
                        <p className="stat-sub">Score moyen global : {stats?.avgRating || "4.5"}/5</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-main-content">
                {/* ── Recent Activity ── */}
                <div className="activity-panel">
                    <h2 className="panel-title">📋 Flux d'activité des clics</h2>
                    <div className="activity-list">
                        {activities.length > 0 ? activities.map((act, i) => (
                            <div key={i} className="activity-item-new">
                                <div className={`activity-dot ${act.status}`}></div>
                                <div className="activity-content">
                                    <p className="activity-text">{act.text}</p>
                                    <span className="activity-time">{act.time}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-muted" style={{fontSize: '12px', color: '#666'}}>Aucune activité récente. Les clics apparaîtront ici en temps réel.</p>
                        )}
                    </div>
                </div>

                {/* ── Meta Section & Generative Actions ── */}
                <div className="quick-stats-panel">
                    <h2 className="panel-title">🦾 Générateurs IA</h2>
                    
                    {generatingStatus.message ? (
                        <div className={`status-message ${generatingStatus.status || ''}`}>
                            {generatingStatus.status === 'loading' && <RefreshCw size={14} className="spin-icon" />}
                            {generatingStatus.status !== 'loading' && <CheckCircle size={14} />}
                            <span>{generatingStatus.message}</span>
                        </div>
                    ) : null}

                    <div className="quick-stats-inner" style={{marginTop: '15px'}}>
                        {/* Produit */}
                        <div className="mini-stat admin-generate-row">
                            <Package size={18} className="text-blue" />
                            <div className="mini-info" style={{flex: 1}}>
                                <strong>Générer de Nouveaux Produits</strong>
                                <p>Catalogue Luxe Complet (40)</p>
                            </div>
                            <button 
                                className="action-btn-small" 
                                disabled={generatingStatus.status === 'loading'}
                                onClick={() => handleGenerate('product')}
                            >
                                <PlusCircle size={16} /> Créer
                            </button>
                        </div>
                        
                        {/* Article */}
                        <div className="mini-stat admin-generate-row">
                            <FileText size={18} className="text-orange" />
                            <div className="mini-info" style={{flex: 1}}>
                                <strong>Générer un Nouvel Article</strong>
                                <p>Blogging SEO Autopilot</p>
                            </div>
                            <button 
                                className="action-btn-small" 
                                disabled={generatingStatus.status === 'loading'}
                                onClick={() => handleGenerate('article')}
                            >
                                <PlusCircle size={16} /> Créer
                            </button>
                        </div>

                        {/* Épingles Pinterest */}
                        <div className="mini-stat admin-generate-row">
                            <Zap size={18} className="text-green" />
                            <div className="mini-info" style={{flex: 1}}>
                                <strong>Générer de Nouvelles Épingles</strong>
                                <p>Création massive d'images Pinterest</p>
                            </div>
                            <button 
                                className="action-btn-small" 
                                disabled={generatingStatus.status === 'loading'}
                                onClick={() => handleGenerate('pin')}
                            >
                                <PlusCircle size={16} /> Créer
                            </button>
                        </div>
                    </div>
                    
                    <div className="dashboard-cta" style={{marginTop: '25px'}}>
                        <button className="btn btn-primary w-full" onClick={() => window.location.href='/admin/pinterest'}>
                            Gérer les Pins Pinterest →
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .dashboard-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 15px; }
                .spinner { width: 30px; height: 30px; border: 3px solid #eee; border-top-color: #c9973a; border-radius: 50%; animation: spin 0.8s linear infinite; }
                .spin-icon { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                .live-badge { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-left: 10px; border: 1px solid #bdf2cc; }
                .dashboard-title { display: inline-flex; align-items: center; margin: 0; }

                .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 25px 0; }
                .stat-card { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e5e5e5; position: relative; transition: all 0.2s; }
                .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
                .accent-card { background: linear-gradient(135deg, #fff, #fefce8); border-color: #fde047; }
                .stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .stat-icon-bg { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
                .bg-gold { background: #fef9c3; color: #854d0e; }
                .bg-blue { background: #dbeafe; color: #1e40af; }
                .bg-green { background: #dcfce7; color: #15803d; }
                .bg-red { background: #fee2e2; color: #991b1b; }
                
                .stat-info-main { display: flex; flex-direction: column; }
                .stat-label { font-size: 12px; color: #666; margin: 0 0 5px 0; font-weight: 500; }
                .stat-number { font-size: 24px; font-weight: 800; margin: 0; color: #111; }
                .stat-sub { font-size: 11px; color: #999; margin: 5px 0 0 0; }

                .dashboard-main-content { display: grid; grid-template-columns: 1fr 350px; gap: 20px; }
                .panel-title { font-size: 14px; font-weight: 700; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; color: #333; }
                
                .activity-panel { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e5e5e5; }
                .activity-list { display: flex; flex-direction: column; gap: 15px; }
                .activity-item-new { display: flex; gap: 12px; align-items: flex-start; }
                .activity-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
                .activity-dot.success { background: #16a34a; box-shadow: 0 0 10px rgba(22,163,74,0.3); }
                .activity-dot.info { background: #3b82f6; box-shadow: 0 0 10px rgba(59,130,246,0.3); }
                .activity-content { flex: 1; }
                .activity-text { font-size: 13px; color: #111; margin: 0; line-height: 1.4; font-weight: 500; }
                .activity-time { font-size: 11px; color: #999; }

                .quick-stats-panel { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e5e5e5; }
                .quick-stats-inner { display: flex; flex-direction: column; gap: 15px; }
                
                .admin-generate-row { display: flex; align-items: center; gap: 15px; justify-content: space-between; }
                .mini-stat { padding: 12px; background: #fafafa; border-radius: 8px; border: 1px solid #eee; transition: all 0.2s; }
                .mini-stat:hover { border-color: #ddd; background: #fdfdfd; }
                .mini-info strong { display: block; font-size: 13px; color: #222; margin-bottom: 2px; }
                .mini-info p { font-size: 11px; color: #777; margin: 0; }
                
                .text-orange { color: #ea580c; }
                .text-blue { color: #2563eb; }
                .text-green { color: #16a34a; }

                .action-btn-small { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #ddd; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: #444; transition: all 0.2s; }
                .action-btn-small:hover:not(:disabled) { background: #f5f5f5; border-color: #ccc; }
                .action-btn-small:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .status-message { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-bottom: 15px; transition: all 0.3s ease; }
                .status-message.loading { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
                .status-message.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
                .status-message.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

                .btn-primary { background: linear-gradient(135deg, #111, #333); color: #fff; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; }
                .w-full { width: 100%; }
            `}</style>
        </div>
    );
}

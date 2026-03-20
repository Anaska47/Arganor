import { Package, FileText, DollarSign, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
    return (
        <div className="dashboard-home">
            <header className="page-header-admin">
                <h1>Dashboard Overview</h1>
                <p>Welcome back, Admin.</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <h3>Total Revenue</h3>
                        <p>$12,450.00</p>
                        <span className="stat-trend up">+15% this month</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><Package size={24} /></div>
                    <div className="stat-info">
                        <h3>Active Products</h3>
                        <p>124</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>Clicks</h3>
                        <p>8,540</p>
                        <span className="stat-trend up">+5% this week</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><FileText size={24} /></div>
                    <div className="stat-info">
                        <h3>Blog Posts</h3>
                        <p>12</p>
                    </div>
                </div>
            </div>

            <div className="recent-activity">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                    <div className="activity-item">
                        <span className="dot green"></span>
                        <p>New sale generated from <strong>Pure Radiance Argan Oil</strong></p>
                        <span className="time">2 mins ago</span>
                    </div>
                    <div className="activity-item">
                        <span className="dot blue"></span>
                        <p>New blog post published: <strong>Anti-Aging Secrets</strong></p>
                        <span className="time">1 hour ago</span>
                    </div>
                    <div className="activity-item">
                        <span className="dot yellow"></span>
                        <p>Product &quot;Velvet Night Cream&quot; low stock alert</p>
                        <span className="time">3 hours ago</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

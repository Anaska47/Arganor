import Link from "next/link";
import { LayoutDashboard, Package, FileText, Settings, LogOut, Pin } from "lucide-react";

export const metadata = {
    title: "Admin Dashboard | Arganor",
    description: "Manage your affiliate business.",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-logo">ARGANOR <span className="admin-badge">Admin</span></div>
                <nav className="admin-nav">
                    <Link href="/admin" className="admin-link">
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>
                    <Link href="/admin/products" className="admin-link">
                        <Package size={20} /> Products
                    </Link>
                    <Link href="/admin/blog" className="admin-link">
                        <FileText size={20} /> Blog
                    </Link>
                    <Link href="/admin/pinterest" className="admin-link" style={{ color: '#e60023' }}>
                        <Pin size={20} /> Pinterest 📌
                    </Link>
                    <Link href="/admin/settings" className="admin-link">
                        <Settings size={20} /> Settings
                    </Link>
                </nav>
                <div className="admin-footer">
                    <button className="logout-btn">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>
            <main className="admin-content">
                {children}
            </main>
        </div>
    );
}

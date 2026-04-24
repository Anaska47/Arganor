import type { Metadata } from "next";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arganor | Routines beaute et selections produits",
  description: "Selections produits, contenus SEO et routines beaute autour du visage, des cheveux et du corps.",
  verification: {
    google: "wnL49Tuf54VQIr6HH6XVw5pLTpq9O8rs8da7eEf401g",
    other: {
      "p:domain_verify": "118ca06797a8f693394f2588a1429a15"
    }
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SiteAnalytics />
        {children}
      </body>
    </html>
  );
}

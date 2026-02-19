import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ML Stock Simulator",
  description:
    "Compare baseline ML models on 10 years of monthly data. Explore 6-month and 12-month return forecasts with bearish, stable, and bullish scenarios.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="relative">
          {/* Ambient background glow */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[120px]" />
            <div className="absolute -bottom-40 right-0 h-[400px] w-[600px] rounded-full bg-accent/[0.05] blur-[100px]" />
          </div>
          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}

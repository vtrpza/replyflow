import "@/instrument";
import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider, ModalProvider } from "@/components/ui";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "ReplyFlow — Outreach pipeline for devs who take ownership",
  description:
    "Track leads, draft emails, send, follow up, and measure replies — in one place.",
  openGraph: {
    title: "ReplyFlow",
    description: "Outreach pipeline for devs who take ownership.",
    images: [
      {
        url: "/brand/replyflow/replyflow-og.png",
        width: 1200,
        height: 630,
        alt: "ReplyFlow",
      },
    ],
  },
  icons: {
    icon: [
      {
        url: "/brand/replyflow/favicons/replyflow-icon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/replyflow/favicons/replyflow-icon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: {
      url: "/brand/replyflow/favicons/replyflow-icon-180.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased">
        <Providers>
          <ToastProvider>
            <ModalProvider>
              {children}
            </ModalProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}

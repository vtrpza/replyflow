import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ToastProvider, ModalProvider } from "@/components/ui";
import { Providers } from "@/components/providers";
import { RedditPixel } from "@/components/reddit-pixel";
import { Instrument_Serif } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { IBM_Plex_Sans } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-display",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans-display",
  display: "swap",
});

type Locale = "pt-BR" | "en";

function getLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return "en";

  const locales = acceptLanguage.split(",").map((lang) => lang.split(";")[0].trim().toLowerCase());

  for (const locale of locales) {
    if (locale.startsWith("pt")) return "pt-BR";
    if (locale.startsWith("en")) return "en";
  }

  return "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const locale = getLocaleFromAcceptLanguage(acceptLanguage);

  const titles: Record<Locale, { title: string; description: string }> = {
    "pt-BR": {
      title: "ReplyFlow — Um pipeline para toda sua busca de emprego",
      description: "Vagas, etapas de ATS, contatos de recrutadores e follow-ups em um lugar só. Grátis durante o pré-lançamento.",
    },
    en: {
      title: "ReplyFlow — One pipeline for your entire job search",
      description: "Jobs, ATS stages, recruiter contacts, and follow-ups in one place. Free during pre-release.",
    },
  };

  const { title, description } = titles[locale];

  return {
    metadataBase: new URL("https://replyflow.fly.dev"),
    title,
    description,
    openGraph: {
      title: "ReplyFlow",
      description: "One pipeline for jobs, contacts, and follow-ups. Free for early adopters.",
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`antialiased ${instrumentSerif.variable} ${jetbrainsMono.variable} ${ibmPlexSans.variable}`}>
        <Providers>
          <RedditPixel />
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

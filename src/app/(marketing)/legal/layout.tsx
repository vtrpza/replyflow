import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  return (
    <div className="min-h-screen bg-[var(--rf-bg)] text-[var(--rf-text)]">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--rf-border)] bg-[var(--rf-bg)]/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-semibold text-sm tracking-tight text-white">
              Reply<span className="text-[var(--rf-green)]">Flow</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-[var(--rf-muted)] hover:text-white transition-colors"
          >
            {isPt ? "Voltar ao inicio" : "Back to home"}
          </Link>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>

      <footer className="border-t border-[var(--rf-border)] py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-zinc-600 font-mono">
            &copy; {new Date().getFullYear()} ReplyFlow.{" "}
            {isPt ? "Todos os direitos reservados." : "All rights reserved."}
          </p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useI18n } from "@/lib/i18n";

interface LanguageSwitchProps {
  variant?: "fixed" | "inline";
}

export function LanguageSwitch({ variant = "fixed" }: LanguageSwitchProps) {
  const { locale, setLocale, t } = useI18n();

  const inlineStyles = "flex items-center gap-1 rounded-lg border border-[var(--rf-border)] bg-[var(--rf-surface)] px-2 py-1";
  const fixedStyles = "fixed right-4 top-4 z-[80] flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/90 px-2 py-1.5 backdrop-blur-md";

  const containerClass = variant === "inline" ? inlineStyles : fixedStyles;

  return (
    <div className={containerClass}>
      {variant === "fixed" && (
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-400">
          {t("language.switch")}
        </span>
      )}
      <button
        type="button"
        onClick={() => setLocale("pt-BR")}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          locale === "pt-BR"
            ? "bg-emerald-600 text-white"
            : "text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        {t("language.pt")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          locale === "en"
            ? "bg-emerald-600 text-white"
            : "text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        {t("language.en")}
      </button>
    </div>
  );
}

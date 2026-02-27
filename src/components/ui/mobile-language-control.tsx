"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function MobileLanguageControl(): ReactElement {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isPt = locale === "pt-BR";

  const closeSheet = useCallback((): void => {
    setIsOpen(false);
    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button,[href],[tabindex]:not([tabindex="-1"])'
    );

    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }

      if (event.key !== "Tab" || !focusable || focusable.length === 0) {
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeSheet, isOpen]);

  const handleLocaleSelect = useCallback(
    (nextLocale: "pt-BR" | "en"): void => {
      setLocale(nextLocale);
      closeSheet();
    },
    [closeSheet, setLocale]
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={isPt ? "Alterar idioma" : "Change language"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="sm:hidden fixed right-3 z-50 inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-[var(--rf-border)] bg-[var(--rf-surface)]/95 px-2.5 text-xs font-semibold text-[var(--rf-text)] backdrop-blur-md"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <Globe className="h-3.5 w-3.5 text-[var(--rf-muted)]" />
        <span>{isPt ? "PT" : "EN"}</span>
      </button>

      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label={isPt ? "Fechar seletor de idioma" : "Close language selector"}
            className="absolute inset-0 bg-black/55"
            onClick={closeSheet}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-[var(--rf-border)] bg-[var(--rf-surface)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-600" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-sm font-semibold text-white">
                  {isPt ? "Idioma" : "Language"}
                </h2>
                <p className="text-xs text-[var(--rf-muted)]">
                  {isPt ? "Aplicado em todo o site" : "Applied site-wide"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSheet}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--rf-muted)] hover:bg-zinc-800 hover:text-white"
              >
                {isPt ? "Fechar" : "Close"}
              </button>
            </div>

            <div role="radiogroup" aria-label={isPt ? "Escolher idioma" : "Choose language"} className="grid gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={locale === "pt-BR"}
                onClick={() => handleLocaleSelect("pt-BR")}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  locale === "pt-BR"
                    ? "border-emerald-500/70 bg-emerald-500/10 text-white"
                    : "border-[var(--rf-border)] text-[var(--rf-muted)] hover:border-zinc-500 hover:text-white"
                }`}
              >
                <span className="text-sm font-medium">Portugues (Brasil)</span>
                <span className="text-xs font-mono uppercase">PT</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={locale === "en"}
                onClick={() => handleLocaleSelect("en")}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  locale === "en"
                    ? "border-emerald-500/70 bg-emerald-500/10 text-white"
                    : "border-[var(--rf-border)] text-[var(--rf-muted)] hover:border-zinc-500 hover:text-white"
                }`}
              >
                <span className="text-sm font-medium">English</span>
                <span className="text-xs font-mono uppercase">EN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

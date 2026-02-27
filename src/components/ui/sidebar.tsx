"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const navItems = [
  {
    href: "/app",
    labelKey: "sidebar.nav.dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/app/jobs",
    labelKey: "sidebar.nav.jobs",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/app/sources",
    labelKey: "sidebar.nav.sources",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5m14 14H5" />
      </svg>
    ),
  },
  {
    href: "/app/compose",
    labelKey: "sidebar.nav.compose",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: "/app/history",
    labelKey: "sidebar.nav.history",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/app/contacts",
    labelKey: "sidebar.nav.contacts",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-8 0v2m8 0H9m8-9a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: "/app/outreach",
    labelKey: "sidebar.nav.outreach",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/app/settings",
    labelKey: "sidebar.nav.settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");

  return (
    <aside
      className="hidden md:flex w-64 flex-col border-r backdrop-blur-md"
      style={{
        background: "rgba(11, 15, 20, 0.92)",
        borderColor: "var(--rf-border)",
      }}
    >
      <div className="p-6 border-b" style={{ borderColor: "var(--rf-border)" }}>
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--rf-muted)] font-mono mb-3">
          {t("sidebar.operatorPanel")}
        </p>
        <Link href="/app" className="flex items-center gap-3">
          <div className="relative">
            <Image
              src="/brand/replyflow/replyflow-icon.png"
              alt="ReplyFlow"
              width={30}
              height={30}
              className="rounded-md"
            />
            <span className="absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full border border-[var(--rf-bg)] bg-[var(--rf-green)] animate-pulse" />
          </div>
          <div>
            <p className="text-[19px] leading-none font-bold text-white tracking-tight">
              Reply<span style={{ color: "var(--rf-green)" }}>Flow</span>
            </p>
            <p className="text-[11px] text-[var(--rf-muted)] font-mono mt-1">
              {t("sidebar.outreachPipeline")}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono">
          {t("sidebar.navigation")}
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                isActive
                  ? "text-white"
                  : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/70"
              }`}
              style={
                isActive
                  ? {
                      borderColor: "rgba(56, 189, 248, 0.25)",
                      background:
                        "linear-gradient(90deg, rgba(56, 189, 248, 0.18) 0%, rgba(34, 197, 94, 0.14) 100%)",
                    }
                  : undefined
              }
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-sm bg-[var(--rf-cyan)]" />
              )}
              {item.icon}
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: "var(--rf-border)" }}>
        <p className="px-1 mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--rf-muted)] font-mono">
          {t("sidebar.quickAction")}
        </p>
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: syncStatus === "error"
              ? "var(--rf-red)"
              : syncStatus === "success"
              ? "var(--rf-green)"
              : "var(--rf-gradient)",
          }}
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            setSyncStatus("idle");
            setSyncMessage("");
            try {
              const res = await fetch("/api/sync", { method: "POST" });
              const data = await res.json();
                if (res.ok) {
                  setSyncStatus("success");
                  const count = data.totalNewJobs || 0;
                  setSyncMessage(
                    count > 0
                      ? t("sidebar.newJobsFound", { count })
                      : t("sidebar.alreadyUpToDate")
                  );
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500);
                } else {
                  setSyncStatus("error");
                  setSyncMessage(data.error || t("sidebar.syncFailed"));
                }
              } catch (err) {
                setSyncStatus("error");
                setSyncMessage(
                  err instanceof Error ? err.message : t("sidebar.unknownError")
                );
              } finally {
                setSyncing(false);
              }
          }}
        >
          {syncing ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : syncStatus === "success" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : syncStatus === "error" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {syncMessage || (syncing ? t("sidebar.syncing") : t("sidebar.syncJobs"))}
        </button>
      </div>
    </aside>
  );
}

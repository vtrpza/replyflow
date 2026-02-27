"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

export function MobileTopBar() {
  const { t } = useI18n();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus("idle");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus("success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncStatus("error");
        console.error(data.error);
      }
    } catch {
      setSyncStatus("error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header
      className="sticky top-0 z-40 md:hidden flex items-center justify-between h-12 px-4 border-b backdrop-blur-md"
      style={{
        background: "rgba(11, 15, 20, 0.95)",
        borderColor: "var(--rf-border)",
      }}
    >
      <Link href="/app" className="flex items-center gap-2">
        <Image
          src="/brand/replyflow/replyflow-icon.png"
          alt="ReplyFlow"
          width={22}
          height={22}
          className="rounded-sm"
        />
        <span className="text-sm font-bold text-white tracking-tight">
          Reply<span style={{ color: "var(--rf-green)" }}>Flow</span>
        </span>
      </Link>

      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
        style={{
          background: syncStatus === "error"
            ? "var(--rf-red)"
            : syncStatus === "success"
            ? "var(--rf-green)"
            : "var(--rf-gradient)",
        }}
      >
        {syncing ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : syncStatus === "success" ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        {syncing ? t("sidebar.syncing") : t("sidebar.syncJobs")}
      </button>
    </header>
  );
}

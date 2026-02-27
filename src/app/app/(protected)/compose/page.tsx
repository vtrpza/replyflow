"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast, LoadingButton } from "@/components/ui";
import { Send, Mail, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  BILLING_UPGRADE_ROUTE,
  formatLimit,
  getMonthlyResetLabel,
  getUpgradeMessage,
  usePlanSnapshot,
} from "@/lib/plan/client";

interface ConnectedAccount {
  id: string;
  provider: string;
  emailAddress: string;
  isDefault: boolean;
}

export default function ComposePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t, locale } = useI18n();
  const isPt = locale === "pt-BR";
  const { snapshot, refresh } = usePlanSnapshot();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [sending, setSending] = useState(false);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/app/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const toParam = searchParams.get("to");
    const subjectParam = searchParams.get("subject");
    if (toParam) setTo(toParam);
    if (subjectParam) setSubject(subjectParam);
  }, [searchParams]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/accounts")
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setAccounts(data.accounts || []);
            const defaultAccount = data.accounts?.find((a: ConnectedAccount) => a.isDefault);
            if (defaultAccount) {
              setAccountId(defaultAccount.id);
            } else if (data.accounts?.length > 0) {
              setAccountId(data.accounts[0].id);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingAccounts(false));
    }
  }, [session]);

  const handleSend = async () => {
    if (!to || !subject) {
      toast.error(t("compose.fillRecipientSubject"));
      return;
    }

    if (!accountId) {
      toast.error(t("compose.connectAccountFirst"));
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          bodyHtml,
          bodyText: bodyText || bodyHtml.replace(/<[^>]*>/g, ""),
          accountId,
        }),
      });
      const data = await res.json();

      if (res.status === 402 && data?.error === "upgrade_required") {
        toast.error(getUpgradeMessage(data, isPt));
        router.push(BILLING_UPGRADE_ROUTE);
        return;
      }

      if (data.success) {
        toast.success(t("compose.emailSent"));
        void refresh();
        setTo("");
        setSubject("");
        setBodyHtml("");
        setBodyText("");
      } else {
        toast.error(t("compose.sendFailed", { error: data.error }));
      }
    } catch {
      toast.error(t("compose.sendFailedGeneric"));
    } finally {
      setSending(false);
    }
  };

  if (status === "loading" || loadingAccounts) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-zinc-800 rounded" />
          <div className="h-64 bg-zinc-900 rounded-lg" />
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
          <h2 className="text-xl font-semibold text-zinc-200 mb-2">
            {t("compose.noAccountTitle")}
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            {t("compose.noAccountDescription")}
          </p>
          <button
            onClick={() => router.push("/app/settings")}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            {t("compose.goToSettings")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t("compose.title")}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {t("compose.subtitle")}
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-zinc-300">
            {isPt ? "Envios no ciclo atual" : "Sends in current cycle"}:{" "}
            <span className="font-medium text-zinc-100">
              {snapshot?.usage.sendsUsed ?? 0} / {formatLimit(snapshot?.limits.sends, isPt)}
            </span>
          </p>
          <p className="text-xs text-zinc-500">
            {getMonthlyResetLabel(snapshot?.usage.periodStart, isPt)}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">{t("compose.from")}</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.emailAddress}
                {account.isDefault ? t("compose.default") : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">{t("compose.to")}</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">{t("compose.subject")}</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("compose.emailSubject")}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            {t("compose.bodyHtml")}
          </label>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="<p>Your email body...</p>"
            rows={10}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            {t("compose.plainText")}
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={t("compose.plainTextPlaceholder")}
            rows={4}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <LoadingButton
            onClick={handleSend}
            loading={sending}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            <Send className="w-4 h-4 mr-2" />
            {t("compose.sendEmail")}
          </LoadingButton>
        </div>
      </div>

      <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500">
            {t("compose.permissionsHint")}
          </p>
        </div>
      </div>
    </div>
  );
}

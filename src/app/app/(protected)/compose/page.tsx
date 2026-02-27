"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast, LoadingButton } from "@/components/ui";
import { Send, Mail, AlertCircle } from "lucide-react";

interface ConnectedAccount {
  id: string;
  provider: string;
  emailAddress: string;
  isDefault: boolean;
}

export default function ComposePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();

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
      toast.error("Please fill in recipient and subject");
      return;
    }

    if (!accountId) {
      toast.error("Please connect an email account first");
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
        toast.error("Send limit reached. Upgrade to Pro in Settings.");
        router.push("/app/settings");
        return;
      }

      if (data.success) {
        toast.success("Email sent successfully!");
        setTo("");
        setSubject("");
        setBodyHtml("");
        setBodyText("");
      } else {
        toast.error(`Failed: ${data.error}`);
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (status === "loading" || loadingAccounts) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-zinc-800 rounded" />
          <div className="h-64 bg-zinc-900 rounded-lg" />
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-8 max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
          <h2 className="text-xl font-semibold text-zinc-200 mb-2">
            No Email Account Connected
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Connect your Gmail account in Settings to start sending emails.
          </p>
          <button
            onClick={() => router.push("/app/settings")}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Compose Email</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Send an email from your connected Gmail account
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">From</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.emailAddress}
                {account.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">To</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Body (HTML)
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
            Plain Text (optional - auto-generated from HTML if empty)
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Plain text version..."
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
            Send Email
          </LoadingButton>
        </div>
      </div>

      <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500">
            Emails will be sent through your connected Gmail account. Make sure you
            have granted the necessary permissions in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

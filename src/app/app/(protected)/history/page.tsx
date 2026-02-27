"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast, Skeleton, EmptyState } from "@/components/ui";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface EmailRecord {
  id: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  status: string;
  provider: string;
  providerMessageId: string | null;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
  errorCode: string | null;
  errorMessage: string | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  queued: { icon: Clock, color: "text-yellow-400", label: "Queued" },
  sent: { icon: CheckCircle, color: "text-green-400", label: "Sent" },
  failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
};

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (filter) params.set("status", filter);

      const res = await fetch(`/api/emails/history?${params}`);
      const data = await res.json();

      if (!data.error) {
        setEmails(data.emails || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/app/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchEmails();
    }
  }, [session, filter, fetchEmails]);

  if (status === "loading" || loading) {
    return (
      <div className="p-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Email History</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total} emails {filter ? `(${filter})` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              !filter
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("sent")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "sent"
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "failed"
                ? "bg-red-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {emails.length === 0 ? (
        <EmptyState
          title="No emails sent yet"
          message="Go to the Compose page to send your first email."
          action={{
            label: "Compose Email",
            onClick: () => router.push("/app/compose"),
          }}
        />
      ) : (
        <div className="space-y-2">
          {emails.map((email) => {
            const config = STATUS_CONFIG[email.status] || STATUS_CONFIG.queued;
            const StatusIcon = config.icon;

            return (
              <div
                key={email.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`w-4 h-4 ${config.color}`} />
                      <span className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        via {email.provider}
                      </span>
                    </div>

                    <h3 className="text-sm font-medium text-zinc-200 truncate">
                      {email.subject}
                    </h3>

                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                      <span>To: {email.recipientEmail}</span>
                      <span>From: {email.senderEmail}</span>
                    </div>

                    {email.sentAt && (
                      <p className="text-xs text-zinc-600 mt-1">
                        Sent: {new Date(email.sentAt).toLocaleString()}
                      </p>
                    )}

                    {email.errorMessage && (
                      <div className="mt-2 p-2 bg-red-900/20 border border-red-900/30 rounded text-xs text-red-400">
                        <div className="flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{email.errorMessage}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

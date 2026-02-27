"use client";

import { useEffect, useState, useRef } from "react";
import {
  useToast,
  SkeletonList,
  EmptyState,
} from "@/components/ui";

interface ConnectedAccount {
  id: string;
  emailAddress: string;
  isDefault: boolean;
}

interface OutreachRecord {
  id: string;
  jobId: string;
  status: string;
  emailSubject: string | null;
  emailBody: string | null;
  sentAt: string | null;
  followedUpAt: string | null;
  repliedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    title: string;
    company: string | null;
    issueUrl: string;
    repoFullName: string;
    contactEmail: string | null;
    contactLinkedin: string | null;
  };
}

const STATUS_FLOW = [
  "email_drafted",
  "email_sent",
  "followed_up",
  "replied",
  "interviewing",
  "accepted",
  "rejected",
];

const STATUS_COLORS: Record<string, string> = {
  email_drafted: "bg-yellow-500/10 text-yellow-400",
  email_sent: "bg-blue-500/10 text-blue-400",
  followed_up: "bg-cyan-500/10 text-cyan-400",
  replied: "bg-green-500/10 text-green-400",
  interviewing: "bg-purple-500/10 text-purple-400",
  accepted: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
};

export default function OutreachPage() {
  const toast = useToast();
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [sheetRecord, setSheetRecord] = useState<OutreachRecord | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  
  const [sheetForm, setSheetForm] = useState({
    to: "",
    from: "",
    subject: "",
    body: "",
    attachCV: "" as "" | "en" | "br",
  });
  
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/outreach");
      if (!res.ok) throw new Error("Failed to fetch records");
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch records");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch {
      // Silently fail - accounts are optional
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchAccounts();
    
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("open");
    if (openId) {
      const record = records.find(r => r.id === openId);
      if (record) {
        setTimeout(() => openSheet(record), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Status updated");
      fetchRecords();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openSheet = (record: OutreachRecord) => {
    setSheetRecord(record);
    setSheetForm({
      to: record.job.contactEmail && record.job.contactEmail !== "***" ? record.job.contactEmail : "",
      from: accounts.find(a => a.isDefault)?.id || accounts[0]?.id || "",
      subject: record.emailSubject || "",
      body: record.emailBody || "",
      attachCV: "",
    });
  };

  const closeSheet = () => {
    setSheetRecord(null);
    setSheetForm({ to: "", from: "", subject: "", body: "", attachCV: "" });
  };

  const saveDraft = async () => {
    if (!sheetRecord) return;
    setSheetLoading(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sheetRecord.id,
          emailSubject: sheetForm.subject,
          emailBody: sheetForm.body,
        }),
      });
      if (!res.ok) throw new Error("Failed to save draft");
      toast.success("Draft saved");
      fetchRecords();
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSheetLoading(false);
    }
  };

  const sendNow = async () => {
    if (!sheetRecord) return;
    setSheetLoading(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sheetRecord.id,
          toEmailOverride: sheetForm.to,
          attachCV: sheetForm.attachCV || undefined,
          accountId: sheetForm.from || undefined,
          emailSubject: sheetForm.subject,
          emailBody: sheetForm.body,
        }),
      });
      const data = await res.json();
      if (res.status === 402 && data?.error === "upgrade_required") {
        toast.error("Send limit reached. Upgrade to Pro in Settings.");
        window.location.href = "/app/settings";
        return;
      }
      if (data.success) {
        toast.success(`Email sent!${data.attachedCV ? ` Attached: ${data.attachedCV} CV` : ""}`);
        fetchRecords();
        closeSheet();
      } else {
        toast.error(`Failed to send: ${data.error}`);
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSheetLoading(false);
    }
  };

  const getNextStatus = (current: string): string | null => {
    const idx = STATUS_FLOW.indexOf(current);
    if (idx >= 0 && idx < STATUS_FLOW.length - 2) {
      return STATUS_FLOW[idx + 1];
    }
    return null;
  };

  // Group by status for pipeline view
  const grouped = STATUS_FLOW.reduce(
    (acc, status) => {
      acc[status] = records.filter((r) => r.status === status);
      return acc;
    },
    {} as Record<string, OutreachRecord[]>
  );

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Outreach Pipeline</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {records.length} outreach records
          </p>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {STATUS_FLOW.map((status) => (
          <div
            key={status}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${STATUS_COLORS[status] || "bg-zinc-800 text-zinc-400"}`}
          >
            {status.replace(/_/g, " ")}
            <span className="ml-2 font-bold">
              {grouped[status]?.length || 0}
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No outreach records yet"
          message='Go to the Jobs page and click "Draft Email" on a job to get started.'
        />
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div
              key={record.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[record.status] || "bg-zinc-800 text-zinc-400"}`}
                      >
                        {record.status.replace(/_/g, " ")}
                      </span>
                      <a
                        href={record.job.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-zinc-200 hover:text-emerald-400 truncate"
                      >
                        {record.job.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      {record.job.company && (
                        <span>{record.job.company}</span>
                      )}
                      <span>{record.job.repoFullName}</span>
                      {record.job.contactEmail && record.job.contactEmail !== "***" && (
                        <span className="text-zinc-400">
                          {record.job.contactEmail}
                        </span>
                      )}
                      <span>
                        Created: {new Date(record.createdAt).toLocaleDateString()}
                      </span>
                      {record.sentAt && (
                        <span>
                          Sent: {new Date(record.sentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                      onClick={() =>
                        setExpandedRecord(
                          expandedRecord === record.id ? null : record.id
                        )
                      }
                      className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedRecord === record.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                      </svg>
                    </button>
                    {getNextStatus(record.status) && (
                      <button
                        onClick={() =>
                          updateStatus(
                            record.id,
                            getNextStatus(record.status)!
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                      >
                        Mark as{" "}
                        {getNextStatus(record.status)!.replace(/_/g, " ")}
                      </button>
                    )}
                    {record.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(record.id, "rejected")}
                        className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded: Email Preview */}
              {expandedRecord === record.id && (
                <div className="border-t border-zinc-800 p-4">
                  {record.emailSubject && (
                    <div className="mb-3">
                      <span className="text-xs text-zinc-500">Subject:</span>
                      <p className="text-sm text-zinc-200 font-medium">
                        {record.emailSubject}
                      </p>
                    </div>
                  )}
                  {record.emailBody && (
                    <div className="bg-zinc-950 rounded-lg p-4">
                      <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">
                        {record.emailBody}
                      </pre>
                    </div>
                  )}
                  {record.job.contactEmail && record.job.contactEmail !== "***" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => openSheet(record)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Edit & Send
                      </button>
                      <a
                        href={`mailto:${record.job.contactEmail}?subject=${encodeURIComponent(record.emailSubject || "")}&body=${encodeURIComponent(record.emailBody || "")}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open in mail client
                      </a>
                    </div>
                  )}
                  {record.notes && (
                    <div className="mt-3 p-3 bg-zinc-800 rounded text-sm text-zinc-400">
                      <span className="text-xs text-zinc-500">Notes:</span>
                      <p>{record.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Operator Sheet */}
      {sheetRecord && (
        <OperatorSheet
          open={!!sheetRecord}
          onClose={closeSheet}
          form={sheetForm}
          setForm={setSheetForm}
          onSaveDraft={saveDraft}
          onSend={sendNow}
          loading={sheetLoading}
          accounts={accounts}
        />
      )}
    </div>
  );
}

interface OperatorSheetProps {
  open: boolean;
  onClose: () => void;
  form: {
    to: string;
    from: string;
    subject: string;
    body: string;
    attachCV: "" | "en" | "br";
  };
  setForm: React.Dispatch<React.SetStateAction<{
    to: string;
    from: string;
    subject: string;
    body: string;
    attachCV: "" | "en" | "br";
  }>>;
  onSaveDraft: () => void;
  onSend: () => void;
  loading: boolean;
  accounts: ConnectedAccount[];
}

function OperatorSheet({
  open,
  onClose,
  form,
  setForm,
  onSaveDraft,
  onSend,
  loading,
  accounts,
}: OperatorSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      const firstInput = sheetRef.current?.querySelector("input, textarea, select");
      if (firstInput) setTimeout(() => (firstInput as HTMLElement).focus(), 50);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const isGenericEmail = /^(talents|rh|recrutamento|jobs|carreiras|vagas|contato|faleconosco|atendimento|suporte)@/i.test(form.to);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative w-full max-w-xl h-full bg-[var(--rf-surface)] border-l border-[var(--rf-border)] shadow-2xl overflow-y-auto rf-animate-in"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--rf-border)] bg-[var(--rf-surface)]">
          <h2 className="text-lg font-semibold text-[var(--rf-text)]">Edit & Send</h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--rf-muted)] hover:text-[var(--rf-text)] transition-colors rounded-lg hover:bg-[var(--rf-border)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">To</label>
            <input
              type="email"
              value={form.to}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, to: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500"
              placeholder="recipient@example.com"
            />
            {isGenericEmail && (
              <p className="mt-1 text-xs text-amber-400">
                Warning: This looks like a generic recruitment inbox
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">From</label>
            <select
              value={form.from}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, from: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500"
            >
              {accounts.length === 0 ? (
                <option value="">No accounts connected</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.emailAddress} {acc.isDefault ? "(default)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500"
              placeholder="Email subject"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">Attachment</label>
            <div className="flex gap-2">
              {([
                { value: "", label: "None" },
                { value: "en", label: "EN CV" },
                { value: "br", label: "BR CV" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((f: typeof form) => ({ ...f, attachCV: opt.value }))}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    form.attachCV === opt.value
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "border-[var(--rf-border)] text-[var(--rf-muted)] hover:border-[var(--rf-text)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, body: e.target.value }))}
              rows={10}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500 resize-none font-sans"
              placeholder="Email body..."
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">Preview</label>
            <div className="bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg p-4">
              {form.body ? (
                <pre className="text-sm text-[var(--rf-text)] whitespace-pre-wrap font-sans">{form.body}</pre>
              ) : (
                <p className="text-sm text-[var(--rf-muted)] italic">No content</p>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t border-[var(--rf-border)] bg-[var(--rf-surface)]">
          <button
            onClick={onSaveDraft}
            disabled={loading || !form.subject}
            className="px-4 py-2 text-sm font-medium text-[var(--rf-muted)] hover:text-[var(--rf-text)] hover:bg-[var(--rf-border)] rounded-lg transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={onSend}
            disabled={loading || !form.to || !form.subject}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loading ? "Sending..." : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

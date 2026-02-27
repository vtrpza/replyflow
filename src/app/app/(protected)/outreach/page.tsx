"use client";

import { useEffect, useState, useRef } from "react";
import {
  useToast,
  SkeletonList,
  EmptyState,
} from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  type: string;
  language: string;
  subject: string;
  subjectVariants: string[] | null;
  body: string;
  isDefault: boolean;
}

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
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sheetRecord, setSheetRecord] = useState<OutreachRecord | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  
  const [sheetForm, setSheetForm] = useState({
    to: "",
    from: "",
    subject: "",
    body: "",
    attachCV: "" as "" | "en" | "br",
  });
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  const getStatusLabel = (status: string): string => {
    const labelsPt: Record<string, string> = {
      email_drafted: "rascunhado",
      email_sent: "enviado",
      followed_up: "follow-up",
      replied: "respondeu",
      interviewing: "entrevista",
      accepted: "aceito",
      rejected: "rejeitado",
    };

    return isPt ? labelsPt[status] || status.replace(/_/g, " ") : status.replace(/_/g, " ");
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/outreach");
      if (!res.ok) throw new Error(isPt ? "Falha ao buscar registros" : "Failed to fetch records");
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isPt
            ? "Falha ao buscar registros"
            : "Failed to fetch records"
      );
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

  const fetchTemplates = async () => {
    try {
      const lang = isPt ? "pt-BR" : "en";
      const res = await fetch(`/api/templates?language=${lang}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchAccounts();
    fetchTemplates();
    
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
      if (!res.ok) throw new Error(isPt ? "Falha ao atualizar status" : "Failed to update status");
      toast.success(isPt ? "Status atualizado" : "Status updated");
      fetchRecords();
    } catch {
      toast.error(isPt ? "Falha ao atualizar status" : "Failed to update status");
    }
  };

  const openSheet = (record: OutreachRecord) => {
    setSheetRecord(record);
    setSelectedTemplate(null);
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
    setSelectedTemplate(null);
    setSheetForm({ to: "", from: "", subject: "", body: "", attachCV: "" });
  };

  const applyTemplate = (template: EmailTemplate) => {
    if (sheetForm.subject || sheetForm.body) {
      if (!confirm(isPt ? "Substituir conteudo atual?" : "Replace current content?")) {
        return;
      }
    }
    setSelectedTemplate(template);
    setSheetForm((prev) => ({
      ...prev,
      subject: template.subject,
      body: template.body,
    }));
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
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
      if (!res.ok) throw new Error(isPt ? "Falha ao salvar rascunho" : "Failed to save draft");
      toast.success(isPt ? "Rascunho salvo" : "Draft saved");
      fetchRecords();
    } catch {
      toast.error(isPt ? "Falha ao salvar rascunho" : "Failed to save draft");
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
        toast.error(
          isPt
            ? "Limite de envios atingido. Faca upgrade para Pro em Configuracoes."
            : "Send limit reached. Upgrade to Pro in Settings."
        );
        window.location.href = "/app/settings";
        return;
      }
      if (data.success) {
        toast.success(
          isPt
            ? `Email enviado!${data.attachedCV ? ` Anexo: CV ${data.attachedCV.toUpperCase()}` : ""}`
            : `Email sent!${data.attachedCV ? ` Attached: ${data.attachedCV} CV` : ""}`
        );
        fetchRecords();
        closeSheet();
      } else {
        toast.error(`${isPt ? "Falha ao enviar" : "Failed to send"}: ${data.error}`);
      }
    } catch {
      toast.error(isPt ? "Falha ao enviar email" : "Failed to send email");
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
          <h1 className="text-2xl font-bold text-white">{isPt ? "Pipeline de Outreach" : "Outreach Pipeline"}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isPt ? `${records.length} registros de outreach` : `${records.length} outreach records`}
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
            {getStatusLabel(status)}
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
          title={isPt ? "Nenhum registro de outreach" : "No outreach records yet"}
          message={
            isPt
              ? 'Va para a pagina de Vagas e clique em "Criar rascunho" para comecar.'
              : 'Go to the Jobs page and click "Draft Email" on a job to get started.'
          }
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
                        {getStatusLabel(record.status)}
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
                        {isPt ? "Criado" : "Created"}: {new Date(record.createdAt).toLocaleDateString()}
                      </span>
                      {record.sentAt && (
                        <span>
                          {isPt ? "Enviado" : "Sent"}: {new Date(record.sentAt).toLocaleDateString()}
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
                        {isPt ? "Marcar como" : "Mark as"}{" "}
                        {getStatusLabel(getNextStatus(record.status)!)}
                      </button>
                    )}
                    {record.status !== "rejected" && (
                      <button
                        onClick={() => updateStatus(record.id, "rejected")}
                        className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        {isPt ? "Rejeitar" : "Reject"}
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
                      <span className="text-xs text-zinc-500">{isPt ? "Assunto" : "Subject"}:</span>
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
                        {isPt ? "Editar e enviar" : "Edit & Send"}
                      </button>
                      <a
                        href={`mailto:${record.job.contactEmail}?subject=${encodeURIComponent(record.emailSubject || "")}&body=${encodeURIComponent(record.emailBody || "")}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {isPt ? "Abrir no cliente de email" : "Open in mail client"}
                      </a>
                    </div>
                  )}
                  {record.notes && (
                    <div className="mt-3 p-3 bg-zinc-800 rounded text-sm text-zinc-400">
                      <span className="text-xs text-zinc-500">{isPt ? "Notas" : "Notes"}:</span>
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
          isPt={isPt}
          templates={templates}
          selectedTemplate={selectedTemplate}
          onApplyTemplate={applyTemplate}
          onClearTemplate={clearTemplate}
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
  isPt: boolean;
  templates: EmailTemplate[];
  selectedTemplate: EmailTemplate | null;
  onApplyTemplate: (template: EmailTemplate) => void;
  onClearTemplate: () => void;
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
  isPt,
  templates,
  selectedTemplate,
  onApplyTemplate,
  onClearTemplate,
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
          <h2 className="text-lg font-semibold text-[var(--rf-text)]">{isPt ? "Editar e enviar" : "Edit & Send"}</h2>
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
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">{isPt ? "Para" : "To"}</label>
            <input
              type="email"
              value={form.to}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, to: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500"
              placeholder="recipient@example.com"
            />
            {isGenericEmail && (
              <p className="mt-1 text-xs text-amber-400">
                {isPt
                  ? "Aviso: isso parece uma caixa de recrutamento generica"
                  : "Warning: This looks like a generic recruitment inbox"}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">{isPt ? "De" : "From"}</label>
            <select
              value={form.from}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, from: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500"
            >
              {accounts.length === 0 ? (
                <option value="">{isPt ? "Nenhuma conta conectada" : "No accounts connected"}</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.emailAddress} {acc.isDefault ? (isPt ? "(padrao)" : "(default)") : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">
              {isPt ? "Template" : "Template"}
              {selectedTemplate && (
                <span className="ml-2 text-xs text-emerald-400">
                  ({selectedTemplate.name})
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate?.id || ""}
                onChange={(e) => {
                  const template = templates.find((t) => t.id === e.target.value);
                  if (template) {
                    onApplyTemplate(template);
                  }
                }}
                className="flex-1 px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="">{isPt ? "Selecionar template..." : "Select template..."}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.language})
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(isPt ? "Limpar template selecionado?" : "Clear selected template?")) {
                      onClearTemplate();
                    }
                  }}
                  className="px-3 py-2 text-sm text-[var(--rf-muted)] hover:text-[var(--rf-text)] border border-[var(--rf-border)] rounded-lg transition-colors"
                  title={isPt ? "Limpar" : "Clear"}
                >
                  ✕
                </button>
              )}
            </div>
            {selectedTemplate && (
              <div className="mt-2 p-3 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg">
                <p className="text-xs text-[var(--rf-muted)] mb-1">
                  {isPt ? "Preview:" : "Preview:"}
                </p>
                <p className="text-sm text-[var(--rf-text)] whitespace-pre-wrap line-clamp-4">
                  {selectedTemplate.body}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">{isPt ? "Assunto" : "Subject"}</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, subject: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500"
              placeholder={isPt ? "Assunto do email" : "Email subject"}
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">{isPt ? "Anexo" : "Attachment"}</label>
            <div className="flex gap-2">
              {([
                { value: "", label: isPt ? "Nenhum" : "None" },
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
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">{isPt ? "Corpo" : "Body"}</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f: typeof form) => ({ ...f, body: e.target.value }))}
              rows={10}
              className="w-full px-3 py-2 bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg text-[var(--rf-text)] focus:outline-none focus:border-emerald-500 resize-none font-sans"
              placeholder={isPt ? "Corpo do email..." : "Email body..."}
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--rf-muted)] mb-1.5">{isPt ? "Previa" : "Preview"}</label>
            <div className="bg-[var(--rf-bg)] border border-[var(--rf-border)] rounded-lg p-4">
              {form.body ? (
                <pre className="text-sm text-[var(--rf-text)] whitespace-pre-wrap font-sans">{form.body}</pre>
              ) : (
                <p className="text-sm text-[var(--rf-muted)] italic">{isPt ? "Sem conteudo" : "No content"}</p>
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
            {isPt ? "Salvar rascunho" : "Save Draft"}
          </button>
          <button
            onClick={onSend}
            disabled={loading || !form.to || !form.subject}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loading ? (isPt ? "Enviando..." : "Sending...") : isPt ? "Enviar agora" : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

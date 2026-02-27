"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingButton, SkeletonList, useToast } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface Contact {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  position: string | null;
  source: string | null;
  sourceRef: string | null;
  status: string | null;
  updatedAt: string;
}

export default function ContactsPage() {
  const toast = useToast();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", company: "", position: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/contacts?${params.toString()}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch {
      toast.error(isPt ? "Falha ao carregar contatos" : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [status, toast, isPt]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) =>
      [c.email, c.name, c.company, c.position].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const createContact = async () => {
    if (!form.email.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || (isPt ? "Falha ao criar contato" : "Failed to create contact"));
        return;
      }
      setForm({ email: "", name: "", company: "", position: "" });
      toast.success(isPt ? "Contato salvo" : "Contact saved");
      load();
    } catch {
      toast.error(isPt ? "Falha ao criar contato" : "Failed to create contact");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{isPt ? "Banco de recrutadores" : "Recruiter Bank"}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isPt
            ? "Transforme vagas antigas em leads e mantenha seu CRM ativo."
            : "Turn outdated jobs into leads and keep your CRM active."}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isPt ? "Buscar por email, empresa, nome..." : "Search email, company, name..."}
          className="lg:col-span-5 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="lg:col-span-2 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300"
        >
          <option value="all">{isPt ? "Todos" : "All"}</option>
          <option value="lead">Lead</option>
          <option value="contacted">{isPt ? "Contatado" : "Contacted"}</option>
          <option value="replied">{isPt ? "Respondeu" : "Replied"}</option>
        </select>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/contacts?format=csv";
          }}
          className="lg:col-span-2 inline-flex items-center justify-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200"
        >
          {isPt ? "Exportar CSV" : "Export CSV"}
        </button>
      </div>

      <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          placeholder="email@empresa.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="md:col-span-2 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
        />
        <input
          placeholder={isPt ? "Nome (opcional)" : "Name (optional)"}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
        />
        <input
          placeholder={isPt ? "Empresa" : "Company"}
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200"
        />
        <LoadingButton onClick={createContact} loading={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
          {isPt ? "Salvar" : "Save"}
        </LoadingButton>
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={isPt ? "Nenhum contato" : "No contacts yet"}
          message={isPt ? "Salve emails de recrutadores nas vagas para construir seu banco." : "Save recruiter emails from jobs to build your bank."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((contact) => (
            <div key={contact.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm text-zinc-100 font-medium">{contact.email}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {[contact.name, contact.position, contact.company].filter(Boolean).join(" - ") || (isPt ? "Sem detalhes" : "No details")}
                  </p>
                  {contact.sourceRef && (
                    <a href={contact.sourceRef} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300">
                      {isPt ? "Fonte" : "Source"}
                    </a>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {isPt ? "Atualizado" : "Updated"}: {new Date(contact.updatedAt).toLocaleDateString(isPt ? "pt-BR" : "en-US")}
                  <div>
                    <a
                      href={`/app/compose?to=${encodeURIComponent(contact.email)}&subject=${encodeURIComponent(isPt ? "Conversa sobre oportunidades" : "Quick intro for opportunities")}`}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      {isPt ? "Rascunhar outreach" : "Draft outreach"}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

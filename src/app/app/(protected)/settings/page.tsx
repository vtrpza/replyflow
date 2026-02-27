"use client";

import { Suspense, useEffect, useState } from "react";
import { useToast, Skeleton, LoadingButton, Tooltip } from "@/components/ui";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Mail, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/ui/language-switch";

interface Profile {
  name: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  skills: string[];
  experienceYears: number;
  experienceLevel: string;
  preferredContractTypes: string[];
  preferredLocations: string[];
  preferRemote: boolean;
  minSalary: number | null;
  maxSalary: number | null;
  bio: string | null;
  highlights: string[];
  profileScore?: {
    score: number;
    band: "low" | "medium" | "high";
    missing: string[];
    suggestions: string[];
    updatedAt: string | null;
  };
}

interface ConnectedAccount {
  id: string;
  provider: string;
  emailAddress: string;
  isDefault: boolean;
  createdAt: string;
}

interface PlanSnapshot {
  plan: "free" | "pro";
  usage: {
    revealsUsed: number;
    draftsUsed: number;
    sendsUsed: number;
    periodStart: string;
  };
  limits: {
    reveals: number;
    drafts: number;
    sends: number;
    accounts: number;
    historyItems: number;
  };
}

function SettingsPageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    phone: null,
    linkedinUrl: null,
    githubUrl: null,
    portfolioUrl: null,
    resumeUrl: null,
    skills: [],
    experienceYears: 0,
    experienceLevel: "Pleno",
    preferredContractTypes: ["CLT", "PJ"],
    preferredLocations: [],
    preferRemote: true,
    minSalary: null,
    maxSalary: null,
    bio: null,
    highlights: [],
    profileScore: {
      score: 0,
      band: "low",
      missing: [],
      suggestions: [],
      updatedAt: null,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [highlightInput, setHighlightInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [planSnapshot, setPlanSnapshot] = useState<PlanSnapshot | null>(null);

  const formatLimit = (value: number | undefined, fallback: number): string => {
    const current = value ?? fallback;
    return current < 0 ? (isPt ? "Ilimitado" : "Unlimited") : String(current);
  };

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setProfile(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session?.user) {
      setLoadingAccounts(true);
      fetch("/api/accounts")
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setAccounts(data.accounts || []);
        })
        .catch(console.error)
        .finally(() => setLoadingAccounts(false));

      fetch("/api/stats")
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setPlanSnapshot({
              plan: data.plan,
              usage: data.usage,
              limits: data.limits,
            });
          }
        })
        .catch(console.error);
    }
  }, [session]);

  useEffect(() => {
    const gmailStatus = searchParams.get("gmail");
    const gmailMessage = searchParams.get("message");
    if (gmailStatus === "connected") {
      toast.success(isPt ? "Conta Gmail conectada com sucesso!" : "Gmail account connected successfully!");
      window.history.replaceState(null, "", "/app/settings");
    } else if (gmailStatus === "error") {
      toast.error(
        gmailMessage
          ? `${isPt ? "Falha ao conectar Gmail" : "Failed to connect Gmail"}: ${gmailMessage}`
          : isPt
            ? "Falha ao conectar Gmail"
            : "Failed to connect Gmail"
      );
      window.history.replaceState(null, "", "/app/settings");
    } else if (gmailStatus === "upgrade_required") {
      toast.error(
        gmailMessage
          || (isPt
            ? "Plano Free suporta 1 conta conectada. Faca upgrade para Pro."
            : "Free plan supports 1 connected account. Upgrade to Pro.")
      );
      window.history.replaceState(null, "", "/app/settings");
    }
  }, [searchParams, toast, isPt]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (data.success) {
        if (data.profileScore) {
          setProfile((prev) => ({ ...prev, profileScore: data.profileScore }));
        }
        toast.success(isPt ? "Perfil salvo!" : "Profile saved!");
      } else {
        toast.error(`${isPt ? "Erro" : "Error"}: ${data.error}`);
      }
    } catch {
      toast.error(isPt ? "Falha ao salvar perfil" : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, skillInput.trim()],
      });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skill),
    });
  };

  const addHighlight = () => {
    if (highlightInput.trim()) {
      setProfile({
        ...profile,
        highlights: [...profile.highlights, highlightInput.trim()],
      });
      setHighlightInput("");
    }
  };

  const removeHighlight = (idx: number) => {
    setProfile({
      ...profile,
      highlights: profile.highlights.filter((_, i) => i !== idx),
    });
  };

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate" }),
      });
      const data = await res.json();
      if (res.status === 402 && data?.error === "upgrade_required") {
        toast.error(
          isPt
            ? "Plano Free suporta 1 conta conectada. Faca upgrade para Pro."
            : "Free plan supports 1 connected account. Upgrade to Pro."
        );
        return;
      }
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(isPt ? "Falha ao iniciar OAuth" : "Failed to initiate OAuth");
      }
    } catch {
      toast.error(isPt ? "Falha ao conectar Gmail" : "Failed to connect Gmail");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", accountId }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts(accounts.filter((a) => a.id !== accountId));
        toast.success(isPt ? "Conta desconectada" : "Account disconnected");
      } else {
        toast.error(`${isPt ? "Erro" : "Error"}: ${data.error}`);
      }
    } catch {
      toast.error(isPt ? "Falha ao desconectar conta" : "Failed to disconnect account");
    }
  };

  const setDefaultAccount = async (accountId: string) => {
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-default", accountId }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts(
          accounts.map((a) => ({
            ...a,
            isDefault: a.id === accountId,
          }))
        );
        toast.success(isPt ? "Conta padrao atualizada" : "Default account updated");
      } else {
        toast.error(`${isPt ? "Erro" : "Error"}: ${data.error}`);
      }
    } catch {
      toast.error(isPt ? "Falha ao definir conta padrao" : "Failed to set default account");
    }
  };

  const addLocation = () => {
    if (
      locationInput.trim() &&
      !profile.preferredLocations.includes(locationInput.trim())
    ) {
      setProfile({
        ...profile,
        preferredLocations: [
          ...profile.preferredLocations,
          locationInput.trim(),
        ],
      });
      setLocationInput("");
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
          <h2 className="text-xl font-semibold text-zinc-200 mb-2">
            {isPt ? "Conecte seu email" : "Connect Your Email"}
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            {isPt
              ? "Entre para conectar sua conta Gmail e comecar a enviar emails direto pelo app."
              : "Sign in to connect your Gmail account and start sending emails directly from the app."}
          </p>
          <button
            onClick={() => signIn("google")}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            {isPt ? "Entrar com Google" : "Sign in with Google"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{isPt ? "Configuracoes" : "Settings"}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isPt
              ? "Configure seu perfil para match de vagas e geracao de emails"
              : "Configure your profile for job matching and email generation"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <span className="text-sm text-zinc-400 truncate max-w-[200px]">{session?.user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-sm text-zinc-500 hover:text-zinc-300 shrink-0"
          >
            {isPt ? "Sair" : "Sign out"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-zinc-200">{isPt ? "Score de perfil" : "Profile score"}</h2>
            <Tooltip
              content={
                isPt
                  ? "Score de prontidao baseado em dados de perfil, skills e sinais de outreach."
                  : "Readiness score based on profile data, skills, and outreach signals."
              }
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-300">?</span>
            </Tooltip>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-4xl font-bold text-white">{profile.profileScore?.score ?? 0}</p>
            <span
              className={`px-2 py-1 rounded text-xs ${
                profile.profileScore?.band === "high"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : profile.profileScore?.band === "medium"
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-red-500/10 text-red-300"
              }`}
            >
              {(profile.profileScore?.band || "low").toUpperCase()}
            </span>
          </div>
          {profile.profileScore?.suggestions?.length ? (
            <ul className="mt-3 space-y-1 text-xs text-zinc-400">
              {profile.profileScore.suggestions.slice(0, 4).map((suggestion) => (
                <li key={suggestion}>- {suggestion}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-200">{isPt ? "Plano e uso" : "Plan & Usage"}</h2>
              <p className="text-xs text-zinc-500 mt-1">
                {isPt ? "Uso do mes atual e limites do plano" : "Current month usage and plan limits"}
              </p>
            </div>
            <a
              href="/app/settings"
              className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              {isPt ? "Upgrade para Pro" : "Upgrade to Pro"}
            </a>
          </div>

          <div className="mb-4 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200">
            {isPt ? "Plano" : "Plan"}: <span className="font-semibold uppercase">{planSnapshot?.plan || "free"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <p className="text-zinc-400">{isPt ? "Reveals" : "Reveals"}</p>
              <p className="text-zinc-100 font-medium">
                {planSnapshot?.usage.revealsUsed ?? 0} / {formatLimit(planSnapshot?.limits.reveals, 50)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <p className="text-zinc-400">{isPt ? "Rascunhos" : "Drafts"}</p>
              <p className="text-zinc-100 font-medium">
                {planSnapshot?.usage.draftsUsed ?? 0} / {formatLimit(planSnapshot?.limits.drafts, 30)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <p className="text-zinc-400">{isPt ? "Envios" : "Sends"}</p>
              <p className="text-zinc-100 font-medium">
                {planSnapshot?.usage.sendsUsed ?? 0} / {formatLimit(planSnapshot?.limits.sends, 10)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
              <p className="text-zinc-400">{isPt ? "Contas conectadas" : "Connected accounts"}</p>
              <p className="text-zinc-100 font-medium">
                {accounts.length} / {formatLimit(planSnapshot?.limits.accounts, 1)}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">
            <p className="text-zinc-300">
              {isPt ? "Automacao de follow-up" : "Follow-up automation"}: {planSnapshot?.plan === "pro" ? (isPt ? "habilitado (em breve)" : "enabled (soon)") : (isPt ? "bloqueado no Free" : "locked on Free")}
            </p>
          </div>
        </section>

        {/* Connected Email Accounts */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            {isPt ? "Contas de email conectadas" : "Connected Email Accounts"}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            {isPt
              ? "Conecte sua conta Gmail para enviar emails direto pelo app."
              : "Connect your Gmail account to send emails directly from the app."}
          </p>

          {loadingAccounts ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : accounts.length > 0 ? (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-zinc-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-200">
                          {account.emailAddress}
                        </span>
                        {account.isDefault && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-600/20 text-emerald-400 rounded">
                            {isPt ? "Padrao" : "Default"}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 capitalize">
                        {account.provider}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.isDefault && (
                      <button
                        onClick={() => setDefaultAccount(account.id)}
                        className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded"
                      >
                        {isPt ? "Definir como padrao" : "Set as default"}
                      </button>
                    )}
                    <button
                      onClick={() => disconnectAccount(account.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Mail className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm text-zinc-500 mb-4">
                {isPt ? "Nenhuma conta de email conectada" : "No email accounts connected"}
              </p>
              <LoadingButton
                onClick={connectGmail}
                loading={connecting}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {isPt ? "Conectar Gmail" : "Connect Gmail"}
              </LoadingButton>
            </div>
          )}

          {accounts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <LoadingButton
                onClick={connectGmail}
                loading={connecting}
              >
                {isPt ? "Adicionar outra conta" : "Add Another Account"}
              </LoadingButton>
            </div>
          )}
        </section>
        {/* Personal Info */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            {isPt ? "Informacoes pessoais" : "Personal Information"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{isPt ? "Nome" : "Name"}</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "URL do LinkedIn" : "LinkedIn URL"}
              </label>
              <input
                type="url"
                value={profile.linkedinUrl || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    linkedinUrl: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "URL do GitHub" : "GitHub URL"}
              </label>
              <input
                type="url"
                value={profile.githubUrl || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    githubUrl: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "URL do Portfolio" : "Portfolio URL"}
              </label>
              <input
                type="url"
                value={profile.portfolioUrl || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    portfolioUrl: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "Bio" : "Bio"}
              </label>
              <input
                type="text"
                value={profile.bio || ""}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value || null })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            {isPt ? "Experiencia" : "Experience"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "Anos de experiencia" : "Years of Experience"}
              </label>
              <input
                type="number"
                min={0}
                max={40}
                value={profile.experienceYears}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    experienceYears: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "Nivel de experiencia" : "Experience Level"}
              </label>
              <select
                value={profile.experienceLevel}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    experienceLevel: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200"
              >
                <option value="Intern">Intern/Estagio</option>
                <option value="Junior">Junior</option>
                <option value="Pleno">Pleno</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead/Principal</option>
              </select>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            {isPt ? "Skills / Tech Stack" : "Skills / Tech Stack"}
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              placeholder={
                isPt
                  ? "Adicionar skill (ex.: React, Python, AWS)"
                  : "Add a skill (e.g., React, Python, AWS)"
              }
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={addSkill}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg"
            >
              {isPt ? "Adicionar" : "Add"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-lg"
              >
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="text-zinc-500 hover:text-red-400"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">
            {isPt ? "Preferencias" : "Preferences"}
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.preferRemote}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    preferRemote: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-zinc-300">
                {isPt ? "Preferir vagas remotas" : "Prefer remote positions"}
              </span>
            </label>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "Tipos de contrato preferidos" : "Preferred Contract Types"}
              </label>
              <div className="flex gap-3">
                {["CLT", "PJ", "Freela"].map((ct) => (
                  <label key={ct} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.preferredContractTypes.includes(ct)}
                      onChange={(e) => {
                        const types = e.target.checked
                          ? [...profile.preferredContractTypes, ct]
                          : profile.preferredContractTypes.filter(
                              (t) => t !== ct
                            );
                        setProfile({
                          ...profile,
                          preferredContractTypes: types,
                        });
                      }}
                      className="w-4 h-4 rounded border-zinc-700 text-emerald-500"
                    />
                    <span className="text-sm text-zinc-300">{ct}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {isPt ? "Localizacoes preferidas" : "Preferred Locations"}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLocation()}
                  placeholder={isPt ? "ex.: Sao Paulo, Rio de Janeiro" : "e.g., Sao Paulo, Rio de Janeiro"}
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={addLocation}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg"
                >
                  {isPt ? "Adicionar" : "Add"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.preferredLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-lg"
                  >
                    {loc}
                    <button
                      onClick={() =>
                        setProfile({
                          ...profile,
                          preferredLocations:
                            profile.preferredLocations.filter(
                              (l) => l !== loc
                            ),
                        })
                      }
                      className="text-zinc-500 hover:text-red-400"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Highlights (for email generation) */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">
            {isPt ? "Destaques do perfil" : "Profile Highlights"}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            {isPt
              ? "Esses pontos serao incluidos em emails frios gerados automaticamente."
              : "These will be included in auto-generated cold emails."}
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHighlight()}
              placeholder={
                isPt
                  ? 'ex.: "Liderei migracao para microservicos atendendo 1M+ usuarios"'
                  : 'e.g., "Led migration to microservices serving 1M+ users"'
              }
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={addHighlight}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg"
            >
              {isPt ? "Adicionar" : "Add"}
            </button>
          </div>
          <div className="space-y-2">
            {profile.highlights.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg"
              >
                <span className="text-sm text-zinc-300">{h}</span>
                <button
                  onClick={() => removeHighlight(idx)}
                  className="text-zinc-500 hover:text-red-400 text-xs"
                >
                  {isPt ? "remover" : "remove"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <LoadingButton onClick={handleSave} loading={saving} size="lg">
            {isPt ? "Salvar perfil" : "Save Profile"}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

function SettingsPageFallback() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}

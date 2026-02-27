"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/ui/language-switch";

/* ───────────────────────── data ───────────────────────── */

const PIPELINE_STEPS = [
  { label: "Lead", desc: "Find jobs with direct contact", icon: ">", signal: "source" },
  { label: "Draft", desc: "One-click email generation", icon: "~", signal: "compose" },
  { label: "Send", desc: "Send via your Gmail", icon: "|", signal: "deliver" },
  { label: "Follow up", desc: "Automated reminders", icon: ">>", signal: "ping" },
  { label: "Reply", desc: "Track responses", icon: "<", signal: "feedback" },
  { label: "Interview", desc: "Move to next stage", icon: "#", signal: "outcome" },
];

const FEATURES = [
  {
    title: "Direct-contact first",
    desc: "We surface jobs with real emails and LinkedIn profiles. No black-hole ATS forms.",
    tag: "signal",
  },
  {
    title: "One-click drafts",
    desc: "Generate cold emails in PT-BR or EN, tailored to your profile and the job posting.",
    tag: "speed",
  },
  {
    title: "Pipeline + follow-ups",
    desc: "Track every application from draft to interview. Follow-ups are where interviews happen.",
    tag: "system",
  },
  {
    title: "History & logs",
    desc: "Full send history, open tracking, and status per outreach. Know what works.",
    tag: "data",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is ReplyFlow a job board?",
    a: "No. ReplyFlow is an outreach pipeline. It connects to job sources, but its core value is the workflow: draft, send, follow up, track replies. Think lightweight CRM for job applications.",
  },
  {
    q: "Does it guarantee interviews?",
    a: "No tool can guarantee that. What ReplyFlow does is reduce friction and increase consistency in your outreach. More sends + better follow-ups = more replies. The math compounds.",
  },
  {
    q: "Do I need to use ATS platforms?",
    a: "Not necessarily. ReplyFlow focuses on direct contact when available (email, LinkedIn). For ATS-only positions, we flag them so you can decide. Direct outreach has higher response rates for senior roles.",
  },
];

/* ───────────────────────── component ───────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--rf-bg)] text-[var(--rf-text)]">
      <Nav />
      <Hero />
      <Pipeline />
      <Features />
      <Banner />
      <Pricing />
      <Faq />
      <Footer />
    </div>
  );
}

/* ─── Nav ─── */

function Nav() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--rf-border)] bg-[var(--rf-bg)]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/replyflow/replyflow-icon.png"
            alt="ReplyFlow"
            width={24}
            height={24}
            className="rounded"
          />
          <span className="font-semibold text-sm tracking-tight text-white">
            Reply<span className="text-[var(--rf-green)]">Flow</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/app/signin"
            className="hidden sm:block text-sm text-[var(--rf-muted)] hover:text-white transition-colors"
          >
            {isPt ? "Entrar" : "Sign in"}
          </Link>
          <Link
            href="/app"
            className="text-sm font-medium px-4 py-1.5 rounded-lg bg-[var(--rf-green)] hover:bg-emerald-400 text-[var(--rf-bg)] transition-colors"
          >
            {isPt ? "Abrir app" : "Open app"}
          </Link>
          <div className="hidden sm:block">
            <LanguageSwitch variant="inline" />
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-[var(--rf-muted)] hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[var(--rf-border)] bg-[var(--rf-bg)]">
          <div className="px-4 py-4 flex flex-col gap-3">
            <Link
              href="/app/signin"
              className="text-sm text-[var(--rf-muted)] hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {isPt ? "Entrar" : "Sign in"}
            </Link>
            <Link
              href="/app"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--rf-green)] hover:bg-emerald-400 text-[var(--rf-bg)] transition-colors text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              {isPt ? "Abrir app" : "Open app"}
            </Link>
            <div className="pt-2 border-t border-[var(--rf-border)]">
              <LanguageSwitch variant="inline" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero ─── */

function Hero() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  return (
    <section className="rf-grid-bg relative pt-24 pb-16 sm:pt-32 sm:pb-24 px-6">
      {/* Gradient glow behind hero */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[200px] sm:h-[300px] rounded-full opacity-[0.07] blur-[100px] pointer-events-none"
        style={{ background: "var(--rf-gradient)" }}
      />

      <div className="max-w-3xl mx-auto text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--rf-border)] bg-[var(--rf-surface)] mb-6 sm:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--rf-green)] animate-pulse" />
          <span className="text-xs font-mono text-[var(--rf-muted)]">
            {isPt ? "v1.0 - ja disponivel" : "v1.0 - now open"}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          <span className="text-white">{isPt ? "Pipeline de outreach" : "Outreach pipeline"}</span>
          <br />
          <span className="rf-gradient-text">
            {isPt ? "para devs que assumem responsabilidade." : "for devs who take ownership."}
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[var(--rf-muted)] max-w-xl mx-auto mb-10 leading-relaxed">
          {isPt
            ? "Encontre vagas com contato direto. Gere emails em um clique. Acompanhe do primeiro contato ate a entrevista."
            : "Find jobs with direct contacts. Generate emails in one click. Track from first contact to interview."}
          {" "}
          {isPt
            ? "Mais respostas. Menos forms ATS."
            : "More replies. Less ATS forms."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm text-[var(--rf-bg)] transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"
            style={{ background: "var(--rf-gradient)" }}
          >
            <span className="font-mono text-xs opacity-70">&gt;</span>
            {isPt ? "Comecar gratis" : "Start free"}
          </Link>
          <Link
            href="/app/signin"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--rf-border)] text-sm font-medium text-[var(--rf-muted)] hover:text-white hover:border-zinc-600 transition-all w-full sm:w-auto justify-center"
          >
            {isPt ? "Entrar" : "Sign in"}
          </Link>
        </div>

        <p className="mt-6 text-xs text-zinc-600 font-mono">
          {isPt ? "plano gratis disponivel - sem cartao" : "free tier available - no credit card"}
        </p>
      </div>
    </section>
  );
}

/* ─── Pipeline (How it works) ─── */

function Pipeline() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  const pipelinePt = [
    { label: "Lead", desc: "Encontre vagas com contato direto" },
    { label: "Rascunho", desc: "Geracao de email em um clique" },
    { label: "Enviar", desc: "Envie pela sua conta Gmail" },
    { label: "Follow-up", desc: "Lembretes automatizados" },
    { label: "Resposta", desc: "Acompanhe retornos" },
    { label: "Entrevista", desc: "Avance para a proxima etapa" },
  ];

  return (
    <section className="relative py-24 px-6 border-t border-[var(--rf-border)] overflow-hidden">
      <div
        className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-[720px] h-[280px] blur-[120px] opacity-20"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.28) 0%, rgba(34,197,94,0) 70%)" }}
      />

      <div className="max-w-6xl mx-auto relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
          <div>
            <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
              {isPt ? "Como funciona" : "How it works"}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {isPt ? "Seis etapas. Um pipeline." : "Six steps. One pipeline."}
            </h2>
          </div>
          <p className="text-xs font-mono text-[var(--rf-muted)] rounded-full border border-[var(--rf-border)] px-3 py-1.5 w-fit">
            {isPt ? "fluxo deterministico · sem teatro de ATS" : "deterministic flow · no ATS theater"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {PIPELINE_STEPS.map((step, i) => (
            <article
              key={step.label}
              className="rf-animate-in group relative overflow-hidden p-5 rounded-xl border border-[var(--rf-border)] bg-[var(--rf-surface)] hover:border-zinc-500 hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/50 via-emerald-300/40 to-transparent" />

              <div className="flex items-start justify-between mb-4">
                <div className="text-[10px] font-mono text-zinc-500 border border-[var(--rf-border)] rounded-md px-1.5 py-0.5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-[var(--rf-muted)]">
                  {step.signal}
                </span>
              </div>

              <div className="mb-4 w-9 h-9 rounded-lg border border-[var(--rf-border)] bg-[var(--rf-bg)]/70 flex items-center justify-center">
                <span className="font-mono text-xl rf-gradient-text leading-none">
                  {step.icon}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1">
                {isPt ? pipelinePt[i].label : step.label}
              </h3>
              <p className="text-xs text-[var(--rf-muted)] leading-relaxed">
                {isPt ? pipelinePt[i].desc : step.desc}
              </p>

              {i < PIPELINE_STEPS.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-4 w-7 items-center gap-1">
                  <span className="w-5 h-px bg-gradient-to-r from-cyan-400/60 to-emerald-400/60" />
                  <span className="text-[10px] font-mono text-cyan-300">&gt;</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─── */

function Features() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  const featurePt = [
    {
      title: "Contato direto primeiro",
      desc: "Mostramos vagas com emails reais e perfis no LinkedIn. Sem buraco negro de formularios ATS.",
    },
    {
      title: "Rascunhos em um clique",
      desc: "Gere cold emails em PT-BR ou EN, adaptados ao seu perfil e a vaga.",
    },
    {
      title: "Pipeline + follow-ups",
      desc: "Acompanhe cada candidatura do rascunho ate a entrevista. Follow-up e onde as entrevistas acontecem.",
    },
    {
      title: "Historico e logs",
      desc: "Historico completo de envios e status por outreach. Saiba o que funciona.",
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)] bg-[var(--rf-surface)]/50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            {isPt ? "Recursos" : "Features"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {isPt ? "Feito para outreach real de dev." : "Built for real-world dev outreach."}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border border-[var(--rf-border)] bg-[var(--rf-bg)] hover:border-zinc-600 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1 w-8 h-8 rounded-lg border border-[var(--rf-border)] bg-[var(--rf-surface)] flex items-center justify-center">
                  <span className="text-xs font-mono rf-gradient-text font-bold">
                    {f.tag.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {isPt ? featurePt[i].title : f.title}
                  </h3>
                  <p className="text-sm text-[var(--rf-muted)] leading-relaxed">
                    {isPt ? featurePt[i].desc : f.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-zinc-600 font-mono">
            {isPt
              ? '"Voce nao precisa de mais vagas. Voce precisa de mais respostas."'
              : "\"You don't need more jobs. You need more replies.\""}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Banner / Visual ─── */

function Banner() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)]">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-[var(--rf-border)] rf-glow">
          <Image
            src="/brand/replyflow/replyflow-banner-dark.png"
            alt="ReplyFlow pipeline view"
            width={1920}
            height={384}
            className="w-full h-auto"
            priority
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--rf-bg)] via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <p className="text-sm font-mono text-[var(--rf-muted)]">
              <span className="text-[var(--rf-cyan)]">$</span>{" "}
              {isPt ? "replyflow --status funil" : "replyflow --status pipeline"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */

function Pricing() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      period: isPt ? "para sempre" : "forever",
      desc: isPt ? "Comece agora. Sem cartao." : "Get started. No credit card.",
      features: [
        isPt ? "Ate 50 leads/mes" : "Up to 50 leads/month",
        isPt ? "Rascunhos de email (PT-BR / EN)" : "Email drafts (PT-BR / EN)",
        isPt ? "Acompanhamento basico do pipeline" : "Basic pipeline tracking",
        isPt ? "Envio pela sua conta Gmail" : "Send via your Gmail",
      ],
      cta: isPt ? "Comecar gratis" : "Start free",
      href: "/app",
      primary: false,
    },
    {
      name: "Pro",
      price: "R$ 49",
      period: isPt ? "/mes" : "/month",
      desc: isPt
        ? "Para quem esta em busca ativa e quer mais respostas."
        : "For active job seekers who want more replies.",
      features: [
        isPt ? "Leads ilimitados" : "Unlimited leads",
        isPt ? "Geracao de rascunho prioritaria" : "Priority draft generation",
        isPt ? "Automacao de follow-up" : "Follow-up automation",
        isPt ? "Historico completo e analytics" : "Full history & analytics",
        isPt ? "Ranking por score de match" : "Match score ranking",
      ],
      cta: isPt ? "Upgrade para Pro" : "Upgrade to Pro",
      href: "/app/settings",
      primary: true,
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)] bg-[var(--rf-surface)]/50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            {isPt ? "Precos" : "Pricing"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {isPt ? "Simples. Sem surpresa." : "Simple. No surprises."}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border transition-all ${
                plan.primary
                  ? "border-[var(--rf-green)]/30 bg-[var(--rf-bg)] rf-glow"
                  : "border-[var(--rf-border)] bg-[var(--rf-bg)]"
              }`}
            >
              {plan.primary && (
                <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[10px] font-mono font-medium text-[var(--rf-bg)] bg-[var(--rf-green)]">
                  {isPt ? "recomendado" : "recommended"}
                </div>
              )}

              <h3 className="text-lg font-semibold text-white mb-1">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-sm text-[var(--rf-muted)]">
                  {plan.period}
                </span>
              </div>
              <p className="text-sm text-[var(--rf-muted)] mb-6">
                {plan.desc}
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-zinc-300"
                  >
                    <span className="text-[var(--rf-green)] mt-0.5 font-mono text-xs">
                      +
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block text-center w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
                  plan.primary
                    ? "text-[var(--rf-bg)] hover:opacity-90"
                    : "border border-[var(--rf-border)] text-[var(--rf-muted)] hover:text-white hover:border-zinc-600"
                }`}
                style={
                  plan.primary
                    ? { background: "var(--rf-gradient)" }
                    : undefined
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */

function Faq() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const [open, setOpen] = useState<number | null>(null);

  const faqPt = [
    {
      q: "A ReplyFlow e um job board?",
      a: "Nao. A ReplyFlow e um pipeline de outreach. Ela conecta fontes de vagas, mas o valor central esta no fluxo: rascunhar, enviar, fazer follow-up e acompanhar respostas.",
    },
    {
      q: "Ela garante entrevistas?",
      a: "Nenhuma ferramenta garante isso. A ReplyFlow reduz friccao e aumenta consistencia no outreach. Mais envios e follow-ups melhores resultam em mais respostas.",
    },
    {
      q: "Preciso usar plataformas ATS?",
      a: "Nem sempre. A ReplyFlow prioriza contato direto quando disponivel (email, LinkedIn). Quando for ATS-only, voce decide como seguir.",
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {isPt ? "Perguntas comuns" : "Common questions"}
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="border border-[var(--rf-border)] rounded-xl overflow-hidden bg-[var(--rf-surface)]"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-medium text-white">
                  {isPt ? faqPt[i].q : item.q}
                </span>
                <span
                  className={`text-[var(--rf-muted)] font-mono text-lg transition-transform ${
                    open === i ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-[var(--rf-muted)] leading-relaxed">
                    {isPt ? faqPt[i].a : item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */

function Footer() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  return (
    <footer className="border-t border-[var(--rf-border)] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/replyflow/replyflow-icon.png"
            alt="ReplyFlow"
            width={20}
            height={20}
            className="rounded"
          />
          <span className="text-sm font-medium text-zinc-500">
            Reply<span className="text-zinc-400">Flow</span>
          </span>
        </div>

        <p className="text-xs text-zinc-600 font-mono">
          {isPt
            ? "E no follow-up que a entrevista acontece."
            : "The follow-up is where the interview happens."}
        </p>
      </div>
    </footer>
  );
}

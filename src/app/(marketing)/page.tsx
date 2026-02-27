"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/ui/language-switch";

/* ───────────────────────── hooks ───────────────────────── */

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("rf-visible");
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}

function useAnimatedCounter(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, value };
}

function useTypewriter(lines: string[], speed = 40, delay = 600) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [done, setDone] = useState(false);

  const start = useCallback(() => {
    setDisplayedLines([]);
    setCurrentLine(0);
    setDone(false);
  }, []);

  useEffect(() => {
    start();
  }, [lines.join(","), start]);

  useEffect(() => {
    if (done || currentLine >= lines.length) {
      if (currentLine >= lines.length) setDone(true);
      return;
    }

    const line = lines[currentLine];
    let charIndex = 0;
    let partial = "";

    const initialTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (charIndex < line.length) {
          partial += line[charIndex];
          charIndex++;
          setDisplayedLines((prev) => {
            const next = [...prev];
            next[currentLine] = partial;
            return next;
          });
        } else {
          clearInterval(interval);
          setTimeout(() => setCurrentLine((c) => c + 1), delay / 2);
        }
      }, speed);

      return () => clearInterval(interval);
    }, currentLine === 0 ? delay : 100);

    return () => clearTimeout(initialTimeout);
  }, [currentLine, done, lines, speed, delay]);

  return { displayedLines, currentLine, done };
}

/* ───────────────────────── data ───────────────────────── */

const STATS = [
  { value: 3, suffix: "", enLabel: "Source connectors", ptLabel: "Conectores de fonte" },
  { value: 5, suffix: "min", enLabel: "To first scan", ptLabel: "Para o primeiro scan" },
  { value: 10, suffix: "+", enLabel: "Email templates", ptLabel: "Templates de e-mail" },
  { value: 0, suffix: "", enLabel: "Credit cards required", ptLabel: "Cartões de crédito" },
];

const TERMINAL_LINES_EN = [
  "$ replyflow scan --sources github,greenhouse,lever",
  "  ✓ 148 new positions found across 12 sources",
  "$ replyflow rank --profile ./cv.json",
  "  ✓ Top 23 matches scored (avg: 82/100)",
  "$ replyflow draft --top 5 --lang en",
  "  ✓ 5 personalized cold emails generated",
  "$ replyflow send --account gmail --attach cv.pdf",
  "  ✓ Sent 5 emails · follow-ups scheduled in 3 days",
];

const TERMINAL_LINES_PT = [
  "$ replyflow scan --sources github,greenhouse,lever",
  "  ✓ 148 novas posições em 12 fontes",
  "$ replyflow rank --profile ./cv.json",
  "  ✓ Top 23 matches pontuados (média: 82/100)",
  "$ replyflow draft --top 5 --lang pt-br",
  "  ✓ 5 e-mails personalizados gerados",
  "$ replyflow send --account gmail --attach cv.pdf",
  "  ✓ 5 e-mails enviados · follow-ups em 3 dias",
];

const WHY_USE_ITEMS = [
  {
    id: "pain",
    ptTitle: "Você conhece a rotina",
    ptDesc: "Dez abas abertas. Uma planilha que ninguém atualiza. Candidatura no escuro. E-mails de recrutador perdidos na caixa de entrada. Toda semana a mesma coisa — esforço sem retorno.",
    enTitle: "You know the routine",
    enDesc: "Ten tabs open. A spreadsheet nobody updates. Blind applications. Recruiter emails buried in your inbox. Every week the same cycle — effort without traction.",
  },
  {
    id: "solution",
    ptTitle: "Um sistema, não mais uma ferramenta",
    ptDesc: "ReplyFlow conecta sourcing, score, outreach e CRM em um pipeline único. Vagas nacionais e internacionais rankeadas contra seu perfil, contatos enriquecidos automaticamente, e-mails enviados pelo seu próprio Gmail.",
    enTitle: "A system, not another tool",
    enDesc: "ReplyFlow connects sourcing, scoring, outreach, and CRM in one pipeline. National and international roles ranked against your profile, contacts auto-enriched, emails sent from your own Gmail.",
  },
  {
    id: "outcome",
    ptTitle: "O resultado que importa",
    ptDesc: "Menos tempo perdido em vagas que não encaixam. Mais consistência no follow-up. Mais chances reais de resposta — porque a matemática do volume funciona.",
    enTitle: "The outcome that matters",
    enDesc: "Less time wasted on bad-fit roles. More consistency in follow-ups. Stronger odds of getting replies — because the math of consistent volume works.",
  },
];

const BENTO_FEATURES = [
  {
    size: "wide" as const,
    visual: "chart" as const,
    tag: "INTELLIGENCE",
    title: "Find jobs worth applying to",
    desc: "Every role scored against your profile with transparent reasoning — top match reasons, missing skills, and weighted breakdown. You see exactly why a job fits before spending time on it.",
    ptTitle: "Encontre vagas que valem a pena",
    ptDesc: "Cada vaga pontuada contra seu perfil com razões transparentes — motivos do match, skills faltantes e breakdown ponderado. Você vê exatamente por que uma vaga encaixa antes de investir tempo.",
  },
  {
    size: "normal" as const,
    visual: "pipeline" as const,
    tag: "ATS",
    title: "Never lose track of where you stand",
    desc: "ATS submissions and direct outreach live side-by-side in one pipeline. No more switching between Greenhouse, Lever, and your inbox to check status.",
    ptTitle: "Nunca perca de vista onde você está",
    ptDesc: "Candidaturas ATS e outreach direto lado a lado em um pipeline. Sem precisar alternar entre Greenhouse, Lever e sua caixa de entrada.",
  },
  {
    size: "normal" as const,
    visual: "email" as const,
    tag: "OUTREACH",
    title: "Send emails that get replies",
    desc: "Personalized PT-BR or EN cold emails from your own Gmail. CV attached, follow-ups scheduled, outreach history tracked per contact.",
    ptTitle: "Envie e-mails que recebem respostas",
    ptDesc: "E-mails personalizados PT-BR ou EN pelo seu próprio Gmail. CV anexo, follow-ups agendados, histórico de outreach por contato.",
  },
  {
    size: "wide" as const,
    visual: "contacts" as const,
    tag: "CRM",
    title: "Remember every recruiter",
    desc: "Contact cards auto-enriched from job syncs and email reveals with outreach history. Old listings become reusable recruiter leads instead of lost contacts.",
    ptTitle: "Lembre de cada recrutador",
    ptDesc: "Cards de contato enriquecidos automaticamente via sync e reveal com histórico de outreach. Vagas antigas viram leads de recrutador reutilizáveis em vez de contatos perdidos.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    enTitle: "Connect your sources",
    enDesc: "Add GitHub repos, Greenhouse boards, and Lever postings. First scan runs in under 5 minutes. Every role gets scored against your profile automatically.",
    ptTitle: "Conecte suas fontes",
    ptDesc: "Adicione repos GitHub, boards Greenhouse e Lever. O primeiro scan roda em menos de 5 minutos. Cada vaga é pontuada automaticamente contra seu perfil.",
  },
  {
    step: "02",
    enTitle: "Draft and send outreach",
    enDesc: "Pick your top matches, generate personalized cold emails in PT-BR or EN, and send from your own Gmail with CV attached. One click per email.",
    ptTitle: "Rascunhe e envie outreach",
    ptDesc: "Escolha seus melhores matches, gere e-mails personalizados em PT-BR ou EN, e envie pelo seu Gmail com CV anexo. Um clique por e-mail.",
  },
  {
    step: "03",
    enTitle: "Follow up until you land it",
    enDesc: "Scheduled reminders keep your follow-ups consistent. Per-contact history means you never send the same email twice. The pipeline tracks every stage until the interview.",
    ptTitle: "Faça follow-up até conseguir",
    ptDesc: "Lembretes agendados mantêm seus follow-ups consistentes. Histórico por contato garante que você nunca envie o mesmo e-mail duas vezes. O pipeline acompanha cada etapa até a entrevista.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is ReplyFlow a job board?",
    a: "No. ReplyFlow is a job search framework — it sources, scores, and helps you act on opportunities. Think of it as your outreach pipeline, not another place to scroll listings.",
    ptQ: "A ReplyFlow é um job board?",
    ptA: "Não. A ReplyFlow é um framework de busca de emprego — ela coleta, pontua e ajuda você a agir sobre oportunidades. Pense nela como seu pipeline de outreach, não outro lugar para rolar vagas.",
  },
  {
    q: "Does it guarantee interviews?",
    a: "No tool can guarantee that. ReplyFlow removes the friction that stops you from sending consistent outreach. More sends + better follow-ups = more replies. The math compounds over weeks.",
    ptQ: "Ela garante entrevistas?",
    ptA: "Nenhuma ferramenta garante isso. A ReplyFlow remove a fricção que te impede de manter outreach consistente. Mais envios + follow-ups melhores = mais respostas. A matemática acumula ao longo de semanas.",
  },
  {
    q: "How is this different from Huntr or a spreadsheet?",
    a: "Spreadsheets don't source jobs, score matches, or send emails. Huntr tracks applications but doesn't do outreach. ReplyFlow connects the full pipeline: source, score, send, follow up, and track.",
    ptQ: "Como isso é diferente de Huntr ou uma planilha?",
    ptA: "Planilhas não coletam vagas, pontuam matches ou enviam e-mails. Huntr rastreia candidaturas mas não faz outreach. A ReplyFlow conecta o pipeline completo: coletar, pontuar, enviar, follow-up e rastrear.",
  },
  {
    q: "Is my data safe?",
    a: "Your Gmail credentials use OAuth and are never stored on our servers. All outreach data stays in your account. We don't sell or share user data.",
    ptQ: "Meus dados estão seguros?",
    ptA: "Suas credenciais do Gmail usam OAuth e nunca são armazenadas em nossos servidores. Todos os dados de outreach ficam na sua conta. Não vendemos nem compartilhamos dados de usuários.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no penalties. Downgrade to Free whenever you want and keep all your data, contacts, and outreach history.",
    ptQ: "Posso cancelar a qualquer momento?",
    ptA: "Sim. Sem contratos, sem multas. Volte para o Free quando quiser e mantenha todos os seus dados, contatos e histórico de outreach.",
  },
  {
    q: "Does it work for international remote jobs?",
    a: "Yes. ReplyFlow sources from Greenhouse, Lever, and GitHub regardless of geography. Draft outreach in English or Portuguese. Many users target global remote roles from Brazil.",
    ptQ: "Funciona para vagas internacionais remotas?",
    ptA: "Sim. A ReplyFlow coleta de Greenhouse, Lever e GitHub independente da geografia. Gere outreach em inglês ou português. Muitos usuários miram vagas remotas globais a partir do Brasil.",
  },
];

/* ───────────────────────── feature visuals ───────────────────────── */

function FeatureVisual({ type }: { type: "chart" | "pipeline" | "email" | "contacts" }) {
  if (type === "chart") {
    return (
      <div className="flex items-end gap-1.5 h-10">
        {[40, 65, 50, 80, 70, 90, 85].map((h, i) => (
          <div
            key={i}
            className="w-2 rounded-sm"
            style={{
              height: `${h}%`,
              background: i >= 5 ? "var(--rf-green)" : "var(--rf-border)",
              opacity: i >= 5 ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    );
  }
  if (type === "pipeline") {
    return (
      <div className="flex items-center gap-2">
        {["var(--rf-cyan)", "var(--rf-amber)", "var(--rf-green)"].map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: c }} />
            {i < 2 && <div className="w-6 h-px" style={{ background: "var(--rf-border)" }} />}
          </div>
        ))}
      </div>
    );
  }
  if (type === "email") {
    return (
      <div className="relative w-10 h-8">
        <div className="absolute inset-0 rounded border border-[var(--rf-border)] bg-[var(--rf-surface)]" />
        <div className="absolute top-0 left-0 right-0 h-4 border-b border-[var(--rf-border)]" style={{
          clipPath: "polygon(0 0, 50% 100%, 100% 0)",
          background: "var(--rf-cyan)",
          opacity: 0.3,
        }} />
      </div>
    );
  }
  // contacts
  return (
    <div className="flex -space-x-2">
      {["var(--rf-cyan)", "var(--rf-green)", "var(--rf-amber)"].map((c, i) => (
        <div
          key={i}
          className="w-7 h-7 rounded-full border-2 border-[var(--rf-bg)] flex items-center justify-center text-[9px] font-mono font-bold"
          style={{ background: c, color: "var(--rf-bg)" }}
        >
          {["R", "M", "S"][i]}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── component ───────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--rf-bg)] text-[var(--rf-text)]">
      <Nav />
      <Hero />
      <StatsBar />
      <ProblemSolution />
      <Features />
      <HowItWorks />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─── Nav ─── */

function Nav() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl">
      <div className="flex items-center justify-between px-5 py-2.5 rounded-full border border-[var(--rf-border)] bg-[var(--rf-bg)]/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="font-[var(--font-serif)] italic text-lg text-white">
            Reply
          </span>
          <span className="font-bold text-lg text-[var(--rf-green)]">
            Flow
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitch variant="inline" />
          <Link
            href="/app"
            className="text-sm font-medium px-4 py-1.5 rounded-full text-[var(--rf-bg)] transition-all hover:opacity-90"
            style={{ background: "var(--rf-gradient)" }}
          >
            {isPt ? "Começar grátis" : "Get started"}
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */

function Hero() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const terminalLines = isPt ? TERMINAL_LINES_PT : TERMINAL_LINES_EN;
  const { displayedLines, currentLine, done } = useTypewriter(terminalLines, 30, 700);

  return (
    <section className="rf-grid-bg relative pt-28 pb-16 sm:pt-36 sm:pb-24 px-6 overflow-hidden">
      {/* Gradient glow orb */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[200px] sm:h-[300px] rounded-full opacity-[0.07] blur-[100px] pointer-events-none"
        style={{ background: "var(--rf-gradient)" }}
      />

      <div className="max-w-6xl mx-auto relative lg:grid lg:grid-cols-5 lg:gap-12 lg:items-center">
        {/* Left — copy (3 cols) */}
        <div className="lg:col-span-3 text-center lg:text-left mb-12 lg:mb-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--rf-border)] bg-[var(--rf-surface)] mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--rf-green)] animate-pulse" />
            <span className="text-xs font-mono text-[var(--rf-muted)]">
              {isPt ? "v1.0 — já disponível" : "v1.0 — now open"}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-[var(--font-serif)] italic tracking-tight leading-[1.08] mb-6">
            <span className="text-white">
              {isPt
                ? "Menos candidaturas no escuro."
                : "Stop applying blindly."}
            </span>
            <br />
            <span className="rf-gradient-text">
              {isPt
                ? "Mais entrevistas."
                : "Start getting interviews."}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--rf-muted)] max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed font-[var(--font-sans-display)]">
            {isPt
              ? "Conecte fontes de vagas, pontue matches contra seu perfil, envie outreach pelo Gmail e acompanhe follow-ups — tudo em um só lugar. Chega de planilha e 10 abas abertas."
              : "Connect job sources, score matches against your profile, send outreach via Gmail, and track follow-ups — all in one place. No more spreadsheets and 10 open tabs."}
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm text-[var(--rf-bg)] transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"
              style={{ background: "var(--rf-gradient)" }}
            >
              <span className="font-mono text-xs opacity-70">&gt;</span>
              {isPt ? "Escanear vagas agora" : "Scan your first jobs"}
            </Link>
            <Link
              href="/app/signin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--rf-border)] text-sm font-medium text-[var(--rf-muted)] hover:text-white hover:border-zinc-600 transition-all w-full sm:w-auto justify-center"
            >
              {isPt ? "Entrar" : "Sign in"}
            </Link>
          </div>

          <p className="mt-5 text-xs text-zinc-600 font-mono">
            {isPt ? "grátis para sempre — sem cartão — setup em 5 min" : "free forever — no credit card — setup in 5 min"}
          </p>
        </div>

        {/* Right — terminal (2 cols) */}
        <div className="lg:col-span-2">
          <div className="rf-terminal shadow-2xl">
            <div className="rf-terminal-bar">
              <div className="rf-terminal-dot" />
              <div className="rf-terminal-dot" />
              <div className="rf-terminal-dot" />
              <span className="ml-2 text-xs text-[var(--rf-muted)] font-mono">replyflow</span>
            </div>
            <div className="p-4 font-mono text-[13px] leading-relaxed min-h-[260px]">
              {displayedLines.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("  ✓")
                      ? "text-[var(--rf-green)]"
                      : "text-[var(--rf-muted)]"
                  }
                >
                  {line}
                </div>
              ))}
              {!done && <span className="rf-cursor" />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── StatsBar ─── */

function StatsBar() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const revealRef = useScrollReveal(0.2);

  return (
    <section className="relative border-t border-[var(--rf-border)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--rf-cyan)] to-transparent opacity-40" />
      <div
        ref={revealRef}
        className="rf-reveal max-w-5xl mx-auto px-6 py-12"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <StatItem key={stat.enLabel} stat={stat} isPt={isPt} />
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--rf-border)] flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-zinc-600 font-mono">
          <span>{isPt ? "OAuth seguro via Gmail" : "Secure Gmail OAuth"}</span>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <span>{isPt ? "Seus dados ficam com você" : "Your data stays yours"}</span>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <span>{isPt ? "Cancele quando quiser" : "Cancel anytime"}</span>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <span>{isPt ? "Feito para devs BR" : "Built for BR developers"}</span>
        </div>
      </div>
    </section>
  );
}

function StatItem({ stat, isPt }: { stat: typeof STATS[number]; isPt: boolean }) {
  const { ref, value } = useAnimatedCounter(stat.value);

  return (
    <div className="text-center">
      <span ref={ref} className="text-3xl sm:text-4xl font-mono font-bold text-white">
        {value}
        <span className="text-[var(--rf-cyan)]">{stat.suffix}</span>
      </span>
      <p className="mt-1 text-xs text-[var(--rf-muted)] uppercase tracking-wider">
        {isPt ? stat.ptLabel : stat.enLabel}
      </p>
    </div>
  );
}

/* ─── Problem / Solution ─── */

function ProblemSolution() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const revealRef = useScrollReveal();

  const pain = WHY_USE_ITEMS[0];
  const solution = WHY_USE_ITEMS[1];
  const outcome = WHY_USE_ITEMS[2];

  return (
    <section className="relative py-24 px-6 border-t border-[var(--rf-border)] overflow-hidden">
      <div
        className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-[720px] h-[280px] blur-[120px] opacity-20"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.28) 0%, rgba(34,197,94,0) 70%)" }}
      />

      <div ref={revealRef} className="rf-reveal max-w-6xl mx-auto relative">
        <div className="text-center mb-14">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            {isPt ? "POR QUE USAR" : "WHY USE IT"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-[var(--font-serif)] italic text-white tracking-tight max-w-3xl mx-auto">
            {isPt ? "Você não precisa de mais vagas. Precisa de um sistema." : "You don't need more listings. You need a system."}
          </h2>
        </div>

        {/* Asymmetric pain / solution cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Pain card */}
          <article
            className="relative overflow-hidden p-6 rounded-xl border border-[var(--rf-border)] bg-[var(--rf-surface)] hover:border-zinc-500 transition-all duration-300"
            style={{ transitionDelay: "100ms" }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-400/50 via-amber-300/40 to-transparent" />
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center justify-center text-sm font-mono text-red-400">
                !
              </div>
              <span className="text-[10px] font-mono text-red-400/70 uppercase tracking-widest">
                {isPt ? "PROBLEMA" : "PROBLEM"}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              {isPt ? pain.ptTitle : pain.enTitle}
            </h3>
            <p className="text-sm text-[var(--rf-muted)] leading-relaxed">
              {isPt ? pain.ptDesc : pain.enDesc}
            </p>
          </article>

          {/* Solution card */}
          <article
            className="relative overflow-hidden p-6 rounded-xl border border-[var(--rf-border)] bg-[var(--rf-surface)] hover:border-zinc-500 transition-all duration-300"
            style={{ transitionDelay: "200ms" }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/50 via-emerald-300/40 to-transparent" />
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-sm font-mono text-emerald-400">
                &gt;
              </div>
              <span className="text-[10px] font-mono text-emerald-400/70 uppercase tracking-widest">
                {isPt ? "SOLUÇÃO" : "SOLUTION"}
              </span>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              {isPt ? solution.ptTitle : solution.enTitle}
            </h3>
            <p className="text-sm text-[var(--rf-muted)] leading-relaxed">
              {isPt ? solution.ptDesc : solution.enDesc}
            </p>
          </article>
        </div>

        {/* Outcome pull-quote */}
        <article
          className="relative overflow-hidden p-8 rounded-xl border border-[var(--rf-border)] bg-[var(--rf-surface)]/60"
          style={{ transitionDelay: "300ms" }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/50 via-emerald-300/40 to-transparent" />
          <p className="text-lg sm:text-xl font-[var(--font-serif)] italic text-white text-center leading-relaxed">
            &ldquo;{isPt ? outcome.ptDesc : outcome.enDesc}&rdquo;
          </p>
          <p className="text-xs font-mono text-[var(--rf-cyan)] text-center mt-3 uppercase tracking-widest">
            {isPt ? outcome.ptTitle : outcome.enTitle}
          </p>
        </article>
      </div>
    </section>
  );
}

/* ─── Features (Bento) ─── */

function Features() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const revealRef = useScrollReveal();

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)] bg-[var(--rf-surface)]/50">
      <div ref={revealRef} className="rf-reveal max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            {isPt ? "PILARES" : "CORE PILLARS"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-[var(--font-serif)] italic text-white">
            {isPt ? "Tudo que move sua busca. Reunido." : "Everything that moves your search. Together."}
          </h2>
        </div>

        <div className="rf-bento">
          {BENTO_FEATURES.map((f, i) => (
            <article
              key={f.title}
              className={`relative overflow-hidden p-6 rounded-xl border border-[var(--rf-border)] bg-[var(--rf-bg)] rf-glow-hover transition-all group ${
                f.size === "wide" ? "rf-bento-wide" : ""
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400/50 via-emerald-300/40 to-transparent" />
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] font-mono text-[var(--rf-cyan)] uppercase tracking-widest">
                    {f.tag}
                  </span>
                </div>
                <FeatureVisual type={f.visual} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {isPt ? f.ptTitle : f.title}
              </h3>
              <p className="text-sm text-[var(--rf-muted)] leading-relaxed">
                {isPt ? f.ptDesc : f.desc}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-zinc-600 font-mono">
            {isPt
              ? "\"Goodbye, planilha. Goodbye, 10 abas.\""
              : "\"Goodbye, spreadsheet. Goodbye, 10 tabs.\""}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */

function HowItWorks() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const revealRef = useScrollReveal();

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)]">
      <div ref={revealRef} className="rf-reveal max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            {isPt ? "COMO FUNCIONA" : "HOW IT WORKS"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-[var(--font-serif)] italic text-white tracking-tight">
            {isPt ? "De zero a outreach em 5 minutos." : "From zero to outreach in 5 minutes."}
          </h2>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-[44px] left-[16.66%] right-[16.66%] h-px border-t-2 border-dashed border-[var(--rf-border)]" />

          {HOW_IT_WORKS.map((item, i) => (
            <div
              key={item.step}
              className="relative text-center"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="relative z-10 w-16 h-16 mx-auto mb-5 rounded-2xl border border-[var(--rf-border)] bg-[var(--rf-surface)] flex items-center justify-center">
                <span className="text-2xl font-mono font-bold rf-gradient-text">
                  {item.step}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {isPt ? item.ptTitle : item.enTitle}
              </h3>
              <p className="text-sm text-[var(--rf-muted)] leading-relaxed max-w-xs mx-auto">
                {isPt ? item.ptDesc : item.enDesc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */

function Pricing() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const revealRef = useScrollReveal();

  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      period: isPt ? "para sempre" : "forever",
      desc: isPt ? "Comece agora. Sem cartão." : "Get started. No credit card.",
      features: [
        isPt ? "Fontes e syncs ilimitados" : "Unlimited sources & syncs",
        isPt ? "50 reveals de contato/mês" : "50 contact reveals/month",
        isPt ? "30 gerações de rascunho/mês" : "30 draft generations/month",
        isPt ? "10 envios/mês" : "10 sends/month",
        isPt ? "1 conta Gmail conectada" : "1 connected Gmail account",
      ],
      cta: isPt ? "Escanear vagas agora" : "Scan your first jobs",
      href: "/app",
      primary: false,
    },
    {
      name: "Pro",
      price: "R$ 49",
      period: isPt ? "/mês" : "/month",
      desc: isPt
        ? "Para devs em busca ativa. Sem limites, sem fricção."
        : "For active job seekers. No limits, no friction.",
      features: [
        isPt ? "Tudo do Free, sem limites" : "Everything in Free, unlimited",
        isPt ? "Reveals de contato ilimitados" : "Unlimited contact reveals",
        isPt ? "Geração de rascunho ilimitada" : "Unlimited draft generation",
        isPt ? "Envios ilimitados" : "Unlimited sends",
        isPt ? "Contas Gmail ilimitadas" : "Unlimited Gmail accounts",
        isPt ? "Histórico completo e analytics" : "Full history & analytics",
      ],
      cta: isPt ? "Ir ilimitado" : "Go unlimited",
      href: "/app/settings",
      primary: true,
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)] bg-[var(--rf-surface)]/50">
      <div ref={revealRef} className="rf-reveal max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            {isPt ? "PREÇOS" : "PRICING"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-[var(--font-serif)] italic text-white">
            {isPt ? "Comece grátis. Upgrade quando quiser." : "Start free. Upgrade when ready."}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl border transition-all hover:scale-[1.02] duration-300 ${
                plan.primary
                  ? "border-[var(--rf-green)]/30 bg-[var(--rf-bg)] rf-glow"
                  : "border-[var(--rf-border)] bg-[var(--rf-bg)]"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
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
                <span className="text-4xl font-mono font-bold text-white">
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
                    <span className="text-[var(--rf-green)] mt-0.5 text-xs">
                      &#10003;
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
  const revealRef = useScrollReveal();

  return (
    <section className="py-24 px-6 border-t border-[var(--rf-border)]">
      <div ref={revealRef} className="rf-reveal max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-[var(--font-serif)] italic text-white">
            {isPt ? "Perguntas comuns" : "Common questions"}
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden bg-[var(--rf-surface)] transition-colors duration-300 ${
                  isOpen ? "border-zinc-500" : "border-[var(--rf-border)] hover:border-zinc-600"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-white">
                    {isPt ? item.ptQ : item.q}
                  </span>
                  <span
                    className={`text-[var(--rf-muted)] font-mono text-lg transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: isOpen ? "300px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="px-6 pb-5">
                    <p className="text-sm text-[var(--rf-muted)] leading-relaxed">
                      {isPt ? item.ptA : item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */

function FinalCta() {
  const { locale } = useI18n();
  const isPt = locale === "pt-BR";
  const revealRef = useScrollReveal();

  return (
    <section className="relative py-24 px-6 border-t border-[var(--rf-border)] overflow-hidden">
      {/* Grid + gradient bg */}
      <div className="rf-grid-bg absolute inset-0 opacity-50" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[120px] opacity-[0.08] pointer-events-none"
        style={{ background: "var(--rf-gradient)" }}
      />

      <div ref={revealRef} className="rf-reveal relative max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-[var(--font-serif)] italic text-white tracking-tight mb-5">
          {isPt ? "Sua próxima entrevista começa aqui." : "Your next interview starts here."}
        </h2>
        <p className="text-base sm:text-lg text-[var(--rf-muted)] max-w-xl mx-auto mb-8 leading-relaxed">
          {isPt
            ? "Grátis para sempre. Sem cartão. Cancele quando quiser. Seus dados ficam com você."
            : "Free forever. No credit card. Cancel anytime. Your data stays yours."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-medium text-sm text-[var(--rf-bg)] transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"
            style={{ background: "var(--rf-gradient)" }}
          >
            <span className="font-mono text-xs opacity-70">&gt;</span>
            {isPt ? "Escanear vagas agora" : "Scan your first jobs"}
          </Link>
          <Link
            href="/app/signin"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--rf-border)] text-sm font-medium text-[var(--rf-muted)] hover:text-white hover:border-zinc-600 transition-all w-full sm:w-auto justify-center"
          >
            {isPt ? "Entrar" : "Sign in"}
          </Link>
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
    <footer className="border-t border-[var(--rf-border)]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-[var(--font-serif)] italic text-base text-zinc-500">
              Reply
            </span>
            <span className="font-bold text-base text-zinc-400">
              Flow
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/termos"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {isPt ? "Termos de Uso" : "Terms of Service"}
            </Link>
            <Link
              href="/privacidade"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {isPt ? "Privacidade" : "Privacy"}
            </Link>
          </div>

          <p className="text-xs text-zinc-600 font-mono">
            &copy; {new Date().getFullYear()} ReplyFlow
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--rf-border)]" />
    </footer>
  );
}

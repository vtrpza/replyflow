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
  const linesKey = lines.join(",");

  const start = useCallback(() => {
    setDisplayedLines([]);
    setCurrentLine(0);
    setDone(false);
  }, []);

  useEffect(() => {
    start();
  }, [linesKey, start]);

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
  { value: 1, suffix: "", enLabel: "Unified pipeline", ptLabel: "Pipeline único" },
  { value: 3, suffix: "+", enLabel: "Connected sources", ptLabel: "Fontes conectadas" },
  { value: 10, suffix: "+", enLabel: "Outreach templates", ptLabel: "Templates prontos" },
  { value: 2, suffix: "", enLabel: "Outreach languages", ptLabel: "Idiomas de outreach" },
];

const TERMINAL_LINES_EN = [
  "$ replyflow collect --sources github,greenhouse,lever",
  "  ✓ Opportunities centralized in one inbox",
  "$ replyflow prioritize --profile ./cv.json",
  "  ✓ High-fit roles ranked for this week",
  "$ replyflow outreach --lang en --account gmail",
  "  ✓ Personalized emails sent with full history",
  "$ replyflow followup --cadence 4d",
  "  ✓ Next actions scheduled per role and contact",
];

const TERMINAL_LINES_PT = [
  "$ replyflow collect --sources github,greenhouse,lever",
  "  ✓ Oportunidades centralizadas em um só inbox",
  "$ replyflow prioritize --profile ./cv.json",
  "  ✓ Vagas de maior fit rankeadas para a semana",
  "$ replyflow outreach --lang pt-br --account gmail",
  "  ✓ E-mails personalizados enviados com histórico",
  "$ replyflow followup --cadence 4d",
  "  ✓ Próximas ações agendadas por vaga e contato",
];

const WHY_USE_ITEMS = [
  {
    id: "pain",
    ptTitle: "Sem processo, sua busca vira ruído",
    ptDesc: "Vaga salva no LinkedIn, candidatura no ATS, contato no inbox, follow-up em lembrete solto. Você trabalha muito, mas sem clareza de prioridade e sem histórico confiável.",
    enTitle: "Without a system, your search turns into noise",
    enDesc: "Saved jobs in LinkedIn, ATS submissions elsewhere, recruiter contacts in inbox, follow-ups in random reminders. High effort, low clarity, weak continuity.",
  },
  {
    id: "solution",
    ptTitle: "Feito para busca de emprego no mercado real",
    ptDesc: "ReplyFlow unifica vaga, ATS, contato e outreach no mesmo fluxo. Você coleta oportunidades, prioriza por fit, contata com contexto e executa follow-up sem perder timing.",
    enTitle: "Built for real-market job search",
    enDesc: "ReplyFlow unifies jobs, ATS, contacts, and outreach in one flow. Collect opportunities, prioritize by fit, reach out with context, and follow up on schedule.",
  },
  {
    id: "outcome",
    ptTitle: "Direção e consistência no que importa",
    ptDesc: "Menos candidaturas no escuro. Mais clareza de decisão, mais disciplina de execução e mais oportunidades reais de resposta.",
    enTitle: "Direction and consistency where it matters",
    enDesc: "Fewer blind applications. Better decisions, more disciplined execution, and more real reply opportunities.",
  },
];

const BENTO_FEATURES = [
  {
    size: "wide" as const,
    visual: "chart" as const,
    tag: "RADAR",
    title: "Job radar with context",
    desc: "Consolidate openings with enough context to decide where to invest your time first. Why it matters: fewer low-signal applications.",
    ptTitle: "Radar de vagas com contexto",
    ptDesc: "Consolida oportunidades com contexto para decidir onde investir energia primeiro. Por que importa: menos candidatura de baixo sinal.",
  },
  {
    size: "normal" as const,
    visual: "pipeline" as const,
    tag: "PIPELINE",
    title: "ATS and outreach in one timeline",
    desc: "Each role keeps stage, messages, and next step together. Why it matters: you stop losing status across tools.",
    ptTitle: "ATS e outreach na mesma linha do tempo",
    ptDesc: "Cada vaga mantém etapa, mensagens e próxima ação no mesmo registro. Por que importa: você para de perder contexto entre ferramentas.",
  },
  {
    size: "normal" as const,
    visual: "contacts" as const,
    tag: "CRM",
    title: "Recruiter CRM per opportunity",
    desc: "Keep contacts and conversation history linked to each opening. Why it matters: relationships do not disappear in your inbox.",
    ptTitle: "CRM de recrutadores por oportunidade",
    ptDesc: "Organiza contatos e histórico de conversa por vaga. Por que importa: relacionamento não se perde no inbox.",
  },
  {
    size: "normal" as const,
    visual: "email" as const,
    tag: "GMAIL",
    title: "Outreach with editable templates",
    desc: "Send personalized PT-BR or EN emails from your own Gmail. Why it matters: faster execution without generic messaging.",
    ptTitle: "Outreach com templates editáveis",
    ptDesc: "Envie mensagens personalizadas em PT-BR ou EN pelo seu Gmail. Por que importa: mais velocidade sem parecer texto genérico.",
  },
  {
    size: "normal" as const,
    visual: "pipeline" as const,
    tag: "FOLLOW-UP",
    title: "Consistent follow-up cadence",
    desc: "Track attempts, replies, and pending actions per role. Why it matters: consistency where most candidates fail.",
    ptTitle: "Cadência de follow-up consistente",
    ptDesc: "Registra tentativas, respostas e pendências por vaga. Por que importa: consistência onde a maioria falha.",
  },
  {
    size: "wide" as const,
    visual: "chart" as const,
    tag: "PRIORIZATION",
    title: "Prioritization by technical fit",
    desc: "Rank your week by technical alignment and context quality. Why it matters: better allocation of effort and attention.",
    ptTitle: "Priorização por fit técnico",
    ptDesc: "Ranqueia sua semana por aderência técnica e qualidade de contexto. Por que importa: melhor alocação de esforço e atenção.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    enTitle: "Connect sources",
    enDesc: "Bring jobs and contacts into one flow from your core channels.",
    ptTitle: "Conecte suas fontes",
    ptDesc: "Traga vagas e contatos para um fluxo único a partir dos seus canais principais.",
  },
  {
    step: "02",
    enTitle: "Prioritize and contact",
    enDesc: "Select what deserves effort first, personalize your message, and keep every action logged.",
    ptTitle: "Priorize e contate",
    ptDesc: "Defina o que merece esforço primeiro, personalize a mensagem e registre cada ação.",
  },
  {
    step: "03",
    enTitle: "Execute follow-ups",
    enDesc: "Keep ATS and outreach in sync with a clear cadence and complete history per opportunity.",
    ptTitle: "Faça follow-up",
    ptDesc: "Mantenha ATS e contato direto sincronizados com cadência clara e histórico completo por oportunidade.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is ReplyFlow a job board?",
    a: "No. It is an execution system for your search: jobs, ATS stages, recruiter contacts, and follow-ups in one operational flow.",
    ptQ: "A ReplyFlow é um job board?",
    ptA: "Não. É um sistema de execução da busca: vagas, etapas de ATS, contatos e follow-ups no mesmo fluxo operacional.",
  },
  {
    q: "Do I need outreach for it to be useful?",
    a: "No. You can use it only for ATS organization and prioritization. Outreach becomes an optional execution layer when you are ready.",
    ptQ: "Preciso fazer outreach para valer a pena?",
    ptA: "Não. Você pode usar só para organização de ATS e priorização. Outreach entra como camada opcional quando fizer sentido.",
  },
  {
    q: "Can I use ReplyFlow only for ATS tracking?",
    a: "Yes. Start with pipeline tracking, stage visibility, and next actions. Add outreach and CRM only when you need it.",
    ptQ: "Posso usar apenas para organizar ATS?",
    ptA: "Sim. Comece pelo controle de pipeline, status e próximas ações. Depois adicione outreach e CRM se precisar.",
  },
  {
    q: "How does Gmail sending work?",
    a: "You connect Gmail via OAuth and send from your own account with editable templates. Every send is linked to the related role and contact history.",
    ptQ: "Como funciona o envio com Gmail?",
    ptA: "Você conecta seu Gmail via OAuth e envia pela sua própria conta com templates editáveis. Cada envio fica ligado à vaga e ao histórico do contato.",
  },
  {
    q: "Is it secure?",
    a: "Security is handled through scoped OAuth permissions and controlled access to your connected account data.",
    ptQ: "É seguro?",
    ptA: "A segurança é tratada com permissões OAuth escopadas e controle de acesso aos dados das contas conectadas.",
  },
  {
    q: "Does it work for Brazil and international roles?",
    a: "Yes. You can run one process for Brazilian and global opportunities, including outreach in PT-BR and English.",
    ptQ: "Funciona para vagas no Brasil e internacionais?",
    ptA: "Sim. Você pode operar o mesmo processo para oportunidades no Brasil e fora, com outreach em PT-BR e inglês.",
  },
  {
    q: "Does it replace LinkedIn, Gupy, or Greenhouse?",
    a: "No. It does not replace those channels. It organizes your operation across them so context and follow-up execution stay consistent.",
    ptQ: "Substitui LinkedIn, Gupy ou Greenhouse?",
    ptA: "Não. Ele não substitui esses canais. Ele organiza sua operação entre eles para manter contexto e follow-up consistentes.",
  },
  {
    q: "Does ReplyFlow guarantee interviews?",
    a: "No. It improves process quality and execution consistency. Interview outcomes still depend on fit, communication, and market timing.",
    ptQ: "A ReplyFlow garante entrevistas?",
    ptA: "Não. Ela melhora qualidade de processo e consistência de execução. O resultado ainda depende de fit, comunicação e timing de mercado.",
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
  const { displayedLines, done } = useTypewriter(terminalLines, 30, 700);

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
              {isPt ? "para devs mid-senior em busca ativa" : "for mid-senior devs in active search"}
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
              ? "ReplyFlow transforma sua busca de emprego em um sistema operacional: você organiza oportunidades em um fluxo único, prioriza onde vale investir energia e mantém follow-up consistente."
              : "ReplyFlow turns your job search into an operating system: organize opportunities in one flow, prioritize where effort matters, and keep follow-ups consistent."}
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm text-[var(--rf-bg)] transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"
              style={{ background: "var(--rf-gradient)" }}
            >
              <span className="font-mono text-xs opacity-70">&gt;</span>
              {isPt ? "Começar grátis" : "Start free"}
            </Link>
            <Link
              href="#como-funciona"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--rf-border)] text-sm font-medium text-[var(--rf-muted)] hover:text-white hover:border-zinc-600 transition-all w-full sm:w-auto justify-center"
            >
              {isPt ? "Ver o fluxo na prática" : "See the flow in action"}
            </Link>
          </div>

          <p className="mt-5 text-xs text-zinc-600 font-mono">
            {isPt ? "comece sem custo — organize sua busca com método" : "start free — run your search with structure"}
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
            {isPt ? "Você não precisa de mais vagas. Precisa de direção." : "You don't need more listings. You need direction."}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[var(--rf-muted)] max-w-2xl mx-auto">
            {isPt
              ? "Menos improviso, mais processo: um fluxo único para decidir melhor e executar com consistência."
              : "Less improvisation, more process: one flow to decide better and execute with consistency."}
          </p>
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
            {isPt ? "Pilares operacionais para busca séria." : "Operational pillars for serious job search."}
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
              ? "\"Menos ruído. Mais direção de execução.\""
              : "\"Less noise. More execution direction.\""}
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
    <section id="como-funciona" className="py-24 px-6 border-t border-[var(--rf-border)]">
      <div ref={revealRef} className="rf-reveal max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-[var(--rf-cyan)] uppercase tracking-widest mb-3">
            {isPt ? "COMO FUNCIONA" : "HOW IT WORKS"}
          </p>
          <h2 className="text-3xl sm:text-4xl font-[var(--font-serif)] italic text-white tracking-tight">
            {isPt ? "Um processo simples para operar sua busca." : "A simple process to run your search."}
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
      desc: isPt ? "Estruture sua rotina sem custo inicial." : "Structure your routine with zero upfront cost.",
      features: [
        isPt ? "Fontes e syncs ilimitados" : "Unlimited sources & syncs",
        isPt ? "50 reveals de contato/mês" : "50 contact reveals/month",
        isPt ? "30 gerações de rascunho/mês" : "30 draft generations/month",
        isPt ? "10 envios/mês" : "10 sends/month",
        isPt ? "1 conta Gmail conectada" : "1 connected Gmail account",
      ],
      cta: isPt ? "Começar grátis" : "Start free",
      href: "/app",
      primary: false,
    },
    {
      name: "Pro",
      price: "R$ 49",
      period: isPt ? "/mês" : "/month",
      desc: isPt
        ? "Para busca ativa com volume e disciplina."
        : "For active search with volume and consistency.",
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
            {isPt ? "Comece grátis. Evolua com método." : "Start free. Scale with method."}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[var(--rf-muted)] max-w-2xl mx-auto">
            {isPt
              ? "Sem promessas milagrosas. O valor está em melhorar sua execução semana após semana."
              : "No miracle promises. The value is improving execution week after week."}
          </p>
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
        <p className="mt-8 text-xs text-zinc-600 font-mono text-center">
          {isPt
            ? "Comece sem custo. Faça upgrade quando precisar de mais volume e automação."
            : "Start free. Upgrade when you need more volume and automation."}
        </p>
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
          {isPt ? "Pare de improvisar sua busca de emprego." : "Stop improvising your job search."}
        </h2>
        <p className="text-base sm:text-lg text-[var(--rf-muted)] max-w-xl mx-auto mb-8 leading-relaxed">
          {isPt
            ? "Organize seu pipeline, priorize melhor e execute com consistência do primeiro contato ao follow-up."
            : "Organize your pipeline, prioritize better, and execute consistently from first contact to follow-up."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-medium text-sm text-[var(--rf-bg)] transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center"
            style={{ background: "var(--rf-gradient)" }}
          >
            <span className="font-mono text-xs opacity-70">&gt;</span>
            {isPt ? "Começar grátis no ReplyFlow" : "Start free on ReplyFlow"}
          </Link>
          <Link
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--rf-border)] text-sm font-medium text-[var(--rf-muted)] hover:text-white hover:border-zinc-600 transition-all w-full sm:w-auto justify-center"
          >
            {isPt ? "Ver como funciona em 3 etapas" : "See the 3-step flow"}
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

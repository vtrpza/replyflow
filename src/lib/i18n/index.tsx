"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "pt-BR" | "en";

type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const STORAGE_KEY = "replyflow.locale";
const DEFAULT_LOCALE: Locale = "pt-BR";

function isLocale(value: string | null): value is Locale {
  return value === "pt-BR" || value === "en";
}

function resolveBrowserLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const browserLocales =
    window.navigator.languages.length > 0
      ? window.navigator.languages
      : [window.navigator.language];

  for (const browserLocale of browserLocales) {
    if (browserLocale.toLowerCase().startsWith("pt")) {
      return "pt-BR";
    }

    if (browserLocale.toLowerCase().startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

function resolveInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const storedLocale = window.localStorage.getItem(STORAGE_KEY);
  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  return resolveBrowserLocale();
}

const messages: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    "language.switch": "Idioma",
    "language.pt": "PT",
    "language.en": "EN",

    "sidebar.operatorPanel": "painel operador",
    "sidebar.outreachPipeline": "job search framework",
    "sidebar.navigation": "navegacao",
    "sidebar.quickAction": "acao rapida",
    "sidebar.syncJobs": "Sincronizar Vagas",
    "sidebar.syncing": "Sincronizando...",
    "sidebar.syncFailed": "Falha na sincronizacao",
    "sidebar.syncLimitReached": "Sincronizacao indisponivel no momento.",
    "sidebar.unknownError": "Erro desconhecido",
    "sidebar.alreadyUpToDate": "Ja esta atualizado",
    "sidebar.newJobsFound": "{count} vagas novas encontradas",
    "sidebar.nav.dashboard": "Dashboard",
    "sidebar.nav.jobs": "Vagas",
    "sidebar.nav.sources": "Fontes",
    "sidebar.nav.compose": "Escrever",
    "sidebar.nav.history": "Historico",
    "sidebar.nav.contacts": "Contatos",
    "sidebar.nav.outreach": "Outreach",
    "sidebar.nav.settings": "Configuracoes",
    "sidebar.nav.billing": "Assinatura",

    "signin.tagline": "Framework para devs brasileiros conseguirem entrevistas mais rapido",
    "signin.welcomeBack": "Bem-vindo de volta",
    "signin.description": "Entre para organizar vagas, ATS e contatos diretos em um unico sistema",
    "signin.continueGoogle": "Continuar com Google",
    "signin.disclaimer": "Ao entrar, voce concorda em conectar sua conta Gmail para envio de emails",

    "compose.fillRecipientSubject": "Preencha destinatario e assunto",
    "compose.connectAccountFirst": "Conecte uma conta de email primeiro",
    "compose.sendLimitReached": "Limite de envios atingido. Faca upgrade para Pro em Assinatura.",
    "compose.emailSent": "Email enviado com sucesso!",
    "compose.sendFailed": "Falha ao enviar: {error}",
    "compose.sendFailedGeneric": "Falha ao enviar email",
    "compose.noAccountTitle": "Nenhuma conta de email conectada",
    "compose.noAccountDescription": "Conecte sua conta Gmail em Configuracoes para comecar a enviar emails.",
    "compose.goToSettings": "Ir para Configuracoes",
    "compose.title": "Escrever Email",
    "compose.subtitle": "Envie email pela sua conta Gmail conectada",
    "compose.from": "De",
    "compose.to": "Para",
    "compose.subject": "Assunto",
    "compose.emailSubject": "Assunto do email",
    "compose.bodyHtml": "Corpo (HTML)",
    "compose.plainText": "Texto puro (opcional - gerado automaticamente do HTML se vazio)",
    "compose.plainTextPlaceholder": "Versao em texto puro...",
    "compose.sendEmail": "Enviar Email",
    "compose.default": " (Padrao)",
    "compose.permissionsHint": "Os emails serao enviados pela sua conta Gmail conectada. Garanta que as permissoes necessarias foram concedidas em Configuracoes.",

    "onboarding.welcome.title": "Bem-vindo ao ReplyFlow",
    "onboarding.welcome.subtitle": "Seu sistema de job search em 4 passos",
    "onboarding.welcome.step.welcome": "Entenda o sistema",
    "onboarding.welcome.step.profile": "Configure seu perfil",
    "onboarding.welcome.step.sources": "Revise suas fontes",
    "onboarding.welcome.step.first_action": "Explore vagas",
    "onboarding.welcome.cta": "Comecar",
    "onboarding.welcome.skip": "Pular onboarding",
    "onboarding.checklist.title": "Primeiros passos",
    "onboarding.checklist.progress": "{completed}/{total} concluidos",
    "onboarding.checklist.done.title": "Tudo pronto!",
    "onboarding.checklist.done.message": "Voce configurou tudo. Bom trabalho!",
    "onboarding.checklist.dismiss": "Fechar",
    "onboarding.checklist.goTo": "Ir para",
    "onboarding.hint.profile": "Configure seu perfil com pelo menos 2 skills para melhorar o match de vagas.",
    "onboarding.hint.sources": "Revise suas fontes de vagas. Elas ja foram provisionadas automaticamente.",
    "onboarding.hint.jobs": "Explore as vagas e revele um contato ou crie um rascunho para completar o onboarding.",
    "onboarding.hint.markDone": "Marcar como feito",

    "contractType.CLT": "CLT",
    "contractType.PJ": "PJ",
    "contractType.Freela": "Freela",
    "contractType.Internship": "Estágio",
    "contractType.Unknown": "Desconhecido",
    "matchReason.contractLabel": "Contrato: ",
  },
  en: {
    "language.switch": "Language",
    "language.pt": "PT",
    "language.en": "EN",

    "sidebar.operatorPanel": "operator panel",
    "sidebar.outreachPipeline": "job search framework",
    "sidebar.navigation": "navigation",
    "sidebar.quickAction": "quick action",
    "sidebar.syncJobs": "Sync Jobs",
    "sidebar.syncing": "Syncing...",
    "sidebar.syncFailed": "Sync failed",
    "sidebar.syncLimitReached": "Sync is currently unavailable.",
    "sidebar.unknownError": "Unknown error",
    "sidebar.alreadyUpToDate": "Already up to date",
    "sidebar.newJobsFound": "{count} new jobs found",
    "sidebar.nav.dashboard": "Dashboard",
    "sidebar.nav.jobs": "Jobs",
    "sidebar.nav.sources": "Sources",
    "sidebar.nav.compose": "Compose",
    "sidebar.nav.history": "History",
    "sidebar.nav.contacts": "Contacts",
    "sidebar.nav.outreach": "Outreach",
    "sidebar.nav.settings": "Settings",
    "sidebar.nav.billing": "Billing",

    "signin.tagline": "Framework for Brazilian devs to land interviews faster",
    "signin.welcomeBack": "Welcome back",
    "signin.description": "Sign in to run jobs intel, ATS tracking, and direct recruiter outreach in one system",
    "signin.continueGoogle": "Continue with Google",
    "signin.disclaimer": "By signing in, you agree to connect your Gmail account for sending emails",

    "compose.fillRecipientSubject": "Please fill in recipient and subject",
    "compose.connectAccountFirst": "Please connect an email account first",
    "compose.sendLimitReached": "Send limit reached. Upgrade to Pro in Billing.",
    "compose.emailSent": "Email sent successfully!",
    "compose.sendFailed": "Failed: {error}",
    "compose.sendFailedGeneric": "Failed to send email",
    "compose.noAccountTitle": "No Email Account Connected",
    "compose.noAccountDescription": "Connect your Gmail account in Settings to start sending emails.",
    "compose.goToSettings": "Go to Settings",
    "compose.title": "Compose Email",
    "compose.subtitle": "Send an email from your connected Gmail account",
    "compose.from": "From",
    "compose.to": "To",
    "compose.subject": "Subject",
    "compose.emailSubject": "Email subject",
    "compose.bodyHtml": "Body (HTML)",
    "compose.plainText": "Plain Text (optional - auto-generated from HTML if empty)",
    "compose.plainTextPlaceholder": "Plain text version...",
    "compose.sendEmail": "Send Email",
    "compose.default": " (Default)",
    "compose.permissionsHint": "Emails will be sent through your connected Gmail account. Make sure you have granted the necessary permissions in Settings.",

    "onboarding.welcome.title": "Welcome to ReplyFlow",
    "onboarding.welcome.subtitle": "Your job search system in 4 steps",
    "onboarding.welcome.step.welcome": "Understand the system",
    "onboarding.welcome.step.profile": "Set up your profile",
    "onboarding.welcome.step.sources": "Review your sources",
    "onboarding.welcome.step.first_action": "Explore matched jobs",
    "onboarding.welcome.cta": "Get started",
    "onboarding.welcome.skip": "Skip onboarding",
    "onboarding.checklist.title": "Getting started",
    "onboarding.checklist.progress": "{completed}/{total} completed",
    "onboarding.checklist.done.title": "All set!",
    "onboarding.checklist.done.message": "You've set up everything. Great job!",
    "onboarding.checklist.dismiss": "Dismiss",
    "onboarding.checklist.goTo": "Go to",
    "onboarding.hint.profile": "Set up your profile with at least 2 skills to improve job matching.",
    "onboarding.hint.sources": "Review your job sources. They were auto-provisioned for you.",
    "onboarding.hint.jobs": "Explore jobs and reveal a contact or create a draft to complete onboarding.",
    "onboarding.hint.markDone": "Mark as done",

    "contractType.CLT": "Employment (LATAM)",
    "contractType.PJ": "Contract",
    "contractType.Freela": "Freelance",
    "contractType.Internship": "Internship",
    "contractType.Unknown": "Unknown",
    "matchReason.contractLabel": "Contract: ",
  },
};

const I18nContext = createContext<I18nContextValue | null>(null);

function formatMessage(message: string, values?: TranslationValues): string {
  if (!values) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const resolved = resolveInitialLocale();
    if (resolved !== locale) {
      setLocale(resolved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: string, values?: TranslationValues): string => {
      const localeMessage = messages[locale][key];
      const defaultMessage = messages[DEFAULT_LOCALE][key];
      const finalMessage = localeMessage ?? defaultMessage ?? key;
      return formatMessage(finalMessage, values);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

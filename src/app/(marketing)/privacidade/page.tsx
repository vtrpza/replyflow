"use client";

import { useI18n } from "@/lib/i18n";

const content = {
  "pt-BR": {
    title: "Politica de Privacidade",
    lastUpdated: "Ultima atualizacao",
    intro:
      "A ReplyFlow se compromete a proteger sua privacidade. Esta Politica de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informacoes pessoais no uso do framework de busca de emprego.",
    sections: [
      {
        title: "1. Dados que Coletamos",
        content:
          "Coletamos: (a) Informacoes da conta Google OAuth (nome, email, foto); (b) Dados de perfil que voce fornece (nome, highlights profissionais, preferencias de idioma); (c) Dados de job search e CRM (vagas salvas, estagios ATS, contatos/recrutadores, historico de outreach); (d) Dados de uso do servico (emails enviados, metricas de engagement); (e) Informacoes do dispositivo e log de acesso.",
      },
      {
        title: "2. Como Usamos seus Dados",
        content:
          "Usamos seus dados para: (a) Fornecer e melhorar nossos servicos; (b) Personalizar sua experiencia; (c) Enviar comunicacoes relacionadas ao servico; (d) Analisarmetricas de uso para aprimoramento do produto; (e) Cumprir obrigações legais.",
      },
      {
        title: "3. Armazenamento e Seguranca",
        content:
          "Seus dados sao armazenados em servidores seguros no Brasil e nos EUA. Implementamos medidas tecnicas e organizacionais para proteger seus dados contra acesso nao autorizado, alteracao, divulgacao ou destruicao. Однако, nenhum metodo de transmissao pela internet e 100% seguro.",
      },
      {
        title: "4. Cookies e Tecnologias Similar",
        content:
          "Utilizamos cookies e tecnologias de rastreamento para melhorar sua experiencia. Cookies sao arquivos de texto pequenos armazenados no seu navegador. Voce pode bloquear cookies atraves das configuracoes do navegador, mas isso pode afetar funcionalidades do servico.",
      },
      {
        title: "5. Servicos de Terceiros",
        content:
          "Utilizamos servicos de terceiros para: (a) Autenticacao Google OAuth; (b) Hospedagem e infraestrutura (Vercel/Netlify); (c) Analytics. Esses provedores tem suas proprias politicas de privacidade. Recomendamos que voce as revise.",
      },
      {
        title: "6. Compartilhamento de Dados",
        content:
          "Nao vendemos seus dados pessoais. Compartilhamos dados apenas: (a) Com seu consentimento; (b) Para cumprir obrigacoes legais; (c) Com provedores de servicos que nos auxiliam (sob acordo de confidencialidade); (d) Em caso de fusao, venda ou reorganizacao empresarial.",
      },
      {
        title: "7. Seus Direitos (LGPD)",
        content:
          "Nos termos da Lei Geral de Protecao de Dados (Lei 13.709/2018), voce tem direito a: (a) Confirmar a existencia de tratamento; (b) Acessar seus dados; (c) Corrigir dados incompletos ou desatualizados; (d) Solicitar eliminacao de dados; (e) Revogar consentimento. Para exercer esses direitos, entre em contato.",
      },
      {
        title: "8. Retencao de Dados",
        content:
          "Mantemos seus dados enquanto sua conta estiver ativa ou pelo tempo necessario para fornecer os servicos. Voce pode solicitar a exclusao de sua conta e dados a qualquer momento. Apos solicitacao de exclusao, removemos seus dados em ate 30 dias.",
      },
      {
        title: "9. Transferencias Internacionais",
        content:
          "Seus dados podem ser transferidos para servidores fora do Brasil. Garantimos que tais transferencias sejam realizadas em conformidade com a LGPD e outras aplicaveis leis de protecao de dados.",
      },
      {
        title: "10. Menores de Idade",
        content:
          "O ReplyFlow nao coleta intencionalmente informacoes de menores de 18 anos. Se descobrirmos que coletamos dados de um menor, excluiremos tais informacoes imediatamente.",
      },
      {
        title: "11. Alteracoes nesta Politica",
        content:
          "Podemos alterar esta Politica de Privacidade periodicamente. Notificaremos sobre alteracoes significativas atraves do servico ou por email. A versao mais atual estara sempre disponivel nesta pagina.",
      },
      {
        title: "12. Contato",
        content:
          "Se voce tiver duvidas sobre esta Politica de Privacidade ou deseja exercer seus direitos, entre em contato em contato@replyflow.com.br.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated",
    intro:
      "ReplyFlow is committed to protecting your privacy. This Privacy Policy describes how we collect, use, store, and protect your personal information while you use our job search framework.",
    sections: [
      {
        title: "1. Data We Collect",
        content:
          "We collect: (a) Google OAuth account information (name, email, photo); (b) Profile data you provide (name, professional highlights, language preferences); (c) Job search and CRM data (saved jobs, ATS stages, recruiter contacts, outreach history); (d) Service usage data (emails sent, engagement metrics); (e) Device information and access logs.",
      },
      {
        title: "2. How We Use Your Data",
        content:
          "We use your data to: (a) Provide and improve our services; (b) Personalize your experience; (c) Send service-related communications; (d) Analyze usage metrics for product improvement; (e) Comply with legal obligations.",
      },
      {
        title: "3. Storage and Security",
        content:
          "Your data is stored on secure servers in Brazil and the USA. We implement technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission method is 100% secure.",
      },
      {
        title: "4. Cookies and Similar Technologies",
        content:
          "We use cookies and tracking technologies to improve your experience. Cookies are small text files stored in your browser. You can block cookies through browser settings, but this may affect service functionality.",
      },
      {
        title: "5. Third-Party Services",
        content:
          "We use third-party services for: (a) Google OAuth authentication; (b) Hosting and infrastructure (Vercel/Netlify); (c) Analytics. These providers have their own privacy policies. We recommend you review them.",
      },
      {
        title: "6. Data Sharing",
        content:
          "We do not sell your personal data. We share data only: (a) With your consent; (b) To comply with legal obligations; (c) With service providers who assist us (under confidentiality agreement); (d) In case of merger, sale, or business reorganization.",
      },
      {
        title: "7. Your Rights (LGPD)",
        content:
          "Under the General Data Protection Law (Lei 13.709/2018), you have the right to: (a) Confirm the existence of processing; (b) Access your data; (c) Correct incomplete or outdated data; (d) Request deletion of data; (e) Withdraw consent. To exercise these rights, contact us.",
      },
      {
        title: "8. Data Retention",
        content:
          "We retain your data while your account is active or as long as necessary to provide services. You may request account and data deletion at any time. Upon deletion request, we remove your data within 30 days.",
      },
      {
        title: "9. International Transfers",
        content:
          "Your data may be transferred to servers outside Brazil. We ensure such transfers are made in compliance with LGPD and other applicable data protection laws.",
      },
      {
        title: "10. Minors",
        content:
          "ReplyFlow does not intentionally collect information from minors under 18. If we discover we have collected data from a minor, we will delete such information immediately.",
      },
      {
        title: "11. Changes to This Policy",
        content:
          "We may update this Privacy Policy periodically. We will notify you of significant changes through the service or email. The current version will always be available on this page.",
      },
      {
        title: "12. Contact",
        content:
          "If you have questions about this Privacy Policy or wish to exercise your rights, contact us at contato@replyflow.com.br.",
      },
    ],
  },
};

export default function PrivacidadePage() {
  const { locale, setLocale } = useI18n();
  const isPt = locale === "pt-BR";
  const c = isPt ? content["pt-BR"] : content.en;

  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          {c.title}
        </h1>
        <p className="text-sm text-[var(--rf-muted)]">
          {c.lastUpdated}: February 27, 2026
        </p>
        <button
          onClick={() => setLocale(isPt ? "en" : "pt-BR")}
          className="mt-4 text-xs font-mono text-[var(--rf-cyan)] hover:text-white transition-colors"
        >
          [{isPt ? "View in English" : "Ver em Portugues"}]
        </button>
      </header>

      <div className="prose prose-invert max-w-none">
        <p className="text-sm text-[var(--rf-muted)] leading-relaxed mb-10">
          {c.intro}
        </p>

        {c.sections.map((section) => (
          <section key={section.title} className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-3">
              {section.title}
            </h2>
            <p className="text-sm text-[var(--rf-muted)] leading-relaxed">
              {section.content}
            </p>
          </section>
        ))}
      </div>
    </>
  );
}

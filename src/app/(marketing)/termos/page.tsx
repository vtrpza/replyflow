"use client";

import { useI18n } from "@/lib/i18n";

const content = {
  "pt-BR": {
    title: "Termos de Uso",
    lastUpdated: "Ultima atualizacao",
    sections: [
      {
        title: "1. Aceitacao dos Termos",
        content:
          "Ao acessar e usar o ReplyFlow, voce concorda em cumprir estes Termos de Uso. Se voce nao concordar com qualquer parte destes termos, nao devera usar nosso servico.",
      },
      {
        title: "2. Descricao do Servico",
        content:
          "O ReplyFlow e um framework de busca de emprego para desenvolvedores, incluindo coleta de vagas, inteligencia de oportunidades, CRM de contatos, acompanhamento de ATS e outreach direto. O servico e fornecido como esta, sem garantias de qualquer tipo.",
      },
      {
        title: "3. Elegibilidade",
        content:
          "Voce deve ter pelo menos 18 anos e ser capaz de celebrar contratos legais para usar o ReplyFlow. Ao usar o servico, voce declara e garante que atende a estes requisitos.",
      },
      {
        title: "4. Contas de Usuario",
        content:
          "Voce e responsavel por manter a confidencialidade da sua conta e senha. Voce concorda em aceitar responsabilidade por todas as atividades que ocurram sob sua conta. Notifique-nos imediatamente sobre qualquer uso nao autorizado.",
      },
      {
        title: "5. Uso Proibido",
        content:
          "Voce concorda em NAO: (a) usar o servico para qualquer finalidade ilegal; (b) enviar spam ou emails nao solicitados; (c) tentar obter acesso nao autorizado a sistemas; (d) interferir no funcionamento do servico; (e) coletar informacoes de outros usuarios sem consentimento.",
      },
      {
        title: "6. Propriedade Intelectual",
        content:
          "O ReplyFlow e todo o seu conteudo, funcionalidades e funcionalidades sao propriedade da ReplyFlow e seus licenciantes. Voce nao pode copiar, modificar, distribuir, vender ou alugar qualquer parte do servico sem permissao previa por escrito.",
      },
      {
        title: "7. Limitacao de Responsabilidade",
        content:
          "Em nenhuma circunstancia a ReplyFlow sera responsavel por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou oportunidades, mesmo que tenhamos sido avisados da possibilidade de tais danos.",
      },
      {
        title: "8. Modificacoes do Servico",
        content:
          "Reservamos o direito de modificar ou descontinuar o servico (ou qualquer parte dele) a qualquer momento. Notificaremos sobre mudancas significativas quando possivel.",
      },
      {
        title: "9. Rescisao",
        content:
          "Podemos rescindir ou suspender seu acesso ao servico imediatamente, sem aviso previo, por qualquer motivo, incluindo violacao destes Termos. Upon rescisao, seu direito de usar o servico cessa imediatamente.",
      },
      {
        title: "10. Lei Aplicavel",
        content:
          "Estes Termos serao regidos pelas leis do Brasil. Qualquer disputa derivada destes termos sera resolvida nos tribunais brasileiros.",
      },
      {
        title: "11. Contato",
        content:
          "Se voce tiver alguma duvida sobre estes Termos, entre em contato conosco em contato@replyflow.com.br.",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    lastUpdated: "Last updated",
    sections: [
      {
        title: "1. Acceptance of Terms",
        content:
          "By accessing and using ReplyFlow, you agree to be bound by these Terms of Use. If you do not agree to any part of these terms, you should not use our service.",
      },
      {
        title: "2. Description of Service",
        content:
          "ReplyFlow is a job search framework for developers, including job gathering, opportunity intelligence, contact CRM, ATS tracking, and direct outreach. The service is provided as is, without any warranties.",
      },
      {
        title: "3. Eligibility",
        content:
          "You must be at least 18 years old and able to enter into legal contracts to use ReplyFlow. By using the service, you represent and warrant that you meet these requirements.",
      },
      {
        title: "4. User Accounts",
        content:
          "You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. Notify us immediately of any unauthorized use.",
      },
      {
        title: "5. Prohibited Use",
        content:
          "You agree NOT to: (a) use the service for any illegal purpose; (b) send spam or unsolicited emails; (c) attempt to gain unauthorized access to systems; (d) interfere with the service's operation; (e) collect information from other users without consent.",
      },
      {
        title: "6. Intellectual Property",
        content:
          "ReplyFlow and all its content, features, and functionality are owned by ReplyFlow and its licensors. You may not copy, modify, distribute, sell, or lease any part of the service without prior written permission.",
      },
      {
        title: "7. Limitation of Liability",
        content:
          "In no event shall ReplyFlow be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or opportunities, even if we have been advised of the possibility of such damages.",
      },
      {
        title: "8. Modifications to Service",
        content:
          "We reserve the right to modify or discontinue the service (or any part of it) at any time. We will notify you of significant changes when possible.",
      },
      {
        title: "9. Termination",
        content:
          "We may terminate or suspend your access to the service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the service ceases immediately.",
      },
      {
        title: "10. Governing Law",
        content:
          "These Terms shall be governed by the laws of Brazil. Any dispute arising from these terms will be resolved in Brazilian courts.",
      },
      {
        title: "11. Contact",
        content:
          "If you have any questions about these Terms, contact us at contato@replyflow.com.br.",
      },
    ],
  },
};

export default function TermosPage() {
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
          {c.lastUpdated}: 27 de Fevereiro de 2026
        </p>
        <button
          onClick={() => setLocale(isPt ? "en" : "pt-BR")}
          className="mt-4 text-xs font-mono text-[var(--rf-cyan)] hover:text-white transition-colors"
        >
          [{isPt ? "View in English" : "Ver em Portugues"}]
        </button>
      </header>

      <div className="prose prose-invert max-w-none">
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

/**
 * Seed default email templates for outreach.
 * Run with: npx tsx src/lib/db/seed-templates.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "gitjobs.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const now = new Date().toISOString();

const templates = [
  // ========== ENGLISH TEMPLATES ==========
  {
    id: generateId(),
    userId: null,
    name: "Direct Apply",
    description: "Found their job posting - direct, concise, value-focused",
    type: "initial",
    language: "en",
    subject: "{{job_title}} at {{company}}",
    subjectVariants: JSON.stringify([
      "Quick question about {{job_title}}",
      "Interested in {{job_title}} role",
      "{{job_title}} - quick question"
    ]),
    body: `Hi {{recipient_name}},

I came across your {{job_title}} opening and wanted to reach out directly.

A bit about me: {{your_highlight}}. I'm particularly excited about {{company}}'s {{specific_detail_about_company_or_product}}.

Would love to chat about how I can contribute to your team. Happy to hop on a 15-minute call whenever works for you.

Best,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Warm Outreach",
    description: "Referenced their codebase, project, or recent work",
    type: "initial",
    language: "en",
    subject: "Loved your work on {{project_name}}",
    subjectVariants: JSON.stringify([
      "Saw your {{project_name}} - impressive",
      "Your work on {{project_name}}",
      "Quick question about {{project_name}}"
    ]),
    body: `Hi {{recipient_name}},

I was checking out {{project_name}} and really liked {{specific_thing_you_liked}}. The way you handled {{specific_technical_detail}} is exactly the kind of thing I enjoy working on.

I've been working with {{your_tech_stack}} for {{years}} years, and I'd love to contribute to a team that's building {{company_mission}}.

Would you be open to a quick chat? I promise not to waste your time.

Best,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Referral Request",
    description: "Ask for referral without asking for a job",
    type: "initial",
    language: "en",
    subject: "Quick favor? ({{mutual_connection_or_interest}})",
    subjectVariants: JSON.stringify([
      "A quick favor",
      "Would you have 2 minutes?",
      "Quick question about {{company}}"
    ]),
    body: `Hi {{recipient_name}},

{{reason_for_reaching_out - mutual connection, shared interest, or found them on LinkedIn}}.

I'm exploring opportunities at {{company}} and noticed you're connected there. Would you be comfortable having a quick 10-minute call to share your experience?

No pressure at all - I'm just doing some research and would appreciate any insights you can share.

Thanks so much,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Follow-up #1",
    description: "First follow-up - new angle, no pressure",
    type: "followup_1",
    language: "en",
    subject: "Following up on {{job_title}}",
    subjectVariants: JSON.stringify([
      "Just checking in",
      "{{job_title}} - one more thing",
      "Quick update on my previous email"
    ]),
    body: `Hi {{recipient_name}},

Just wanted to bump this to the top of your inbox. I know you're busy.

I wanted to add that {{new_piece_of_value_or_relevant_experience}} that might be relevant to the role.

If the timing isn't right, no worries at all. Happy to reconnect when it makes sense.

Best,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Follow-up #2",
    description: "Final follow-up - offer new value, low-pressure CTA",
    type: "followup_2",
    language: "en",
    subject: "Last one, I promise",
    subjectVariants: JSON.stringify([
      "One final thought",
      "{{job_title}} - last attempt",
      "Final follow-up"
    ]),
    body: `Hi {{recipient_name}},

This is my last email on this topic, I promise.

I recently {{relevant_achievement_or_project}} that I think could bring value to {{company}}. Happy to share more details if interested.

If this isn't the right time, I completely understand. I'll stop here.

Best of luck with the search,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },

  // ========== PORTUGUESE (PT-BR) TEMPLATES ==========
  {
    id: generateId(),
    userId: null,
    name: "Candidatura Direta",
    description: "Encontrou a vaga - direto, conciso, focado em valor",
    type: "initial",
    language: "pt-BR",
    subject: "{{job_title}} na {{company}}",
    subjectVariants: JSON.stringify([
      "Uma pergunta rapida sobre {{job_title}}",
      "Interessado na vaga de {{job_title}}",
      "{{job_title}} - duvida rapida"
    ]),
    body: `Ola {{recipient_name}},

Vi a vaga de {{job_title}} e queria entrar em contato direto.

Um pouco sobre mim: {{your_highlight}}. Estou especialmente animado com {{specific_detail_about_company_or_product}} da {{company}}.

Gostaria de conversar sobre como posso contribuir com a equipe. Posso fazer uma chamada de 15 minutos no seu horario.

Abs,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Abordagem Warm",
    description: "Referenciou seu codigo, projeto ou trabalho recente",
    type: "initial",
    language: "pt-BR",
    subject: "Gostei do {{project_name}}",
    subjectVariants: JSON.stringify([
      "Vi o {{project_name}} - muito bom",
      "Seu trabalho no {{project_name}}",
      "Pergunta rapida sobre {{project_name}}"
    ]),
    body: `Ola {{recipient_name}},

Estive conferindo o {{project_name}} e gostei muito de {{specific_thing_you_liked}}. A forma como voce lidou com {{specific_technical_detail}} e exatamente o tipo de coisa que gosto de trabalhar.

Trabalho com {{your_tech_stack}} ha {{years}} anos, e adoraria contribuir com uma equipe que constroi {{company_mission}}.

Voce teria tempo para uma conversa rapida? Prometo não tomar seu tempo.

Abs,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Pedido de Referral",
    description: "Pede referral sem pedir emprego",
    type: "initial",
    language: "pt-BR",
    subject: "Um favor rapido? ({{mutual_connection_or_interest}})",
    subjectVariants: JSON.stringify([
      "Um favor rapido",
      "Voce tem 2 minutos?",
      "Pergunta rapida sobre {{company}}"
    ]),
    body: `Ola {{recipient_name}},

{{reason_for_reaching_out - conexao mutua, interesse comum, ou encontrou no LinkedIn}}.

Estou explorando oportunidades na {{company}} e percebi que voce tem conexao la. Voce teria abertura para uma conversa rapida de 10 minutos para compartilhar sua experiencia?

Sem pressa nenhuma - estou fazendo uma pesquisa e agradeceria qualquer insights que voce possa compartilhar.

Muito obrigado,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Follow-up #1",
    description: "Primeiro follow-up - novo angulo, sem pressao",
    type: "followup_1",
    language: "pt-BR",
    subject: "Seguindo sobre {{job_title}}",
    subjectVariants: JSON.stringify([
      "Apenas conferindo",
      "{{job_title}} - mais uma coisa",
      "Atualizacao rapida"
    ]),
    body: `Ola {{recipient_name}},

Só queria trazer isso de volta para o topo da sua caixa de entrada. Sei que voce esta ocupado.

Queria adicionar que {{new_piece_of_value_or_relevant_experience}} que pode ser relevante para a vaga.

Se o timing nao for o certo, sem problemas. Happy to reconnect when it makes sense.

Abs,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: generateId(),
    userId: null,
    name: "Follow-up #2",
    description: "Follow-up final - oferece novo valor, CTA sem pressao",
    type: "followup_2",
    language: "pt-BR",
    subject: "Ultimo, eu prometo",
    subjectVariants: JSON.stringify([
      "Um ultimo pensamento",
      "{{job_title}} - ultima tentativa",
      "Follow-up final"
    ]),
    body: `Ola {{recipient_name}},

Este e meu ultimo email sobre este assunto, eu prometo.

Recentemente {{relevant_achievement_or_project}} que creo que pode agregar valor para a {{company}}. Posso compartilhar mais detalhes se tiver interesse.

Se nao for o momento certo, entendo completamente. Vou parar por aqui.

Boa sorte com a busca,
{{your_name}}`,
    isDefault: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
];

async function seed() {
  console.log("Seeding email templates...");

  // Check if templates already exist
  const existing = sqlite
    .prepare("SELECT COUNT(*) as count FROM email_templates")
    .get() as { count: number };

  if (existing.count > 0) {
    console.log(`Already have ${existing.count} templates. Skipping seed.`);
    sqlite.close();
    return;
  }

  for (const template of templates) {
    db.insert(schema.emailTemplates).values(template).run();
    console.log(`  Added: ${template.name} (${template.language})`);
  }

  console.log(`\nDone! ${templates.length} templates seeded.`);
  sqlite.close();
}

seed().catch(console.error);

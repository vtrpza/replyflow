/**
 * Email Generator
 * Generates personalized cold emails for job applications.
 * Uses templates with variable substitution.
 */

import type { UserProfile } from "@/lib/types";

interface JobContext {
  title: string;
  company: string | null;
  role: string | null;
  techStack: string[];
  repoFullName: string;
  posterUsername: string;
  issueUrl: string;
  contactEmail: string | null;
}

interface GeneratedEmail {
  subject: string;
  body: string;
  to: string | null;
}

function detectGenericEmail(email: string | null): boolean {
  if (!email) return false;
  const localPart = email.split("@")[0]?.toLowerCase() || "";
  const genericPatterns = [
    "talents", "rh", "recrutamento", "jobs", "carreiras", "vagas",
    "contato", "faleconosco", "atendimento", "suporte", "helpdesk",
    "no-reply", "noreply", "nao-responda", "careers", "hiring",
  ];
  return genericPatterns.some((p) => localPart.includes(p));
}

/**
 * Generate a personalized cold email for a job posting
 */
export function generateColdEmail(
  job: JobContext,
  profile: UserProfile,
  language: "pt-BR" | "en" = "pt-BR"
): GeneratedEmail {
  const companyName = job.company || "your company";
  const jobTitle = job.role || job.title;
  const posterName = job.posterUsername;
  const matchingSkills = profile.skills.filter((skill) =>
    job.techStack.some(
      (tech) => tech.toLowerCase() === skill.toLowerCase()
    )
  );

  if (language === "pt-BR") {
    return generatePtBrEmail(
      job,
      profile,
      companyName,
      jobTitle,
      posterName,
      matchingSkills
    );
  }

  return generateEnEmail(
    job,
    profile,
    companyName,
    jobTitle,
    posterName,
    matchingSkills
  );
}

function generatePtBrEmail(
  job: JobContext,
  profile: UserProfile,
  companyName: string,
  jobTitle: string,
  posterName: string,
  matchingSkills: string[]
): GeneratedEmail {
  const subject = ` Interesse na vaga: ${jobTitle} - ${companyName}`;

  const recipientGreeting = detectGenericEmail(job.contactEmail) 
    ? `time de recrutamento da ${companyName}`
    : posterName;

  const highlightsText =
    profile.highlights.length > 0
      ? profile.highlights.map((h) => `- ${h}`).join("\n")
      : matchingSkills.length > 0
        ? matchingSkills.slice(0, 3).map((s) => `- Experiência com ${s}`).join("\n")
        : `- ${profile.experienceYears} anos de experiência como desenvolvedor(a)`;

  const linksSection = [
    profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : null,
    profile.githubUrl ? `GitHub: ${profile.githubUrl}` : null,
    profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const body = `Olá ${recipientGreeting},

Vi a vaga de ${jobTitle} publicada no repositório ${job.repoFullName} (${job.issueUrl}) e gostaria de me candidatar.

Sou ${profile.name || "um desenvolvedor"}, nível ${profile.experienceLevel} com ${profile.experienceYears} anos de experiência${matchingSkills.length > 0 ? ` em ${matchingSkills.join(", ")}` : ""}.

Destaques do meu perfil:
${highlightsText}

${linksSection}

Fico à disposição para conversarmos sobre como posso contribuir para ${companyName === "your company" ? "a equipe" : companyName}.

Abraço,
${profile.name || ""}
${profile.email}`;

  return {
    subject,
    body: body.trim(),
    to: job.contactEmail,
  };
}

function generateEnEmail(
  job: JobContext,
  profile: UserProfile,
  companyName: string,
  jobTitle: string,
  posterName: string,
  matchingSkills: string[]
): GeneratedEmail {
  const subject = `Application: ${jobTitle} at ${companyName}`;

  const highlightsText =
    profile.highlights.length > 0
      ? profile.highlights.map((h) => `- ${h}`).join("\n")
      : matchingSkills.length > 0
        ? `- Proficient in ${matchingSkills.slice(0, 3).join(", ")}\n- ${profile.experienceYears} years of professional experience`
        : `- ${profile.experienceYears} years of software development experience`;

  const linksSection = [
    profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : null,
    profile.githubUrl ? `GitHub: ${profile.githubUrl}` : null,
    profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const body = `Hi ${posterName},

I came across the ${jobTitle} position posted on ${job.repoFullName} (${job.issueUrl}) and I'm very interested in applying.

I'm ${profile.name || "a developer"}, a ${profile.experienceLevel}-level developer with ${profile.experienceYears} years of experience${matchingSkills.length > 0 ? ` in ${matchingSkills.join(", ")}` : ""}.

Key highlights:
${highlightsText}

${linksSection}

I'd love to discuss how I can contribute to ${companyName === "your company" ? "your team" : companyName}.

Best regards,
${profile.name || ""}
${profile.email}`;

  return {
    subject,
    body: body.trim(),
    to: job.contactEmail,
  };
}

/**
 * Generate a follow-up email
 */
export function generateFollowUpEmail(
  job: JobContext,
  profile: UserProfile,
  originalSentDate: string,
  language: "pt-BR" | "en" = "pt-BR"
): GeneratedEmail {
  const companyName = job.company || "your company";
  const jobTitle = job.role || job.title;

  if (language === "pt-BR") {
    const recipientGreeting = detectGenericEmail(job.contactEmail) 
      ? `time de recrutamento da ${companyName}`
      : job.posterUsername;
    return {
      subject: `Re: Interesse na vaga: ${jobTitle} - ${companyName}`,
      body: `Olá ${recipientGreeting},

Estou fazendo um acompanhamento sobre minha candidatura para a vaga de ${jobTitle} enviada em ${originalSentDate}.

Continuo muito interessado(a) na oportunidade e gostaria de saber se há alguma atualização sobre o processo seletivo.

Fico à disposição para qualquer etapa do processo.

Abraço,
${profile.name || ""}
${profile.email}`,
      to: job.contactEmail,
    };
  }

  return {
    subject: `Re: Application: ${jobTitle} at ${companyName}`,
    body: `Hi ${job.posterUsername},

I'm following up on my application for the ${jobTitle} position, sent on ${originalSentDate}.

I remain very interested in this opportunity and would love to hear about any updates on the hiring process.

I'm available for any stage of the interview process.

Best regards,
${profile.name || ""}
${profile.email}`,
    to: job.contactEmail,
  };
}

/**
 * Job Parser
 * Extracts structured data from semi-structured GitHub issue bodies.
 * Brazilian job postings follow common patterns but vary between repos.
 */

import type {
  ContractType,
  ExperienceLevel,
  SourceType,
} from "@/lib/types";
import { isDirectContactEmail } from "@/lib/contacts/email-quality";

interface ParsedJob {
  company: string | null;
  role: string | null;
  salary: string | null;
  location: string | null;
  contractType: ContractType | null;
  experienceLevel: ExperienceLevel | null;
  techStack: string[];
  benefits: string | null;
  applyUrl: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  contactWhatsapp: string | null;
  isRemote: boolean;
}

// Common section headers in Portuguese job postings
const SECTION_PATTERNS = {
  company: [
    /##?\s*(?:empresa|company|sobre\s*a?\s*empresa)/i,
    /\*{1,2}empresa:?\*{1,2}\s*/i,
    /empresa:\s*/i,
  ],
  role: [
    /##?\s*(?:vaga|cargo|posicao|position|role)/i,
    /\*{1,2}(?:vaga|cargo):?\*{1,2}\s*/i,
  ],
  salary: [
    /##?\s*(?:salario|remuneracao|salary|faixa\s*salarial)/i,
    /\*{1,2}(?:salario|remuneracao):?\*{1,2}\s*/i,
    /(?:salario|salary|faixa):\s*/i,
  ],
  location: [
    /##?\s*(?:localizacao|local|location|cidade)/i,
    /\*{1,2}(?:local|localizacao):?\*{1,2}\s*/i,
    /(?:local|localizacao|cidade):\s*/i,
  ],
  contract: [
    /##?\s*(?:contratacao|tipo\s*de?\s*contrato|contract)/i,
    /\*{1,2}(?:contratacao|contrato):?\*{1,2}\s*/i,
    /(?:contratacao|contrato):\s*/i,
  ],
  level: [
    /##?\s*(?:nivel|senioridade|level|experience)/i,
    /\*{1,2}(?:nivel|senioridade):?\*{1,2}\s*/i,
  ],
  stack: [
    /##?\s*(?:stack|tecnologias|requisitos|requirements|tech\s*stack|habilidades)/i,
    /\*{1,2}(?:stack|tecnologias|requisitos):?\*{1,2}\s*/i,
  ],
  benefits: [
    /##?\s*(?:beneficios|benefits|diferenciais)/i,
    /\*{1,2}(?:beneficios|benefits):?\*{1,2}\s*/i,
  ],
  apply: [
    /##?\s*(?:como\s*se\s*candidatar|how\s*to\s*apply|candidatar|inscreva|apply)/i,
    /\*{1,2}(?:como\s*se\s*candidatar):?\*{1,2}\s*/i,
  ],
};

// Known tech keywords for extraction
const TECH_KEYWORDS = [
  // Languages
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C#",
  "Go",
  "Golang",
  "Ruby",
  "PHP",
  "Rust",
  "Kotlin",
  "Swift",
  "Dart",
  "Elixir",
  "Scala",
  "Clojure",
  "R",
  "SQL",
  // Frontend
  "React",
  "React.js",
  "ReactJS",
  "Next.js",
  "NextJS",
  "Vue",
  "Vue.js",
  "VueJS",
  "Angular",
  "Svelte",
  "SvelteKit",
  "Nuxt",
  "Gatsby",
  "Remix",
  "Astro",
  "HTML",
  "CSS",
  "Sass",
  "SCSS",
  "Tailwind",
  "TailwindCSS",
  "Bootstrap",
  "Material UI",
  "Chakra UI",
  "Styled Components",
  // Backend
  "Node.js",
  "NodeJS",
  "Express",
  "NestJS",
  "Fastify",
  "Django",
  "Flask",
  "FastAPI",
  "Spring",
  "Spring Boot",
  "Rails",
  "Ruby on Rails",
  "Laravel",
  "Symfony",
  ".NET",
  "ASP.NET",
  "Gin",
  "Fiber",
  "Phoenix",
  "AdonisJS",
  // Mobile
  "React Native",
  "Flutter",
  "iOS",
  "Android",
  "SwiftUI",
  "Jetpack Compose",
  // Database
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "DynamoDB",
  "Cassandra",
  "Neo4j",
  "Elasticsearch",
  "Supabase",
  "Firebase",
  "Prisma",
  // Cloud/DevOps
  "AWS",
  "Azure",
  "GCP",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "K8s",
  "Terraform",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "GitLab CI",
  "ArgoCD",
  "Helm",
  "Linux",
  "Nginx",
  // Data
  "Machine Learning",
  "ML",
  "AI",
  "Data Science",
  "Pandas",
  "NumPy",
  "TensorFlow",
  "PyTorch",
  "Spark",
  "Airflow",
  "dbt",
  "Snowflake",
  "BigQuery",
  "Kafka",
  "RabbitMQ",
  // Testing
  "Jest",
  "Cypress",
  "Playwright",
  "Selenium",
  "Testing Library",
  "Vitest",
  "Pytest",
  "JUnit",
  // Tools
  "Git",
  "GraphQL",
  "REST",
  "gRPC",
  "Microservices",
  "Monorepo",
  "Storybook",
  "Figma",
  "Jira",
  "Agile",
  "Scrum",
];

export function parseJobBody(
  title: string,
  body: string,
  labels: string[],
  sourceTypeHint?: SourceType
): ParsedJob {
  const parsed: ParsedJob = {
    company: null,
    role: null,
    salary: null,
    location: null,
    contractType: null,
    experienceLevel: null,
    techStack: [],
    benefits: null,
    applyUrl: null,
    contactEmail: null,
    contactLinkedin: null,
    contactWhatsapp: null,
    isRemote: false,
  };

  // --- Extract from title ---
  // Common pattern: "[Location] Role - Company" or "[Remote] [Senior] Role at Company"
  const titleMatch = title.match(
    /^\[([^\]]+)\]\s*(?:\[([^\]]+)\]\s*)?(.+?)(?:\s*[-–|@]\s*(.+))?$/
  );
  if (titleMatch) {
    const bracket1 = titleMatch[1];
    const bracket2 = titleMatch[2];
    const roleCompany = titleMatch[3];
    const companyPart = titleMatch[4];

    // Check brackets for location/remote/level
    for (const bracket of [bracket1, bracket2].filter(Boolean)) {
      if (
        /remoto|remote/i.test(bracket!)
      ) {
        parsed.isRemote = true;
      } else if (
        /senior|pleno|junior|estagio|intern|lead/i.test(bracket!)
      ) {
        parsed.experienceLevel = extractLevel(bracket!);
      } else {
        parsed.location = bracket!.trim();
      }
    }

    if (companyPart) {
      parsed.company = companyPart.trim();
      parsed.role = roleCompany.trim();
    } else {
      // Try to split role and company from the remaining text
      const dashSplit = roleCompany.split(/\s*[-–]\s*/);
      if (dashSplit.length >= 2) {
        parsed.role = dashSplit[0].trim();
        parsed.company = dashSplit.slice(1).join(" - ").trim();
      } else {
        parsed.role = roleCompany.trim();
      }
    }
  } else {
    parsed.role = title.trim();
  }

  // --- Extract from body ---
  if (body) {
    // Company
    if (!parsed.company) {
      parsed.company = extractSection(body, SECTION_PATTERNS.company);
    }

    // Salary
    parsed.salary = extractSalary(body);

    // Location (from body if not from title)
    if (!parsed.location) {
      parsed.location = extractSection(body, SECTION_PATTERNS.location);
    }

    // Contract type (explicit signal only)
    parsed.contractType = extractContractType(body, labels);

    // Experience level (from body if not from title)
    if (!parsed.experienceLevel) {
      parsed.experienceLevel = extractLevelFromBody(body, labels);
    }

    // Tech stack
    parsed.techStack = extractTechStack(body, title);

    // Benefits
    parsed.benefits = extractSection(body, SECTION_PATTERNS.benefits);

    // Contact info
    parsed.contactEmail = extractEmail(body);
    parsed.contactLinkedin = extractLinkedin(body);
    parsed.contactWhatsapp = extractWhatsapp(body);

    // Apply URL
    parsed.applyUrl = extractApplyUrl(body);

    // Remote check (from body and labels)
    if (!parsed.isRemote) {
      parsed.isRemote = checkRemote(body, labels);
    }
  }

  // --- Extract from labels ---
  if (!parsed.contractType) {
    parsed.contractType = extractContractType("", labels);
  }
  if (!parsed.contractType) {
    parsed.contractType = inferContractTypeFallback({
      title,
      body,
      labels,
      location: parsed.location,
      sourceTypeHint,
    });
  }
  if (!parsed.experienceLevel) {
    parsed.experienceLevel = extractLevelFromBody("", labels);
  }

  return parsed;
}

function extractSection(
  body: string,
  patterns: RegExp[]
): string | null {
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const startIdx = match.index! + match[0].length;
      // Get text until next section header or double newline
      const rest = body.substring(startIdx);
      const endMatch = rest.match(/\n##|\n\*{2}[A-Z]|\n\n\n/);
      const endIdx = endMatch ? endMatch.index! : Math.min(rest.length, 500);
      const text = rest.substring(0, endIdx).trim();
      if (text.length > 0 && text.length < 1000) {
        return text;
      }
    }
  }
  return null;
}

function extractSalary(body: string): string | null {
  // Match R$ patterns
  const brSalary = body.match(
    /R\$\s*[\d.,]+(?:\s*(?:a|até|-|–)\s*R?\$?\s*[\d.,]+)?/i
  );
  if (brSalary) return brSalary[0].trim();

  // Match USD patterns
  const usdSalary = body.match(
    /(?:USD|US\$|\$)\s*[\d.,]+(?:\s*(?:to|a|até|-|–)\s*(?:USD|US\$|\$)?\s*[\d.,]+)?(?:\s*\/\s*(?:month|mes|ano|year))?/i
  );
  if (usdSalary) return usdSalary[0].trim();

  // Match "A combinar" or "A definir"
  const tbd = body.match(/(?:a combinar|a definir|negociavel|negotiable)/i);
  if (tbd) return tbd[0].trim();

  return null;
}

function extractContractType(
  body: string,
  labels: string[]
): ContractType | null {
  const text = `${body} ${labels.join(" ")}`.toLowerCase();

  if (/\bestagio\b|\bestágio\b|\binternship\b|\bintern\b/.test(text)) return "Internship";
  if (/\bpj\b|\bpessoa\s*juridica\b/.test(text)) return "PJ";
  if (/\bcontractor\b|\bindependent contractor\b|\b1099\b|\bc2c\b/.test(text)) return "PJ";
  if (/\bfreela\b|\bfreelance\b/.test(text)) return "Freela";
  if (/\bconsultant\b|\bconsultoria\b|\bpart[-\s]?time\b|\bpart time\b/.test(text)) return "Freela";
  if (/\bclt\b/.test(text)) return "CLT";
  return null;
}

function inferContractTypeFallback(input: {
  title: string;
  body: string;
  labels: string[];
  location: string | null;
  sourceTypeHint?: SourceType;
}): ContractType {
  const text = [
    input.title,
    input.body,
    input.location || "",
    input.labels.join(" "),
  ]
    .join("\n")
    .toLowerCase();

  const hasBrazilSignal =
    /\b(brasil|brazil|são paulo|sao paulo|rio de janeiro|curitiba|campinas|belo horizonte|porto alegre|recife|florianópolis|florianopolis|brasilia|brasília)\b/i.test(
      text
    ) ||
    /\b(vaga|requisitos|benef[ií]cios|sal[áa]rio|contrata[cç][aã]o|candidatar|remoto no brasil|h[ií]brido|presencial)\b/i.test(
      text
    );

  if (hasBrazilSignal) {
    return "CLT";
  }

  if (input.sourceTypeHint && input.sourceTypeHint !== "github_repo") {
    return "PJ";
  }

  if (
    /\b(united states|usa|canada|united kingdom|uk|germany|france|spain|italy|portugal|netherlands|sweden|norway|denmark|finland|poland|india|japan|singapore|australia|new zealand|mexico|argentina|chile|colombia|europe|global)\b/i.test(
      text
    )
  ) {
    return "PJ";
  }

  return "CLT";
}

function extractLevel(text: string): ExperienceLevel {
  const lower = text.toLowerCase();
  if (/senior|sênior|sr\.?/i.test(lower)) return "Senior";
  if (/pleno|mid|middle/i.test(lower)) return "Pleno";
  if (/junior|júnior|jr\.?/i.test(lower)) return "Junior";
  if (/lead|principal|staff/i.test(lower)) return "Lead";
  if (/estagio|estágio|intern/i.test(lower)) return "Intern";
  return "Unknown";
}

function extractLevelFromBody(
  body: string,
  labels: string[]
): ExperienceLevel | null {
  const text = `${body} ${labels.join(" ")}`;
  const level = extractLevel(text);
  return level === "Unknown" ? null : level;
}

function extractTechStack(body: string, title: string): string[] {
  const fullText = `${title} ${body}`;
  const found = new Set<string>();

  for (const tech of TECH_KEYWORDS) {
    // Case-insensitive word boundary match
    const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(fullText)) {
      found.add(tech);
    }
  }

  return Array.from(found);
}

function extractEmail(body: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = [...body.matchAll(emailRegex)];

  if (matches.length === 0) return null;

  const applySection = extractSection(body, SECTION_PATTERNS.apply) || "";
  const contactSection = body.match(/(?:contato|contact|email|e-mail)\s*(?:[:\-]|\s+para\s+)?([^\n\r]{5,100})/i)?.[1] || "";
  const fallbackDisclaimer = body.match(/(?:em\s*caso\s*de\s*(?:nao|non?)\s*haver|if\s*no\s*response|fallback)[^\.]{0,50}([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1];

  type ScoredEmail = { email: string; score: number; isFallback: boolean };

  const scored: ScoredEmail[] = [];

  for (const match of matches) {
    const email = match[0].toLowerCase();
    const localPart = email.split("@")[0];
    const domain = email.split("@")[1];

    if (!isDirectContactEmail(email)) continue;
    if (domain && (domain.length < 4 || !domain.includes("."))) continue;

    let score = 0;
    const isFallback = fallbackDisclaimer?.toLowerCase() === email;

    const inApplySection = applySection.includes(email);
    const inContactSection = contactSection.toLowerCase().includes(localPart);

    if (inApplySection) score += 30;
    else if (inContactSection) score += 20;
    else score -= 10;

    if (isFallback) score -= 50;

    const isPersonal = /^[a-z]+\.[a-z]+$/.test(localPart) || /^[a-z]+[0-9]?[a-z]*$/.test(localPart);
    if (isPersonal) score += 15;

    const hasCommonTLD = /\.(com|org|net|io|co|ai|dev|tech|com\.br|org\.br)$/.test(domain || "");
    if (hasCommonTLD) score += 5;

    scored.push({ email, score, isFallback });
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  return scored[0].email;
}

function extractLinkedin(body: string): string | null {
  const match = body.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_-]+\/?/i
  );
  return match ? match[0] : null;
}

function extractWhatsapp(body: string): string | null {
  const match = body.match(
    /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com)\/[0-9]+/i
  );
  return match ? match[0] : null;
}

function extractApplyUrl(body: string): string | null {
  // Look for URLs in the "como se candidatar" section
  const applySection = extractSection(body, SECTION_PATTERNS.apply);
  if (applySection) {
    const urlMatch = applySection.match(
      /https?:\/\/[^\s\)>\]]+/
    );
    if (urlMatch) return urlMatch[0];
  }

  // Fallback: look for common apply URLs
  const patterns = [
    /(?:https?:\/\/)?(?:[\w-]+\.)?(?:lever|greenhouse|workable|gupy|kenoby|recruitee|bamboohr|indeed|linkedin)\.(?:co|com|io|com\.br)[^\s\)>\]]*/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) return match[0];
  }

  return null;
}

function checkRemote(body: string, labels: string[]): boolean {
  const text = `${body} ${labels.join(" ")}`.toLowerCase();
  return /\bremoto\b|\bremote\b|\b100%\s*remote\b|\bhome\s*office\b|\btrabalho\s*remoto\b/.test(
    text
  );
}

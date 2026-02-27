/**
 * Seed a user's profile from CV data.
 * Run with: npx tsx src/lib/db/seed-profile.ts
 */
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "gitjobs.db");
const sqlite = new Database(DB_PATH);

const targetEmail = "vhnpouza@gmail.com";

const user = sqlite
  .prepare("SELECT id FROM users WHERE email = ?")
  .get(targetEmail) as { id: string } | undefined;

if (!user) {
  console.error(`User with email ${targetEmail} not found. Sign in first.`);
  sqlite.close();
  process.exit(1);
}

const profile = {
  id: `profile-${Date.now()}`,
  user_id: user.id,
  name: "Vitor Pouza",
  email: targetEmail,
  phone: "+55 11 94189-0083",
  linkedin_url: "https://linkedin.com/in/vitor-pouza-91a275163",
  github_url: "https://github.com/vtrpza",
  portfolio_url: null,
  resume_url: null,
  skills: JSON.stringify([
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "HTML",
    "CSS",
    "Tailwind",
    "Vite",
    "Node.js",
    "GraphQL",
    "REST",
    "PostgreSQL",
    "Python",
    "Docker",
    "AWS",
    "Jest",
    "Cypress",
    "Playwright",
    "GitHub Actions",
    "Storybook",
    "Nx",
    "Module Federation",
    "React Server Components",
  ]),
  experience_years: 8,
  experience_level: "Senior",
  preferred_contract_types: JSON.stringify(["CLT", "PJ", "Freela"]),
  preferred_locations: JSON.stringify(["Sao Paulo", "Jundiai", "Campinas"]),
  prefer_remote: 1,
  min_salary: null,
  max_salary: null,
  bio: "Frontend/Product Engineer (React, Next.js, TypeScript) - Full-stack when needed.",
  highlights: JSON.stringify([
    "Full-stack MVPs in Next.js (App Router / RSC), from zero to deployment",
    "Web scraping/data extraction in Python: 10M+ public records processed",
    "Micro-frontends with Module Federation, reducing deployment time by ~35%",
    "Design system in Storybook + Chromatic covering ~90% of UI patterns",
  ]),
  updated_at: new Date().toISOString(),
};

sqlite
  .prepare(
    `INSERT INTO user_profile (
      id, user_id, name, email, phone, linkedin_url, github_url, portfolio_url,
      resume_url, skills, experience_years, experience_level, preferred_contract_types,
      preferred_locations, prefer_remote, min_salary, max_salary, bio, highlights, updated_at
    ) VALUES (
      @id, @user_id, @name, @email, @phone, @linkedin_url, @github_url, @portfolio_url,
      @resume_url, @skills, @experience_years, @experience_level, @preferred_contract_types,
      @preferred_locations, @prefer_remote, @min_salary, @max_salary, @bio, @highlights, @updated_at
    )
    ON CONFLICT(user_id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      linkedin_url = excluded.linkedin_url,
      github_url = excluded.github_url,
      portfolio_url = excluded.portfolio_url,
      resume_url = excluded.resume_url,
      skills = excluded.skills,
      experience_years = excluded.experience_years,
      experience_level = excluded.experience_level,
      preferred_contract_types = excluded.preferred_contract_types,
      preferred_locations = excluded.preferred_locations,
      prefer_remote = excluded.prefer_remote,
      min_salary = excluded.min_salary,
      max_salary = excluded.max_salary,
      bio = excluded.bio,
      highlights = excluded.highlights,
      updated_at = excluded.updated_at`
  )
  .run(profile);

console.log("Profile seeded successfully for", targetEmail);
sqlite.close();

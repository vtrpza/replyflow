# Agent Guidelines for gitjobs-v2

## Project Overview

This is a Next.js 16 application for email outreach/CRM functionality. It uses:
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with Drizzle ORM
- **Authentication**: NextAuth v5 with Google OAuth (JWT sessions)
- **Styling**: Tailwind CSS v4
- **Email Provider**: Gmail API (extensible to others)

---

## Build & Development Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
```

### Database
```bash
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate    # Run Drizzle migrations
npm run db:seed       # Seed database with sample data
npm run db:seed-profile # Seed user profile
npm run db:seed-templates # Seed email templates
```

### Linting
```bash
npm run lint         # Run ESLint on entire codebase
```

### Testing
**Note**: This project does not currently have a test framework configured. When adding tests:
```bash
# Jest (if added)
npm test             # Run all tests
npm test -- --testPathPattern=<file>  # Run single test file

# Vitest (if added)
npx vitest            # Run all tests
npx vitest run <file> # Run single test file
```

---

## Code Style Guidelines

### TypeScript

- **Always use explicit types** for function parameters and return types
- **Avoid `any`**: Use `unknown` or proper generic types instead strict
- **Use null checks**: Check for `null`/`undefined` explicitly

```typescript
// Good
function getUserById(id: string): User | null { ... }

// Avoid
function getUserById(id: string) { ... }
```

### Imports

- **Use path aliases** (`@/` for src root)
- **Group imports** in this order: external → internal → types → styles
- **Avoid barrel imports** from index files when possible (import directly)

```typescript
// Good
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { gmailProvider } from "@/lib/providers/email";
import type { User } from "@/types";

// In route handlers, prefer named imports
import { NextRequest, NextResponse } from "next/server";
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | kebab-case | `user-profile.tsx` |
| Files (utilities) | kebab-case | `email-utils.ts` |
| React Components | PascalCase | `ComposePage` |
| Functions | camelCase | `getAuthUrl()` |
| Variables | camelCase | `isLoading` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Database Tables | snake_case | `connected_email_accounts` |
| TypeScript Types | PascalCase | `ConnectedAccount` |

### React Patterns

- **Client Components**: Add `"use client"` at the top of any file using hooks
- **File Naming**: Use `page.tsx` for Next.js pages, `component.tsx` for reusable components
- **Component Structure**: Props interface first, then component function

```typescript
"use client";

import { useState, useEffect } from "react";

interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export default function MyComponent({ title, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  
  // ...
}
```

### API Routes

- **Use named exports**: `export async function GET()` and `export async function POST()`
- **Always handle errors**: Wrap in try/catch with proper error logging
- **Return proper status codes**: 200 (OK), 400 (Bad Request), 401 (Unauthorized), 500 (Server Error)

```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // ... logic
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### Database (Drizzle ORM)

- **Use transactions** for multi-step operations
- **Always use schema imports** from `@/lib/db/schema`
- **Use parameterized queries** - never interpolate values into SQL

```typescript
// Good
db.select().from(schema.users).where(eq(schema.users.id, userId));

// Avoid - SQL injection risk
db.select().from(schema.users).where(sql`id = ${userId}`);
```

### Error Handling

- **Log errors with context**: Include operation name and relevant data
- **Use structured error responses**: Return consistent JSON error format
- **Don't expose internal errors**: Return generic messages to clients

```typescript
// Good
console.error("Accounts GET error:", error);
return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });

// Avoid
return NextResponse.json({ error: error.message }, { status: 500 }); // Exposes internals
```

### Environment Variables

- **Never commit secrets**: Use `.env.local` or `.env` for local development
- **Use descriptive names**: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`
- **Document required vars**: Add to `.env.example` when adding new required variables

### CSS & Styling

- **Use Tailwind utility classes** for all styling
- **Follow color scheme**: Uses `zinc` for neutrals, `emerald` for primary actions
- **Use consistent spacing**: Follow Tailwind's default spacing scale
- **Prefer semantic class names**: `bg-zinc-900`, `text-zinc-200`, `hover:bg-emerald-500`

---

## Architecture Patterns

### Email Provider Abstraction

The codebase uses a provider abstraction pattern for email services:

```
src/lib/providers/email/
├── index.ts          # Provider factory
├── types.ts          # Type definitions
├── gmail/
│   ├── provider.ts   # Gmail implementation
│   └── ...
```

When adding new providers, implement the interface in `types.ts`.

### Authentication Flow

- **NextAuth (Google OAuth)** handles user login
- **Gmail OAuth** is separate - stored in SQLite `connected_email_accounts` table
- **Session strategy**: JWT-based (stateless)

### Email Templates

The app includes a template system for cold outreach emails:

```
src/lib/db/
├── schema.ts           # email_templates table definition
├── seed-templates.ts   # Seed script for default templates
```

**Template Types:**
- `initial` - First outreach email
- `followup_1` - First follow-up (Day 4-7)
- `followup_2` - Second follow-up (Day 8-10)

**API Endpoints:**
- `GET /api/templates` - List templates (filter by `language`, `type`)
- `POST /api/templates` - Create user template
- `GET /api/templates/[id]` - Get single template
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template

**Seed Templates:**
Run `npm run db:seed-templates` to seed default templates (10 templates: 5 EN, 5 PT-BR).

**Template Variables:**
Templates support placeholder variables that are replaced when applied:
- `{{recipient_name}}` - Recipient's name
- `{{job_title}}` - Job position title
- `{{company}}` - Company name
- `{{your_name}}` - User's name
- `{{your_highlight}}` - User's key achievement
- `{{project_name}}` - Referenced project name
- etc.

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── accounts/      # Email account management
│   │   ├── auth/          # NextAuth routes
│   │   └── emails/        # Email sending/history
│   ├── settings/          # Settings page
│   ├── compose/           # Email composer
│   └── ...
├── components/            # Reusable React components
├── lib/                   # Core utilities
│   ├── auth/              # NextAuth config
│   ├── db/                # Database schema & connection
│   ├── providers/        # Email provider abstractions
│   └── ...
└── types/                 # Shared TypeScript types
```

---

## Common Patterns

### Checking Authentication

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Frontend Session Check

```typescript
const { data: session, status } = useSession();

if (status === "loading") {
  return <Loading />;
}

if (status === "unauthenticated") {
  router.push("/signin");
}
```

### Fetching Data with Loading State

```typescript
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/endpoint")
    .then(r => r.json())
    .then(setData)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

---

## Important Notes

1. **NextAuth v5 is in beta**: May have breaking changes; check documentation
2. **Gmail OAuth tokens stored in SQLite**: Separate from NextAuth user login
3. **No tests exist yet**: Consider adding Jest or Vitest for critical paths
4. **Tailwind v4**: Uses CSS-based configuration, not tailwind.config.js

# ReplyFlow

![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![SQLite + Drizzle](https://img.shields.io/badge/SQLite-Drizzle-003B57?logo=sqlite)
![Fly.io](https://img.shields.io/badge/Fly.io-deployed-8B5CF6?logo=flydotio)


**Stop applying blindly. Start running your job search like a system.**

ReplyFlow is a job-search workflow product for developers.

It brings together **job sourcing, ATS tracking, recruiter context, and outreach** in one place — so the process stops feeling scattered and starts feeling operational.

> Public repository, proprietary software.
> This project is being built in public for visibility and feedback, but it is **not open source**.

---

## Why this exists

Looking for a job gets messy fast.

You save roles in one place, apply in another, lose recruiter context, forget follow-ups, and end up spending energy without a clear system behind it.

ReplyFlow exists to make that process more structured.

Instead of treating job search as a pile of links and scattered actions, it turns it into a workflow:

* collect opportunities
* prioritize what is worth your time
* track ATS submissions
* keep recruiter context
* follow up consistently

---

## What ReplyFlow does

### Jobs intelligence

Collect opportunities from sources like GitHub, Greenhouse, and Lever, then help prioritize them with contextual match signals.

### ATS pipeline tracking

Track submitted applications and their current stage without losing visibility of the broader process.

### Recruiter context

Keep recruiter and contact information attached to the opportunities you found, instead of letting it get buried in email threads or notes.

### Outreach workflow

Draft and send outreach emails, keep history per contact, and stay consistent with follow-ups.

### Profile readiness

Surface missing profile information and improve the quality of your outreach and application workflow before you start sending.

---

## Product direction

ReplyFlow is being built around one idea:

**You do not need more vacancies. You need more direction.**

The goal is not to create another generic job board.
The goal is to help developers run job search with more structure, context, and consistency.

---

## Current stack

* **Framework:** Next.js 16 (App Router)
* **UI:** React 19 + Tailwind CSS 4
* **Language:** TypeScript 5
* **Database:** SQLite + Drizzle ORM
* **Auth:** NextAuth v5
* **Email:** Gmail API
* **Monitoring:** Sentry + PostHog
* **Deploy:** Fly.io

---

## Screenshots

Screenshots and demo GIFs will be added here.

Suggested sections:

* dashboard
* jobs pipeline
* recruiter/contact workflow
* outreach flow

---

## Quick start

```bash
git clone https://github.com/vtrpza/replyflow.git
cd replyflow
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Optional seed commands:

```bash
npm run db:seed
npm run db:seed-profile
```

---

## Project structure

```text
src/
├── app/
│   ├── api/
│   ├── app/
│   └── (marketing)/
├── components/
└── lib/
```

Core modules include:

* auth
* contacts
* db
* i18n
* matcher
* outreach
* parser
* profile
* providers
* scraper
* sources
* types

---

## Supported sources

ReplyFlow is designed to work with opportunity sources such as:

* GitHub repository listings
* Greenhouse boards
* Lever postings
* Ashby boards
* Workable boards
* Recruitee boards

The goal is to unify multiple discovery channels into one operational workflow.

---

## Running locally

To run the app locally, you will typically need:

* environment variables from `.env.example`
* a local SQLite database
* auth configuration
* optional provider credentials depending on which flows you want to test

Some integrations may be partially unavailable without external credentials.

---

## Current status

ReplyFlow is at **release candidate** stage (`v0.1.0-rc.1`).

Core flows are stable:
- job sourcing from 6 connectors (GitHub, Greenhouse, Lever, Ashby, Workable, Recruitee)
- ATS pipeline tracking
- recruiter contact management
- outreach with email templates
- billing (Free / Pro)
- analytics instrumentation

Active polish areas: UX refinements, screenshots/demo material, and production hardening.

---

## Documentation

See [`docs/`](./docs/) for detailed documentation:

- [Deployment runbook](./docs/DEPLOYMENT.md)
- [Sentry setup](./docs/SENTRY.md)
- [Versioning policy](./docs/VERSIONING.md)
- [Implementation runbook](./docs/IMPLEMENTATION_RUNBOOK.md)

---

## Commercial model

ReplyFlow is being built as a product.

Current pricing direction:

* **Free**
* **Pro — R$ 39/month**

This repository may show product internals and implementation details, but the software itself is not licensed for open reuse or redistribution.

---

## Feedback

Issues and product feedback are welcome.

This repository is public mainly for visibility and transparency around the product, not as a community-led open-source project.

---

## License

**Proprietary / All rights reserved.**

This repository is public for transparency and visibility.
Unless explicitly stated otherwise, you may not copy, redistribute, modify, or use this code to create derivative commercial products.

If a formal license file is added, that file becomes the source of truth.

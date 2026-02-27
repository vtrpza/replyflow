# Contributing

## Branch Strategy

- `main`: stable branch.
- Feature branches: `feat/<short-name>`
- Fix branches: `fix/<short-name>`
- Chore/docs branches: `chore/<short-name>`, `docs/<short-name>`

## Commit Convention

Use Conventional Commits:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` code change without behavior change
- `chore:` tooling/build/internal

Examples:

- `feat: add per-user job reveal endpoint`
- `fix: scope outreach updates by authenticated user`

## Pull Request Checklist

- Keep PR focused and small when possible.
- Explain **why** in the PR description.
- Include migration notes if DB changed.
- Run:

```bash
npm run build
npm run lint
```

- Update docs when behavior changes (`README.md`, `CHANGELOG.md`, `VERSIONING.md`).

## Deployment

- Production deploy target is Fly.io (`replyflow-vhnpouza`).
- Deployment config is tracked in `fly.toml` + `Dockerfile`.
- If deployment behavior changes, update `DEPLOYMENT.md` in the same PR.

## Security & Data Safety

- Do not commit secrets.
- Validate multi-tenant scoping for any user data query.
- Enforce plan limits server-side.

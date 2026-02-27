# Versioning Policy

This project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`.

## Rules

- `MAJOR`: breaking changes in behavior, API, schema contract, or integration flow.
- `MINOR`: backward-compatible features.
- `PATCH`: backward-compatible bug fixes and small internal improvements.

## Database Changes

- Any schema migration that breaks compatibility should trigger a **major** or **minor** bump based on runtime impact.
- Migration files must be deterministic and committed in `drizzle/`.

## Release Cadence

- Patch releases: as needed.
- Minor releases: grouped feature increments.
- Major releases: planned with migration/rollback notes.

## Tagging

Use annotated tags:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Changelog

Every release must update [`CHANGELOG.md`](../CHANGELOG.md) using Keep a Changelog style sections:

- Added
- Changed
- Fixed
- Security

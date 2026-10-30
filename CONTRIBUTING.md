# Contributing to Scope

Scope accepts focused changes that preserve the YAML inventory contract and the read-only nature of monitored infrastructure.

1. Create an issue or describe the user-facing problem in the pull request.
2. Keep credentials and environment-specific hostnames out of the application repository.
3. Run `npm run config:check`, `npm test` and, for UI changes, `npm run test:e2e`.
4. Add a database migration for every persistent schema change; never edit an already released migration.
5. Keep inventory version 1 backward compatible throughout Scope 1.x.
6. Update `CHANGELOG.md`, examples and translations for user-visible behavior.

Use conventional, imperative commit subjects such as `feat: add maintenance windows` or `fix: prevent duplicate notifications`.

By submitting a contribution, you agree that it may be distributed under Scope's `AGPL-3.0-or-later` license. A contributor licensing agreement may be introduced before accepting contributions that are intended for a separately licensed commercial edition.

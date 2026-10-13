# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NestJS 11 backend ("Venturia") in TypeScript — a platform matching natural persons with company projects via an affinity index. The app listens on `process.env.PORT` (default 3000).

## Database

PostgreSQL via TypeORM 0.3 with `SnakeNamingStrategy` (camelCase properties → snake_case columns) and `synchronize: false` — all schema changes go through migrations.

- Feature modules live in `src/modules/<feature>/` (module file + `entities/`); shared infra stays in `src/config`, `src/database`, `src/common`.
- Entities live in `src/modules/<feature>/entities/*.entity.ts` and must be registered in `src/database/entities.ts`; each feature's `<feature>.module.ts` registers its repositories via `TypeOrmModule.forFeature` and is imported in `AppModule`.
- Migrations live in `src/database/migrations/` and must be registered in `src/database/migrations/index.ts` (no globs — the app and CLI share these arrays).
- CLI entry point is `src/database/data-source.ts`; env config is validated with Joi in `src/config/validation.schema.ts` (needs `.env`, see `.env.example`).

```bash
docker compose up -d postgres adminer   # Postgres on :5432, Adminer UI on :8080
pnpm run migration:generate src/database/migrations/<Name>
pnpm run migration:run
pnpm run migration:revert
docker compose up -d --build api        # API container, runs migrations on boot
```

e2e tests require the dockerized Postgres to be running.

## Package manager

Uses **pnpm** (pnpm-lock.yaml / pnpm-workspace.yaml). Do not use npm or yarn.

## Commands

```bash
pnpm install              # install dependencies
pnpm run start:dev        # run with watch mode
pnpm run build            # nest build → dist/
pnpm run lint             # eslint with --fix
pnpm run format           # prettier on src/ and test/

pnpm run test             # unit tests (jest, *.spec.ts under src/)
pnpm run test:watch
pnpm run test:e2e         # e2e tests (test/jest-e2e.json, *.e2e-spec.ts under test/)

# run a single test file
pnpm run test -- app.controller.spec
```

Jest unit tests use `rootDir: src` and match `*.spec.ts`; e2e tests live in `test/` with their own config.

## Git workflow

`develop` is the working branch; PRs target `main`. Feature work goes on `feature/*` branches.

## Git Rules

Do not commit, push, branch, rewrite history, or `git add .` — the user performs all git write operations manually. Inspecting history and suggesting commit messages is fine.

## Conventions

- ESLint uses the type-checked config with prettier; `no-explicit-any` is disabled, `no-floating-promises` and `no-unsafe-argument` are warnings. Line endings are `endOfLine: auto` (Windows dev environment).
- TypeScript is not fully strict: `noImplicitAny` is off, but `strictNullChecks` is on.
- Do not generate code comments unless strictly necessary.


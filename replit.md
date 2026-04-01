# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (Tailwind CSS v4, shadcn/ui, wouter, react-query)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── sfoes/              # SFOES React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## SFOES - Sehhat Foundation Online Exam System

### Project Description
Full-stack online examination portal for a medical foundation. Supports 3 roles:
- **Admin**: Manage users, programs, years, subjects, view live exams, export results
- **Faculty**: Create exams, bulk upload MCQs via CSV/Excel, edit individual MCQs
- **Student**: Login by selecting name from list, take shuffled exams with anti-cheat

### Database Schema
- `users` — admin/faculty/student with role-based fields
- `years` — academic years (2026-2030)
- `programs` — GBSN, PRN
- `semesters` — 8 semesters
- `subjects` — per program/semester
- `exams` — exam slots with duration and question count
- `mcqs` — 100 MCQs per exam with correct option
- `exam_attempts` — student attempts with shuffled question/option order, answers JSON, score

### Auth
Simple token-based auth. Tokens stored in localStorage. Custom fetch automatically includes `Authorization: Bearer` header.

Default credentials:
- Admin: `admin` / `admin123`
- Faculty: `faculty1` / `faculty123`
- Faculty: `faculty2` / `faculty123`
- Students: Login via Student Login page (select program GBSN/year 2026)

### Anti-Cheat Features
- Tab switch detection (3 warnings → auto-submit)
- Right-click disabled
- Copy/paste disabled
- Text selection disabled
- 30-minute countdown timer with auto-submit
- Answer persistence to DB + localStorage on each click

### CSV/Excel Upload Format
Expected columns: questionNumber, questionText, optionA, optionB, optionC, optionD, correctOption

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Packages

### `artifacts/sfoes` (`@workspace/sfoes`)
React + Vite frontend. Routes to `/`.

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server serving all routes under `/api`.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.

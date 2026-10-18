# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the React/TypeScript application, browser SQLite lessons (`lessons.ts`), authentication, and shared styles.
- `src/teacher/` contains dashboard, quiz, and reporting components, domain models, and feature CSS.
- `server/index.js` provides the optional Express/MongoDB scaffold; `server/*.test.js` tests application behavior, including frontend models.
- `public/images/` contains static artwork. `supabase/` contains SQL setup scripts; `docs/teacher-auth.md` explains teacher authentication.
- `verify/` contains browser fixtures and manual verification scripts. `dist/` is generated build output; edit source files instead.

## Build, Test, and Development Commands

Use Node.js 24 LTS and install dependencies with `npm ci`.

- `npm run dev`: start the Vite development server; `/api` requests proxy to port 3001.
- `npm run build`: check TypeScript and generate production assets.
- `npm run preview`: serve the production build locally.
- `npm test`: run `server/*.test.js` with Node’s built-in test runner.
- `docker compose up -d`: start optional local MongoDB.
- `npm run server`: start the backend using `.env`; copy `.env.example` first if needed.

## Coding Style & Naming Conventions

Use strict TypeScript for frontend code and ES modules throughout. Match surrounding formatting: existing models and tests generally use one-space indentation, single quotes, and semicolons. No formatter or linter script is configured.

Use PascalCase for React component files (`ReportsPage.tsx`), camelCase for functions and variables, and descriptive kebab-case for utility modules (`report-data.ts`). Keep feature styles beside their components and reusable calculations in model modules.

## Testing Guidelines

Use `node:test` and `node:assert/strict`. Name files `server/<feature>.test.js` and describe observable behavior in test names. Cover changed validation, grading, filtering, and access rules. No coverage threshold is configured. Run `npm test` and `npm run build` before submitting changes. Browser scripts in `verify/` require local setup and currently reference a machine-specific Playwright installation.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout. Use concise, imperative commit subjects such as `Fix quiz score rounding`. Keep changes focused. Include purpose, validation results, linked issues when applicable, and screenshots for UI changes in pull requests.

## Security & Configuration

Keep secrets out of commits and browser-exposed configuration. Follow `docs/teacher-auth.md` for teacher roles and access controls. Browser localStorage progress and client XP are demo data, not authoritative grades.

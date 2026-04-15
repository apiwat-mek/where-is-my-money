# Copilot Instructions for SlipSaver

## Build, lint, and test commands

- Install dependencies: `npm install`
- Run dev server (Vite on port 3000): `npm run dev`
- Type-check/lint (TypeScript only): `npm run lint`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Clean build output: `npm run clean`

### Tests

- There is currently no test script or test runner configured in `package.json`.
- Single-test execution is not available until a test framework is added.

## High-level architecture

- Frontend is a Vite + React + TypeScript SPA in `src/`.
- Auth and data layer are Firebase:
  - Firebase Auth handles email/password + Google sign-in (`src/components/Auth.tsx`).
  - Firestore stores `users`, `transactions`, and `categories`.
  - `src/App.tsx` listens to auth state and ensures a `users/{uid}` profile document exists.
- Main app flow:
  - `Dashboard` loads month-filtered transactions and user categories via Firestore realtime listeners.
  - Users can add/edit/delete transactions manually (`TransactionForm`, `TransactionList`).
  - Users can add custom categories (`CategoryManager`).
  - Reports/charts are rendered with Recharts (`Reports`).
- AI slip processing flow:
  - Frontend uploader (`src/components/SlipUploader.tsx`) optimizes image size/quality and calls `processSlip` (`src/lib/gemini.ts`).
  - `processSlip` sends POST `/api/process-slip` with `{ base64Image, mimeType, acceptedCategories }`.
  - Vercel serverless function (`api/process-slip.ts`) calls Gemini, validates structured output, normalizes category to accepted options, and returns extraction metadata (including `requiresCategorySelection` when AI category does not match).
- Deployment routing (`vercel.json`):
  - `/api/*` routes to serverless API files.
  - All other paths rewrite to `index.html` for SPA routing.

## Key codebase conventions

- Environment configuration is strict:
  - Firebase config must come from `VITE_*` env vars; missing required vars throw at startup (`src/lib/firebase.ts`).
  - Env values may be pasted with quotes in Vercel; code trims and unquotes values.
  - `GEMINI_API_KEY` must remain server-side only and is used in `/api/process-slip`.
- Firestore ownership and shape constraints are enforced by security rules (`firestore.rules`):
  - Documents must carry `userId` and match expected field types.
  - Reads/writes are scoped to the authenticated owner.
  - Keep client writes aligned with rule-required fields when changing schema.
- Category handling convention:
  - Transaction type is strictly `'income' | 'expense'`.
  - Category pools are type-specific, combining built-in defaults with user custom categories.
  - AI-extracted categories are matched case-insensitively; unmatched values are coerced to `Other` and require explicit user selection before save.
- Timestamp/data model convention:
  - Transaction `date` is stored as Firestore `Timestamp`.
  - Creation uses `serverTimestamp()` in app writes; keep temporal fields compatible with Firestore rules.

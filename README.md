# SlipSaver - Bank Slip Expense Tracker

## Local development

Prerequisites: Node.js 20+

1. Install dependencies:
   npm install
2. Create your local env file from the template:
   cp .env.example .env.local
3. Fill all Firebase values and GEMINI_API_KEY in .env.local
4. Start the dev server:
   npm run dev

## Vercel deployment

1. Import this repository into Vercel.
2. Keep the build settings:
   - Build command: npm run build
   - Output directory: dist
3. Add these Environment Variables in Vercel Project Settings.

Public values (exposed to browser, must start with VITE\_):

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_MEASUREMENT_ID (optional)
- VITE_FIREBASE_DATABASE_ID (optional)

Private value (server-side only):

- GEMINI_API_KEY

4. Deploy.

## Security notes

- Gemini API calls run through the serverless endpoint at /api/process-slip so GEMINI_API_KEY is not shipped in frontend bundles.
- Firebase web config is loaded from environment variables instead of a committed config JSON.

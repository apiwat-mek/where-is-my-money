import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function readEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) return "";

  const trimmed = value.trim();
  // Vercel values are sometimes pasted with surrounding quotes.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

const requiredEnvKeys: Array<keyof ImportMetaEnv> = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
];

const missingEnvKeys = requiredEnvKeys.filter((key) => !readEnv(key));
if (missingEnvKeys.length > 0) {
  throw new Error(
    `Missing Firebase env vars: ${missingEnvKeys.join(", ")}. Check your Vercel project Environment Variables.`,
  );
}

const firebaseConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY"),
  authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
  appId: readEnv("VITE_FIREBASE_APP_ID"),
  storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  measurementId: readEnv("VITE_FIREBASE_MEASUREMENT_ID"),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = readEnv("VITE_FIREBASE_DATABASE_ID")
  ? getFirestore(app, readEnv("VITE_FIREBASE_DATABASE_ID"))
  : getFirestore(app);

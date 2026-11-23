import { z } from "zod";
const schema = z.object({
  VITE_DATA_PROVIDER: z.enum(["firebase", "demo"]).default("firebase"),
  VITE_MEDIA_PROVIDER: z.literal("cloudinary").default("cloudinary"),
  VITE_FIREBASE_API_KEY: z.string().default(""),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().default(""),
  VITE_FIREBASE_PROJECT_ID: z.string().default(""),
  VITE_FIREBASE_APP_ID: z.string().default(""),
  VITE_ALLOWED_EMAILS: z.string().default(""),
  VITE_CLOUDINARY_CLOUD_NAME: z.string().default(""),
  VITE_CLOUDINARY_UPLOAD_PRESET: z.string().default(""),
  VITE_USE_FIREBASE_EMULATORS: z.enum(["true", "false"]).default("false"),
});
export const env = schema.parse(import.meta.env);
export const allowedEmails = env.VITE_ALLOWED_EMAILS.split(",")
  .map((x) => x.trim().toLowerCase())
  .filter(Boolean);
export const configured =
  !!env.VITE_FIREBASE_API_KEY &&
  !!env.VITE_FIREBASE_PROJECT_ID &&
  allowedEmails.length === 2 &&
  new Set(allowedEmails).size === 2;

import { getApps, initializeApp } from "firebase-admin/app";

export function getFirebaseAdminApp() {
  return getApps()[0] ?? initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-flasharo" });
}

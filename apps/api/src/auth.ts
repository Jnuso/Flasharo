import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface Identity {
  uid: string;
  email: string;
}

export type VerifyToken = (token: string) => Promise<Identity>;

export const verifyFirebaseToken: VerifyToken = async (token) => {
  if (getApps().length === 0) {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-flasharo" });
  }
  const decoded = await getAuth().verifyIdToken(token);
  if (!decoded.email) {
    throw new Error("An email address is required for a Flasharo account.");
  }
  return { uid: decoded.uid, email: decoded.email };
};

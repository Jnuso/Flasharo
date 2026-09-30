import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "./firebase-admin.js";

export interface Identity {
  uid: string;
  email: string;
}

export type VerifyToken = (token: string) => Promise<Identity>;

export const verifyFirebaseToken: VerifyToken = async (token) => {
  const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(token);
  if (!decoded.email) {
    throw new Error("An email address is required for a Flasharo account.");
  }
  return { uid: decoded.uid, email: decoded.email };
};

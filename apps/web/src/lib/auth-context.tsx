"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserProfile } from "@flasharo/contracts";
import { apiFetch } from "./api";
import { auth } from "./firebase";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  ready: boolean;
  profileError: string | null;
  retryProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (currentUser: User) => {
    setProfileError(null);
    try {
      setProfile(await apiFetch<UserProfile>(currentUser, "/me"));
    } catch (error) {
      setProfile(null);
      setProfileError(error instanceof Error ? error.message : "Could not load your account.");
    }
  }, []);

  useEffect(() => {
    let generation = 0;
    return onAuthStateChanged(auth, (currentUser) => {
      const ownGeneration = ++generation;
      setUser(currentUser);
      setProfile(null);
      setProfileError(null);
      setReady(false);
      if (!currentUser) {
        setReady(true);
        return;
      }
      apiFetch<UserProfile>(currentUser, "/me")
        .then((nextProfile) => {
          if (generation === ownGeneration) setProfile(nextProfile);
        })
        .catch((error: unknown) => {
          if (generation === ownGeneration) {
            setProfileError(error instanceof Error ? error.message : "Could not load your account.");
          }
        })
        .finally(() => {
          if (generation === ownGeneration) setReady(true);
        });
    });
  }, []);

  return <AuthContext.Provider value={{
    user, profile, ready, profileError,
    retryProfile: async () => { if (user) await loadProfile(user); },
    logout: () => signOut(auth),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useAuth must be used within AuthProvider.");
  return state;
}

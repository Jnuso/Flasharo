"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { useAuth } from "../lib/auth-context";

export function RequireAuth({ children }: { children: (user: User) => ReactNode }) {
  const router = useRouter();
  const { user, profile, ready, profileError, retryProfile } = useAuth();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return <div className="loading-panel">Loading your account…</div>;
  if (!user) return <div className="loading-panel">Taking you to sign in…</div>;
  if (profileError) return <div className="error-panel">
    <h2>We couldn’t load your account</h2>
    <p>{profileError}</p>
    <button className="button button-primary" onClick={retryProfile}>Try again</button>
  </div>;
  if (!profile) return <div className="loading-panel">Loading your account…</div>;
  return <>{children(user)}</>;
}

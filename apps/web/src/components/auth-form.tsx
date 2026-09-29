"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

function authMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code.includes("email-already-in-use")) return "That email already has an account. Try logging in.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("weak-password")) return "Choose a password with at least 6 characters.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  return "We couldn’t complete that request. Please try again.";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (signup && password.length < 6) {
      setError("Choose a password with at least 6 characters.");
      return;
    }
    setPending(true);
    try {
      if (signup) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/sets");
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-shell container">
    <div className="auth-aside"><span className="eyebrow">Make room for what matters</span><h1>Small cards.<br /><em>Big ideas.</em></h1><p>Your learning space starts here.</p><div className="auth-doodle">✳</div></div>
    <div className="auth-card">
      <div className="auth-icon">✦</div>
      <h2>{signup ? "Create your account" : "Welcome back"}</h2>
      <p className="muted">{signup ? "Start building a collection that’s yours." : "Pick up right where you left off."}</p>
      <form onSubmit={submit} className="stack-form">
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /></label>
        <label>Password<input type="password" minLength={signup ? 6 : undefined} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="••••••••" /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-wide" disabled={pending}>{pending ? "One moment…" : signup ? "Create account" : "Log in"}</button>
      </form>
      {!signup && <Link className="text-link reset-link" href="/reset-password">Forgot your password?</Link>}
      <p className="auth-switch">{signup ? "Already have an account?" : "New to Flasharo?"} <Link className="text-link" href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p>
    </div>
  </main>;
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch {
      setError("Could not send a reset link. Check the email address and try again.");
    } finally {
      setPending(false);
    }
  }

  return <main className="container narrow-page"><div className="auth-card single-card">
    <div className="auth-icon">✦</div><h1>Reset your password</h1>
    <p className="muted">{sent ? "If that address has an account, a reset link is on its way. In local development, find it in the emulator terminal." : "Enter your email and we’ll send you a reset link."}</p>
    {!sent && <form className="stack-form" onSubmit={submit}>
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    </form>}
    <Link className="text-link reset-link" href="/login">Back to log in</Link>
  </div></main>;
}

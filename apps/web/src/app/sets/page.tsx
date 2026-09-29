"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import type { StudySet, StudySetSummary } from "@flasharo/contracts";
import { RequireAuth } from "../../components/require-auth";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function SetsDashboard({ user }: { user: User }) {
  const router = useRouter();
  const { profile } = useAuth();
  const [sets, setSets] = useState<StudySetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSets(await apiFetch<StudySetSummary[]>(user, "/sets"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your sets.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function createSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const set = await apiFetch<StudySet>(user, "/sets", {
        method: "POST", body: JSON.stringify({ title, description }),
      });
      router.push(`/sets/${set.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create your set.");
      setCreating(false);
    }
  }

  return <main className="container workspace-page">
    <div className="page-heading"><div><span className="eyebrow">Your learning space</span><h1>My study sets</h1><p>Welcome back{profile?.email ? `, ${profile.email.split("@")[0]}` : ""}. Pick up a set or make something new.</p></div>
      <button className="button button-primary" onClick={() => setShowForm((value) => !value)}>{showForm ? "Cancel" : "+ Create a set"}</button>
    </div>
    {showForm && <form className="create-panel stack-form" onSubmit={createSet}>
      <div><h2>New study set</h2><p className="muted">Only you can see this set.</p></div>
      <label>Set title<input autoFocus value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Spanish food vocabulary" required /></label>
      <label>Description <span className="optional">(optional)</span><textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="What is this set about?" rows={3} /></label>
      <button className="button button-primary" disabled={creating}>{creating ? "Creating…" : "Create set"}</button>
    </form>}
    {error && <div className="form-error" role="alert">{error} <button className="text-link" onClick={refresh}>Retry</button></div>}
    {loading ? <div className="loading-panel">Loading your sets…</div> : sets.length === 0 ? <div className="empty-state"><div className="empty-icon">✦</div><h2>Your first set starts here</h2><p>Collect the terms you want to remember, then study them one card at a time.</p><button className="button button-outline" onClick={() => setShowForm(true)}>Create a set</button></div> :
      <div className="set-grid">{sets.map((set) => <Link className="set-tile" key={set.id} href={`/sets/${set.id}`}>
        <span className="tile-top"><span className="private-badge">Private</span><span aria-hidden="true">↗</span></span>
        <h2>{set.title}</h2><p>{set.description || "A space for your ideas."}</p>
        <span className="tile-bottom">{set.cardCount} {set.cardCount === 1 ? "card" : "cards"}<span>Updated {new Date(set.updatedAt).toLocaleDateString()}</span></span>
      </Link>)}</div>}
  </main>;
}

export default function SetsPage() {
  return <RequireAuth>{(user) => <SetsDashboard user={user} />}</RequireAuth>;
}

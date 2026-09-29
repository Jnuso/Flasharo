"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { User } from "firebase/auth";
import type { StudySet } from "@flasharo/contracts";
import { RequireAuth } from "../../../../components/require-auth";
import { apiFetch } from "../../../../lib/api";

function StudyView({ user, setId }: { user: User; setId: string }) {
  const [set, setSet] = useState<StudySet | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<StudySet>(user, `/sets/${setId}`)
      .then((data) => { if (active) setSet(data); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load this set."); });
    return () => { active = false; };
  }, [user, setId]);

  function move(direction: -1 | 1) {
    if (!set) return;
    setIndex((current) => Math.max(0, Math.min(set.cards.length - 1, current + direction)));
    setFlipped(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === " ") { event.preventDefault(); setFlipped((value) => !value); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (error) return <main className="container narrow-page"><div className="error-panel"><h1>Couldn’t open study mode</h1><p>{error}</p><Link className="button button-outline" href="/sets">Back to my sets</Link></div></main>;
  if (!set) return <div className="loading-panel">Getting your cards ready…</div>;
  if (set.cards.length === 0) return <main className="container narrow-page"><div className="empty-state"><h1>No cards to study yet</h1><p>Add a card and come back to flip through it.</p><Link className="button button-primary" href={`/sets/${setId}`}>Add cards</Link></div></main>;

  const card = set.cards[index]!;
  return <main className="container study-page">
    <Link className="back-link" href={`/sets/${setId}`}>← Back to {set.title}</Link>
    <div className="study-heading"><span className="eyebrow">Study mode</span><h1>{set.title}</h1><p>Think of the answer, then flip the card to check yourself.</p></div>
    <div className="study-progress"><span>Card {index + 1} of {set.cards.length}</span><div className="progress-track"><div style={{ width: `${((index + 1) / set.cards.length) * 100}%` }} /></div></div>
    <button className={`study-card ${flipped ? "is-flipped" : ""}`} onClick={() => setFlipped((value) => !value)} aria-label={flipped ? "Show term" : "Show definition"}>
      <span className="study-card-label">{flipped ? "DEFINITION" : "TERM"}</span>
      <strong>{flipped ? card.definition : card.term}</strong>
      <span className="study-card-hint">Click or press space to flip ↻</span>
    </button>
    <div className="study-controls"><button className="button button-outline" disabled={index === 0} onClick={() => move(-1)}>← Previous</button><span>Use ← → to move</span><button className="button button-primary" disabled={index === set.cards.length - 1} onClick={() => move(1)}>Next →</button></div>
    {index === set.cards.length - 1 && <p className="study-finish">You reached the end. <button className="text-link" onClick={() => { setIndex(0); setFlipped(false); }}>Study again</button></p>}
  </main>;
}

export default function StudyPage() {
  const { setId } = useParams<{ setId: string }>();
  return <RequireAuth>{(user) => <StudyView user={user} setId={setId} />}</RequireAuth>;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StudySet } from "@flasharo/contracts";

export function StudyDeck({ set, backHref, backLabel }: {
  set: StudySet;
  backHref: string;
  backLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  function move(direction: -1 | 1) {
    setIndex((current) => Math.max(0, Math.min(set.cards.length - 1, current + direction)));
    setFlipped(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(0, current - 1));
        setFlipped(false);
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.max(0, Math.min(set.cards.length - 1, current + 1)));
        setFlipped(false);
      }
      if (event.key === " ") { event.preventDefault(); setFlipped((value) => !value); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [set.cards.length]);

  if (set.cards.length === 0) return <main className="container narrow-page"><div className="empty-state">
    <h1>No cards to study yet</h1><p>This set does not have any cards.</p>
    <Link className="button button-primary" href={backHref}>Back to {backLabel}</Link>
  </div></main>;

  const card = set.cards[index]!;
  return <main className="container study-page">
    <Link className="back-link" href={backHref}>← Back to {backLabel}</Link>
    <div className="study-heading"><span className="eyebrow">Study mode · {set.visibility === "public" ? "Public set" : "Your set"}</span><h1>{set.title}</h1><p>{set.description || "Think of the answer, then flip the card to check yourself."}</p></div>
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

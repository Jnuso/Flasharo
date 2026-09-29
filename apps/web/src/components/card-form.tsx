"use client";

import { useState, type FormEvent } from "react";
import type { Flashcard, FlashcardInput } from "@flasharo/contracts";

export function CardForm({ card, onSave, onCancel }: {
  card?: Flashcard;
  onSave: (input: FlashcardInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [term, setTerm] = useState(card?.term ?? "");
  const [definition, setDefinition] = useState(card?.definition ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!term.trim() || !definition.trim()) {
      setError("Fill in both sides of the card.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await onSave({ term: term.trim(), definition: definition.trim() });
      if (!card) { setTerm(""); setDefinition(""); }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this card.");
    } finally {
      setPending(false);
    }
  }

  return <form className="card-form stack-form" onSubmit={submit}>
    <div className="card-form-grid">
      <label>Term<textarea rows={3} maxLength={1000} value={term} onChange={(event) => setTerm(event.target.value)} placeholder="What do you want to remember?" required /></label>
      <label>Definition<textarea rows={3} maxLength={3000} value={definition} onChange={(event) => setDefinition(event.target.value)} placeholder="Write the answer in your own words" required /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="button button-primary button-small" disabled={pending}>{pending ? "Saving…" : card ? "Save changes" : "Add card"}</button>{onCancel && <button className="button button-plain button-small" type="button" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

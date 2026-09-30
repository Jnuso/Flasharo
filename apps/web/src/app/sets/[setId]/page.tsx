"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import type { Flashcard, FlashcardInput, StudySet } from "@flasharo/contracts";
import { RequireAuth } from "../../../components/require-auth";
import { CardForm } from "../../../components/card-form";
import { apiFetch } from "../../../lib/api";

function SetEditor({ user, setId }: { user: User; setId: string }) {
  const router = useRouter();
  const [set, setSet] = useState<StudySet | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [editingCard, setEditingCard] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<StudySet>(user, `/sets/${setId}`);
      setSet(data); setTitle(data.title); setDescription(data.description);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this set.");
    } finally { setLoading(false); }
  }, [user, setId]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function saveSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const updated = await apiFetch<StudySet>(user, `/sets/${setId}`, { method: "PATCH", body: JSON.stringify({ title, description }) });
      setSet(updated);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this set."); }
    finally { setSaving(false); }
  }

  async function addCard(input: FlashcardInput) {
    await apiFetch<Flashcard>(user, `/sets/${setId}/cards`, { method: "POST", body: JSON.stringify(input) });
    await refresh();
  }

  async function editCard(cardId: string, input: FlashcardInput) {
    await apiFetch<Flashcard>(user, `/sets/${setId}/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(input) });
    setEditingCard(null);
    await refresh();
  }

  async function deleteCard(cardId: string) {
    if (!window.confirm("Delete this card?")) return;
    try { await apiFetch<void>(user, `/sets/${setId}/cards/${cardId}`, { method: "DELETE" }); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete this card."); }
  }

  async function moveCard(index: number, direction: -1 | 1) {
    if (!set) return;
    const next = [...set.cards];
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= next.length) return;
    [next[index], next[otherIndex]] = [next[otherIndex]!, next[index]!];
    setSet({ ...set, cards: next });
    try {
      const updated = await apiFetch<StudySet>(user, `/sets/${setId}/card-order`, { method: "PUT", body: JSON.stringify({ cardIds: next.map((card) => card.id) }) });
      setSet(updated);
    } catch (caught) {
      setSet(set);
      setError(caught instanceof Error ? caught.message : "Could not reorder cards.");
    }
  }

  async function deleteSet() {
    if (!window.confirm("Delete this set and all its cards? This cannot be undone.")) return;
    try { await apiFetch<void>(user, `/sets/${setId}`, { method: "DELETE" }); router.push("/sets"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete this set."); }
  }

  async function toggleVisibility() {
    if (!set) return;
    setSharing(true); setError("");
    try {
      const visibility = set.visibility === "private" ? "public" : "private";
      const updated = await apiFetch<StudySet>(user, `/sets/${setId}/visibility`, {
        method: "PATCH", body: JSON.stringify({ visibility }),
      });
      setSet(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change sharing for this set.");
    } finally { setSharing(false); }
  }

  if (loading && !set) return <div className="loading-panel">Loading your set…</div>;
  if (!set) return <main className="container narrow-page"><div className="error-panel"><h1>Set unavailable</h1><p>{error || "This set may have been deleted."}</p><Link className="button button-outline" href="/sets">Back to my sets</Link></div></main>;

  return <main className="container workspace-page editor-page">
    <Link className="back-link" href="/sets">← My study sets</Link>
    <div className="page-heading editor-heading"><div><span className="eyebrow">{set.visibility === "public" ? "Public study set" : "Private study set"}</span><h1>{set.title}</h1><p>{set.cards.length} {set.cards.length === 1 ? "card" : "cards"} ready to study</p></div>
      <div className="editor-actions"><Link className="button button-outline" href={`/sets/${setId}/learn`}>Learn mode</Link><Link className={`button button-primary ${set.cards.length === 0 ? "button-disabled" : ""}`} aria-disabled={set.cards.length === 0} href={set.cards.length ? `/sets/${setId}/study` : "#cards"}>Study cards →</Link></div>
    </div>
    {error && <div className="form-error" role="alert">{error} <button className="text-link" onClick={refresh}>Reload</button></div>}
    <section className="editor-section"><div className="section-heading"><div><span className="section-kicker">01 / THE DETAILS</span><h2>About this set</h2></div></div>
      <form className="details-form stack-form" onSubmit={saveSet}>
        <label>Title<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Description <span className="optional">(optional)</span><textarea rows={2} value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} /></label>
        <div className="form-actions"><button className="button button-outline button-small" disabled={saving}>{saving ? "Saving…" : "Save details"}</button><button className="text-danger" type="button" onClick={deleteSet}>Delete set</button></div>
      </form>
    </section>
    <section className="editor-section"><div className="section-heading"><div><span className="section-kicker">02 / SHARING</span><h2>Who can study this set?</h2></div></div>
      <div className="sharing-panel"><div><span className={set.visibility === "public" ? "public-badge" : "private-badge"}>{set.visibility === "public" ? "Public" : "Private"}</span>
        <p>{set.visibility === "public" ? "Anyone can find and study these cards. Only you can edit them." : "Only you can see and study these cards."}</p>
      </div><div className="sharing-actions">
        {set.visibility === "public" && <Link className="button button-outline button-small" href={`/explore/${setId}`}>View public page ↗</Link>}
        <button className="button button-primary button-small" type="button" disabled={sharing} onClick={toggleVisibility}>{sharing ? "Updating…" : set.visibility === "public" ? "Make private" : "Make public"}</button>
      </div></div>
    </section>
    <section className="editor-section" id="cards"><div className="section-heading"><div><span className="section-kicker">03 / THE CARDS</span><h2>Your flashcards</h2></div><span className="count-pill">{set.cards.length} cards</span></div>
      {set.cards.length === 0 && <p className="muted">No cards yet. Add the first one below.</p>}
      <div className="editor-card-list">{set.cards.map((card, index) => <article className="editor-card" key={card.id}>
        <div className="card-index">{String(index + 1).padStart(2, "0")}</div>
        {editingCard === card.id ? <CardForm card={card} onSave={(input) => editCard(card.id, input)} onCancel={() => setEditingCard(null)} /> : <>
          <div className="card-pair"><div><span>TERM</span><p>{card.term}</p></div><div><span>DEFINITION</span><p>{card.definition}</p></div></div>
          <div className="card-toolbar"><button aria-label={`Move card ${index + 1} up`} disabled={index === 0} onClick={() => moveCard(index, -1)}>↑</button><button aria-label={`Move card ${index + 1} down`} disabled={index === set.cards.length - 1} onClick={() => moveCard(index, 1)}>↓</button><button onClick={() => setEditingCard(card.id)}>Edit</button><button className="text-danger" onClick={() => deleteCard(card.id)}>Delete</button></div>
        </>}
      </article>)}</div>
      <div className="add-card-panel"><h3>+ Add a card</h3><CardForm onSave={addCard} /></div>
    </section>
  </main>;
}

export default function SetPage() {
  const { setId } = useParams<{ setId: string }>();
  return <RequireAuth>{(user) => <SetEditor user={user} setId={setId} />}</RequireAuth>;
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { User } from "firebase/auth";
import type { LearnAnswerResult, LearnSession } from "@flasharo/contracts";
import { RequireAuth } from "../../../../components/require-auth";
import { apiFetch } from "../../../../lib/api";

function LearnView({ user, setId }: { user: User; setId: string }) {
  const [session, setSession] = useState<LearnSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<LearnAnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const backHref = session && !session.isOwner ? `/explore/${setId}` : `/sets/${setId}`;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSession(await apiFetch<LearnSession>(user, `/learn/sets/${setId}`));
      setAnswer("");
      setFeedback(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Learn mode.");
    } finally {
      setLoading(false);
    }
  }, [user, setId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(value: string) {
    if (!session?.question || pending || feedback || !value.trim()) return;
    setPending(true);
    setError("");
    try {
      setFeedback(await apiFetch<LearnAnswerResult>(user, `/learn/sets/${setId}/answers`, {
        method: "POST",
        body: JSON.stringify({ cardId: session.question.cardId, answer: value }),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your answer.");
    } finally {
      setPending(false);
    }
  }

  function submitWritten(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(answer);
  }

  async function restart() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await apiFetch<void>(user, `/learn/sets/${setId}/restart`, { method: "POST" });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not restart Learn mode.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <div className="loading-panel">Loading your Learn progress…</div>;
  if (!session) return <main className="container narrow-page"><div className="error-panel"><h1>Learn mode unavailable</h1><p>{error}</p><button className="button button-primary" onClick={refresh}>Try again</button></div></main>;

  return <main className="container learn-page">
    <Link className="back-link" href={backHref}>← Back to set</Link>
    <div className="learn-heading"><span className="eyebrow">Learn mode</span><h1>{session.title}</h1><p>Choose the right definition, then type it from memory.</p>
      {session.status === "question" && <div className="learn-restart"><button className="button button-plain button-small" disabled={pending} onClick={restart}>Start over</button><small>Clears this round’s saved answers.</small></div>}
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {session.status === "needs-cards" ? <div className="empty-state"><h2>More cards needed</h2><p>Add at least two cards with different definitions to start multiple choice.</p><Link className="button button-primary" href={backHref}>Back to set</Link></div> : <>
      <div className="study-progress"><span>{session.masteredCards} of {session.totalCards} learned</span><div className="progress-track"><div style={{ width: `${(session.masteredCards / session.totalCards) * 100}%` }} /></div></div>
      {session.status === "complete" ? <div className="learn-complete"><span aria-hidden="true">✦</span><h2>You learned every card!</h2><p>Your progress is saved. Study again whenever you want; starting a new round clears this round’s answers.</p><div className="learn-complete-actions"><button className="button button-primary" disabled={pending} onClick={restart}>{pending ? "Starting…" : "Study again"}</button><Link className="button button-outline" href={backHref}>Back to set</Link></div></div> : session.question && <section className="learn-question">
        <div className="learn-question-top"><span className="section-kicker">{session.question.stage === "multiple-choice" ? "Step 1 / Choose" : "Step 2 / Write"}</span><span>{session.question.attempts} previous {session.question.attempts === 1 ? "try" : "tries"}</span></div>
        <h2>{session.question.term}</h2>
        <p className="muted">{session.question.stage === "multiple-choice" ? "Which definition matches this term?" : "Type the definition from memory. Capitalization and extra spaces do not matter."}</p>
        {session.question.stage === "multiple-choice" ? <div className="learn-options">{session.question.options.map((option) => <button key={option.cardId} type="button" disabled={pending || !!feedback} onClick={() => submit(option.cardId)}>{option.definition}</button>)}</div> :
          <form className="learn-written" onSubmit={submitWritten}><label htmlFor="learn-answer">Your answer</label><textarea id="learn-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={pending || !!feedback} maxLength={3000} rows={3} placeholder="Type the definition here…" /><button className="button button-primary" disabled={pending || !!feedback || !answer.trim()}>{pending ? "Checking…" : "Check answer"}</button></form>}
        {feedback && <div className={`learn-feedback ${feedback.correct ? "is-correct" : "is-incorrect"}`} role="status">
          <strong>{feedback.correct ? feedback.stage === "mastered" ? "Correct — card learned!" : "Correct — now type it." : "Not quite. Give this step another try."}</strong>
          {!feedback.correct && <p>Correct answer: <span>{feedback.correctAnswer}</span></p>}
          <button className="button button-primary button-small" onClick={refresh}>{feedback.correct ? feedback.stage === "mastered" ? "Next card" : "Type the answer" : "Try again"}</button>
        </div>}
      </section>}
    </>}
  </main>;
}

export default function LearnPage() {
  const { setId } = useParams<{ setId: string }>();
  return <RequireAuth>{(user) => <LearnView key={setId} user={user} setId={setId} />}</RequireAuth>;
}

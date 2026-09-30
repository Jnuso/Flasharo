"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { User } from "firebase/auth";
import type { StudySet } from "@flasharo/contracts";
import { RequireAuth } from "../../../../components/require-auth";
import { StudyDeck } from "../../../../components/study-deck";
import { apiFetch } from "../../../../lib/api";

function PrivateStudyView({ user, setId }: { user: User; setId: string }) {
  const [set, setSet] = useState<StudySet | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<StudySet>(user, `/sets/${setId}`)
      .then((data) => { if (active) setSet(data); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load this set."); });
    return () => { active = false; };
  }, [user, setId]);

  if (error) return <main className="container narrow-page"><div className="error-panel"><h1>Couldn’t open study mode</h1><p>{error}</p><Link className="button button-outline" href="/sets">Back to my sets</Link></div></main>;
  if (!set) return <div className="loading-panel">Getting your cards ready…</div>;
  return <StudyDeck key={set.id} set={set} backHref={`/sets/${setId}`} backLabel={set.title} learnHref={`/sets/${setId}/learn`} />;
}

export default function StudyPage() {
  const { setId } = useParams<{ setId: string }>();
  return <RequireAuth>{(user) => <PrivateStudyView user={user} setId={setId} />}</RequireAuth>;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { StudySet } from "@flasharo/contracts";
import { StudyDeck } from "../../../components/study-deck";
import { publicGet } from "../../../lib/api";

export default function PublicSetPage() {
  const { setId } = useParams<{ setId: string }>();
  const [set, setSet] = useState<StudySet | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    publicGet<StudySet>(`/public/sets/${setId}`)
      .then((data) => { if (active) setSet(data); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Could not open this set."); });
    return () => { active = false; };
  }, [setId]);

  if (error) return <main className="container narrow-page"><div className="error-panel"><h1>Set unavailable</h1><p>This set may be private now or may have been deleted.</p><Link className="button button-outline" href="/explore">Explore other sets</Link></div></main>;
  if (!set) return <div className="loading-panel">Getting these cards ready…</div>;
  return <StudyDeck key={set.id} set={set} backHref="/explore" backLabel="Explore sets" />;
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicSetSearchResult } from "@flasharo/contracts";
import { publicGet } from "../../lib/api";

export function ExploreClient({ query, page }: { query: string; page: number }) {
  const router = useRouter();
  const [input, setInput] = useState(query);
  const [result, setResult] = useState<PublicSetSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setInput(query); }, [query]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const url = `/public/sets?q=${encodeURIComponent(query)}&page=${page}`;
    publicGet<PublicSetSearchResult>(url)
      .then((data) => { if (active) setResult(data); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Could not search sets."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, page]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = input.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  }

  function pageHref(nextPage: number) {
    return `/explore?${query ? `q=${encodeURIComponent(query)}&` : ""}page=${nextPage}`;
  }

  return <main className="container workspace-page explore-page">
    <div className="page-heading"><div><span className="eyebrow">Learn together</span><h1>Explore study sets</h1><p>Find public flashcards made by the community.</p></div></div>
    <form className="search-form" onSubmit={search} role="search">
      <label className="sr-only" htmlFor="set-search">Search public sets</label>
      <input id="set-search" value={input} maxLength={100} onChange={(event) => setInput(event.target.value)} placeholder="Search titles or descriptions…" />
      <button className="button button-primary" type="submit">Search</button>
    </form>
    {error && <div className="form-error" role="alert">{error}</div>}
    {loading ? <div className="loading-panel">Finding public sets…</div> : result && <>
      <div className="results-heading"><h2>{query ? `Results for “${query}”` : "Recently shared"}</h2><span>{result.total} {result.total === 1 ? "set" : "sets"}</span></div>
      {result.items.length === 0 ? <div className="empty-state"><div className="empty-icon">✦</div><h2>No sets found</h2><p>{query ? "Try a different search, or browse all public sets." : "Public sets will appear here when someone shares one."}</p>{query && <Link className="button button-outline" href="/explore">Browse all</Link>}</div> :
        <div className="set-grid">{result.items.map((set) => <Link className="set-tile" key={set.id} href={`/explore/${set.id}`}>
          <span className="tile-top"><span className="public-badge">Public set</span><span aria-hidden="true">↗</span></span>
          <h2>{set.title}</h2><p>{set.description || "A new set to discover."}</p>
          <span className="tile-bottom">{set.cardCount} {set.cardCount === 1 ? "card" : "cards"}<span>Shared {new Date(set.updatedAt).toLocaleDateString()}</span></span>
        </Link>)}</div>}
      {result.totalPages > 1 && <nav className="pagination" aria-label="Search pages">
        {page > 1 ? <Link className="button button-outline button-small" href={pageHref(page - 1)}>← Previous</Link> : <span />}
        <span>Page {page} of {result.totalPages}</span>
        {page < result.totalPages ? <Link className="button button-outline button-small" href={pageHref(page + 1)}>Next →</Link> : <span />}
      </nav>}
    </>}
  </main>;
}

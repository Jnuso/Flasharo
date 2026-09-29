"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import SetsPage from "./sets/page";

export default function HomePage() {
  const { user, ready } = useAuth();

  if (!ready) return <div className="loading-panel">Loading your account…</div>;
  if (user) return <SetsPage />;

  return <main>
    <section className="hero container">
      <div className="hero-copy">
        <span className="eyebrow">A little practice goes a long way</span>
        <h1>Make what you learn <em>stick.</em></h1>
        <p>Turn your notes into your own flashcards. Keep your sets together and study whenever you have a few minutes.</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/signup">Create your first set <span aria-hidden="true">↗</span></Link>
          <Link className="button button-outline" href="/explore">Explore public sets</Link>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="sample-card sample-back"><span>01 / 03</span><strong>Knowledge grows<br />with practice.</strong></div>
        <div className="sample-card sample-front"><span>YOUR NEXT FLASHCARD</span><strong>What will you<br />learn today?</strong><i>↻ flip to remember</i></div>
        <div className="art-sparkle sparkle-one">✦</div><div className="art-sparkle sparkle-two">✳</div>
      </div>
    </section>
    <section className="feature-strip"><div className="container feature-grid">
      <div><span className="feature-number">01</span><h2>Build your set</h2><p>Write a term and a definition for each idea you want to remember.</p></div>
      <div><span className="feature-number">02</span><h2>Flip through cards</h2><p>Test your recall one card at a time, at your own pace.</p></div>
      <div><span className="feature-number">03</span><h2>Learn together</h2><p>Share a set when you’re ready, or study cards made by the community.</p></div>
    </div></section>
  </main>;
}

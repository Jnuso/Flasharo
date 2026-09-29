"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  return <header className="site-header">
    <div className="container header-inner">
      <Link className="brand" href="/" aria-label="Flasharo home"><span className="brand-mark">✦</span> Flasharo</Link>
      <nav className="header-actions" aria-label="Main navigation">
        {user ? <>
          <Link className="nav-link" href="/sets">My sets</Link>
          <button className="nav-link nav-button" onClick={async () => { await logout(); router.push("/"); }}>Log out</button>
        </> : <>
          <Link className="nav-link" href="/login">Log in</Link>
          <Link className="button button-small button-primary" href="/signup">Get started</Link>
        </>}
      </nav>
    </div>
  </header>;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth-context";
import { Header } from "../components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flasharo — make it stick",
  description: "Create your own flashcards and study them at your pace.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><AuthProvider><Header />{children}</AuthProvider></body></html>;
}

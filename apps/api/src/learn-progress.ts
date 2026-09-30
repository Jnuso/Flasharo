import { getFirestore } from "firebase-admin/firestore";
import type { LearnAnswerResult, LearnStage } from "@flasharo/contracts";
import { getFirebaseAdminApp } from "./firebase-admin.js";

export interface LearnCard {
  id: string;
  definition: string;
  updatedAt: Date;
}

export interface SavedCardProgress {
  stage: LearnStage;
  attempts: number;
  correctAnswers: number;
  cardUpdatedAt: string;
  updatedAt: string;
}

export interface LearnProgressStore {
  getSet(uid: string, setId: string): Promise<Map<string, SavedCardProgress>>;
  recordAnswer(uid: string, setId: string, card: LearnCard, answer: string): Promise<LearnAnswerResult | null>;
  restartSet(uid: string, setId: string): Promise<void>;
}

function readProgress(value: Record<string, unknown> | undefined): SavedCardProgress | undefined {
  if (!value || !["multiple-choice", "written", "mastered"].includes(String(value.stage))) return;
  if (typeof value.cardUpdatedAt !== "string") return;
  return {
    stage: value.stage as LearnStage,
    attempts: typeof value.attempts === "number" ? value.attempts : 0,
    correctAnswers: typeof value.correctAnswers === "number" ? value.correctAnswers : 0,
    cardUpdatedAt: value.cardUpdatedAt,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

export function effectiveProgress(saved: SavedCardProgress | undefined, card: LearnCard) {
  if (saved?.cardUpdatedAt === card.updatedAt.toISOString()) return saved;
  return { stage: "multiple-choice" as const, attempts: 0, correctAnswers: 0 };
}

function normalizeAnswer(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** One correct choice unlocks writing; one correct written answer completes the card. */
export function gradeAnswer(saved: SavedCardProgress | undefined, card: LearnCard, answer: string, now = new Date()) {
  const current = effectiveProgress(saved, card);
  if (current.stage === "mastered") return null;
  const correct = current.stage === "multiple-choice"
    ? answer === card.id
    : normalizeAnswer(answer) === normalizeAnswer(card.definition);
  const stage: LearnStage = correct
    ? current.stage === "multiple-choice" ? "written" : "mastered"
    : current.stage;
  const progress: SavedCardProgress = {
    stage,
    attempts: current.attempts + 1,
    correctAnswers: current.correctAnswers + Number(correct),
    cardUpdatedAt: card.updatedAt.toISOString(),
    updatedAt: now.toISOString(),
  };
  return { progress, result: { correct, correctAnswer: card.definition, stage } satisfies LearnAnswerResult };
}

export class FirestoreLearnProgressStore implements LearnProgressStore {
  private cards(uid: string, setId: string) {
    return getFirestore(getFirebaseAdminApp())
      .collection("learn_progress").doc(uid).collection("sets").doc(setId).collection("cards");
  }

  async getSet(uid: string, setId: string) {
    const snapshot = await this.cards(uid, setId).get();
    const progress = new Map<string, SavedCardProgress>();
    for (const document of snapshot.docs) {
      const saved = readProgress(document.data());
      if (saved) progress.set(document.id, saved);
    }
    return progress;
  }

  async recordAnswer(uid: string, setId: string, card: LearnCard, answer: string) {
    const firestore = getFirestore(getFirebaseAdminApp());
    const ref = this.cards(uid, setId).doc(card.id);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const graded = gradeAnswer(snapshot.exists ? readProgress(snapshot.data()) : undefined, card, answer);
      if (!graded) return null;
      transaction.set(ref, graded.progress);
      return graded.result;
    });
  }

  async restartSet(uid: string, setId: string) {
    const documents = await this.cards(uid, setId).get();
    const firestore = getFirestore(getFirebaseAdminApp());
    // Firestore batches have a write limit; each chunk removes one user's saved round.
    for (let index = 0; index < documents.docs.length; index += 400) {
      const batch = firestore.batch();
      for (const document of documents.docs.slice(index, index + 400)) batch.delete(document.ref);
      await batch.commit();
    }
  }
}

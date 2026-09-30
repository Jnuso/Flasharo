/** Types shared by the web app and API. OpenAPI is served by the API for other clients. */
export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  setId: string;
  term: string;
  definition: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type SetVisibility = "private" | "public";

export interface StudySetSummary {
  id: string;
  title: string;
  description: string;
  visibility: SetVisibility;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudySet extends Omit<StudySetSummary, "cardCount"> {
  cards: Flashcard[];
}

export interface StudySetInput {
  title: string;
  description?: string;
}

export interface PublicSetSearchResult {
  items: StudySetSummary[];
  page: number;
  totalPages: number;
  total: number;
}

export interface FlashcardInput {
  term: string;
  definition: string;
}

export interface ApiError {
  error: string;
}

export type LearnStage = "multiple-choice" | "written" | "mastered";

export interface LearnOption {
  cardId: string;
  definition: string;
}

export interface LearnQuestion {
  cardId: string;
  term: string;
  stage: Exclude<LearnStage, "mastered">;
  options: LearnOption[];
  attempts: number;
}

export interface LearnSession {
  setId: string;
  title: string;
  isOwner: boolean;
  status: "needs-cards" | "question" | "complete";
  totalCards: number;
  masteredCards: number;
  question: LearnQuestion | null;
}

export interface LearnAnswerResult {
  correct: boolean;
  correctAnswer: string;
  stage: LearnStage;
}

export interface LearnAnswerInput {
  cardId: string;
  answer: string;
}

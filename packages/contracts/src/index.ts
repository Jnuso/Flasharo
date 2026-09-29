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

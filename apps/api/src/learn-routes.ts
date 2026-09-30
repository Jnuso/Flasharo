import type { FastifyInstance } from "fastify";
import { and, eq, or } from "drizzle-orm";
import type { LearnAnswerInput, LearnOption, LearnQuestion, LearnSession } from "@flasharo/contracts";
import { db } from "./db/client.js";
import { studySets } from "./db/schema.js";
import { effectiveProgress, type LearnProgressStore, type SavedCardProgress } from "./learn-progress.js";
import { loadCards } from "./routes.js";

const uuid = { type: "string", format: "uuid" } as const;
const setParams = { type: "object", required: ["setId"], properties: { setId: uuid } } as const;
const questionResponse = {
  type: "object",
  required: ["cardId", "term", "stage", "options", "attempts"],
  properties: {
    cardId: uuid,
    term: { type: "string" },
    stage: { type: "string", enum: ["multiple-choice", "written"] },
    options: { type: "array", items: {
      type: "object", required: ["cardId", "definition"],
      properties: { cardId: uuid, definition: { type: "string" } },
    } },
    attempts: { type: "integer" },
  },
} as const;
const sessionResponse = {
  type: "object",
  required: ["setId", "title", "isOwner", "status", "totalCards", "masteredCards", "question"],
  properties: {
    setId: uuid,
    title: { type: "string" },
    isOwner: { type: "boolean" },
    status: { type: "string", enum: ["needs-cards", "question", "complete"] },
    totalCards: { type: "integer" },
    masteredCards: { type: "integer" },
    question: { ...questionResponse, nullable: true },
  },
} as const;
const answerResponse = {
  type: "object", required: ["correct", "correctAnswer", "stage"],
  properties: {
    correct: { type: "boolean" }, correctAnswer: { type: "string" },
    stage: { type: "string", enum: ["multiple-choice", "written", "mastered"] },
  },
} as const;

type SetRow = typeof studySets.$inferSelect;
type CardRow = Awaited<ReturnType<typeof loadCards>>[number];

async function accessibleSet(setId: string, uid: string) {
  const [set] = await db.select().from(studySets)
    .where(and(eq(studySets.id, setId), or(eq(studySets.ownerId, uid), eq(studySets.visibility, "public"))))
    .limit(1);
  return set;
}

function hasChoices(cards: CardRow[]) {
  return new Set(cards.map((card) => card.definition.trim().toLocaleLowerCase())).size >= 2;
}

function optionsFor(cards: CardRow[], target: CardRow): LearnOption[] {
  const seen = new Set([target.definition.trim().toLocaleLowerCase()]);
  const distractors = cards.filter((card) => {
    const definition = card.definition.trim().toLocaleLowerCase();
    if (seen.has(definition)) return false;
    seen.add(definition);
    return true;
  }).slice(0, 3);
  return [target, ...distractors]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((card) => ({ cardId: card.id, definition: card.definition }));
}

function makeSession(set: SetRow, uid: string, cards: CardRow[], saved: Map<string, SavedCardProgress>): LearnSession {
  const masteredCards = cards.filter((card) => effectiveProgress(saved.get(card.id), card).stage === "mastered").length;
  const base = { setId: set.id, title: set.title, isOwner: set.ownerId === uid, totalCards: cards.length, masteredCards };
  if (!hasChoices(cards)) return { ...base, status: "needs-cards", question: null };
  const card = cards.find((item) => effectiveProgress(saved.get(item.id), item).stage !== "mastered");
  if (!card) return { ...base, status: "complete", question: null };
  const progress = effectiveProgress(saved.get(card.id), card);
  const question: LearnQuestion = {
    cardId: card.id,
    term: card.term,
    stage: progress.stage as LearnQuestion["stage"],
    options: progress.stage === "multiple-choice" ? optionsFor(cards, card) : [],
    attempts: progress.attempts,
  };
  return { ...base, status: "question", question };
}

export function registerLearnRoutes(app: FastifyInstance, progress: LearnProgressStore) {
  app.get<{ Params: { setId: string } }>("/learn/sets/:setId", {
    schema: { tags: ["learn"], params: setParams, response: { 200: sessionResponse } },
  }, async (request, reply) => {
    const set = await accessibleSet(request.params.setId, request.identity.uid);
    if (!set) return reply.code(404).send({ error: "Set not found." });
    const cards = await loadCards(set.id);
    const saved = await progress.getSet(request.identity.uid, set.id);
    return makeSession(set, request.identity.uid, cards, saved);
  });

  app.post<{ Params: { setId: string }; Body: LearnAnswerInput }>("/learn/sets/:setId/answers", {
    schema: {
      tags: ["learn"], params: setParams, response: { 200: answerResponse },
      body: {
        type: "object", required: ["cardId", "answer"], additionalProperties: false,
        properties: { cardId: uuid, answer: { type: "string", minLength: 1, maxLength: 3000 } },
      },
    },
  }, async (request, reply) => {
    const set = await accessibleSet(request.params.setId, request.identity.uid);
    if (!set) return reply.code(404).send({ error: "Set not found." });
    const cards = await loadCards(set.id);
    if (!hasChoices(cards)) return reply.code(409).send({ error: "Add at least two cards with different definitions to start Learn mode." });
    const card = cards.find((item) => item.id === request.body.cardId);
    if (!card) return reply.code(404).send({ error: "Card not found." });
    const answer = request.body.answer.trim();
    if (!answer) return reply.code(400).send({ error: "Choose or type an answer." });
    const result = await progress.recordAnswer(request.identity.uid, set.id, card, answer);
    if (!result) return reply.code(409).send({ error: "This card is already learned. Reload Learn mode." });
    return result;
  });

  app.post<{ Params: { setId: string } }>("/learn/sets/:setId/restart", {
    schema: { tags: ["learn"], params: setParams, response: { 204: { type: "null" } } },
  }, async (request, reply) => {
    const set = await accessibleSet(request.params.setId, request.identity.uid);
    if (!set) return reply.code(404).send({ error: "Set not found." });
    await progress.restartSet(request.identity.uid, set.id);
    return reply.code(204).send();
  });
}

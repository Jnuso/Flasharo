import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { FlashcardInput, StudySetInput } from "@flasharo/contracts";
import { db } from "./db/client.js";
import { cards, studySets } from "./db/schema.js";
import { findProfile } from "./profile.js";

const uuid = { type: "string", format: "uuid" } as const;
const setParams = { type: "object", required: ["setId"], properties: { setId: uuid } } as const;
const cardParams = {
  type: "object",
  required: ["setId", "cardId"],
  properties: { setId: uuid, cardId: uuid },
} as const;
const setBody = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 120 },
    description: { type: "string", maxLength: 500 },
  },
} as const;
const cardBody = {
  type: "object",
  required: ["term", "definition"],
  additionalProperties: false,
  properties: {
    term: { type: "string", minLength: 1, maxLength: 1000 },
    definition: { type: "string", minLength: 1, maxLength: 3000 },
  },
} as const;
const dateTime = { type: "string", format: "date-time" } as const;
const cardResponse = {
  type: "object", required: ["id", "setId", "term", "definition", "position", "createdAt", "updatedAt"],
  properties: {
    id: uuid, setId: uuid, term: { type: "string" }, definition: { type: "string" },
    position: { type: "integer" }, createdAt: dateTime, updatedAt: dateTime,
  },
} as const;
const setFields = {
  id: uuid, title: { type: "string" }, description: { type: "string" },
  visibility: { type: "string", enum: ["private", "public"] },
  createdAt: dateTime, updatedAt: dateTime,
} as const;
export const setResponse = {
  type: "object", required: ["id", "title", "description", "visibility", "createdAt", "updatedAt", "cards"],
  properties: { ...setFields, cards: { type: "array", items: cardResponse } },
} as const;
export const setSummaryResponse = {
  type: "object", required: ["id", "title", "description", "visibility", "createdAt", "updatedAt", "cardCount"],
  properties: { ...setFields, cardCount: { type: "integer" } },
} as const;

type SetParams = { setId: string };
type CardParams = SetParams & { cardId: string };

function serialiseCard(card: typeof cards.$inferSelect) {
  return {
    id: card.id,
    setId: card.setId,
    term: card.term,
    definition: card.definition,
    position: card.position,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export function serialiseSet(set: typeof studySets.$inferSelect, setCards: (typeof cards.$inferSelect)[]) {
  return {
    id: set.id,
    title: set.title,
    description: set.description,
    visibility: set.visibility,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
    cards: setCards.map(serialiseCard),
  };
}

export function serialiseSummary(set: typeof studySets.$inferSelect, cardCount: number) {
  return {
    id: set.id,
    title: set.title,
    description: set.description,
    visibility: set.visibility,
    cardCount,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
  };
}

async function ownedSet(setId: string, uid: string) {
  const [set] = await db.select().from(studySets)
    .where(and(eq(studySets.id, setId), eq(studySets.ownerId, uid))).limit(1);
  return set;
}

export async function loadCards(setId: string) {
  return db.select().from(cards).where(eq(cards.setId, setId))
    .orderBy(asc(cards.position), asc(cards.createdAt));
}

async function touchSet(setId: string) {
  await db.update(studySets).set({ updatedAt: new Date() }).where(eq(studySets.id, setId));
}

export function registerRoutes(app: FastifyInstance) {
  app.get("/me", { schema: { tags: ["account"], response: { 200: {
    type: "object", required: ["id", "email", "createdAt"],
    properties: { id: { type: "string" }, email: { type: "string", format: "email" }, createdAt: dateTime },
  } } } }, async (request) => {
    // The authentication hook has already synced this profile.
    const user = await findProfile(request.identity.uid);
    if (!user) throw new Error("Profile disappeared after sync.");
    return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() };
  });

  app.get("/sets", { schema: { tags: ["sets"], response: { 200: { type: "array", items: setSummaryResponse } } } }, async (request) => {
    const sets = await db.select().from(studySets)
      .where(eq(studySets.ownerId, request.identity.uid))
      .orderBy(desc(studySets.updatedAt));
    if (sets.length === 0) return [];

    const counts = await db.select({
      setId: cards.setId,
      count: sql<number>`count(*)::integer`,
    }).from(cards).where(inArray(cards.setId, sets.map((set) => set.id))).groupBy(cards.setId);
    const countBySet = new Map(counts.map((row) => [row.setId, row.count]));
    return sets.map((set) => serialiseSummary(set, countBySet.get(set.id) ?? 0));
  });

  app.post<{ Body: StudySetInput }>("/sets", { schema: { tags: ["sets"], body: setBody, response: { 201: setResponse } } }, async (request, reply) => {
    const title = request.body.title.trim();
    if (!title) return reply.code(400).send({ error: "Give your set a title." });
    const [set] = await db.insert(studySets).values({
      id: randomUUID(),
      ownerId: request.identity.uid,
      title,
      description: request.body.description?.trim() ?? "",
    }).returning();
    if (!set) throw new Error("Set creation returned no row.");
    return reply.code(201).send(serialiseSet(set, []));
  });

  app.get<{ Params: SetParams }>("/sets/:setId", {
    schema: { tags: ["sets"], params: setParams, response: { 200: setResponse } },
  }, async (request, reply) => {
    const set = await ownedSet(request.params.setId, request.identity.uid);
    if (!set) return reply.code(404).send({ error: "Set not found." });
    return serialiseSet(set, await loadCards(set.id));
  });

  app.patch<{ Params: SetParams; Body: StudySetInput }>("/sets/:setId", {
    schema: { tags: ["sets"], params: setParams, body: setBody, response: { 200: setResponse } },
  }, async (request, reply) => {
    const title = request.body.title.trim();
    if (!title) return reply.code(400).send({ error: "Give your set a title." });
    const [set] = await db.update(studySets).set({
      title,
      description: request.body.description?.trim() ?? "",
      updatedAt: new Date(),
    }).where(and(eq(studySets.id, request.params.setId), eq(studySets.ownerId, request.identity.uid))).returning();
    if (!set) return reply.code(404).send({ error: "Set not found." });
    return serialiseSet(set, await loadCards(set.id));
  });

  app.patch<{ Params: SetParams; Body: { visibility: "private" | "public" } }>("/sets/:setId/visibility", {
    schema: {
      tags: ["sets"], params: setParams, response: { 200: setResponse },
      body: {
        type: "object", required: ["visibility"], additionalProperties: false,
        properties: { visibility: { type: "string", enum: ["private", "public"] } },
      },
    },
  }, async (request, reply) => {
    const [set] = await db.update(studySets)
      .set({ visibility: request.body.visibility, updatedAt: new Date() })
      .where(and(eq(studySets.id, request.params.setId), eq(studySets.ownerId, request.identity.uid)))
      .returning();
    if (!set) return reply.code(404).send({ error: "Set not found." });
    return serialiseSet(set, await loadCards(set.id));
  });

  app.delete<{ Params: SetParams }>("/sets/:setId", {
    schema: { tags: ["sets"], params: setParams },
  }, async (request, reply) => {
    const deleted = await db.delete(studySets)
      .where(and(eq(studySets.id, request.params.setId), eq(studySets.ownerId, request.identity.uid)))
      .returning({ id: studySets.id });
    if (deleted.length === 0) return reply.code(404).send({ error: "Set not found." });
    return reply.code(204).send();
  });

  app.post<{ Params: SetParams; Body: FlashcardInput }>("/sets/:setId/cards", {
    schema: { tags: ["cards"], params: setParams, body: cardBody, response: { 201: cardResponse } },
  }, async (request, reply) => {
    const term = request.body.term.trim();
    const definition = request.body.definition.trim();
    if (!term || !definition) return reply.code(400).send({ error: "Fill in both sides of the card." });

    const result = await db.transaction(async (tx) => {
      // Lock the parent row so two concurrent additions cannot take the same position.
      const locked = await tx.execute(sql`SELECT id FROM study_sets WHERE id = ${request.params.setId} AND owner_id = ${request.identity.uid} FOR UPDATE`);
      if (locked.rows.length === 0) return null;
      const [last] = await tx.select({ position: cards.position }).from(cards)
        .where(eq(cards.setId, request.params.setId)).orderBy(desc(cards.position)).limit(1);
      const [card] = await tx.insert(cards).values({
        id: randomUUID(), setId: request.params.setId, term, definition,
        position: (last?.position ?? -1) + 1,
      }).returning();
      await tx.update(studySets).set({ updatedAt: new Date() }).where(eq(studySets.id, request.params.setId));
      return card;
    });
    if (!result) return reply.code(404).send({ error: "Set not found." });
    return reply.code(201).send(serialiseCard(result));
  });

  app.patch<{ Params: CardParams; Body: FlashcardInput }>("/sets/:setId/cards/:cardId", {
    schema: { tags: ["cards"], params: cardParams, body: cardBody, response: { 200: cardResponse } },
  }, async (request, reply) => {
    const term = request.body.term.trim();
    const definition = request.body.definition.trim();
    if (!term || !definition) return reply.code(400).send({ error: "Fill in both sides of the card." });
    const set = await ownedSet(request.params.setId, request.identity.uid);
    if (!set) return reply.code(404).send({ error: "Card not found." });
    const [card] = await db.update(cards).set({ term, definition, updatedAt: new Date() })
      .where(and(eq(cards.id, request.params.cardId), eq(cards.setId, set.id))).returning();
    if (!card) return reply.code(404).send({ error: "Card not found." });
    await touchSet(set.id);
    return serialiseCard(card);
  });

  app.delete<{ Params: CardParams }>("/sets/:setId/cards/:cardId", {
    schema: { tags: ["cards"], params: cardParams },
  }, async (request, reply) => {
    const set = await ownedSet(request.params.setId, request.identity.uid);
    if (!set) return reply.code(404).send({ error: "Card not found." });
    const deleted = await db.delete(cards)
      .where(and(eq(cards.id, request.params.cardId), eq(cards.setId, set.id)))
      .returning({ id: cards.id });
    if (deleted.length === 0) return reply.code(404).send({ error: "Card not found." });
    await touchSet(set.id);
    return reply.code(204).send();
  });

  app.put<{ Params: SetParams; Body: { cardIds: string[] } }>("/sets/:setId/card-order", {
    schema: {
      tags: ["cards"], params: setParams, response: { 200: setResponse },
      body: {
        type: "object", required: ["cardIds"], additionalProperties: false,
        properties: { cardIds: { type: "array", uniqueItems: true, items: uuid } },
      },
    },
  }, async (request, reply) => {
    const set = await ownedSet(request.params.setId, request.identity.uid);
    if (!set) return reply.code(404).send({ error: "Set not found." });
    const current = await loadCards(set.id);
    const wanted = request.body.cardIds;
    const known = new Set(current.map((card) => card.id));
    if (wanted.length !== current.length || wanted.some((id) => !known.has(id))) {
      return reply.code(400).send({ error: "Card order must contain every card exactly once." });
    }
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM study_sets WHERE id = ${set.id} FOR UPDATE`);
      for (const [position, id] of wanted.entries()) {
        await tx.update(cards).set({ position }).where(and(eq(cards.id, id), eq(cards.setId, set.id)));
      }
      await tx.update(studySets).set({ updatedAt: new Date() }).where(eq(studySets.id, set.id));
    });
    const updated = await ownedSet(set.id, request.identity.uid);
    if (!updated) throw new Error("Set disappeared after reorder.");
    return serialiseSet(updated, await loadCards(set.id));
  });
}

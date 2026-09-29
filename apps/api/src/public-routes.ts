import type { FastifyInstance } from "fastify";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "./db/client.js";
import { cards, studySets } from "./db/schema.js";
import { loadCards, serialiseSet, serialiseSummary, setResponse, setSummaryResponse } from "./routes.js";

const pageSize = 12;
const publicSearchResponse = {
  type: "object",
  required: ["items", "page", "totalPages", "total"],
  properties: {
    items: { type: "array", items: setSummaryResponse },
    page: { type: "integer" },
    totalPages: { type: "integer" },
    total: { type: "integer" },
  },
} as const;

// % and _ are SQL LIKE wildcards. Escape them so search treats the user's text literally.
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function registerPublicRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; page?: number } }>("/v1/public/sets", {
    schema: {
      tags: ["public sets"], security: [], response: { 200: publicSearchResponse },
      querystring: {
        type: "object", additionalProperties: false,
        properties: {
          q: { type: "string", maxLength: 100 },
          page: { type: "integer", minimum: 1, maximum: 10000 },
        },
      },
    },
  }, async (request) => {
    const q = request.query.q?.trim() ?? "";
    const page = request.query.page ?? 1;
    const pattern = `%${escapeLike(q)}%`;
    const filter = q
      ? and(eq(studySets.visibility, "public"), or(ilike(studySets.title, pattern), ilike(studySets.description, pattern)))
      : eq(studySets.visibility, "public");

    const [countRow] = await db.select({ total: sql<number>`count(*)::integer` })
      .from(studySets).where(filter);
    const total = countRow?.total ?? 0;
    const sets = await db.select().from(studySets).where(filter)
      .orderBy(desc(studySets.updatedAt), desc(studySets.id))
      .limit(pageSize).offset((page - 1) * pageSize);
    if (sets.length === 0) {
      return { items: [], page, totalPages: Math.ceil(total / pageSize), total };
    }

    const counts = await db.select({
      setId: cards.setId, count: sql<number>`count(*)::integer`,
    }).from(cards).where(inArray(cards.setId, sets.map((set) => set.id))).groupBy(cards.setId);
    const countBySet = new Map(counts.map((row) => [row.setId, row.count]));
    return {
      items: sets.map((set) => serialiseSummary(set, countBySet.get(set.id) ?? 0)),
      page,
      totalPages: Math.ceil(total / pageSize),
      total,
    };
  });

  app.get<{ Params: { setId: string } }>("/v1/public/sets/:setId", {
    schema: {
      tags: ["public sets"], security: [], response: { 200: setResponse },
      params: { type: "object", required: ["setId"], properties: { setId: { type: "string", format: "uuid" } } },
    },
  }, async (request, reply) => {
    const [set] = await db.select().from(studySets)
      .where(and(eq(studySets.id, request.params.setId), eq(studySets.visibility, "public")))
      .limit(1);
    if (!set) return reply.code(404).send({ error: "Set not found." });
    return serialiseSet(set, await loadCards(set.id));
  });
}

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

const testUrl = process.env.TEST_DATABASE_URL;
const run = testUrl ? describe : describe.skip;

run("Flasharo API with a test PostgreSQL database", () => {
  let app: FastifyInstance;
  let pool: (typeof import("./db/client.js"))["pool"];

  beforeAll(async () => {
    const databaseName = new URL(testUrl!).pathname.slice(1);
    if (!databaseName.endsWith("_test")) {
      throw new Error("TEST_DATABASE_URL must point to a database ending in _test.");
    }
    process.env.DATABASE_URL = testUrl;
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const database = await import("./db/client.js");
    pool = database.pool;
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    const { createApp } = await import("./app.js");
    app = await createApp({
      verifyToken: async (token) => {
        if (token === "alice") return { uid: "alice", email: "alice@example.com" };
        if (token === "bob") return { uid: "bob", email: "bob@example.com" };
        throw new Error("Invalid token");
      },
    });
    await app.ready();
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM users WHERE id IN ('alice', 'bob')");
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  function request(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", url: string, token?: string, payload?: unknown) {
    return app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload });
  }

  it("requires a valid sign-in token", async () => {
    expect((await request("GET", "/v1/sets")).statusCode).toBe(401);
    expect((await request("GET", "/v1/sets", "invalid")).statusCode).toBe(401);
  });

  it("allows browser preflight for editing, publishing, ordering, and deletion", async () => {
    for (const method of ["PATCH", "PUT", "DELETE"]) {
      const response = await app.inject({
        method: "OPTIONS",
        url: "/v1/sets/00000000-0000-0000-0000-000000000000/visibility",
        headers: {
          origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
          "access-control-request-method": method,
          "access-control-request-headers": "authorization,content-type",
        },
      });
      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-methods"]).toContain(method);
    }
  });

  it("syncs a profile again after its row is removed", async () => {
    const first = await request("GET", "/v1/me", "alice");
    expect(first.statusCode).toBe(200);
    expect(first.json().email).toBe("alice@example.com");
    await pool.query("DELETE FROM users WHERE id = 'alice'");
    const retried = await request("GET", "/v1/me", "alice");
    expect(retried.statusCode).toBe(200);
    expect(retried.json().id).toBe("alice");
  });

  it("creates, updates, reorders, studies, and deletes a private set", async () => {
    const created = await request("POST", "/v1/sets", "alice", { title: "  Biology  ", description: "Cells" });
    expect(created.statusCode).toBe(201);
    const setId = created.json().id as string;
    expect(created.json().title).toBe("Biology");

    const first = await request("POST", `/v1/sets/${setId}/cards`, "alice", { term: "Nucleus", definition: "Holds DNA" });
    const second = await request("POST", `/v1/sets/${setId}/cards`, "alice", { term: "Ribosome", definition: "Makes proteins" });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    const firstId = first.json().id as string;
    const secondId = second.json().id as string;

    const edited = await request("PATCH", `/v1/sets/${setId}/cards/${firstId}`, "alice", { term: "Nucleus", definition: "Contains DNA" });
    expect(edited.json().definition).toBe("Contains DNA");
    const reordered = await request("PUT", `/v1/sets/${setId}/card-order`, "alice", { cardIds: [secondId, firstId] });
    expect(reordered.statusCode).toBe(200);
    expect(reordered.json().cards.map((card: { id: string }) => card.id)).toEqual([secondId, firstId]);

    const listed = await request("GET", "/v1/sets", "alice");
    expect(listed.json()[0].cardCount).toBe(2);
    expect((await request("DELETE", `/v1/sets/${setId}/cards/${firstId}`, "alice")).statusCode).toBe(204);
    expect((await request("DELETE", `/v1/sets/${setId}`, "alice")).statusCode).toBe(204);
    expect((await request("GET", `/v1/sets/${setId}`, "alice")).statusCode).toBe(404);
  });

  it("does not reveal or change another user's sets", async () => {
    const created = await request("POST", "/v1/sets", "alice", { title: "Private" });
    const setId = created.json().id as string;
    const card = await request("POST", `/v1/sets/${setId}/cards`, "alice", { term: "A", definition: "B" });
    const cardId = card.json().id as string;

    expect((await request("GET", `/v1/sets/${setId}`, "bob")).statusCode).toBe(404);
    expect((await request("PATCH", `/v1/sets/${setId}`, "bob", { title: "Taken" })).statusCode).toBe(404);
    expect((await request("DELETE", `/v1/sets/${setId}`, "bob")).statusCode).toBe(404);
    expect((await request("PATCH", `/v1/sets/${setId}/cards/${cardId}`, "bob", { term: "X", definition: "Y" })).statusCode).toBe(404);
    expect((await request("GET", "/v1/sets", "bob")).json()).toEqual([]);
  });

  it("publishes only on owner request and removes a set from public search when made private", async () => {
    const created = await request("POST", "/v1/sets", "alice", { title: "Ocean biology", description: "Sea life" });
    const setId = created.json().id as string;
    expect(created.json().visibility).toBe("private");
    expect((await request("GET", `/v1/public/sets/${setId}`)).statusCode).toBe(404);
    expect((await request("GET", "/v1/public/sets?q=ocean")).json().total).toBe(0);

    expect((await request("PATCH", `/v1/sets/${setId}/visibility`, "bob", { visibility: "public" })).statusCode).toBe(404);
    expect((await request("PATCH", `/v1/sets/${setId}/visibility`, "alice", { visibility: "unlisted" })).statusCode).toBe(400);
    const published = await request("PATCH", `/v1/sets/${setId}/visibility`, "alice", { visibility: "public" });
    expect(published.statusCode).toBe(200);
    expect(published.json().visibility).toBe("public");

    const publicSet = await request("GET", `/v1/public/sets/${setId}`);
    expect(publicSet.statusCode).toBe(200);
    expect(publicSet.json().title).toBe("Ocean biology");
    const search = await request("GET", "/v1/public/sets?q=Sea%20life&page=1");
    expect(search.statusCode).toBe(200);
    expect(search.json().items.map((set: { id: string }) => set.id)).toContain(setId);
    expect((await request("PATCH", `/v1/sets/${setId}`, "bob", { title: "Changed" })).statusCode).toBe(404);

    expect((await request("PATCH", `/v1/sets/${setId}/visibility`, "alice", { visibility: "private" })).statusCode).toBe(200);
    expect((await request("GET", `/v1/public/sets/${setId}`)).statusCode).toBe(404);
    expect((await request("GET", "/v1/public/sets?q=ocean")).json().total).toBe(0);
  });

  it("rejects blank card content and incomplete reorder lists", async () => {
    const created = await request("POST", "/v1/sets", "alice", { title: "Rules" });
    const setId = created.json().id as string;
    expect((await request("POST", `/v1/sets/${setId}/cards`, "alice", { term: "  ", definition: "B" })).statusCode).toBe(400);
    await request("POST", `/v1/sets/${setId}/cards`, "alice", { term: "A", definition: "B" });
    expect((await request("PUT", `/v1/sets/${setId}/card-order`, "alice", { cardIds: [] })).statusCode).toBe(400);
  });
});

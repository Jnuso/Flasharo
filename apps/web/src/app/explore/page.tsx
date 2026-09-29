import { ExploreClient } from "./search";

export default async function ExplorePage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const numericPage = Number(rawPage ?? "1");
  const page = Number.isInteger(numericPage) && numericPage > 0 ? Math.min(numericPage, 10000) : 1;
  return <ExploreClient query={(rawQuery ?? "").slice(0, 100)} page={page} />;
}

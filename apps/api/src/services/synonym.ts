import { prisma } from "../lib/prisma.js";
import { getSearchClient } from "./search.js";

const PRODUCT_INDEX = "products";

export async function createSynonymGroup(words: string[]): Promise<{ id: string; words: string[] }> {
  const group = await prisma.searchSynonym.create({
    data: { words },
  });
  await syncSynonymsToMeilisearch();
  return { id: group.id, words: group.words as string[] };
}

export async function listSynonymGroups(): Promise<Array<{ id: string; words: string[]; createdAt: Date }>> {
  const groups = await prisma.searchSynonym.findMany({
    orderBy: { createdAt: "desc" },
  });
  return groups.map((g) => ({ id: g.id, words: g.words as string[], createdAt: g.createdAt }));
}

export async function deleteSynonymGroup(id: string): Promise<void> {
  await prisma.searchSynonym.delete({ where: { id } });
  await syncSynonymsToMeilisearch();
}

export async function syncSynonymsToMeilisearch(): Promise<void> {
  const groups = await prisma.searchSynonym.findMany();
  const synonymMap: Record<string, string[]> = {};
  for (const group of groups) {
    const words = group.words as string[];
    if (words.length >= 2) {
      // Create bidirectional entries: each word maps to all others
      for (const word of words) {
        synonymMap[word] = words.filter((w) => w !== word);
      }
    }
  }
  const client = getSearchClient();
  const index = client.index(PRODUCT_INDEX);
  await index.updateSynonyms(synonymMap);
}

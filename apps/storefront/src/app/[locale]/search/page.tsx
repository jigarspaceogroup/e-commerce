import { SearchResultsClient } from "./search-results-client";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category_id?: string; brand?: string | string[]; price_min?: string; price_max?: string; in_stock?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  return <SearchResultsClient initialQuery={params.q ?? ""} />;
}

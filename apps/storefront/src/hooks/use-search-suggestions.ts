"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { fetchSuggestions } from "@/lib/api/search";
import { queryKeys } from "@/lib/query-keys";

export function useSearchSuggestions() {
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.search.suggestions(debouncedValue),
    queryFn: () => fetchSuggestions(debouncedValue),
    enabled: debouncedValue.length >= 2,
    staleTime: 30_000,
  });

  return {
    inputValue,
    setInputValue,
    suggestions: data?.data?.suggestions ?? [],
    isLoading: isLoading && debouncedValue.length >= 2,
    isOpen: debouncedValue.length >= 2,
  };
}

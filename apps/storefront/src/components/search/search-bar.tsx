"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search, X } from "lucide-react";
import { useSearchSuggestions } from "@/hooks/use-search-suggestions";
import { SearchSuggestions } from "./search-suggestions";

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { inputValue, setInputValue, suggestions, isLoading, isOpen } = useSearchSuggestions();
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const totalItems = suggestions.length + 1; // +1 for "view all" link

  useEffect(() => {
    setShowDropdown(isOpen);
    setActiveIndex(-1);
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]!.url);
      } else {
        // Submit search
        if (inputValue.trim()) {
          router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
          setShowDropdown(false);
        }
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (url: string) => {
    setShowDropdown(false);
    setInputValue("");
    router.push(url);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-subtle" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => inputValue.length >= 2 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className="w-full bg-surface-muted rounded-pill py-3 ps-12 pe-10 text-body-md text-primary placeholder:text-primary-subtle outline-none focus:ring-1 focus:ring-primary"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {inputValue && (
          <button
            onClick={() => { setInputValue(""); setShowDropdown(false); }}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-primary-subtle hover:text-primary"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {showDropdown && (
        <SearchSuggestions
          suggestions={suggestions}
          isLoading={isLoading}
          query={inputValue}
          locale={locale}
          activeIndex={activeIndex}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

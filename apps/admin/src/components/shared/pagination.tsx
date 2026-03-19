"use client";

interface PaginationProps {
  cursor?: string | null;
  hasMore: boolean;
  onLoadMore: (cursor: string) => void;
  isLoading?: boolean;
}

export function Pagination({ cursor, hasMore, onLoadMore, isLoading = false }: PaginationProps) {
  if (!hasMore || !cursor) return null;

  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={() => onLoadMore(cursor)}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </>
        ) : (
          "Load More"
        )}
      </button>
    </div>
  );
}

import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import enMessages from "../../messages/en.json";
import arMessages from "../../messages/ar.json";

// Import modular message files that aren't included in the flat base files
import enProfile from "../../messages/en/profile.json";
import enCart from "../../messages/en/cart.json";
import arProfile from "../../messages/ar/profile.json";
import arCart from "../../messages/ar/cart.json";

// Deep merge: source keys take precedence over target keys
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object") {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Merge modular files first (as base), then overlay flat file on top.
// This ensures flat file values (used by existing tests) take precedence,
// while new keys from modular files (profile, extended cart) are available.
const messages: Record<string, Record<string, unknown>> = {
  en: deepMerge(deepMerge(enProfile, enCart), enMessages),
  ar: deepMerge(deepMerge(arProfile, arCart), arMessages),
};

// Stable router mocks — import these in tests that need to assert on router.push/replace
export const mockRouterPush = vi.fn();
export const mockRouterReplace = vi.fn();

// Mock navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  usePathname: () => "/",
}));

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { locale = "en", queryClient, ...options }: RenderOptions & { locale?: "en" | "ar"; queryClient?: QueryClient } = {},
) {
  const intlWrapped = (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>
  );

  // Wrap with QueryClientProvider if react-query is not mocked away
  try {
    const client = queryClient ?? createTestQueryClient();
    return render(
      <QueryClientProvider client={client}>
        {intlWrapped}
      </QueryClientProvider>,
      options,
    );
  } catch {
    // If @tanstack/react-query is mocked (e.g. search-results), skip the wrapper
    return render(intlWrapped, options);
  }
}

// Re-export everything
export * from "@testing-library/react";
export { renderWithProviders as render };

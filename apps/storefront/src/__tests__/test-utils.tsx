import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import enMessages from "../../messages/en.json";
import arMessages from "../../messages/ar.json";

const messages: Record<string, Record<string, unknown>> = { en: enMessages, ar: arMessages };

// Mock navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

export function renderWithProviders(
  ui: ReactElement,
  { locale = "en", ...options }: RenderOptions & { locale?: "en" | "ar" } = {},
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}

// Re-export everything
export * from "@testing-library/react";
export { renderWithProviders as render };

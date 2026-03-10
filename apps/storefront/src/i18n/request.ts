import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const modules = [
  "common",
  "auth",
  "product",
  "cart",
  "checkout",
  "order",
  "profile",
  "error",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "ar" | "en")) {
    locale = routing.defaultLocale;
  }

  const moduleMessages = await Promise.all(
    modules.map(
      (mod) => import(`../../messages/${locale}/${mod}.json`).then((m) => m.default)
    )
  );

  const messages = moduleMessages.reduce(
    (acc, mod) => ({ ...acc, ...mod }),
    {}
  );

  return {
    locale,
    messages,
  };
});

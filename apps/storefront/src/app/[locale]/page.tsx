import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="absolute end-4 top-4">
        <LocaleSwitcher />
      </div>
      <h1 className="text-4xl font-bold">{t("appName")}</h1>
      <p className="mt-4 text-lg text-gray-600">{t("home")}</p>
    </main>
  );
}

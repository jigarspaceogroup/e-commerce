"use client";

import { type ReactNode } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useLocale } from "next-intl";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

export function StripeProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  return (
    <Elements stripe={stripePromise} options={{ locale: locale as "ar" | "en" }}>
      {children}
    </Elements>
  );
}

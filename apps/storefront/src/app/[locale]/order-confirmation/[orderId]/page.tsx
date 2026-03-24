"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getOrder } from "@/lib/api/orders";
import { getPaymentStatus } from "@/lib/api/checkout";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-context";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const t = useTranslations("checkout.confirmation");
  const tReview = useTranslations("checkout.review");
  const { user } = useAuth();
  const guestEmail = searchParams.get("email") ?? undefined;

  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder(orderId, guestEmail),
  });

  // Poll payment status if pending
  const [pollCount, setPollCount] = useState(0);
  const isPending = order?.data?.status === "pending_payment";
  const paymentId = order?.data?.payments?.[0]?.id;

  const { data: paymentData } = useQuery({
    queryKey: queryKeys.payments.status(paymentId ?? ""),
    queryFn: () => getPaymentStatus(paymentId!),
    enabled: isPending && !!paymentId && pollCount < 10,
    refetchInterval: isPending && pollCount < 10 ? 3000 : false,
  });

  useEffect(() => {
    if (isPending && paymentId) setPollCount((c) => c + 1);
  }, [paymentData, isPending, paymentId]);

  const isConfirmed = !isPending || paymentData?.data?.status === "captured";
  const isGuest = !user;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-muted" />
      </div>
    );
  }

  if (!order?.data) {
    return (
      <div className="text-center py-20">
        <p className="text-body-lg text-primary-muted">Order not found</p>
      </div>
    );
  }

  const orderData = order.data;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
      {/* Success animation */}
      {isConfirmed ? (
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-scale-in">
          <Check className="h-10 w-10 text-green-600" />
        </div>
      ) : (
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-muted">
          <Loader2 className="h-10 w-10 animate-spin text-primary-muted" />
        </div>
      )}

      <h1 className="font-heading text-heading-lg mb-2">
        {isConfirmed ? t("title") : t("paymentProcessing")}
      </h1>
      <p className="text-body-lg text-primary-muted mb-1">{t("thankYou")}</p>
      <p className="font-heading text-heading-sm mb-8">
        {t("orderNumber", { number: orderData.orderNumber })}
      </p>

      {/* Order summary card */}
      <div className="rounded-lg border border-border p-6 text-start mb-8">
        <h2 className="font-heading text-heading-sm font-bold mb-4">
          {tReview("orderSummary")}
        </h2>

        {/* Items */}
        {orderData.items && (
          <div className="space-y-3 mb-4">
            {orderData.items.map((item: any) => {
              const title =
                typeof item.productTitleSnapshot === "object"
                  ? item.productTitleSnapshot.en || item.productTitleSnapshot.ar || "Item"
                  : item.productTitleSnapshot ?? "Item";
              return (
                <div key={item.id} className="flex justify-between text-body-md">
                  <span className="text-primary-muted">
                    {title} &times; {item.quantity}
                  </span>
                  <span className="font-bold">
                    {orderData.currency} {(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <hr className="border-border mb-4" />

        {/* Cost breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-body-md">
            <span className="text-primary-muted">{tReview("subtotal")}</span>
            <span className="font-bold">{orderData.currency} {Number(orderData.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-body-md">
            <span className="text-primary-muted">{tReview("shipping")}</span>
            <span className="font-bold">{orderData.currency} {Number(orderData.shippingCost).toFixed(2)}</span>
          </div>
          {Number(orderData.discountAmount) > 0 && (
            <div className="flex justify-between text-body-md">
              <span className="text-primary-muted">{tReview("discount")}</span>
              <span className="font-bold text-accent-red">
                -{orderData.currency} {Number(orderData.discountAmount).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-body-md">
            <span className="text-primary-muted">{tReview("vat")}</span>
            <span className="font-bold">{orderData.currency} {Number(orderData.taxAmount).toFixed(2)}</span>
          </div>
          <hr className="border-border" />
          <div className="flex justify-between text-body-lg">
            <span className="font-bold">{tReview("total")}</span>
            <span className="font-bold">{orderData.currency} {Number(orderData.grandTotal).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {isGuest ? (
          <>
            <Link href={orderData.oneClickRegisterUrl ?? "/auth/register"}>
              <Button variant="primary">{t("createAccount")}</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary">{t("continueShopping")}</Button>
            </Link>
          </>
        ) : (
          <>
            <Link href={`/profile/orders/${orderId}`}>
              <Button variant="primary">{t("orderDetails")}</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary">{t("continueShopping")}</Button>
            </Link>
          </>
        )}
      </div>

      {/* Confirmation email notice */}
      {guestEmail && (
        <p className="mt-6 text-body-sm text-primary-muted">
          {t("confirmationEmail", { email: guestEmail })}
        </p>
      )}
    </div>
  );
}

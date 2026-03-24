"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { Edit2, ChevronRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart-context";
import { createOrder, initiatePayment, getPaymentStatus } from "@/lib/api/checkout";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/components/shared/toast";
import { Button } from "@/components/ui/button";

interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  estimatedDays: string;
}

interface CheckoutState {
  step: 1 | 2 | 3 | 4;
  shippingAddress: Record<string, unknown> | null;
  shippingAddressId: string | null;
  isNewAddress: boolean;
  saveAddress: boolean;
  shippingMethod: ShippingOption | null;
  paymentIntentClientSecret: string | null;
  orderId: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  idempotencyKey: string;
}

type CheckoutAction = { type: "SET_STEP"; payload: 1 | 2 | 3 | 4 };

interface StepReviewProps {
  state: CheckoutState;
  dispatch: React.Dispatch<CheckoutAction>;
  isGuest: boolean;
}

export function StepReview({ state, dispatch, isGuest }: StepReviewProps) {
  const t = useTranslations("checkout.review");
  const tShipping = useTranslations("checkout.shipping");
  const tPayment = useTranslations("checkout.payment");
  const tErrors = useTranslations("checkout.errors");
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { cart } = useCart();
  const { showToast } = useToast();

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const subtotal = cart?.subtotal ?? 0;
  const discountAmount = cart?.discountAmount ?? 0;
  const shippingFee = state.shippingMethod?.cost ?? 0;
  const taxRate = 0.15; // 15% VAT
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = (subtotalAfterDiscount + shippingFee) * taxRate;
  const grandTotal = subtotalAfterDiscount + shippingFee + taxAmount;

  async function handlePlaceOrder() {
    if (!stripe || !elements) {
      setError("Payment system not ready. Please refresh the page.");
      return;
    }

    setIsPlacingOrder(true);
    setError(null);

    try {
      // Step 1: Create order
      const orderData = {
        ...(state.shippingAddressId
          ? { shippingAddressId: state.shippingAddressId }
          : { shippingAddress: state.shippingAddress }),
        ...(isGuest && { guestEmail: state.guestEmail }),
        saveAddress: state.saveAddress,
        idempotencyKey: state.idempotencyKey,
      };

      const orderResponse = await createOrder(orderData as any);

      if (!orderResponse.success) {
        throw new Error(String(orderResponse.error || "Failed to create order"));
      }

      const orderResponseData = orderResponse.data as any;
      const orderId = orderResponseData.id;

      // Invalidate cart cache immediately after order creation
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });

      // Step 2: Initiate payment
      const paymentResponse = await initiatePayment({
        orderId,
        idempotencyKey: crypto.randomUUID(),
      });

      if (!paymentResponse.success) {
        throw new Error(String(paymentResponse.error || "Failed to initiate payment"));
      }

      const paymentResponseData = paymentResponse.data as any;
      const clientSecret = paymentResponseData.clientSecret;

      // Step 3: Confirm card payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card details not found");
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || "Payment failed");
      }

      if (!paymentIntent) {
        throw new Error("Payment intent not found");
      }

      // Step 4: Poll payment status (wait for webhook)
      let attempts = 0;
      const maxAttempts = 3;
      const pollInterval = 2000; // 2 seconds

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        const statusResponse = await getPaymentStatus(paymentIntent.id);
        const statusResponseData = statusResponse.data as any;

        if (statusResponse.success && statusResponseData.status === "succeeded") {
          // Payment confirmed, redirect to confirmation
          const confirmationUrl = isGuest
            ? `/order-confirmation/${orderId}?email=${encodeURIComponent(state.guestEmail || "")}`
            : `/order-confirmation/${orderId}`;

          router.push(confirmationUrl);
          return;
        }

        attempts++;
      }

      // If we reach here, webhook hasn't confirmed yet but payment succeeded
      // Still redirect to confirmation page
      const confirmationUrl = isGuest
        ? `/order-confirmation/${orderId}?email=${encodeURIComponent(state.guestEmail || "")}`
        : `/order-confirmation/${orderId}`;

      router.push(confirmationUrl);

    } catch (err: any) {
      console.error("Order placement error:", err);

      // Check for specific error types
      if (err.code === "INSUFFICIENT_STOCK") {
        setError(tErrors("stockInsufficient"));
      } else if (err.code === "PRICE_CHANGED") {
        setError(tErrors("priceChanged"));
      } else if (err.message?.includes("card")) {
        setError(tErrors("paymentDeclined"));
      } else {
        setError(err.message || tErrors("paymentFailed"));
      }

      showToast({ message: err.message || tErrors("paymentFailed"), variant: "error" });
      setIsPlacingOrder(false);
    }
  }

  // Format address for display
  function formatAddress(addr: Record<string, unknown>) {
    const parts = [
      addr.recipientName,
      addr.streetLine1,
      addr.streetLine2,
      addr.city,
      addr.region,
      addr.postalCode,
    ].filter(Boolean);
    return parts.join(", ");
  }

  return (
    <div className="space-y-4">
      {/* Items List */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="font-heading text-heading-sm font-bold text-primary mb-4">
          {t("orderSummary")}
        </h3>
        <div className="space-y-3">
          {cart?.items?.map((item: any) => (
            <div key={item.id} className="flex gap-3">
              <div className="w-16 h-16 bg-surface-muted rounded-lg overflow-hidden flex-shrink-0">
                {item.productVariant?.product?.images?.[0] && (
                  <img
                    src={item.productVariant.product.images[0]}
                    alt={item.productVariant.product.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-bold text-primary truncate">
                  {item.productVariant?.product?.title}
                </p>
                {item.productVariant?.attributes && (
                  <p className="text-body-xs text-primary-muted">
                    {Object.values(item.productVariant.attributes).join(" / ")}
                  </p>
                )}
                <p className="text-body-xs text-primary-muted">
                  Qty: {item.quantity}
                </p>
              </div>
              <div className="text-end flex-shrink-0">
                <p className="text-body-sm font-bold text-primary">
                  SAR {(parseFloat(item.price as string) * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-heading-sm font-bold text-primary">
            {t("shippingAddress")}
          </h3>
          <button
            onClick={() => dispatch({ type: "SET_STEP", payload: 1 })}
            className="text-body-sm text-primary underline cursor-pointer flex items-center gap-1"
          >
            <Edit2 size={14} />
            Edit
          </button>
        </div>
        {state.shippingAddress && (
          <div className="text-body-sm text-primary-muted">
            <p>{formatAddress(state.shippingAddress)}</p>
            <p className="mt-1">{state.shippingAddress.phone as string}</p>
            {isGuest && state.guestEmail && (
              <p className="mt-1">{state.guestEmail}</p>
            )}
          </div>
        )}
      </div>

      {/* Shipping Method */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-heading-sm font-bold text-primary">
            {tShipping("shippingMethod")}
          </h3>
          <button
            onClick={() => dispatch({ type: "SET_STEP", payload: 2 })}
            className="text-body-sm text-primary underline cursor-pointer flex items-center gap-1"
          >
            <Edit2 size={14} />
            Edit
          </button>
        </div>
        {state.shippingMethod && (
          <div className="text-body-sm text-primary-muted">
            <p className="font-bold text-primary">
              {tShipping(state.shippingMethod.name as any)}
            </p>
            <p>
              {tShipping("standardDelivery", {
                min: state.shippingMethod.estimatedDays.split("-")[0] || "3",
                max: state.shippingMethod.estimatedDays.split("-")[1] || "5",
              })}
            </p>
            <p className="font-bold text-primary mt-1">
              {state.shippingMethod.cost === 0
                ? tShipping("freeShipping")
                : `SAR ${state.shippingMethod.cost.toFixed(2)}`}
            </p>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-heading-sm font-bold text-primary">
            {t("paymentMethod")}
          </h3>
          <button
            onClick={() => dispatch({ type: "SET_STEP", payload: 3 })}
            className="text-body-sm text-primary underline cursor-pointer flex items-center gap-1"
          >
            <Edit2 size={14} />
            Edit
          </button>
        </div>
        <p className="text-body-sm text-primary-muted">
          {tPayment("creditCard")}
        </p>
      </div>

      {/* Cost Breakdown */}
      <div className="border border-border rounded-lg p-4">
        <h3 className="font-heading text-heading-sm font-bold text-primary mb-4">
          {t("orderSummary")}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-body-sm">
            <span className="text-primary-muted">{t("subtotal")}</span>
            <span className="text-primary">SAR {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-body-sm">
              <div className="flex items-center gap-2">
                <span className="text-primary-muted">{t("discount")}</span>
                {cart?.couponCode && (
                  <span className="text-body-xs bg-surface-muted px-2 py-0.5 rounded">
                    {cart.couponCode}
                  </span>
                )}
              </div>
              <span className="text-accent-red">-SAR {discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-body-sm">
            <span className="text-primary-muted">{t("shipping")}</span>
            <span className="text-primary">
              {shippingFee === 0 ? tShipping("freeShipping") : `SAR ${shippingFee.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-body-sm">
            <span className="text-primary-muted">{t("vat")}</span>
            <span className="text-primary">SAR {taxAmount.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-heading text-heading-sm font-bold text-primary">
                {t("total")}
              </span>
              <span className="font-heading text-heading-sm font-bold text-primary">
                SAR {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-accent-red/10 border border-accent-red rounded-lg p-4">
          <p className="text-body-sm text-accent-red">{error}</p>
          {(error.includes("stock") || error.includes("price")) && (
            <button
              onClick={() => router.push("/cart")}
              className="mt-2 text-body-sm text-primary underline flex items-center gap-1"
            >
              Return to Cart <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Place Order Button */}
      <div className="pt-4 border-t border-border">
        <Button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || !stripe || !elements}
          size="full"
        >
          {isPlacingOrder ? t("processing") : t("placeOrder")}
        </Button>
        {isPlacingOrder && (
          <p className="text-body-sm text-primary-muted text-center mt-3">
            {t("processing")}
          </p>
        )}
      </div>
    </div>
  );
}

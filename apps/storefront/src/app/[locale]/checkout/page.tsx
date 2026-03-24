"use client";

import { useReducer, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/components/shared/toast";
import { StripeProvider } from "@/components/checkout/stripe-provider";
import { CheckoutStepper } from "./components/checkout-stepper";
import { CheckoutSummary } from "./components/checkout-summary";
import { StepAddress } from "./components/step-address";
import { StepShipping } from "./components/step-shipping";
import { StepPayment } from "./components/step-payment";
import { StepReview } from "./components/step-review";

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

type CheckoutAction =
  | {
      type: "SET_ADDRESS";
      payload: {
        address: Record<string, unknown>;
        addressId?: string;
        isNew: boolean;
        save: boolean;
      };
    }
  | { type: "SET_GUEST_INFO"; payload: { email: string; phone: string } }
  | { type: "SET_SHIPPING_METHOD"; payload: ShippingOption }
  | {
      type: "SET_PAYMENT_SECRET";
      payload: { clientSecret: string; orderId: string };
    }
  | { type: "SET_STEP"; payload: 1 | 2 | 3 | 4 };

function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction
): CheckoutState {
  switch (action.type) {
    case "SET_ADDRESS":
      return {
        ...state,
        shippingAddress: action.payload.address,
        shippingAddressId: action.payload.addressId ?? null,
        isNewAddress: action.payload.isNew,
        saveAddress: action.payload.save,
      };
    case "SET_GUEST_INFO":
      return {
        ...state,
        guestEmail: action.payload.email,
        guestPhone: action.payload.phone,
      };
    case "SET_SHIPPING_METHOD":
      return { ...state, shippingMethod: action.payload };
    case "SET_PAYMENT_SECRET":
      return {
        ...state,
        paymentIntentClientSecret: action.payload.clientSecret,
        orderId: action.payload.orderId,
      };
    case "SET_STEP":
      return { ...state, step: action.payload };
    default:
      return state;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { cart, isLoading: cartLoading } = useCart();
  const { showToast } = useToast();
  const t = useTranslations("checkout");
  const tErrors = useTranslations("checkout.errors");

  // Generate idempotency key once on mount
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const [state, dispatch] = useReducer(checkoutReducer, {
    step: 1,
    shippingAddress: null,
    shippingAddressId: null,
    isNewAddress: false,
    saveAddress: false,
    shippingMethod: null,
    paymentIntentClientSecret: null,
    orderId: null,
    guestEmail: null,
    guestPhone: null,
    idempotencyKey,
  });

  // Auth check: redirect to cart if not authenticated and not guest
  useEffect(() => {
    if (!authLoading && !user && searchParams.get("guest") !== "true") {
      router.replace("/cart");
    }
  }, [authLoading, user, searchParams, router]);

  // Cart validation
  useEffect(() => {
    if (!cartLoading && (!cart || !cart.items || cart.items.length === 0)) {
      showToast({ message: tErrors("cartEmpty"), variant: "error" });
      router.replace("/cart");
    }
  }, [cartLoading, cart, tErrors, showToast, router]);

  // Inactivity timeout: 30 minutes
  useEffect(() => {
    const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in ms
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        showToast({ message: tErrors("sessionExpired"), variant: "error" });
        router.replace("/cart");
      }, TIMEOUT_DURATION);
    };

    // Initial timeout
    resetTimeout();

    // Reset on user activity
    const handleActivity = () => resetTimeout();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [tErrors, showToast, router]);

  const handleStepClick = useCallback((step: number) => {
    dispatch({ type: "SET_STEP", payload: step as 1 | 2 | 3 | 4 });
  }, []);

  const isGuest = searchParams.get("guest") === "true";

  // Calculate totals from cart
  const subtotal = cart?.subtotal ?? 0;
  const discountAmount = cart?.discountAmount ?? null;
  const shippingFee = state.shippingMethod?.cost ?? null;
  const taxRate = 0.15; // 15% VAT
  const subtotalAfterDiscount = subtotal - (discountAmount ?? 0);
  const taxAmount = (subtotalAfterDiscount + (shippingFee ?? 0)) * taxRate;
  const grandTotal = subtotalAfterDiscount + (shippingFee ?? 0) + taxAmount;

  if (authLoading || cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-surface-muted rounded w-1/3" />
          <div className="h-32 bg-surface-muted rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-64 bg-surface-muted rounded" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-96 bg-surface-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StripeProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-heading-xl font-bold text-primary mb-6">
          {t("title")}
        </h1>

        {/* Stepper */}
        <CheckoutStepper currentStep={state.step} onStepClick={handleStepClick} />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Main content area */}
          <div className="lg:col-span-8">
            {/* Step 1: Shipping Address */}
            {state.step === 1 && (
              <StepAddress dispatch={dispatch} isGuest={isGuest} />
            )}

            {/* Step 2: Shipping Method */}
            {state.step === 2 && (
              <StepShipping dispatch={dispatch} cartSubtotal={subtotal} />
            )}

            {/* Step 3: Payment */}
            {state.step === 3 && <StepPayment dispatch={dispatch} />}

            {/* Step 4: Review */}
            {state.step === 4 && (
              <StepReview state={state} dispatch={dispatch} isGuest={isGuest} />
            )}
          </div>

          {/* Sidebar: Order Summary */}
          <div className="lg:col-span-4">
            <CheckoutSummary
              subtotal={subtotal}
              discountAmount={discountAmount}
              shippingFee={shippingFee}
              taxAmount={taxAmount}
              grandTotal={grandTotal}
              couponCode={cart?.couponCode ?? null}
            />
          </div>
        </div>
      </div>
    </StripeProvider>
  );
}

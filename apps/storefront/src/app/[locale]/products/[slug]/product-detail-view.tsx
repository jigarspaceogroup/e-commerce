"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/components/shared/toast";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { PriceDisplay } from "@/components/shared/price-display";
import { ImageGallery } from "@/components/product/image-gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { SpecificationsTable } from "@/components/product/specifications-table";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/ui/rating-stars";
import type { ProductDetail } from "@/types/product";

interface ProductDetailViewProps {
  product: ProductDetail;
  locale: string;
}

export function ProductDetailView({ product, locale }: ProductDetailViewProps) {
  const t = useTranslations("product");
  const tb = useTranslations("breadcrumb");
  const { addItem, isAddingItem } = useCart();
  const { showToast } = useToast();
  const router = useRouter();

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const effectivePrice = selectedVariant?.priceOverride ?? product.basePrice;
  const isOutOfStock = !selectedVariant || selectedVariant.stockQuantity <= 0;
  const maxQuantity = selectedVariant?.stockQuantity ?? 1;

  const handleAddToCart = async () => {
    if (!selectedVariantId) return;
    try {
      await addItem(selectedVariantId, quantity);
      const title = locale === "ar" ? product.titleAr : product.titleEn;
      showToast({
        message: `${title} ${t("addedToCart")}`,
        variant: "success",
        action: {
          label: t("viewCart"),
          onClick: () => router.push("/cart"),
        },
      });
    } catch {
      showToast({
        message: t("addToCartError"),
        variant: "error",
      });
    }
  };

  // Build breadcrumb from category chain
  const breadcrumbItems = [{ label: tb("home"), href: "/" }];

  // Add category breadcrumb chain (up to 3 levels from API)
  const cat = product.category;
  if (cat.parent?.parent) {
    breadcrumbItems.push({
      label: locale === "ar" ? cat.parent.parent.nameAr : cat.parent.parent.nameEn,
      href: `/category/${cat.parent.parent.slug}`,
    });
  }
  if (cat.parent) {
    const parentPath = cat.parent.parent
      ? `${cat.parent.parent.slug}/${cat.parent.slug}`
      : cat.parent.slug;
    breadcrumbItems.push({
      label: locale === "ar" ? cat.parent.nameAr : cat.parent.nameEn,
      href: `/category/${parentPath}`,
    });
  }
  const catPath = cat.parent?.parent
    ? `${cat.parent.parent.slug}/${cat.parent.slug}/${cat.slug}`
    : cat.parent
      ? `${cat.parent.slug}/${cat.slug}`
      : cat.slug;
  breadcrumbItems.push({
    label: locale === "ar" ? cat.nameAr : cat.nameEn,
    href: `/category/${catPath}`,
  });

  // Product name (last item, no link)
  breadcrumbItems.push({
    label: locale === "ar" ? product.titleAr : product.titleEn,
    href: "",
  });

  const title = locale === "ar" ? product.titleAr : product.titleEn;
  const description = locale === "ar" ? product.descriptionAr : product.descriptionEn;

  // FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb items={breadcrumbItems} />

      {/* Main layout */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Start: Image Gallery */}
        <ImageGallery
          images={product.images}
          locale={locale}
          selectedVariantId={selectedVariantId}
        />

        {/* End: Product Info */}
        <div className="space-y-6">
          {/* Title */}
          <h1 className="font-heading text-display-md font-bold text-primary">{title}</h1>

          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-primary-subtle">{product.brand}</p>
          )}

          {/* Rating — placeholder until reviews are implemented */}
          <RatingStars rating={4.5} showValue />

          {/* Price */}
          <PriceDisplay
            basePrice={effectivePrice}
            compareAtPrice={product.compareAtPrice}
            locale={locale}
          />

          {/* Variant Selector */}
          {product.variants.length > 1 && (
            <VariantSelector
              variants={product.variants}
              basePrice={product.basePrice}
              selectedVariantId={selectedVariantId}
              onSelect={setSelectedVariantId}
              locale={locale}
            />
          )}

          {/* Quantity */}
          {!isOutOfStock && (
            <div>
              <h3 className="text-sm font-medium text-primary mb-2">{t("quantity")}</h3>
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                max={maxQuantity}
              />
            </div>
          )}

          {/* Add to Cart / Out of Stock */}
          {isOutOfStock ? (
            <div className="space-y-2">
              <Button size="full" disabled>
                {t("outOfStock")}
              </Button>
              <Button size="full" variant="secondary">
                {t("notifyWhenAvailable")}
              </Button>
            </div>
          ) : (
            <Button size="full" onClick={handleAddToCart} disabled={isAddingItem}>
              {isAddingItem ? t("adding") : t("addToCart")}
            </Button>
          )}

          {/* Delivery + Returns */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-primary-muted">
              <svg className="h-5 w-5 text-primary-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {t("deliveryEstimate")}
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-muted">
              <svg className="h-5 w-5 text-primary-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t("returnPolicy")}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-primary mb-3">{t("description")}</h2>
          <div className="text-body-md text-primary-muted leading-relaxed prose max-w-none">
            {description}
          </div>
        </div>
      )}

      {/* Specifications */}
      <div className="mt-8">
        <SpecificationsTable specifications={product.specifications} locale={locale} />
      </div>

      {/* FAQ */}
      {product.faq && product.faq.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-primary mb-4">{t("faq")}</h2>
          <div className="divide-y divide-border">
            {product.faq.map((item, idx) => {
              const question = locale === "ar" ? item.question.ar : item.question.en;
              const answer = locale === "ar" ? item.answer.ar : item.answer.en;
              const isExpanded = expandedFaq === idx;

              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="flex items-center justify-between w-full py-4 text-start text-sm font-medium text-primary"
                  >
                    {question}
                    <svg
                      className={`h-5 w-5 text-primary-subtle transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <p className="pb-4 text-sm text-primary-muted">{answer}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import type { ProductDetailImage } from "@/types/product";

interface ImageGalleryProps {
  images: ProductDetailImage[];
  locale: string;
  selectedVariantId?: string | null;
}

export function ImageGallery({ images, locale, selectedVariantId }: ImageGalleryProps) {
  // Sort images: variant-specific first, then general
  const sortedImages = [...images].sort((a, b) => {
    if (selectedVariantId) {
      const aMatch = a.variantId === selectedVariantId ? 0 : 1;
      const bMatch = b.variantId === selectedVariantId ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return a.sortOrder - b.sortOrder;
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [emblaRef] = useEmblaCarousel({ direction: locale === "ar" ? "rtl" : "ltr" });

  const currentImage = sortedImages[selectedIndex] ?? null;

  const getAltText = useCallback(
    (img: ProductDetailImage) => (locale === "ar" ? img.altTextAr : img.altTextEn) ?? "Product image",
    [locale],
  );

  if (sortedImages.length === 0) {
    return (
      <div className="aspect-square bg-surface-warm rounded-lg flex items-center justify-center">
        <div className="text-center text-primary-subtle">
          <svg className="h-16 w-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="image-gallery">
      {/* Main image */}
      <div
        className="relative aspect-square bg-surface-warm rounded-lg overflow-hidden cursor-zoom-in mb-3"
        onClick={() => setZoomOpen(true)}
      >
        {/* Mobile swipe carousel */}
        <div className="md:hidden h-full" ref={emblaRef}>
          <div className="flex h-full">
            {sortedImages.map((img, idx) => (
              <div key={img.id} className="flex-[0_0_100%] min-w-0 relative h-full">
                <Image
                  src={img.url}
                  alt={getAltText(img)}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop static image */}
        <div className="hidden md:block h-full relative">
          {currentImage && (
            <Image
              src={currentImage.url}
              alt={getAltText(currentImage)}
              fill
              sizes="50vw"
              className="object-contain"
              priority
            />
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sortedImages.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === selectedIndex ? "border-primary" : "border-border hover:border-border"
              }`}
            >
              <Image
                src={img.url}
                alt={getAltText(img)}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom overlay */}
      {zoomOpen && currentImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 end-4 text-white p-2 hover:bg-white/20 rounded-full"
            onClick={() => setZoomOpen(false)}
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={currentImage.url}
              alt={getAltText(currentImage)}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

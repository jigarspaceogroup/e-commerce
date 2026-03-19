import type { Metadata } from "next";
import { serverFetch, parseDecimalFields } from "@/lib/api/server";
import { redirect } from "next/navigation";
import type { ProductDetail } from "@/types/product";
import { ProductDetailView } from "./product-detail-view";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  try {
    const product = await serverFetch<ProductDetail>(`/products/${slug}`);
    const title = locale === "ar" ? (product.seoTitleAr ?? product.titleAr) : (product.seoTitleEn ?? product.titleEn);
    const description = locale === "ar"
      ? (product.seoDescriptionAr ?? product.descriptionAr?.slice(0, 160))
      : (product.seoDescriptionEn ?? product.descriptionEn?.slice(0, 160));

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : [],
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;

  let product: ProductDetail;
  try {
    const result = await serverFetch<ProductDetail | { redirect: string }>(`/products/${slug}`);
    if (result && "redirect" in result && typeof result.redirect === "string") {
      redirect(`/${locale}/products/${result.redirect}`);
    }
    product = parseDecimalFields(result as unknown as Record<string, unknown>, ["basePrice", "compareAtPrice"]) as unknown as ProductDetail;
    // Also parse variant priceOverrides
    product.variants = product.variants.map((v) =>
      parseDecimalFields(v as unknown as Record<string, unknown>, ["priceOverride", "weightOverride"])
    ) as unknown as ProductDetail["variants"];
  } catch {
    redirect(`/${locale}/products`);
  }

  // Build JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: locale === "ar" ? product.titleAr : product.titleEn,
    description: locale === "ar" ? product.descriptionAr : product.descriptionEn,
    image: product.images?.map((img) => img.url) ?? [],
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    sku: product.variants?.[0]?.sku,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "SAR",
      lowPrice: Math.min(product.basePrice, ...product.variants.filter((v) => v.priceOverride).map((v) => v.priceOverride!)),
      highPrice: Math.max(product.basePrice, ...product.variants.filter((v) => v.priceOverride).map((v) => v.priceOverride!)),
      availability: product.variants.some((v) => v.stockQuantity > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailView product={product} locale={locale} />
    </>
  );
}

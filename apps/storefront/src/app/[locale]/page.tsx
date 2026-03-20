import { HeroSection } from "@/components/home/hero-section";
import { BrandBar } from "@/components/home/brand-bar";
import { ProductSection } from "@/components/home/product-section";
import { BrowseByStyle } from "@/components/home/browse-by-style";
import { Testimonials } from "@/components/home/testimonials";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BrandBar />
      <ProductSection titleKey="newArrivals" sortBy="newest" />
      <hr className="mx-auto max-w-[1240px] border-border" />
      <ProductSection titleKey="topSelling" sortBy="popularity" />
      <BrowseByStyle />
      <Testimonials />
    </>
  );
}

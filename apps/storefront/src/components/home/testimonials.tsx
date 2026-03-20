"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { TestimonialCard } from "./testimonial-card";

const TESTIMONIALS = [
  { name: "Sarah M.", rating: 5, text: "I'm blown away by the quality and style of the clothes I received from SHOP.CO. From casual wear to elegant dresses, every piece I've bought has exceeded my expectations." },
  { name: "Alex K.", rating: 5, text: "Finding clothes that align with my personal style used to be a challenge until I discovered SHOP.CO. The range of options they offer is truly remarkable, catering to a variety of tastes." },
  { name: "James L.", rating: 5, text: "As someone who's always on the lookout for unique fashion pieces, I'm thrilled to have stumbled upon SHOP.CO. The selection of clothes is not only diverse but also on-point with the latest trends." },
  { name: "Moosa A.", rating: 5, text: "The shopping experience on SHOP.CO is second to none. The website is user-friendly, the delivery is fast, and the quality of the products is outstanding. I'm a customer for life!" },
];

export function Testimonials() {
  const t = useTranslations("home");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 380;
    scrollRef.current.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-16">
      <div className="mx-auto max-w-[1240px] px-4">
        <div className="flex items-center justify-between mb-10">
          <h2 className="font-heading text-display-lg font-bold text-primary">
            {t("happyCustomers")}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 text-primary hover:opacity-70"
              aria-label="Previous"
            >
              <ArrowLeft size={24} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 text-primary hover:opacity-70"
              aria-label="Next"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2"
        >
          {TESTIMONIALS.map((item) => (
            <div key={item.name} className="snap-start">
              <TestimonialCard {...item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

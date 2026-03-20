export function BrandBar() {
  const brands = ["VERSACE", "ZARA", "GUCCI", "PRADA", "Calvin Klein"];

  return (
    <section className="bg-primary py-6 overflow-hidden">
      <div className="mx-auto max-w-[1240px] px-4 flex items-center justify-between gap-8">
        {brands.map((brand) => (
          <span
            key={brand}
            className="text-on-primary text-body-lg lg:text-heading-lg font-bold whitespace-nowrap opacity-80"
          >
            {brand}
          </span>
        ))}
      </div>
    </section>
  );
}

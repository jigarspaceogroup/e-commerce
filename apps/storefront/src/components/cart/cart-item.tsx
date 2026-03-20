"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { QuantitySelector } from "@/components/product/quantity-selector";

interface CartItemProps {
  name: string;
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  image?: string;
  currency?: string;
}

export function CartItem({ name, size, color, price, quantity, image, currency = "SAR" }: CartItemProps) {
  return (
    <div className="flex gap-4 py-6">
      <div className="relative w-[100px] h-[100px] lg:w-[124px] lg:h-[124px] flex-shrink-0 bg-surface-warm rounded-lg overflow-hidden">
        {image ? (
          <Image src={image} alt={name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-muted" />
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-body-lg font-bold text-primary">{name}</h3>
            {size && <p className="text-body-sm text-primary-muted">Size: {size}</p>}
            {color && <p className="text-body-sm text-primary-muted">Color: {color}</p>}
          </div>
          <button className="text-accent-red hover:opacity-70 p-1" aria-label="Remove item">
            <Trash2 size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-body-xl font-bold text-primary">
            {currency} {price.toFixed(2)}
          </p>
          <QuantitySelector value={quantity} onChange={() => {}} max={10} />
        </div>
      </div>
    </div>
  );
}

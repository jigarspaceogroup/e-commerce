"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiClient, uploadFile } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface ProductImage {
  id: string;
  url: string;
  altEn?: string;
  altAr?: string;
  sortOrder: number;
}

interface ImageUploaderProps {
  productId: string;
}

/* ── Sortable Image Card ── */

function SortableImageCard({
  image,
  onDelete,
  onUpdateAlt,
}: {
  image: ProductImage;
  onDelete: (id: string) => void;
  onUpdateAlt: (id: string, altEn: string, altAr: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 bg-white p-2">
      {/* Drag handle + image */}
      <div className="relative mb-2">
        <button
          type="button"
          className="absolute left-1 top-1 cursor-grab rounded bg-white/80 p-1 text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDelete(image.id)}
          className="absolute right-1 top-1 rounded bg-red-500/80 p-1 text-white hover:bg-red-600"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={image.url}
          alt={image.altEn ?? "Product image"}
          className="h-32 w-full rounded object-cover"
        />
      </div>
      {/* Alt text fields */}
      <input
        type="text"
        value={image.altEn ?? ""}
        onChange={(e) => onUpdateAlt(image.id, e.target.value, image.altAr ?? "")}
        placeholder="Alt text (EN)"
        className="mb-1 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
      />
      <input
        type="text"
        value={image.altAr ?? ""}
        onChange={(e) => onUpdateAlt(image.id, image.altEn ?? "", e.target.value)}
        placeholder="Alt text (AR)"
        dir="rtl"
        className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
      />
    </div>
  );
}

/* ── Main Component ── */

export function ImageUploader({ productId }: ImageUploaderProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const imageQueryKey = [...queryKeys.products.detail(productId), "images"];

  const { data: images = [] } = useQuery({
    queryKey: imageQueryKey,
    queryFn: async () => {
      const res = await apiClient.get<ProductImage[]>(`/admin/products/${productId}/images`);
      if (!res.success) throw new Error("Failed to load images");
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const res = await apiClient.del(`/admin/products/${productId}/images/${imageId}`);
      if (!res.success) throw new Error("Failed to delete image");
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: imageQueryKey });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (order: string[]) => {
      const res = await apiClient.patch(`/admin/products/${productId}/images/reorder`, { order });
      if (!res.success) throw new Error("Failed to reorder images");
      return res.data;
    },
  });

  const altMutation = useMutation({
    mutationFn: async ({ imageId, altEn, altAr }: { imageId: string; altEn: string; altAr: string }) => {
      const res = await apiClient.patch(`/admin/products/${productId}/images/${imageId}`, { altEn, altAr });
      if (!res.success) throw new Error("Failed to update alt text");
      return res.data;
    },
  });

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await uploadFile(`/admin/products/${productId}/images`, file);
        }
        void queryClient.invalidateQueries({ queryKey: imageQueryKey });
      } catch {
        // upload errors handled silently for now
      } finally {
        setUploading(false);
      }
    },
    [productId, queryClient, imageQueryKey],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(imageQueryKey, reordered);
    reorderMutation.mutate(reordered.map((img) => img.id));
  }

  function handleUpdateAlt(imageId: string, altEn: string, altAr: string) {
    // Optimistic update
    queryClient.setQueryData(
      imageQueryKey,
      images.map((img) => (img.id === imageId ? { ...img, altEn, altAr } : img)),
    );
    altMutation.mutate({ imageId, altEn, altAr });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Product Images</h3>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            void handleUpload(e.dataTransfer.files);
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-gray-500">Uploading...</span>
          </div>
        ) : (
          <>
            <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">Drop images here or click to upload</p>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG, WebP up to 5MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleUpload(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* Image grid with drag-to-reorder */}
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image) => (
                <SortableImageCard
                  key={image.id}
                  image={image}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onUpdateAlt={handleUpdateAlt}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

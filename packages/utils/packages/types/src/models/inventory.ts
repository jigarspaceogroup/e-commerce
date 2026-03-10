import { MovementType, ReferenceType } from "../enums";

export interface InventoryMovement {
  id: string;
  productVariantId: string;
  movementType: MovementType;
  quantityChange: number;
  quantityAfter: number;
  referenceType: ReferenceType;
  referenceId: string;
  reason: string | null;
  performedBy: string | null;
  createdAt: Date;
}

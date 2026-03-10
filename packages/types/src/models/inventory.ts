import { MovementType, ReferenceType } from '../enums';

export interface InventoryMovement {
  id: string;
  variantId: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType?: ReferenceType;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

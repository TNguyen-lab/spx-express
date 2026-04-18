export interface CreateInboundItemDto {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface CreateInboundDto {
  purchaseOrderId?: string;
  notes?: string;
  items: CreateInboundItemDto[];
  userId: string;
}

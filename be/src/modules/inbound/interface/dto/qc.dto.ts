export interface InboundQcItemUpdateDto {
  id: string;
  receivedQty?: number;
  damageQty?: number;
}

export interface InboundQcDto {
  passed: boolean;
  reason?: string;
  itemUpdates?: InboundQcItemUpdateDto[];
}

import { Product } from '../../master-data/interfaces/product.interface';

export interface InboundReceiptDetail {
  product_id: number;
  expected_qty: number;
  actual_qty?: number;
}

export interface InboundReceipt {
  receipt_id: string;
  status: 'NEW' | 'PROCESSING' | 'COMPLETED';
  created_at: Date;
  details: InboundReceiptDetail[];
}

export interface LpnItem {
  lpn_code: string; // e.g. PLT-2026-0001
  receipt_id: string;
  product_id: number;
  quantity: number;
  weight_kg: number;
  status: 'RECEIVING' | 'STORED';
  location_id?: string; // DOCK_IN or real location_id
}

export interface WorkTask {
  task_id: string;
  task_type: 'PUTAWAY' | 'PICKING' | 'TRANSFER';
  status: 'TODO' | 'COMPLETED';
  lpn_code: string;
  dest_location_code: string; // The rack AI suggested
  ai_reason?: string;
  created_at: Date;
}

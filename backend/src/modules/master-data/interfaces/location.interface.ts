import { Product } from './product.interface';

export interface LocationItem {
  location_id: string;
  location_code: string;
  zone: string;
  coord_x: number;
  coord_y: number;
  level_z: number;
  max_weight_kg: number;
  current_weight_kg: number;
  is_full: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  product?: Product | null;
  lpn_code?: string;
}

export interface CouponCreateDTO {
  code: string;
  maxRedemptions?: number;   // opcional → evita "propriedade inexistente"
  isActive?: boolean;        // opcional → default false/true conforme regra
}

export interface ProductCreateDTO {
  name: string;
  brand?: string;
  model?: string;            // opcional, presente no payload
  price?: number;
  isActive?: boolean;
}

export interface ToggleActiveDTO {
  id: string;
  isActive: boolean;
}
export type UserRole = 'admin' | 'operator';
export type VehicleType = 'cycle' | 'motorcycle' | 'car';
export type PricingBasis = 'hourly' | 'fixed' | 'daily' | 'monthly' | 'yearly';
export type PaymentOption = 'advance' | 'post' | 'both';
export type PaymentStatus = 'paid' | 'pending';
export type TicketStatus = 'open' | 'closed';
export type PassStatus = 'active' | 'expired' | 'revoked';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LotSettings {
  id: number;
  business_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  instructions: string | null;
  rules: string | null;
  currency_symbol: string;
  payment_mode: PaymentOption;
  default_language: 'en' | 'ur';
  receipt_footer: string | null;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  vehicle_type: VehicleType;
  basis: PricingBasis;
  rate: number;
  is_active: boolean;
  updated_at: string;
}

export interface Pass {
  id: string;
  pass_code: string;
  holder_name: string;
  phone: string | null;
  vehicle_type: VehicleType;
  vehicle_number: string;
  basis: PricingBasis;
  amount_paid: number;
  valid_from: string;
  valid_to: string;
  status: PassStatus;
  created_by: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
  basis: PricingBasis;
  rate_applied: number;
  amount: number;
  payment_status: PaymentStatus;
  payment_method: string | null;
  status: TicketStatus;
  entry_time: string;
  exit_time: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_by: string | null;
  created_at: string;
}

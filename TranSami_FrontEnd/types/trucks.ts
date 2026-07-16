// types/trucks.ts
import { YearlyBreakdown } from '@/lib/api-client';

export interface MonthlyDataPoint {
  month: string;   // e.g. "Jan", "Fév"
  revenue: number;
}

export interface FuelDataPoint {
  month: string;
  consumption: number;
}

export interface RepairDataPoint {
  month: string;
  cost: number;
}

export interface Repair {
  id: number;
  date: string;
  type: string;
  typeFr: string;
  cost: number;
  notes: string;
  notesFr: string;
  status: 'pending' | 'completed';
}

export interface Truck {
  id: number;
  matricule: string;
  nomChauffeur: string;
  truckModel: string;
  mileage: number;
  capacityLiters: number | null;
  fuelType: 'DIESEL' | 'ESSENCE' | 'DIESEL_50' | null | string;
  purchaseDate: string | null;
  adminId: number;
  status: boolean;

  // Auto-derived from backend
  revenueBreakdown: YearlyBreakdown[];
  fuelCostBreakdown: YearlyBreakdown[];
  repairCostBreakdown: YearlyBreakdown[];
  lastMaintenanceDate: string | null;
  fuelConsumption: number | null;   // L/100km

  // Derived/computed on the frontend for charts
  monthlyRevenueData?: MonthlyDataPoint[];
  monthlyDieselData?: FuelDataPoint[];
  monthlyRepairData?: RepairDataPoint[];

  // Local only
  repairs?: Repair[];
  trips?: any[];
}

export interface TruckFormData {
  matricule: string;
  nomChauffeur: string;
  truckModel: string;
  mileage: string;
  capacityLiters: string;
  fuelType: string;
  purchaseDate: string;
  status: boolean;
}

export interface RepairFormData {
  date: string;
  type: string;
  cost: string;
  notes: string;
  status: 'pending' | 'completed';
}

export function defaultTruckForm(): TruckFormData {
  return {
    matricule: '',
    nomChauffeur: '',
    truckModel: '',
    mileage: '',
    capacityLiters: '',
    fuelType: '',
    purchaseDate: '',
    status: true,
  };
}

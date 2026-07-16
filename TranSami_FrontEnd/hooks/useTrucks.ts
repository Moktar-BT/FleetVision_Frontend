'use client';

import { useState, useEffect, useCallback } from 'react';
import { camionApi, CamionResponse, YearlyBreakdown } from '@/lib/api-client';
import { Truck, TruckFormData, MonthlyDataPoint, FuelDataPoint, RepairDataPoint } from '@/types/trucks';

const FR_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function breakdownToChartData<T>(
  breakdown: YearlyBreakdown[],
  valueKey: string,
  monthLabels: string[],
): T[] {
  if (!breakdown || breakdown.length === 0) {
    return monthLabels.map((m) => ({ month: m, [valueKey]: 0 } as unknown as T));
  }
  const currentYear = new Date().getFullYear();
  const yearData =
    breakdown.find((b) => b.year === currentYear) ??
    breakdown[breakdown.length - 1];

  return yearData.months.map(
    (entry) => ({ month: monthLabels[entry.month - 1], [valueKey]: Number(entry.amount) } as unknown as T),
  );
}

export function getAnnualTotal(breakdown: YearlyBreakdown[]): number {
  if (!breakdown?.length) return 0;
  const currentYear = new Date().getFullYear();
  const yearData =
    breakdown.find((b) => b.year === currentYear) ??
    breakdown[breakdown.length - 1];
  return Number(yearData.annualTotal);
}

export function getCurrentMonthAmount(breakdown: YearlyBreakdown[]): number {
  if (!breakdown?.length) return 0;
  const now = new Date();
  const yearData = breakdown.find((b) => b.year === now.getFullYear());
  if (!yearData) return 0;
  const monthEntry = yearData.months.find((m) => m.month === now.getMonth() + 1);
  return monthEntry ? Number(monthEntry.amount) : 0;
}

function mapResponse(res: CamionResponse, lang: 'fr' | 'en' = 'fr'): Truck {
  const months = lang === 'fr' ? FR_MONTHS : EN_MONTHS;

  return {
    ...res,
    mileage: res.mileage ?? 0,
    monthlyRevenueData: breakdownToChartData<MonthlyDataPoint>(res.revenueBreakdown ?? [], 'revenue', months),
    monthlyDieselData: breakdownToChartData<FuelDataPoint>(res.fuelCostBreakdown ?? [], 'consumption', months),
    monthlyRepairData: breakdownToChartData<RepairDataPoint>(res.repairCostBreakdown ?? [], 'cost', months),
    repairs: [],
    trips: [],
  };
}

export function useTrucks(lang: 'fr' | 'en' = 'fr') {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await camionApi.getAll();
      setTrucks(data.map((r) => mapResponse(r, lang)));
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const createTruck = async (form: TruckFormData): Promise<Truck> => {
    const res = await camionApi.create({
      matricule: form.matricule,
      nomChauffeur: form.nomChauffeur,
      truckModel: form.truckModel,
      mileage: parseFloat(form.mileage),
      capacityLiters: form.capacityLiters ? parseFloat(form.capacityLiters) : null,
      fuelType: form.fuelType ? (form.fuelType as any) : null,
      purchaseDate: form.purchaseDate || null,
      status: form.status,
    });
    const truck = mapResponse(res, lang);
    setTrucks((prev) => [...prev, truck]);
    return truck;
  };

  const updateTruck = async (id: number, form: TruckFormData): Promise<Truck> => {
    const res = await camionApi.update(id, {
      matricule: form.matricule,
      nomChauffeur: form.nomChauffeur,
      truckModel: form.truckModel,
      mileage: parseFloat(form.mileage),
      capacityLiters: form.capacityLiters ? parseFloat(form.capacityLiters) : null,
      fuelType: form.fuelType ? (form.fuelType as any) : null,
      purchaseDate: form.purchaseDate || null,
      status: form.status,
    });
    const truck = mapResponse(res, lang);
    setTrucks((prev) =>
      prev.map((t) => (t.id === id ? { ...truck, repairs: t.repairs, trips: t.trips } : t)),
    );
    return truck;
  };

  const updateTruckStatus = async (id: number, status: boolean): Promise<Truck> => {
    const res = await camionApi.updateStatus(id, status);
    const truck = mapResponse(res, lang);
    setTrucks((prev) =>
      prev.map((t) => (t.id === id ? { ...truck, repairs: t.repairs, trips: t.trips } : t)),
    );
    return truck;
  };

  const deleteTruck = async (id: number): Promise<void> => {
    await camionApi.delete(id);
    setTrucks((prev) => prev.filter((t) => t.id !== id));
  };

  const getTruckStats = (truck: Truck) => ({
    monthlyRevenue: getCurrentMonthAmount(truck.revenueBreakdown),
    annualRevenue: getAnnualTotal(truck.revenueBreakdown),
    monthlyFuelCost: getCurrentMonthAmount(truck.fuelCostBreakdown),
    annualFuelCost: getAnnualTotal(truck.fuelCostBreakdown),
    monthlyRepairCost: getCurrentMonthAmount(truck.repairCostBreakdown),
    annualRepairCost: getAnnualTotal(truck.repairCostBreakdown),
  });

  return {
    trucks, loading, error,
    createTruck, updateTruck, updateTruckStatus, deleteTruck,
    reload: load, getTruckStats,
  };
}

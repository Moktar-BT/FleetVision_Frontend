'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Droplet } from 'lucide-react';
import {
  camionApi, bonDeLivraisonApi, reparationApi, bonCarburantApi,
  CamionResponse, BonDeLivraisonResponse, ReparationResponse,
  BonCarburantResponse, YearlyBreakdown,
  clientApi, fournisseurApi, codeProduitApi,
  ClientResponse, FournisseurResponse, CodeProduitResponse,
  BonDeLivraisonRequest, ReparationRequest,
  rappelVidangeApi, RappelVidangeResponse,
  chargeApi, chargeTemplateApi, rappelChargeApi,
  ChargeResponse, ChargeTemplateResponse, RappelChargeResponse, StatutCharge,
  chauffeurApi, ChauffeurResponse,
  remorqueApi, RemorqueResponse,
} from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Plus, List, Loader2, AlertCircle, X, Truck as TruckIcon,
  Edit2, Trash2, Save, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  TrendingUp, Fuel, DollarSign, Activity, Wrench, BadgeDollarSign,
  CheckCircle2, Clock, Calendar, MapPin, Route, Filter, ArrowUpRight,
  FileText, RefreshCw, Gauge, AlertTriangle, User, Link as LinkIcon,
  Receipt, Play,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AddBonCarburantModal from '@/app/fuel/components/AddBonCarburantModal';

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyDataPoint { month: string; revenue: number; }
interface FuelDataPoint { month: string; consumption: number; }
interface RepairDataPoint { month: string; cost: number; }

interface Truck {
  id: number;
  matricule: string;
  nomChauffeur: string;
  chauffeurId: number | null;
  chauffeurNom: string | null;
  truckModel: string;
  mileage: number | null;
  capacityLiters: number | null;
  fuelType: 'DIESEL' | 'ESSENCE' | 'DIESEL_50' | null | string;
  purchaseDate: string | null;
  adminId: number;
  chargeCostBreakdown: YearlyBreakdown[];
  status: boolean;
  revenueBreakdown: YearlyBreakdown[];
  fuelCostBreakdown: YearlyBreakdown[];
  repairCostBreakdown: YearlyBreakdown[];
  lastMaintenanceDate: string | null;
  fuelConsumption: number | null;
  monthlyRevenueData?: MonthlyDataPoint[];
  monthlyDieselData?: FuelDataPoint[];
  monthlyRepairData?: RepairDataPoint[];
  remorqueId: number | null;
  remorqueMatricule: string | null;
  remorqueType: string | null;
}

interface TruckFormData {
  matricule: string;
  nomChauffeur: string;
  chauffeurId: string;
  truckModel: string;
  capacityLiters: string;
  fuelType: string;
  purchaseDate: Date | null;
  status: boolean;
  remorqueId: string;
}

// ─── Month helpers ────────────────────────────────────────────────────────────

const FR_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function breakdownToChartData<T>(breakdown: YearlyBreakdown[], valueKey: string, monthLabels: string[]): T[] {
  if (!breakdown?.length) return monthLabels.map(m => ({ month: m, [valueKey]: 0 } as unknown as T));
  const currentYear = new Date().getFullYear();
  const yearData = breakdown.find(b => b.year === currentYear) ?? breakdown[breakdown.length - 1];
  return yearData.months.map(e => ({ month: monthLabels[e.month - 1], [valueKey]: Number(e.amount) } as unknown as T));
}

function getAnnualTotal(breakdown: YearlyBreakdown[]): number {
  if (!breakdown?.length) return 0;
  const currentYear = new Date().getFullYear();
  const yearData = breakdown.find(b => b.year === currentYear) ?? breakdown[breakdown.length - 1];
  return Number(yearData.annualTotal);
}

function getCurrentMonthAmount(breakdown: YearlyBreakdown[]): number {
  if (!breakdown?.length) return 0;
  const now = new Date();
  const yearData = breakdown.find(b => b.year === now.getFullYear());
  if (!yearData) return 0;
  const monthEntry = yearData.months.find(m => m.month === now.getMonth() + 1);
  return monthEntry ? Number(monthEntry.amount) : 0;
}

function availableYears(breakdown: YearlyBreakdown[]): number[] {
  if (!breakdown?.length) return [new Date().getFullYear()];
  return breakdown.map(b => b.year).sort((a, b) => a - b);
}

function mapResponse(res: CamionResponse, lang: 'fr' | 'en' = 'fr'): Truck {
  const months = lang === 'fr' ? FR_MONTHS : EN_MONTHS;
  return {
    ...res,
    chauffeurId: (res as any).chauffeurId ?? null,
    chauffeurNom: (res as any).chauffeurNom ?? null,
    remorqueId: (res as any).remorqueId ?? null,
    remorqueMatricule: (res as any).remorqueMatricule ?? null,
    remorqueType: (res as any).remorqueType ?? null,
    nomChauffeur: (res as any).chauffeurId
      ? ((res as any).chauffeurNom ?? res.nomChauffeur)
      : (lang === 'fr' ? 'Aucun chauffeur disponible' : 'No driver available'),
    monthlyRevenueData: breakdownToChartData<MonthlyDataPoint>(res.revenueBreakdown ?? [], 'revenue', months),
    monthlyDieselData: breakdownToChartData<FuelDataPoint>(res.fuelCostBreakdown ?? [], 'consumption', months),
    monthlyRepairData: breakdownToChartData<RepairDataPoint>(res.repairCostBreakdown ?? [], 'cost', months),
  };
}

function defaultTruckForm(): TruckFormData {
  return {
    matricule: '',
    nomChauffeur: '',
    chauffeurId: '',
    truckModel: '',
    capacityLiters: '',
    fuelType: 'DIESEL',
    purchaseDate: null,
    status: true,
    remorqueId: '',
  };
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
}

function fuelTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  if (type === 'DIESEL_50') return 'Diesel 50';
  if (type === 'DIESEL') return 'Diesel';
  if (type === 'ESSENCE') return 'Essence';
  return type;
}

function fmtKm(n: number | null | undefined) {
  return n == null ? '—' : new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' km';
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Year Selector ────────────────────────────────────────────────────────────

function YearSelector({ years, selected, onChange }: { years: number[]; selected: number; onChange: (y: number) => void }) {
  const idx = years.indexOf(selected);
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => idx > 0 && onChange(years[idx - 1])} disabled={idx <= 0}
        className="p-1 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer">
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs font-bold text-foreground w-10 text-center">{selected}</span>
      <button onClick={() => idx < years.length - 1 && onChange(years[idx + 1])} disabled={idx >= years.length - 1}
        className="p-1 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, color, suffix = 'TND' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-bold text-foreground mb-1">{label}</p>
      <p style={{ color }} className="font-semibold">{Number(payload[0].value).toLocaleString()} {suffix}</p>
    </div>
  );
}

// ─── Truck Charts ─────────────────────────────────────────────────────────────
function TruckCharts({ truck, language, darkMode }: { truck: Truck; language: string; darkMode: boolean }) {
  const textColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? '#334155' : '#374151';
  const monthLabels = language === 'fr' ? FR_MONTHS : EN_MONTHS;
  const curYear = new Date().getFullYear();

  const revenueYears = availableYears(truck.revenueBreakdown ?? []);
  const fuelYears = availableYears(truck.fuelCostBreakdown ?? []);
  const repairYears = availableYears(truck.repairCostBreakdown ?? []);
  const chargeYears = availableYears(truck.chargeCostBreakdown ?? []);

  const [revenueYear, setRevenueYear] = useState(revenueYears.includes(curYear) ? curYear : revenueYears[revenueYears.length - 1] ?? curYear);
  const [fuelYear, setFuelYear] = useState(fuelYears.includes(curYear) ? curYear : fuelYears[fuelYears.length - 1] ?? curYear);
  const [repairYear, setRepairYear] = useState(repairYears.includes(curYear) ? curYear : repairYears[repairYears.length - 1] ?? curYear);
  const [chargeYear, setChargeYear] = useState(chargeYears.includes(curYear) ? curYear : chargeYears[chargeYears.length - 1] ?? curYear);

  function yearData(breakdown: YearlyBreakdown[], year: number, key: string) {
    const found = breakdown.find(b => b.year === year);
    if (!found) return monthLabels.map(m => ({ month: m, [key]: 0 }));
    return found.months.map(e => ({ month: monthLabels[e.month - 1], [key]: Number(e.amount) }));
  }

  const revenueData = yearData(truck.revenueBreakdown ?? [], revenueYear, 'revenue');
  const fuelData = yearData(truck.fuelCostBreakdown ?? [], fuelYear, 'consumption');
  const repairData = yearData(truck.repairCostBreakdown ?? [], repairYear, 'cost');
  const chargeData = yearData(truck.chargeCostBreakdown ?? [], chargeYear, 'charge');

  const tickFmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-emerald-500/60 to-emerald-500/20" />
        <div className="p-2.5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><TrendingUp size={16} className="text-emerald-600" /></div>
              <div>
                <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Revenus' : 'Revenue'}</p>
                <p className="text-[10px] text-muted-foreground">TND / mois</p>
              </div>
            </div>
            <YearSelector years={revenueYears} selected={revenueYear} onChange={setRevenueYear} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} />
              <YAxis stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
              <Tooltip content={<ChartTooltip color="#10b981" />} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-[2px]" style={{ background: darkMode ? 'linear-gradient(to right, rgba(249,115,22,0.6), rgba(249,115,22,0.2))' : 'linear-gradient(to right, rgba(94,58,25,0.6), rgba(94,58,25,0.2))' }} />
        <div className="p-2.5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={darkMode ? "p-2 bg-orange-500/10 rounded-xl" : "p-2 bg-primary/10 rounded-xl"}><Fuel size={16} className={darkMode ? "text-orange-600" : "text-primary"} /></div>
              <div>
                <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Carburant' : 'Fuel Cost'}</p>
                <p className="text-[10px] text-muted-foreground">TND / mois</p>
              </div>
            </div>
            <YearSelector years={fuelYears} selected={fuelYear} onChange={setFuelYear} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fuelData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} />
              <YAxis stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
              <Tooltip content={<ChartTooltip color={darkMode ? "#f97316" : "rgb(94, 58, 25)"} />} cursor={{ fill: darkMode ? 'rgba(251,146,60,0.08)' : 'rgba(94,58,25,0.08)' }} />
              <Bar dataKey="consumption" fill={darkMode ? "#f97316" : "rgb(94, 58, 25)"} radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Repairs Chart - LINE CHART */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-red-500/60 to-red-500/20" />
        <div className="p-2.5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 rounded-xl"><Wrench size={16} className="text-red-600" /></div>
              <div>
                <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Réparations' : 'Repair Costs'}</p>
                <p className="text-[10px] text-muted-foreground">TND / mois</p>
              </div>
            </div>
            <YearSelector years={repairYears} selected={repairYear} onChange={setRepairYear} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={repairData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} />
              <YAxis stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
              <Tooltip content={<ChartTooltip color="#ef4444" />} />
              <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5}
                dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Charges Chart - BAR CHART (même design que Carburant) */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-[#A0522D]/60 to-[#A0522D]/20" />
        <div className="p-2.5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#A0522D]/10 rounded-xl"><Receipt size={16} className="text-[#A0522D]" /></div>
              <div>
                <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Charges' : 'Charges'}</p>
                <p className="text-[10px] text-muted-foreground">TND / mois</p>
              </div>
            </div>
            <YearSelector years={chargeYears} selected={chargeYear} onChange={setChargeYear} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chargeData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} />
              <YAxis stroke={textColor} tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
              <Tooltip content={<ChartTooltip color="#A0522D" />} cursor={{ fill: 'rgba(160,82,45,0.08)' }} />
              <Bar dataKey="charge" fill="#A0522D" radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Truck Header Card ────────────────────────────────────────────────────────

function TruckHeaderCard({ truck, language, onDelete, onUpdate, onStatusChange, rappelVidange, chauffeurs, remorques }: {
  truck: Truck; language: string;
  onDelete: () => void;
  onUpdate: (form: TruckFormData) => Promise<void>;
  onStatusChange: (status: boolean) => Promise<void>;
  rappelVidange?: RappelVidangeResponse;
  chauffeurs: ChauffeurResponse[];
  remorques: RemorqueResponse[];
}) {
  const { darkMode } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const truckToForm = (t: Truck): TruckFormData => ({
    matricule: t.matricule,
    nomChauffeur: t.nomChauffeur,
    chauffeurId: t.chauffeurId != null ? String(t.chauffeurId) : '',
    truckModel: t.truckModel,
    capacityLiters: t.capacityLiters != null ? String(t.capacityLiters) : '',
    fuelType: t.fuelType ?? 'DIESEL',
    purchaseDate: t.purchaseDate ? new Date(t.purchaseDate) : null,
    status: t.status,
    remorqueId: t.remorqueId != null ? String(t.remorqueId) : '',
  });

  const [editForm, setEditForm] = useState<TruckFormData>(() => truckToForm(truck));

  useEffect(() => {
    setEditForm(truckToForm(truck));
    setIsEditing(false);
  }, [truck.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const monthlyRevenue = getCurrentMonthAmount(truck.revenueBreakdown ?? []);
  const annualRevenue = getAnnualTotal(truck.revenueBreakdown ?? []);
  const monthlyFuelCost = getCurrentMonthAmount(truck.fuelCostBreakdown ?? []);
  const monthlyRepair = getCurrentMonthAmount(truck.repairCostBreakdown ?? []);

  const handleSave = async () => {
    setIsSaving(true);
    try { await onUpdate(editForm); setIsEditing(false); } finally { setIsSaving(false); }
  };

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    try { await onStatusChange(!truck.status); } finally { setIsTogglingStatus(false); }
  };

  const truckIconColor = truck.status ? 'text-emerald-500' : 'text-amber-500';
  const truckIconBg = truck.status
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-700/40'
    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-700/40';

  const handleChauffeurChange = (chauffeurIdStr: string) => {
    const found = chauffeurs.find(c => String(c.id) === chauffeurIdStr);
    setEditForm(prev => ({
      ...prev,
      chauffeurId: chauffeurIdStr,
      nomChauffeur: found ? found.nomComplet : (language === 'fr' ? 'Aucun chauffeur disponible' : 'No driver available'),
    }));
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
      <div className="p-6">
        {/* ── Identity row ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="shrink-0 relative">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-sm ${truckIconBg}`}>
                <TruckIcon size={26} className={truckIconColor} />
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${truck.status ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>

            {isEditing ? (
              <div className="flex-1 space-y-2">
                <input type="text" value={editForm.matricule}
                  onChange={e => setEditForm({ ...editForm, matricule: e.target.value })}
                  className="w-full text-xl font-bold bg-background border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Chauffeur' : 'Driver'}</label>
                  <select value={editForm.chauffeurId} onChange={e => handleChauffeurChange(e.target.value)} className={sel}>
                    <option value="">{language === 'fr' ? 'Aucun chauffeur / Libre' : 'No driver / Free'}</option>
                    {chauffeurs.filter(c => c.active).map(c => (
                      <option key={c.id} value={c.id}>{c.nomComplet}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Remorque' : 'Trailer'}</label>
                  <select value={editForm.remorqueId} onChange={e => setEditForm({ ...editForm, remorqueId: e.target.value })} className={sel}>
                    <option value="">{language === 'fr' ? 'Aucune remorque / Libre' : 'No trailer / Free'}</option>
                    {remorques.filter(r => r.active || r.id === truck.remorqueId).map(r => (
                      <option key={r.id} value={r.id}>
                        {r.matricule} {r.typeRemorque ? `(${r.typeRemorque})` : ''} {r.camionId && r.camionId !== truck.id ? `[Assigné à ${r.camionMatricule || r.camionId}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">{truck.matricule}</h1>
                  <button onClick={handleToggleStatus} disabled={isTogglingStatus}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer disabled:opacity-50 ${truck.status
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'}`}>
                    {isTogglingStatus ? <Loader2 size={10} className="animate-spin" /> :
                      <span className={`w-1.5 h-1.5 rounded-full ${truck.status ? 'bg-emerald-500' : 'bg-amber-500'}`} />}
                    {truck.status ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Maintenance' : 'Maintenance')}
                  </button>
                </div>
                <p className="text-sm font-semibold text-primary mt-0.5">{truck.nomChauffeur}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{truck.truckModel}</p>

                <div className="flex flex-wrap gap-2 mt-2">
                  {truck.chauffeurId ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 text-blue-700 dark:text-blue-400">
                      <User size={10} />
                      {truck.chauffeurNom ?? truck.nomChauffeur}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-secondary border border-border text-muted-foreground">
                      <User size={10} />
                      {language === 'fr' ? 'Pas de chauffeur lié' : 'No linked driver'}
                    </span>
                  )}
                  {truck.remorqueMatricule ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-violet-50 dark:bg-violet-900/20 border border-violet-200/50 text-violet-700 dark:text-violet-400">
                      <LinkIcon size={10} />
                      {truck.remorqueMatricule}{truck.remorqueType ? ` · ${truck.remorqueType}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-secondary border border-border text-muted-foreground">
                      <LinkIcon size={10} />
                      {language === 'fr' ? 'Pas de remorque liée' : 'No linked trailer'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEditing ? (
              <>
                <button onClick={handleSave} disabled={isSaving}
                  className="p-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40 cursor-pointer disabled:opacity-50 transition-colors">
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                </button>
                <button onClick={() => { setIsEditing(false); setEditForm(truckToForm(truck)); }}
                  className="p-2 bg-secondary hover:bg-secondary/80 rounded-xl text-foreground border border-border cursor-pointer transition-colors">
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)}
                  className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 border border-transparent hover:border-blue-200/50 cursor-pointer transition-all">
                  <Edit2 size={15} />
                </button>
                <button onClick={onDelete}
                  className="p-2 rounded-xl hover:bg-destructive/10 text-destructive/60 hover:text-destructive border border-transparent hover:border-destructive/20 cursor-pointer transition-all">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 5 KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl p-4 border bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={12} className="text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{language === 'fr' ? 'Revenu mensuel' : 'Monthly revenue'}</span>
            </div>
            <div className="text-lg font-bold leading-none text-emerald-600">{monthlyRevenue.toLocaleString()} <span className="text-xs font-normal">TND</span></div>
            <p className="text-[10px] text-muted-foreground mt-1">{language === 'fr' ? 'Mois en cours' : 'Current month'}</p>
          </div>
          <div className={`rounded-xl p-4 border ${darkMode ? 'bg-orange-900/10 border-orange-800/30' : 'bg-primary/5 border-primary/20'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Fuel size={12} className={darkMode ? "text-orange-600" : "text-primary"} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{language === 'fr' ? 'Carburant / mois' : 'Fuel / month'}</span>
            </div>
            <div className={`text-lg font-bold leading-none ${darkMode ? 'text-orange-600' : 'text-primary'}`}>
              {monthlyFuelCost > 0 ? <>{monthlyFuelCost.toLocaleString()} <span className="text-xs font-normal">TND</span></> : '—'}
            </div>
            {truck.fuelConsumption != null && <p className="text-[10px] text-muted-foreground mt-1">{truck.fuelConsumption.toFixed(1)} L/100km</p>}
          </div>

          <div className="rounded-xl p-4 border bg-violet-50 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-800/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={12} className="text-violet-600" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{language === 'fr' ? 'Kilométrage' : 'Mileage'}</span>
            </div>
            <div className="text-lg font-bold leading-none text-violet-600">
              {truck.mileage != null ? <>{truck.mileage.toLocaleString()} <span className="text-xs font-normal">km</span></> : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{language === 'fr' ? 'Via bons carburant' : 'From fuel receipts'}</p>
          </div>

          <div className="rounded-xl p-4 border bg-red-50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30">
            <div className="flex items-center gap-1.5 mb-2">
              <Wrench size={12} className="text-red-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{language === 'fr' ? 'Répar. ce mois' : 'Repairs / month'}</span>
            </div>
            <div className="text-lg font-bold leading-none text-red-600">
              {monthlyRepair > 0 ? <>{monthlyRepair.toLocaleString()} <span className="text-xs font-normal">TND</span></> : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{language === 'fr' ? 'Mois en cours' : 'Current month'}</p>
          </div>

          {/* 5th KPI: oil change reminder */}
          {(() => {
            const rv = rappelVidange;
            if (!rv) return (
              <div className="rounded-xl p-4 border bg-secondary border-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Gauge size={12} className="text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {language === 'fr' ? 'Vidange' : 'Oil change'}
                  </span>
                </div>
                <div className="text-lg font-bold leading-none text-muted-foreground">—</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {language === 'fr' ? 'Aucun rappel' : 'No reminder set'}
                </p>
              </div>
            );

            const isOverdue = rv.statut === 'DEPASSEE';
            const isClose = rv.statut === 'PROCHE';
            const bgClass = isOverdue
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30'
              : isClose
                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30'
                : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30';
            const textClass = isOverdue ? 'text-red-600' : isClose ? 'text-amber-600' : 'text-emerald-600';
            const iconClass = isOverdue ? 'text-red-500' : isClose ? 'text-amber-500' : 'text-emerald-500';
            const StatusIcon = isOverdue || isClose ? AlertTriangle : CheckCircle2;
            const kmRestants = rv.kmRestants;

            return (
              <div className={`rounded-xl p-4 border ${bgClass}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <StatusIcon size={12} className={iconClass} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {language === 'fr' ? 'Vidange' : 'Oil change'}
                  </span>
                </div>
                <div className={`text-lg font-bold leading-none ${textClass}`}>
                  {kmRestants == null ? '—' :
                    kmRestants < 0
                      ? <>+{fmtKm(Math.abs(kmRestants))} <span className="text-xs font-normal">{language === 'fr' ? 'dépassé' : 'overdue'}</span></>
                      : <>{fmtKm(kmRestants)} <span className="text-xs font-normal">{language === 'fr' ? 'restants' : 'left'}</span></>
                  }
                </div>
                <div className="mt-2 h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isOverdue ? 'bg-red-500 animate-pulse' : isClose ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(rv.pourcentageAvancement ?? 0, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {language === 'fr' ? 'Prévue à' : 'Due at'} {fmtKm(rv.kmProchaineVidange)}
                </p>
              </div>
            );
          })()}
        </div>

        <button onClick={() => setShowDetails(!showDetails)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 text-xs font-medium transition-all cursor-pointer">
          {showDetails
            ? <><ChevronUp size={13} />{language === 'fr' ? 'Masquer les détails' : 'Hide details'}</>
            : <><ChevronDown size={13} />{language === 'fr' ? 'Voir tous les détails' : 'Show all details'}</>}
        </button>
      </div>

      {showDetails && (
        <div className="border-t border-border px-6 py-5 bg-secondary/20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
            {[
              {
                label: language === 'fr' ? 'Modèle' : 'Model',
                value: isEditing
                  ? <input type="text" value={editForm.truckModel} onChange={e => setEditForm({ ...editForm, truckModel: e.target.value })} className={inp} />
                  : <p className="text-sm font-semibold text-foreground">{truck.truckModel || '—'}</p>
              },
              {
                label: language === 'fr' ? 'Type carburant' : 'Fuel Type',
                value: isEditing
                  ? <select value={editForm.fuelType} onChange={e => setEditForm({ ...editForm, fuelType: e.target.value })} className={sel}>
                    <option value="DIESEL">Diesel</option>
                    <option value="ESSENCE">Essence</option>
                    <option value="DIESEL_50">Diesel 50</option>
                  </select>
                  : <p className="text-sm font-semibold text-foreground">{fuelTypeLabel(truck.fuelType)}</p>
              },
              {
                label: language === 'fr' ? 'Consommation (L/100km)' : 'Consumption (L/100km)',
                value: <>
                  <p className="text-sm font-semibold text-foreground">{truck.fuelConsumption != null ? `${truck.fuelConsumption.toFixed(1)} L/100km` : '—'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{language === 'fr' ? 'Calculé automatiquement' : 'Auto-calculated'}</p>
                </>
              },
              {
                label: language === 'fr' ? 'Capacité (L)' : 'Capacity (L)',
                value: isEditing
                  ? <input
                    type="number"
                    value={editForm.capacityLiters}
                    onChange={e => setEditForm({ ...editForm, capacityLiters: e.target.value })}
                    className={`${inp} no-spinner`}
                    onWheel={(e) => e.preventDefault()}
                  />
                  : <p className="text-sm font-semibold text-foreground">{truck.capacityLiters != null ? `${truck.capacityLiters} L` : '—'}</p>
              },
              {
                label: language === 'fr' ? "Date d'achat" : 'Purchase Date',
                value: isEditing
                  ? <DatePicker
                    selected={editForm.purchaseDate}
                    onChange={(date: Date | null) => setEditForm({ ...editForm, purchaseDate: date })}
                    className={`${inp} w-full`}
                    wrapperClassName="w-full"
                    popperClassName="z-[9999]"
                    dateFormat="yyyy-MM-dd"
                    isClearable
                    placeholderText={language === 'fr' ? 'Sélectionner...' : 'Select...'}
                  />
                  : <p className="text-sm font-semibold text-foreground">{truck.purchaseDate ?? '—'}</p>
              },
              {
                label: language === 'fr' ? 'Dernière maintenance' : 'Last Maintenance',
                value: <>
                  <p className="text-sm font-semibold text-foreground">{truck.lastMaintenanceDate ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{language === 'fr' ? 'Déduit des réparations' : 'Derived from repairs'}</p>
                </>
              },
              {
                label: language === 'fr' ? 'Kilométrage' : 'Mileage',
                value: <>
                  <p className="text-sm font-semibold text-foreground">
                    {truck.mileage != null ? `${truck.mileage.toLocaleString()} km` : '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {language === 'fr' ? 'Auto via bons carburant' : 'Auto from fuel receipts'}
                  </p>
                </>
              },
              {
                label: language === 'fr' ? 'Revenu annuel' : 'Annual Revenue',
                value: <>
                  <p className="text-sm font-semibold text-emerald-600">{annualRevenue.toLocaleString()} TND</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{language === 'fr' ? 'Calculé via BDL' : 'Computed from delivery notes'}</p>
                </>
              },
              {
                label: language === 'fr' ? 'Chauffeur lié' : 'Linked Driver',
                value: truck.chauffeurId ? (
                  <>
                    <p className="text-sm font-semibold text-blue-600">{truck.chauffeurNom ?? truck.nomChauffeur}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{language === 'fr' ? 'Chauffeur enregistré' : 'Registered driver'}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{language === 'fr' ? 'Aucun (saisie libre)' : 'None (free text)'}</p>
                )
              },
              {
                label: language === 'fr' ? 'Remorque liée' : 'Linked Trailer',
                value: truck.remorqueMatricule ? (
                  <>
                    <p className="text-sm font-semibold text-violet-600">{truck.remorqueMatricule}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{truck.remorqueType || (language === 'fr' ? 'Type non spécifié' : 'Type N/A')}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{language === 'fr' ? 'Aucune remorque assignée' : 'No trailer assigned'}</p>
                )
              },
            ].map((f, i) => (
              <div key={i}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{f.label}</p>
                {f.value}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delivery Notes Tab ───────────────────────────────────────────────────────

function DeliveryNotesTab({ truckId, language, notes, onRefresh, onDataChange }: {
  truckId: number; language: string; notes: BonDeLivraisonResponse[]; onRefresh: () => void;
  onDataChange?: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<BonDeLivraisonResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BonDeLivraisonResponse | null>(null);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [fournisseurs, setFournisseurs] = useState<FournisseurResponse[]>([]);
  const [codesProduit, setCodesProduit] = useState<CodeProduitResponse[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const emptyForm = { numero: '', blNumFournisseur: '', date: new Date(), quantite: '', montantHt: 0, montantTtc: 0, clientId: '', codeProduitId: '', fournisseurId: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!showModal) return;
    (async () => {
      setLoadingConfig(true);
      try {
        const [cls, frs, codes] = await Promise.all([clientApi.getAll(), fournisseurApi.getAll(), codeProduitApi.getAll()]);
        setClients(cls); setFournisseurs(frs); setCodesProduit(codes);
      } finally { setLoadingConfig(false); }
    })();
  }, [showModal]);

  useEffect(() => {
    const product = codesProduit.find(p => p.id === Number(form.codeProduitId));
    if (!product) return;
    const qty = parseFloat(form.quantite) || 0;
    const ht = qty * Number(product.unitPrice);
    const ttc = ht * (1 + Number(product.vat) / 100);
    setForm(prev => ({ ...prev, montantHt: parseFloat(ht.toFixed(2)), montantTtc: parseFloat(ttc.toFixed(2)) }));
  }, [form.codeProduitId, form.quantite, codesProduit]);

  const selectedProduct = codesProduit.find(p => p.id === Number(form.codeProduitId));

  const openAdd = () => { setEditingNote(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (note: BonDeLivraisonResponse) => {
    setEditingNote(note);
    setForm({
      numero: note.numero,
      blNumFournisseur: note.blNumFournisseur != null ? String(note.blNumFournisseur) : '',
      date: new Date(note.date),
      quantite: String(note.quantite),
      montantHt: Number(note.montantHt),
      montantTtc: Number(note.montantTtc),
      clientId: String(note.clientId),
      codeProduitId: String(note.codeProduitId),
      fournisseurId: note.fournisseurId ? String(note.fournisseurId) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.numero || !form.clientId || !form.codeProduitId || !form.quantite || parseFloat(form.quantite) <= 0) {
      alert(language === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const payload: BonDeLivraisonRequest = {
        numero: form.numero,
        blNumFournisseur: form.blNumFournisseur ? Number(form.blNumFournisseur) : null,
        date: form.date.toISOString().split('T')[0],
        quantite: parseFloat(form.quantite),
        montantHt: form.montantHt,
        montantTtc: form.montantTtc,
        statut: 'NON_FACTURE',
        camionId: truckId,
        clientId: Number(form.clientId),
        codeProduitId: Number(form.codeProduitId),
        fournisseurId: form.fournisseurId ? Number(form.fournisseurId) : null,
      };
      if (editingNote) { await bonDeLivraisonApi.update(editingNote.id, payload); }
      else { await bonDeLivraisonApi.create(payload); }
      setShowModal(false); setEditingNote(null); setForm(emptyForm);
      onRefresh();
      onDataChange?.();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bonDeLivraisonApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
      onDataChange?.();
    }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur'); } finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Bons de livraison associés' : 'Associated delivery notes'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{notes.length} {language === 'fr' ? 'bons' : 'notes'}</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer">
          <Plus size={14} />{language === 'fr' ? 'Ajouter un bon' : 'Add Note'}
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-secondary border-b border-border">
              {[language === 'fr' ? 'N° Bon' : 'Note No', language === 'fr' ? 'Produit' : 'Product', language === 'fr' ? 'Client' : 'Customer', language === 'fr' ? 'N° BL Fourn.' : 'Supplier BL', 'Date', language === 'fr' ? 'Qté' : 'Qty', 'Montant HT', 'Montant TTC', 'Statut', 'Actions'].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {notes.length === 0 ? (
              <tr><td colSpan={10} className="px-5 py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="p-4 bg-secondary rounded-2xl"><FileText size={24} className="opacity-40" /></div>
                  <p className="text-sm font-medium">{language === 'fr' ? 'Aucun bon de livraison' : 'No delivery notes'}</p>
                </div>
              </td></tr>
            ) : notes.map(note => (
              <tr key={note.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{note.numero}</span></td>
                <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary text-foreground text-xs font-semibold">{note.codeProduitCode}</span></td>
                <td className="px-4 py-3 text-xs font-semibold text-foreground">{note.clientNom}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{note.blNumFournisseur ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-medium text-foreground">{note.date}</td>
                <td className="px-4 py-3 text-xs font-bold text-foreground">{note.quantite} <span className="font-normal text-muted-foreground">{note.codeProduitUnit || ''}</span></td>
                <td className="px-4 py-3 text-xs font-semibold text-foreground">{Number(note.montantHt).toLocaleString()} <span className="text-muted-foreground font-normal">TND</span></td>
                <td className="px-4 py-3 text-xs font-bold text-primary">{Number(note.montantTtc).toLocaleString()} <span className="text-muted-foreground font-normal">TND</span></td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${note.statut === 'FACTURE' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/60' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200/60'}`}>
                    {note.statut === 'FACTURE' ? <><CheckCircle2 size={10} />{language === 'fr' ? 'Facturé' : 'Invoiced'}</> : <><Clock size={10} />{language === 'fr' ? 'Non facturé' : 'Not invoiced'}</>}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openEdit(note)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteTarget(note)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border/50">
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">{editingNote ? (language === 'fr' ? 'Modifier le Bon' : 'Edit Delivery Note') : (language === 'fr' ? 'Nouveau Bon de Livraison' : 'New Delivery Note')}</h2>
                <p className="text-xs text-primary mt-0.5 font-semibold">{language === 'fr' ? 'Camion automatiquement assigné' : 'Truck automatically assigned'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6 overflow-y-auto flex-1 relative">
              {loadingConfig && <div className="absolute inset-0 z-10 bg-card/80 backdrop-blur-sm flex items-center justify-center"><Loader2 size={32} className="animate-spin text-primary" /></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{language === 'fr' ? 'N° de Bon *' : 'Note Number *'}</label>
                  <input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="Ex: BL-2024-001" className={inp} />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'N° BL Fournisseur' : 'Supplier BL'}</label>
                  <input
                    type="number"
                    value={form.blNumFournisseur}
                    onChange={e => setForm({ ...form, blNumFournisseur: e.target.value })}
                    placeholder={language === 'fr' ? 'Optionnel' : 'Optional'}
                    className={`${inp} no-spinner`}
                    onWheel={(e) => e.preventDefault()}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>{language === 'fr' ? 'Code Produit *' : 'Product Code *'}</label>
                  <select value={form.codeProduitId} onChange={e => setForm({ ...form, codeProduitId: e.target.value, quantite: '' })} className={sel}>
                    <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                    {codesProduit.map(p => <option key={p.id} value={p.id}>{p.code}{p.description ? ` — ${p.description}` : ''} ({Number(p.unitPrice).toLocaleString()} TND / {p.unit})</option>)}
                  </select>
                  {selectedProduct && <p className="text-xs text-muted-foreground mt-1.5">{Number(selectedProduct.unitPrice).toLocaleString()} TND / {selectedProduct.unit} · TVA {Number(selectedProduct.vat)}%</p>}
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Client *' : 'Customer *'}</label>
                  <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className={sel}>
                    <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.localisation}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Fournisseur' : 'Supplier'}</label>
                  <select value={form.fournisseurId} onChange={e => setForm({ ...form, fournisseurId: e.target.value })} className={sel}>
                    <option value="">{language === 'fr' ? 'Aucun' : 'None'}</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom} — {f.localisation}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date *' : 'Date *'}</span></label>
                  <DatePicker selected={form.date} onChange={(date: Date | null) => setForm({ ...form, date: date || new Date() })} className={`${inp} w-full`} wrapperClassName="w-full" popperClassName="z-[9999]" dateFormat="yyyy-MM-dd" />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>{language === 'fr' ? 'Quantité' : 'Quantity'}{selectedProduct ? ` (${selectedProduct.unit})` : ''} *</label>
                  <input
                    type="number"
                    value={form.quantite}
                    min="0"
                    step="0.001"
                    onChange={e => setForm({ ...form, quantite: e.target.value })}
                    placeholder="0"
                    className={`${inp} no-spinner`}
                    onWheel={(e) => e.preventDefault()}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={lbl}>{language === 'fr' ? 'Récapitulatif' : 'Summary'}</p>
                        {selectedProduct && form.quantite && Number(form.quantite) > 0 && <p className="text-xs text-muted-foreground mt-1">{form.quantite} {selectedProduct.unit} × {Number(selectedProduct.unitPrice).toLocaleString()} TND</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">HT : <span className="font-bold text-foreground">{form.montantHt.toLocaleString()} TND</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">TTC : <span className="text-xl font-bold text-primary">{form.montantTtc.toLocaleString()} TND</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : editingNote ? (language === 'fr' ? 'Modifier' : 'Update') : (language === 'fr' ? 'Créer le Bon' : 'Create Note')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={16} className="text-destructive" /></div>
                <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}</h2>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-2 hover:bg-secondary rounded-xl cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80">{language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce bon ?' : 'Are you sure you want to delete this note?'}</p>
              <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-sm font-bold text-foreground">{deleteTarget.numero}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{deleteTarget.clientNom} · {deleteTarget.date}</p>
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold cursor-pointer text-sm">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting && <Loader2 size={13} className="animate-spin" />}{language === 'fr' ? 'Supprimer' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Repairs Tab ──────────────────────────────────────────────────────────────

function RepairsTab({ truckId, language, onDataChange }: { truckId: number; language: string; onDataChange?: () => void }) {
  const [repairs, setRepairs] = useState<ReparationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ReparationResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReparationResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { date: new Date(), typeReparation: '', cout: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRepairs(await reparationApi.getAll(truckId)); } finally { setLoading(false); }
  }, [truckId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (r: ReparationResponse) => {
    setEditTarget(r);
    setForm({ date: new Date(String(r.date)), typeReparation: r.typeReparation, cout: String(r.cout), notes: r.notes ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.typeReparation || !form.cout) return;
    setSaving(true);
    try {
      const payload: ReparationRequest = { camionId: truckId, date: form.date.toISOString().split('T')[0], typeReparation: form.typeReparation, cout: Number(form.cout), notes: form.notes || undefined };
      if (editTarget) await reparationApi.update(editTarget.id, payload); else await reparationApi.create(payload);
      await load(); setShowModal(false);
      onDataChange?.();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await reparationApi.delete(deleteTarget.id);
      await load(); setDeleteTarget(null);
      onDataChange?.();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur'); }
  };

  const maxCost = repairs.length ? Math.max(...repairs.map(r => Number(r.cout))) : 0;

  return (
    <div>
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Historique des réparations' : 'Repair History'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{repairs.length} {language === 'fr' ? 'réparation(s)' : 'repair(s)'}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer">
          <Plus size={14} />{language === 'fr' ? 'Ajouter une réparation' : 'Add Repair'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[308px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary border-b border-border">
                {['Date', language === 'fr' ? 'Type' : 'Type', language === 'fr' ? 'Coût' : 'Cost', 'Notes', 'Actions'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {repairs.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="p-4 bg-secondary rounded-2xl"><Wrench size={24} className="opacity-40" /></div>
                    <p className="text-sm font-medium">{language === 'fr' ? 'Aucune réparation' : 'No repairs'}</p>
                  </div>
                </td></tr>
              ) : repairs.map(r => {
                const pct = maxCost > 0 ? (Number(r.cout) / maxCost) * 100 : 0;
                return (
                  <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-medium text-foreground whitespace-nowrap">{String(r.date)}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-foreground">{r.typeReparation}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1 min-w-[110px]">
                        <span className="text-xs font-bold text-primary">{fmtCurrency(Number(r.cout))} TND</span>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden w-20">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[180px] truncate">{r.notes || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{editTarget ? (language === 'fr' ? 'Modifier la réparation' : 'Edit Repair') : (language === 'fr' ? 'Nouvelle réparation' : 'New Repair')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date *' : 'Date *'}</span></label>
                <DatePicker selected={form.date} onChange={(date: Date | null) => setForm(f => ({ ...f, date: date || new Date() }))} className={`${inp} w-full`} wrapperClassName="w-full" popperClassName="z-[9999]" dateFormat="yyyy-MM-dd" />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Type de réparation *' : 'Repair type *'}</label>
                <input type="text" className={inp} value={form.typeReparation} onChange={e => setForm(f => ({ ...f, typeReparation: e.target.value }))} placeholder={language === 'fr' ? 'Ex: Vidange et filtre' : 'Ex: Oil Change'} />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><BadgeDollarSign size={10} />{language === 'fr' ? 'Coût (TND) *' : 'Cost (TND) *'}</span></label>
                <input
                  type="number"
                  className={`${inp} no-spinner`}
                  value={form.cout}
                  onChange={e => setForm(f => ({ ...f, cout: e.target.value }))}
                  placeholder="0.000"
                  min="0"
                  step="0.001"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <label className={lbl}>Notes</label>
                <textarea className={`${inp} resize-none`} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={language === 'fr' ? 'Notes supplémentaires...' : 'Additional notes...'} />
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleSave} disabled={saving || !form.typeReparation || !form.cout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <RefreshCw size={13} className="animate-spin" />}
                {saving ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : editTarget ? (language === 'fr' ? 'Modifier' : 'Save changes') : (language === 'fr' ? 'Ajouter' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={16} className="text-destructive" /></div>
                <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}</h2>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-2 hover:bg-secondary rounded-xl cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80 leading-relaxed">{language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette réparation ?' : 'Are you sure you want to delete this repair?'}</p>
              <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-sm font-bold text-foreground">{deleteTarget.typeReparation}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{String(deleteTarget.date)} · <span className="text-primary font-semibold">{fmtCurrency(Number(deleteTarget.cout))} TND</span></p>
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold cursor-pointer text-sm">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold cursor-pointer text-sm">{language === 'fr' ? 'Supprimer' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fuel Tab ─────────────────────────────────────────────────────────────────

function FuelTabContent({ truckId, language, onDataChange }: { truckId: number; language: string; onDataChange?: () => void }) {
  const [bons, setBons] = useState<BonCarburantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<BonCarburantResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BonCarburantResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bonCarburantApi.getAll({ camionId: truckId });
      setBons(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } finally { setLoading(false); }
  }, [truckId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bonCarburantApi.delete(deleteTarget.id);
      await load(); setDeleteTarget(null);
      onDataChange?.();
    } finally { setDeleting(false); }
  };

  const fuelLabel = (type: string) => fuelTypeLabel(type);

  function ConsoBadge({ statut, value }: { statut: string; value: number | null }) {
    if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
    const colorMap: Record<string, string> = { BONNE: 'text-emerald-600', MOYENNE: 'text-yellow-600', MAUVAISE: 'text-red-600' };
    return <span className={`text-xs font-semibold ${colorMap[statut] ?? 'text-foreground'}`}>{value.toFixed(1)} <span className="text-muted-foreground font-normal">L/100</span></span>;
  }

  const formatQuantity = (litres: number | null | undefined) => {
    if (litres == null) return '—';
    return `${litres.toFixed(1)} L`;
  };

  return (
    <div>
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Bons de carburant' : 'Fuel Receipts'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{bons.length} {language === 'fr' ? 'bon(s)' : 'receipt(s)'}</p>
        </div>
        <button onClick={() => { setEditTarget(null); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer">
          <Plus size={14} />{language === 'fr' ? 'Ajouter un bon' : 'Add Receipt'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary border-b border-border">
                {[
                  language === 'fr' ? 'N° Bon' : 'Receipt No', 'Station', 'Date',
                  language === 'fr' ? 'Type carburant' : 'Fuel type',
                  language === 'fr' ? 'Quantité (L)' : 'Quantity (L)',
                  language === 'fr' ? 'Montant total' : 'Total',
                  language === 'fr' ? 'Kilométrage' : 'Mileage',
                  language === 'fr' ? 'Distance' : 'Distance',
                  language === 'fr' ? 'Consommation' : 'Consumption',
                  'Actions',
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {bons.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="p-4 bg-secondary rounded-2xl"><Fuel size={24} className="opacity-40" /></div>
                    <p className="text-sm font-medium">{language === 'fr' ? 'Aucun bon de carburant' : 'No fuel receipts'}</p>
                  </div>
                </td></tr>
              ) : bons.map(bon => (
                <tr key={bon.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">#{bon.numero ?? bon.id}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><MapPin size={11} className="text-orange-500 shrink-0" /><span className="text-xs font-semibold text-foreground">{bon.stationNom ?? `#${bon.stationId}`}</span></div></td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{bon.date}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200/50 text-[10px] font-semibold">{fuelLabel(bon.typCarburant)}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Droplet size={11} className="text-blue-500 shrink-0" /><span className="text-xs font-semibold text-foreground">{formatQuantity(bon.quantiteLitres)}</span></div></td>
                  <td className="px-4 py-3"><span className="text-xs font-bold text-primary">{Number(bon.montantTotal).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <span className="text-muted-foreground font-normal">TND</span></span></td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{bon.kilometrageActuel != null ? `${bon.kilometrageActuel.toLocaleString()} km` : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">{bon.distanceParcourue != null && bon.distanceParcourue > 0 ? <span className="inline-flex items-center gap-1.5"><Route size={11} className="text-violet-500 shrink-0" /><span className="text-xs font-semibold text-foreground">{bon.distanceParcourue.toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}</span><span className="text-xs text-muted-foreground">km</span></span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3"><ConsoBadge statut={bon.consommationStatut} value={bon.consommationReelle} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditTarget(bon); setShowAddModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteTarget(bon)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddBonCarburantModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditTarget(null); }}
          language={language as any} camionId={truckId}
          onSuccess={() => { load(); onDataChange?.(); }}
          editBon={editTarget} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={16} className="text-destructive" /></div>
                <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}</h2>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-2 hover:bg-secondary rounded-xl cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80">{language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce bon de carburant ?' : 'Are you sure you want to delete this fuel receipt?'}</p>
              <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Bon' : 'Receipt'} #{deleteTarget.numero ?? deleteTarget.id}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{deleteTarget.date} · <span className="text-primary font-semibold">{Number(deleteTarget.montantTotal).toLocaleString()} TND</span></p>
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold cursor-pointer text-sm">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting && <Loader2 size={13} className="animate-spin" />}{language === 'fr' ? 'Supprimer' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Charges Tab ──────────────────────────────────────────────────────────────

function ChargesTab({ truckId, language, truckMatricule, onDataChange }: { truckId: number; language: string; truckMatricule: string; onDataChange?: () => void }) {
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [templates, setTemplates] = useState<ChargeTemplateResponse[]>([]);
  const [rappels, setRappels] = useState<RappelChargeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    id: 0,
    templateId: '',
    date: new Date(),
    montant: '',
    statut: 'EN_ATTENTE' as StatutCharge,
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChargeResponse | null>(null);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chargesData, templatesData, rappelsData] = await Promise.all([
        chargeApi.getAll(),
        chargeTemplateApi.getAll(),
        rappelChargeApi.getAll(),
      ]);
      setCharges(chargesData.filter((c) => c.camionId === truckId));
      setTemplates(templatesData.filter((t) => t.camionId === truckId && t.active));
      setRappels(rappelsData.filter((r) => r.camionMatricule === truckMatricule));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [truckId, truckMatricule]);

  useEffect(() => { load(); }, [load]);

  const handleTemplateChange = (templateIdStr: string) => {
    const template = templates.find((t) => String(t.id) === templateIdStr);
    setForm({ ...form, templateId: templateIdStr, montant: template?.montantReference ? String(template.montantReference) : '' });
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.templateId || !form.date || !form.montant) {
      setFormError(language === 'fr' ? 'Champs obligatoires' : 'Required fields');
      return;
    }
    const payload = {
      templateId: Number(form.templateId),
      date: formatLocalDate(form.date),
      montant: parseFloat(form.montant),
      statut: form.statut,
      notes: form.notes || null,
    };
    try {
      if (form.id === 0) { await chargeApi.create(payload); } else { await chargeApi.update(form.id, payload); }
      await load();
      setShowModal(false);
      onDataChange?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleToggleStatus = async (id: number, current: StatutCharge) => {
    try {
      const next = current === 'PAYEE' ? 'EN_ATTENTE' : 'PAYEE';
      await chargeApi.updateStatut(id, next);
      await load();
      onDataChange?.();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await chargeApi.delete(deleteTarget.id);
      await load(); setDeleteTarget(null);
      onDataChange?.();
    }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur'); }
  };

  const handleAvancerRappel = async (id: number) => {
    try {
      setAdvancingId(id);
      await rappelChargeApi.avancer(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setAdvancingId(null);
    }
  };

  const getCategoryLabelText = (cat: string) => {
    const labels: Record<string, { fr: string; en: string }> = {
      SALAIRE: { fr: 'Salaire chauffeur', en: 'Driver salary' },
      CNSS: { fr: 'CNSS', en: 'CNSS' },
      ASSURANCE: { fr: 'Assurance', en: 'Insurance' },
      VIGNETTE: { fr: 'Vignette', en: 'Road Tax' },
      VISITE_TECHNIQUE: { fr: 'Visite technique', en: 'Technical inspection' },
      VIDANGE: { fr: 'Vidange', en: 'Oil change' },
      LAVAGE: { fr: 'Lavage', en: 'Washing' },
      REPARATION: { fr: 'Réparation', en: 'Repair' },
      ASSURANCE_REMORQUE: { fr: 'Assurance remorque', en: 'Trailer insurance' },
      VIGNETTE_REMORQUE: { fr: 'Vignette remorque', en: 'Trailer road tax' },
      AUTRE: { fr: 'Autre', en: 'Other' },
    };
    return labels[cat] ? (language === 'fr' ? labels[cat].fr : labels[cat].en) : cat;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Dépenses du camion' : 'Truck Expenses'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{charges.length} {language === 'fr' ? 'dépense(s)' : 'expense(s)'}</p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setForm({ id: 0, templateId: templates[0]?.id ? String(templates[0].id) : '', date: new Date(), montant: templates[0]?.montantReference ? String(templates[0].montantReference) : '', statut: 'EN_ATTENTE', notes: '' });
              setShowModal(true);
            }}
            disabled={templates.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />{language === 'fr' ? 'Ajouter une dépense' : 'Add Expense'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  {['Date', language === 'fr' ? 'Libellé' : 'Label', language === 'fr' ? 'Catégorie' : 'Category', language === 'fr' ? 'Montant' : 'Amount', language === 'fr' ? 'Statut' : 'Status', 'Actions'].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {charges.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-xs text-muted-foreground italic">{language === 'fr' ? 'Aucune dépense enregistrée' : 'No expenses recorded'}</td></tr>
                ) : charges.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-foreground font-medium whitespace-nowrap">{c.date}</td>
                    <td className="px-4 py-3 text-xs text-foreground font-semibold">{c.templateLibelle}</td>
                    <td className="px-4 py-3 text-xs"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{getCategoryLabelText(c.templateCategorie)}</span></td>
                    <td className="px-4 py-3 text-xs font-bold text-foreground">{fmtCurrency(c.montant)} TND</td>
                    <td className="px-4 py-3 text-xs">
                      <button onClick={() => handleToggleStatus(c.id, c.statut)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer ${c.statut === 'PAYEE' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50'}`}>
                        <span className={`w-1 h-1 rounded-full ${c.statut === 'PAYEE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {c.statut === 'PAYEE' ? (language === 'fr' ? 'PAYÉE' : 'PAID') : (language === 'fr' ? 'ATTENTE' : 'PENDING')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setFormError(null); setForm({ id: c.id, templateId: String(c.templateId), date: new Date(c.date), montant: String(c.montant), statut: c.statut, notes: c.notes || '' }); setShowModal(true); }} className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 cursor-pointer"><Edit2 size={13} /></button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive cursor-pointer"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section Rappels de charges : colonne Statut → Avancer */}
      <div className="pt-4 border-t border-border">
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Rappels de charges' : 'Expenses Reminders'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'fr' ? 'Planifiés pour ce véhicule (gérer dans ' : 'Scheduled for this truck (manage in '}
              <Link href="/charges" className="text-primary hover:underline font-semibold">{language === 'fr' ? 'Charges' : 'Expenses'}</Link>)
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {[
                  language === 'fr' ? 'Libellé' : 'Label',
                  language === 'fr' ? 'Catégorie' : 'Category',
                  language === 'fr' ? 'Fréquence' : 'Frequency',
                  language === 'fr' ? 'Prochaine date' : 'Next date',
                  language === 'fr' ? 'Jours restants' : 'Days left',
                  language === 'fr' ? 'Avancer' : 'Advance'
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rappels.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-xs text-muted-foreground italic">{language === 'fr' ? 'Aucun rappel actif pour ce camion' : 'No active reminders for this truck'}</td></tr>
              ) : rappels.map((r) => {
                const isOverdue = r.statut === 'DEPASSE';
                const isNear = r.statut === 'PROCHE';
                return (
                  <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-foreground">{r.templateLibelle}</td>
                    <td className="px-4 py-3 text-xs"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{getCategoryLabelText(r.templateCategorie)}</span></td>
                    <td className="px-4 py-3 text-xs text-foreground/80">{r.frequence}</td>
                    <td className="px-4 py-3 text-xs font-mono text-foreground/80">{r.prochaineDate}</td>
                    <td className={`px-4 py-3 text-xs font-bold ${isOverdue ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {isOverdue ? (language === 'fr' ? `${Math.abs(r.joursRestants)} j retard` : `${Math.abs(r.joursRestants)} d late`) : (language === 'fr' ? `Dans ${r.joursRestants} j` : `In ${r.joursRestants} d`)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <button
                        onClick={() => handleAvancerRappel(r.id)}
                        disabled={advancingId === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 transition-all cursor-pointer text-[10px] font-bold disabled:opacity-50"
                        title={language === 'fr' ? 'Avancer (cycle suivant)' : 'Advance (next cycle)'}
                      >
                        {advancingId === r.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} className="fill-current" />}
                        <span>{language === 'fr' ? 'Avancer' : 'Advance'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{form.id === 0 ? (language === 'fr' ? 'Ajouter une dépense' : 'Add Expense') : (language === 'fr' ? 'Modifier la dépense' : 'Edit Expense')}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary rounded-xl cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {formError && <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2"><AlertTriangle size={14} /><span>{formError}</span></div>}
              <div>
                <label className={lbl}>{language === 'fr' ? 'Modèle de charge *' : 'Charge Template *'}</label>
                <select value={form.templateId} onChange={(e) => handleTemplateChange(e.target.value)} className={sel} disabled={form.id !== 0}>
                  <option value="">{language === 'fr' ? 'Sélectionner un modèle' : 'Select a template'}</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.libelle}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Date *</label>
                  <DatePicker selected={form.date} onChange={(d: Date | null) => setForm({ ...form, date: d || new Date() })} className={inp} placeholderText="YYYY-MM-DD" dateFormat="yyyy-MM-dd" />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Montant *' : 'Amount *'}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.montant}
                    onChange={(e) => setForm({ ...form, montant: e.target.value })}
                    className={`${inp} no-spinner`}
                    placeholder="0.000"
                    onWheel={(e) => e.preventDefault()}
                  />
                </div>
              </div>
              <div>
                <label className={lbl}>Statut</label>
                <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as any })} className={sel}>
                  <option value="EN_ATTENTE">{language === 'fr' ? 'En attente' : 'Pending'}</option>
                  <option value="PAYEE">{language === 'fr' ? 'Payée' : 'Paid'}</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inp} h-20 resize-none`} placeholder="Notes..." />
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-sm cursor-pointer">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold text-sm cursor-pointer">{language === 'fr' ? 'Enregistrer' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={16} className="text-destructive" /></div>
                <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}</h2>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-2 hover:bg-secondary rounded-xl cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80 leading-relaxed">{language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette dépense ?' : 'Are you sure you want to delete this expense?'}</p>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold cursor-pointer text-sm">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold cursor-pointer text-sm">{language === 'fr' ? 'Supprimer' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Truck Fleet Modal ────────────────────────────────────────────────────────

function TruckListModal({ isOpen, onClose, trucks, selectedTruckId, language, onSelectTruck, onDeleteTruck }: {
  isOpen: boolean; onClose: () => void; trucks: Truck[]; selectedTruckId: number | null;
  language: string; onSelectTruck: (t: Truck) => void; onDeleteTruck: (id: number) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
      <div className="bg-card rounded-2xl w-full max-w-xl border border-border shadow-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">{language === 'fr' ? 'Flotte de camions' : 'Truck Fleet'}</h2>
            <p className="text-xs text-muted-foreground">{trucks.length} {language === 'fr' ? 'véhicules' : 'vehicles'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={18} /></button>
        </div>
        {trucks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <TruckIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{language === 'fr' ? 'Aucun camion trouvé.' : 'No trucks found.'}</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
            {trucks.map(truck => (
              <div key={truck.id} onClick={() => { onSelectTruck(truck); onClose(); }}
                className={`flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-secondary/50 transition-colors ${selectedTruckId === truck.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${truck.status ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                    <TruckIcon size={18} className={truck.status ? 'text-emerald-500' : 'text-amber-500'} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{truck.matricule}</p>
                    <p className="text-xs text-muted-foreground">{truck.nomChauffeur} · {truck.truckModel}</p>
                    {truck.remorqueMatricule && (
                      <p className="text-[10px] text-violet-500 font-semibold mt-0.5">↳ {truck.remorqueMatricule}{truck.remorqueType ? ` (${truck.remorqueType})` : ''}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${truck.status ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700'}`}>
                    {truck.status ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Maintenance' : 'Maintenance')}
                  </span>
                  <button onClick={e => { e.stopPropagation(); onDeleteTruck(truck.id); }}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-destructive/60 hover:text-destructive cursor-pointer">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Truck Modal ──────────────────────────────────────────────────────────

function AddTruckModal({ isOpen, onClose, formData, language, onFormChange, onSubmit, isLoading, error, chauffeurs, remorques }: {
  isOpen: boolean; onClose: () => void; formData: TruckFormData; language: string;
  onFormChange: (d: TruckFormData) => void; onSubmit: () => Promise<void>; isLoading?: boolean; error?: string | null;
  chauffeurs: ChauffeurResponse[];
  remorques: RemorqueResponse[];
}) {
  if (!isOpen) return null;

  const handleChauffeurChange = (chauffeurIdStr: string) => {
    const found = chauffeurs.find(c => String(c.id) === chauffeurIdStr);
    onFormChange({
      ...formData,
      chauffeurId: chauffeurIdStr,
      nomChauffeur: found ? found.nomComplet : (language === 'fr' ? 'Aucun chauffeur disponible' : 'No driver available'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
      <div className="bg-card rounded-2xl w-full max-w-2xl border border-border shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
        <div className="flex items-center justify-between px-8 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">{language === 'fr' ? 'Nouveau camion' : 'New Truck'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{language === 'fr' ? 'Remplissez les informations du véhicule' : 'Fill in the vehicle information'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={20} /></button>
        </div>
        {error && <div className="mx-8 mt-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</div>}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{language === 'fr' ? 'Matricule *' : 'License Plate *'}</label>
              <input type="text" value={formData.matricule} onChange={e => onFormChange({ ...formData, matricule: e.target.value })} placeholder="156 TN 2154" className={inp} />
            </div>
            <div>
              <label className={lbl}>{language === 'fr' ? 'Modèle *' : 'Model *'}</label>
              <input type="text" value={formData.truckModel} onChange={e => onFormChange({ ...formData, truckModel: e.target.value })} placeholder="Mercedes Actros" className={inp} />
            </div>

            <div className="col-span-2">
              <label className={lbl}>{language === 'fr' ? 'Chauffeur' : 'Driver'}</label>
              <select value={formData.chauffeurId} onChange={e => handleChauffeurChange(e.target.value)} className={sel}>
                <option value="">{language === 'fr' ? 'Aucun chauffeur enregistré / Saisie libre' : 'No registered driver / Free text'}</option>
                {chauffeurs.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.nomComplet}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className={lbl}>{language === 'fr' ? 'Remorque' : 'Trailer'}</label>
              <select value={formData.remorqueId} onChange={e => onFormChange({ ...formData, remorqueId: e.target.value })} className={sel}>
                <option value="">{language === 'fr' ? 'Aucune remorque / Libre' : 'No trailer / Free'}</option>
                {remorques.filter((r: RemorqueResponse) => r.active).map((r: RemorqueResponse) => (
                  <option key={r.id} value={r.id}>
                    {r.matricule} {r.typeRemorque ? `(${r.typeRemorque})` : ''} {r.camionId ? `[Assigné à ${r.camionMatricule || r.camionId}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>{language === 'fr' ? 'Type de carburant' : 'Fuel Type'}</label>
              <select value={formData.fuelType} onChange={e => onFormChange({ ...formData, fuelType: e.target.value })} className={sel}>
                <option value="DIESEL">Diesel</option>
                <option value="ESSENCE">Essence</option>
                <option value="DIESEL_50">Diesel 50</option>
              </select>
            </div>
            <div>
              <label className={lbl}>{language === 'fr' ? 'Capacité (L)' : 'Capacity (L)'}</label>
              <input
                type="number"
                value={formData.capacityLiters}
                onChange={e => onFormChange({ ...formData, capacityLiters: e.target.value })}
                placeholder="25000"
                className={`${inp} no-spinner`}
                onWheel={(e) => e.preventDefault()}
              />
            </div>
            <div className="col-span-2">
              <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? "Date d'achat" : 'Purchase Date'}</span></label>
              <DatePicker
                selected={formData.purchaseDate}
                onChange={(date: Date | null) => onFormChange({ ...formData, purchaseDate: date })}
                className={`${inp} w-full`}
                wrapperClassName="w-full"
                popperClassName="z-[9999]"
                dateFormat="yyyy-MM-dd"
                isClearable
                placeholderText={language === 'fr' ? 'Sélectionner une date' : 'Select a date'}
              />
            </div>
            <div className="col-span-2">
              <label className={lbl}>{language === 'fr' ? 'Statut initial' : 'Initial Status'}</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => onFormChange({ ...formData, status: true })}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${formData.status ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700' : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'}`}>
                  {language === 'fr' ? '✓ Actif' : '✓ Active'}
                </button>
                <button type="button" onClick={() => onFormChange({ ...formData, status: false })}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${!formData.status ? 'bg-amber-500/20 border-amber-500 text-amber-700' : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'}`}>
                  {language === 'fr' ? '⚙ Maintenance' : '⚙ Maintenance'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t border-border">
            <button onClick={onClose} disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer font-medium text-sm disabled:opacity-50">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
            <button onClick={onSubmit} disabled={isLoading || !formData.matricule || !formData.truckModel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading && <Loader2 size={16} className="animate-spin" />}{language === 'fr' ? 'Enregistrer le camion' : 'Save Truck'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrucksPage() {
  const { language, darkMode } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [activeTab, setActiveTab] = useState<'trips' | 'fuel' | 'repairs' | 'charges'>('trips');
  const [deliveryNotes, setDeliveryNotes] = useState<BonDeLivraisonResponse[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TruckFormData>(defaultTruckForm());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [rappelsVidange, setRappelsVidange] = useState<RappelVidangeResponse[]>([]);

  const [chauffeurs, setChauffeurs] = useState<ChauffeurResponse[]>([]);
  const [remorques, setRemorques] = useState<RemorqueResponse[]>([]);

  const loadTrucks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await camionApi.getAll();
      const mapped = data.map(r => mapResponse(r, language as 'fr' | 'en'));
      setTrucks(mapped);
      return mapped;
    } catch (err: any) { setError(err.message ?? 'Erreur de chargement'); return []; } finally { setLoading(false); }
  }, [language]);

  const loadDeliveryNotes = async (truckId: number) => {
    try {
      const notes = await bonDeLivraisonApi.getByCamion(truckId);
      notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDeliveryNotes(notes);
    } catch { setDeliveryNotes([]); }
  };

  const refreshTruckData = useCallback(async () => {
    const updated = await loadTrucks();
    setSelectedTruck(prev => {
      if (!prev) return prev;
      const fresh = updated.find(t => t.id === prev.id);
      return fresh ?? prev;
    });
    try {
      const rv = await rappelVidangeApi.getAll();
      setRappelsVidange(rv);
    } catch { /* silencieux */ }
  }, [loadTrucks]);

  useEffect(() => {
    rappelVidangeApi.getAll().then(setRappelsVidange).catch(() => { });
    chauffeurApi.getAll().then(setChauffeurs).catch(() => { });
    remorqueApi.getAll().then(setRemorques).catch(() => { });
  }, []);

  useEffect(() => {
    loadTrucks().then(mapped => {
      if (!mapped.length) return;
      const camionIdParam = searchParams.get('camionId');
      const tabParam = searchParams.get('tab');
      if (camionIdParam) {
        const truck = mapped.find(t => t.id === parseInt(camionIdParam));
        if (truck) { setSelectedTruck(truck); if (tabParam === 'fuel') setActiveTab('fuel'); router.replace('/trucks', { scroll: false }); return; }
      }
      setSelectedTruck(mapped[0]);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (selectedTruck?.id) loadDeliveryNotes(selectedTruck.id); else setDeliveryNotes([]);
  }, [selectedTruck?.id]);

  useEffect(() => {
    if (selectedTruck && trucks.length) {
      const fresh = trucks.find(t => t.id === selectedTruck.id);
      if (fresh && fresh !== selectedTruck) setSelectedTruck(fresh);
    }
  }, [trucks]);

  const syncTrailerRelation = async (camionId: number, oldRemorqueId: number | null, newRemorqueId: number | null) => {
    if (oldRemorqueId === newRemorqueId) return;

    if (oldRemorqueId != null) {
      const oldTrailer = remorques.find(r => r.id === oldRemorqueId);
      if (oldTrailer) {
        try {
          await remorqueApi.update(oldRemorqueId, {
            matricule: oldTrailer.matricule,
            typeRemorque: oldTrailer.typeRemorque,
            capaciteTonnes: oldTrailer.capaciteTonnes,
            dateAchat: oldTrailer.dateAchat,
            camionId: null,
          });
        } catch (err) {
          console.error("Failed to detach old trailer", err);
        }
      }
    }

    if (newRemorqueId != null) {
      const newTrailer = remorques.find(r => r.id === newRemorqueId);
      if (newTrailer) {
        try {
          await remorqueApi.update(newRemorqueId, {
            matricule: newTrailer.matricule,
            typeRemorque: newTrailer.typeRemorque,
            capaciteTonnes: newTrailer.capaciteTonnes,
            dateAchat: newTrailer.dateAchat,
            camionId: camionId,
          });
        } catch (err) {
          console.error("Failed to attach new trailer", err);
        }
      }
    }
  };

  const handleCreate = async () => {
    setFormLoading(true); setFormError(null);
    try {
      const res = await camionApi.create({
        matricule: formData.matricule,
        nomChauffeur: formData.chauffeurId
          ? (chauffeurs.find(c => String(c.id) === formData.chauffeurId)?.nomComplet ?? '')
          : (language === 'fr' ? 'Aucun chauffeur disponible' : 'No driver available'),
        chauffeurId: formData.chauffeurId ? Number(formData.chauffeurId) : undefined,
        truckModel: formData.truckModel,
        capacityLiters: formData.capacityLiters ? parseFloat(formData.capacityLiters) : null,
        fuelType: formData.fuelType ? (formData.fuelType as any) : 'DIESEL',
        purchaseDate: formData.purchaseDate ? formatLocalDate(formData.purchaseDate) : null,
        status: formData.status,
      });

      const newRemorqueId = formData.remorqueId ? Number(formData.remorqueId) : null;
      if (newRemorqueId != null) {
        await syncTrailerRelation(res.id, null, newRemorqueId);
      }

      const updatedTrailers = await remorqueApi.getAll();
      setRemorques(updatedTrailers);

      const updatedTrucks = await loadTrucks();
      const fresh = updatedTrucks.find(t => t.id === res.id);
      if (fresh) {
        setSelectedTruck(fresh);
      } else {
        const truck = mapResponse(res, language as 'fr' | 'en');
        setSelectedTruck(truck);
      }
      setShowAddModal(false); setFormData(defaultTruckForm());
    } catch (err: any) { setFormError(err.message || 'Erreur'); } finally { setFormLoading(false); }
  };

  const handleUpdate = async (updForm: TruckFormData) => {
    if (!selectedTruck) return;
    const res = await camionApi.update(selectedTruck.id, {
      matricule: updForm.matricule,
      nomChauffeur: updForm.chauffeurId
        ? (chauffeurs.find(c => String(c.id) === updForm.chauffeurId)?.nomComplet ?? '')
        : (language === 'fr' ? 'Aucun chauffeur disponible' : 'No driver available'),
      chauffeurId: updForm.chauffeurId ? Number(updForm.chauffeurId) : undefined,
      truckModel: updForm.truckModel,
      capacityLiters: updForm.capacityLiters ? parseFloat(updForm.capacityLiters) : null,
      fuelType: updForm.fuelType ? (updForm.fuelType as any) : 'DIESEL',
      purchaseDate: updForm.purchaseDate ? formatLocalDate(updForm.purchaseDate) : null,
      status: updForm.status,
    });

    const oldRemorqueId = selectedTruck.remorqueId;
    const newRemorqueId = updForm.remorqueId ? Number(updForm.remorqueId) : null;
    await syncTrailerRelation(selectedTruck.id, oldRemorqueId, newRemorqueId);

    const updatedTrailers = await remorqueApi.getAll();
    setRemorques(updatedTrailers);

    const updatedTrucks = await loadTrucks();
    const fresh = updatedTrucks.find(t => t.id === selectedTruck.id);
    if (fresh) setSelectedTruck(fresh);
  };

  const handleStatusChange = async (status: boolean) => {
    if (!selectedTruck) return;
    const res = await camionApi.updateStatus(selectedTruck.id, status);
    const truck = mapResponse(res, language as 'fr' | 'en');
    setTrucks(prev => prev.map(t => t.id === selectedTruck.id ? truck : t));
    setSelectedTruck(truck);
  };

  const confirmDelete = async () => {
    if (deleteTargetId == null) return;
    await camionApi.delete(deleteTargetId);
    setTrucks(prev => prev.filter(t => t.id !== deleteTargetId));
    if (selectedTruck?.id === deleteTargetId) {
      const remaining = trucks.filter(t => t.id !== deleteTargetId);
      setSelectedTruck(remaining[0] ?? null);
    }
    setShowDeleteModal(false); setDeleteTargetId(null);
  };

  return (
    <ProtectedRoute>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{language === 'fr' ? 'Gestion de la Flotte' : 'Fleet Management'}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{trucks.length} {language === 'fr' ? 'camion(s) enregistré(s)' : 'truck(s) on record'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowListModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer text-sm font-medium border border-border">
              <List size={16} />{language === 'fr' ? 'Flotte' : 'Fleet'}
              {trucks.length > 0 && <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{trucks.length}</span>}
            </button>
            <button onClick={() => { setFormData(defaultTruckForm()); setFormError(null); setShowAddModal(true); }}
              className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm">
              <Plus size={16} />{language === 'fr' ? 'Nouveau camion' : 'New Truck'}
            </button>
          </div>
        </div>

        {loading && <Loading fullScreen={false} text={language === 'fr' ? 'Chargement de la flotte de camions...' : 'Loading truck fleet...'} />}

        {error && !loading && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
            <AlertCircle size={18} /><span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && !error && !selectedTruck && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="p-4 bg-secondary rounded-2xl"><TruckIcon size={32} className="text-muted-foreground opacity-40" /></div>
            <p className="text-muted-foreground text-sm">{language === 'fr' ? 'Aucun camion disponible' : 'No trucks available'}</p>
            <button onClick={() => { setFormData(defaultTruckForm()); setFormError(null); setShowAddModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm">
              <Plus size={16} />{language === 'fr' ? 'Ajouter votre premier camion' : 'Add your first truck'}
            </button>
          </div>
        )}

        {!loading && selectedTruck && (
          <>
            <TruckHeaderCard
              truck={selectedTruck}
              language={language}
              rappelVidange={rappelsVidange.find(r => r.camionId === selectedTruck.id)}
              onDelete={() => { setDeleteTargetId(selectedTruck.id); setShowDeleteModal(true); }}
              onUpdate={handleUpdate}
              onStatusChange={handleStatusChange}
              chauffeurs={chauffeurs}
              remorques={remorques}
            />
            <TruckCharts truck={selectedTruck} language={language} darkMode={darkMode} />

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
              <div className="flex border-b border-border">
                {([
                  { key: 'trips', label: language === 'fr' ? 'Bons de livraison' : 'Delivery Notes' },
                  { key: 'fuel', label: language === 'fr' ? 'Carburant' : 'Fuel' },
                  { key: 'repairs', label: language === 'fr' ? 'Réparations' : 'Repairs' },
                  { key: 'charges', label: language === 'fr' ? 'Charges' : 'Expenses' },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all cursor-pointer ${activeTab === tab.key ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {activeTab === 'trips' && (
                <DeliveryNotesTab
                  key={`trips-${selectedTruck.id}`}
                  truckId={selectedTruck.id}
                  language={language}
                  notes={deliveryNotes}
                  onRefresh={() => loadDeliveryNotes(selectedTruck.id)}
                  onDataChange={refreshTruckData}
                />
              )}
              {activeTab === 'fuel' && (
                <FuelTabContent
                  key={`fuel-${selectedTruck.id}`}
                  truckId={selectedTruck.id}
                  language={language}
                  onDataChange={refreshTruckData}
                />
              )}
              {activeTab === 'repairs' && (
                <RepairsTab
                  key={`repairs-${selectedTruck.id}`}
                  truckId={selectedTruck.id}
                  language={language}
                  onDataChange={refreshTruckData}
                />
              )}
              {activeTab === 'charges' && (
                <ChargesTab
                  key={`charges-${selectedTruck.id}`}
                  truckId={selectedTruck.id}
                  language={language}
                  truckMatricule={selectedTruck.matricule}
                  onDataChange={refreshTruckData}
                />
              )}
            </div>
          </>
        )}
      </div>
      <TruckListModal isOpen={showListModal} onClose={() => setShowListModal(false)} trucks={trucks}
        selectedTruckId={selectedTruck?.id ?? null} language={language}
        onSelectTruck={t => { setSelectedTruck(t); setActiveTab('trips'); }}
        onDeleteTruck={id => { setDeleteTargetId(id); setShowDeleteModal(true); setShowListModal(false); }} />

      <AddTruckModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        formData={formData}
        language={language}
        onFormChange={setFormData}
        onSubmit={handleCreate}
        isLoading={formLoading}
        error={formError}
        chauffeurs={chauffeurs}
        remorques={remorques}
      />

      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={18} className="text-destructive" /></div>
                <h2 className="text-lg font-bold text-foreground">{language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}</h2>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80 leading-relaxed">{language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce camion ? Cette action est irréversible.' : 'Are you sure you want to delete this truck? This action cannot be undone.'}</p>
              {deleteTargetId != null && (() => { const truck = trucks.find(t => t.id === deleteTargetId); return truck ? (<div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border"><p className="text-sm font-semibold text-foreground">{truck.matricule}</p><p className="text-muted-foreground text-xs mt-0.5">{truck.nomChauffeur} · {truck.truckModel}</p></div>) : null; })()}
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all cursor-pointer text-sm">{language === 'fr' ? 'Supprimer' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
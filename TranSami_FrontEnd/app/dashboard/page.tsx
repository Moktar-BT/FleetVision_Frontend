'use client';

import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import {
  TrendingUp, Fuel, Wrench, ArrowUpRight, ArrowDownRight, BadgeDollarSign,
  Truck as TruckIcon, Receipt, Gauge, Bell, AlertTriangle,
  Play, RotateCcw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import {
  camionApi, chargeApi, rappelChargeApi, rappelVidangeApi,
  chargeTemplateApi, reparationApi,
  CamionResponse, YearlyBreakdown, RappelChargeResponse, RappelVidangeResponse,
  ChargeTemplateResponse,
} from '@/lib/api-client';
import { ReinitVidangeModal } from '../repairs/Components/RappelsVidangeSection'
import Loading from '@/components/Loading';

// ─── Couleur dédiée aux Charges ──────────────────────────────────────────────
const CHARGE_HEX = '#A0522D';

// ─── Month labels ────────────────────────────────────────────────────────────
const FR_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAnnualTotal(breakdown: YearlyBreakdown[]): number {
  if (!breakdown?.length) return 0;
  const currentYear = new Date().getFullYear();
  const yearData = breakdown.find(b => b.year === currentYear) ?? breakdown[breakdown.length - 1];
  return Number(yearData.annualTotal);
}

// ── Renvoie les 12 mois pour UNE année précise (0 partout si absente) ───────
function getMonthlyAmountsForYear(breakdown: YearlyBreakdown[], year: number): number[] {
  const arr = Array(12).fill(0);
  if (!breakdown?.length) return arr;
  const yearData = breakdown.find(b => b.year === year);
  if (!yearData) return arr;
  yearData.months.forEach(m => { arr[m.month - 1] = Number(m.amount); });
  return arr;
}

// ── Union des années disponibles sur plusieurs breakdowns (ex: tous les camions) ──
function unionYears(breakdownsArrays: YearlyBreakdown[][]): number[] {
  const set = new Set<number>();
  breakdownsArrays.forEach(arr => (arr ?? []).forEach(b => set.add(b.year)));
  if (set.size === 0) set.add(new Date().getFullYear());
  return Array.from(set).sort((a, b) => a - b);
}

// ── Années disponibles sur un seul breakdown ─────────────────────────────────
function availableYearsFromBreakdown(breakdown: YearlyBreakdown[]): number[] {
  if (!breakdown?.length) return [new Date().getFullYear()];
  return breakdown.map(b => b.year).sort((a, b) => a - b);
}

function sumMonthlyArrays(arrays: number[][]): number[] {
  const result = Array(12).fill(0);
  for (const arr of arrays) {
    for (let i = 0; i < 12; i++) {
      result[i] += arr[i] ?? 0;
    }
  }
  return result;
}

function toChartData(amounts: number[], monthLabels: string[]) {
  return amounts.map((v, i) => ({ month: monthLabels[i], value: v }));
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
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

// ─── Tooltips ─────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, color }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p style={{ color }} className="font-bold">{fmtCurrency(Number(payload[0].value))} TND</p>
    </div>
  );
}

// ─── Year Selector (identique à la page Camions) ─────────────────────────────
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

// ─── Chart Card ──────────────────────────────────────────────────────────────
function ChartCard({ icon, title, subtitle, children, accentColor, right }: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
  accentColor?: string; right?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden h-full flex flex-col">
      <div className="h-[2px]" style={{ background: accentColor ? `linear-gradient(to right, ${accentColor}99, ${accentColor}33)` : undefined }} />
      <div className="p-2.5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: accentColor ? `${accentColor}1a` : undefined }}>{icon}</div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
          {right}
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Rappels unifiés ─────────────────────────────────────────────────────────
type StatusGroup = 'OVERDUE' | 'SOON' | 'OK';

interface UnifiedRappel {
  key: string;
  type: 'CHARGE' | 'VIDANGE';
  label: string;
  matricule: string | null;
  chauffeur: string | null;
  remorque: string | null;
  group: StatusGroup;
  sortValue: number;
  remaining: string;
  due: string;
  raw: RappelChargeResponse | RappelVidangeResponse;
}

function statusGroupFromCharge(s: RappelChargeResponse['statut']): StatusGroup {
  if (s === 'DEPASSE') return 'OVERDUE';
  if (s === 'PROCHE') return 'SOON';
  return 'OK';
}

function statusGroupFromVidange(s: RappelVidangeResponse['statut']): StatusGroup {
  if (s === 'DEPASSEE') return 'OVERDUE';
  if (s === 'PROCHE') return 'SOON';
  return 'OK';
}

function groupConfig(group: StatusGroup, language: string) {
  switch (group) {
    case 'OVERDUE':
      return {
        label: language === 'fr' ? 'En retard' : 'Overdue',
        text: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20',
        border: 'border-red-200/50 dark:border-red-700/40', dot: 'bg-red-500',
      };
    case 'SOON':
      return {
        label: language === 'fr' ? 'Proche' : 'Soon',
        text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20',
        border: 'border-amber-200/50 dark:border-amber-700/40', dot: 'bg-amber-500',
      };
    default:
      return {
        label: 'OK',
        text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        border: 'border-emerald-200/50 dark:border-emerald-700/40', dot: 'bg-emerald-500',
      };
  }
}

// ─── Nouveau concept : classement des camions par marge nette ───────────────
function NetMarginRankRow({
  rank, matricule, value, maxAbs, language,
}: { rank: number; matricule: string; value: number; maxAbs: number; language: string }) {
  const isPositive = value >= 0;
  const pct = maxAbs > 0 ? Math.max(4, Math.min(100, (Math.abs(value) / maxAbs) * 100)) : 4;
  const signedText = `${isPositive ? '+' : '−'}${fmtCurrency(Math.abs(value))} TND`;
  const barColor = isPositive ? '#10b981' : '#ef4444';

  const rankBadge =
    rank === 1 ? 'bg-amber-400 text-amber-950' :
      rank === 2 ? 'bg-slate-300 text-slate-800' :
        rank === 3 ? 'bg-orange-300 text-orange-950' :
          'bg-secondary text-muted-foreground';

  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-secondary/30 transition-colors">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${rankBadge}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-foreground truncate">{matricule}</span>
          <span className="text-xs font-extrabold shrink-0" style={{ color: barColor }}>
            {signedText}
          </span>
        </div>
        <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
      <span
        className={`hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${isPositive
          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
          : 'bg-red-50 dark:bg-red-950/20 text-red-600'
          }`}
      >
        {isPositive
          ? (language === 'fr' ? 'Rentable' : 'Profitable')
          : (language === 'fr' ? 'Déficit' : 'Loss')}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { language, darkMode } = useApp();
  const [trucks, setTrucks] = useState<CamionResponse[]>([]);
  const [chargeBreakdown, setChargeBreakdown] = useState<YearlyBreakdown[]>([]);
  const [chargeRappels, setChargeRappels] = useState<RappelChargeResponse[]>([]);
  const [vidangeRappels, setVidangeRappels] = useState<RappelVidangeResponse[]>([]);
  const [chargeTemplates, setChargeTemplates] = useState<ChargeTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal "Faite" (vidange) ──────────────────────────────────────────────
  const [reinitRappel, setReinitRappel] = useState<RappelVidangeResponse | null>(null);

  const textColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? '#334155' : '#374151';
  const fuelColor = darkMode ? '#ea580c' : '#8B5E34';
  const monthLabels = language === 'fr' ? FR_MONTHS : EN_MONTHS;
  const tickFmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
  const curYear = new Date().getFullYear();

  // ── Filtre d'année par graphique ─────────────────────────────────────────
  const [revenueYear, setRevenueYear] = useState(curYear);
  const [fuelYear, setFuelYear] = useState(curYear);
  const [repairYear, setRepairYear] = useState(curYear);
  const [chargeYear, setChargeYear] = useState(curYear);

  const revenueYears = useMemo(() => unionYears(trucks.map(t => t.revenueBreakdown ?? [])), [trucks]);
  const fuelYears = useMemo(() => unionYears(trucks.map(t => t.fuelCostBreakdown ?? [])), [trucks]);
  const repairYears = useMemo(() => unionYears(trucks.map(t => t.repairCostBreakdown ?? [])), [trucks]);
  const chargeYears = useMemo(() => availableYearsFromBreakdown(chargeBreakdown), [chargeBreakdown]);

  // ── Recale l'année sélectionnée si elle devient invalide après chargement ──
  useEffect(() => {
    if (loading) return;
    setRevenueYear(prev => revenueYears.includes(prev) ? prev : (revenueYears[revenueYears.length - 1] ?? curYear));
  }, [loading, revenueYears]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading) return;
    setFuelYear(prev => fuelYears.includes(prev) ? prev : (fuelYears[fuelYears.length - 1] ?? curYear));
  }, [loading, fuelYears]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading) return;
    setRepairYear(prev => repairYears.includes(prev) ? prev : (repairYears[repairYears.length - 1] ?? curYear));
  }, [loading, repairYears]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading) return;
    setChargeYear(prev => chargeYears.includes(prev) ? prev : (chargeYears[chargeYears.length - 1] ?? curYear));
  }, [loading, chargeYears]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Index des camions pour récupérer chauffeur et remorque ──────────────
  const truckMap = useMemo(() => {
    const map: Record<string, { chauffeurNom: string | null; remorqueMatricule: string | null }> = {};
    for (const t of trucks) {
      map[t.matricule] = {
        chauffeurNom: t.chauffeurNom ?? null,
        remorqueMatricule: t.remorqueMatricule ?? null,
      };
    }
    return map;
  }, [trucks]);

  // ── Index des templates pour récupérer la remorque ──────────────────────
  const templateMap = useMemo(() => {
    const map: Record<number, { remorqueMatricule: string | null }> = {};
    for (const t of chargeTemplates) {
      map[t.id] = {
        remorqueMatricule: t.remorqueMatricule ?? null,
      };
    }
    return map;
  }, [chargeTemplates]);

  const loadDashboardData = async () => {
    const [trucksData, chargeData, chargeRappelsData, vidangeRappelsData, templatesData] = await Promise.all([
      camionApi.getAll().catch(() => []),
      chargeApi.getBreakdown().catch(() => []),
      rappelChargeApi.getAll().catch(() => []),
      rappelVidangeApi.getAll().catch(() => []),
      chargeTemplateApi.getAll().catch(() => []),
    ]);
    setTrucks(trucksData);
    setChargeBreakdown(chargeData);
    setChargeRappels(chargeRappelsData);
    setVidangeRappels(vidangeRappelsData);
    setChargeTemplates(templatesData);
  };

  // Rafraîchissement silencieux (sans écran de chargement) après une action
  const refreshRappelsData = async () => {
    const [trucksData, chargeRappelsData, vidangeRappelsData] = await Promise.all([
      camionApi.getAll().catch(() => []),
      rappelChargeApi.getAll().catch(() => []),
      rappelVidangeApi.getAll().catch(() => []),
    ]);
    setTrucks(trucksData);
    setChargeRappels(chargeRappelsData);
    setVidangeRappels(vidangeRappelsData);
  };

  useEffect(() => {
    loadDashboardData().finally(() => setLoading(false));
  }, []);

  // ── Action : Avancer un rappel de charge ─────────────────────────────────
  const handleAvancerCharge = async (rappelId: number) => {
    try {
      await rappelChargeApi.avancer(rappelId);
      await refreshRappelsData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // ── Action : Valider une vidange effectuée (même logique que RappelsVidangeSection) ──
  const handleReinitVidange = async (params: { kmSaisi: number; cout: number; dateVidange: Date; notes: string; intervalleKm: number }) => {
    if (!reinitRappel) return;
    const dateStr = formatLocalDate(params.dateVidange);

    await rappelVidangeApi.reinitialiser(reinitRappel.id, {
      camionId: reinitRappel.camionId,
      kmDerniereVidange: params.kmSaisi,
      intervalleKm: params.intervalleKm,
      dateDerniereVidange: dateStr,
      notes: params.notes || reinitRappel.notes,
    });

    const typeReparation = language === 'fr'
      ? `Vidange — ${new Intl.NumberFormat('fr-FR').format(Math.round(params.kmSaisi))} km`
      : `Oil Change — ${new Intl.NumberFormat('fr-FR').format(Math.round(params.kmSaisi))} km`;

    await reparationApi.create({
      camionId: reinitRappel.camionId,
      date: dateStr,
      typeReparation,
      cout: params.cout,
      notes: params.notes || undefined,
    });

    await refreshRappelsData();
    setReinitRappel(null);
  };

  // ── Totaux annuels ────────────────────────────────────────────────────────
  const totalRevenue = trucks.reduce((s, t) => s + getAnnualTotal(t.revenueBreakdown ?? []), 0);
  const totalFuel = trucks.reduce((s, t) => s + getAnnualTotal(t.fuelCostBreakdown ?? []), 0);
  const totalRepair = trucks.reduce((s, t) => s + getAnnualTotal(t.repairCostBreakdown ?? []), 0);
  const totalCharges = getAnnualTotal(chargeBreakdown);
  const netProfit = totalRevenue - totalFuel - totalRepair - totalCharges;
  const isProfit = netProfit >= 0;

  // ── Données mensuelles (selon l'année sélectionnée par graphique) ────────
  const revenueMonthly = toChartData(
    sumMonthlyArrays(trucks.map(t => getMonthlyAmountsForYear(t.revenueBreakdown ?? [], revenueYear))),
    monthLabels,
  );
  const fuelMonthly = toChartData(
    sumMonthlyArrays(trucks.map(t => getMonthlyAmountsForYear(t.fuelCostBreakdown ?? [], fuelYear))),
    monthLabels,
  );
  const repairMonthly = toChartData(
    sumMonthlyArrays(trucks.map(t => getMonthlyAmountsForYear(t.repairCostBreakdown ?? [], repairYear))),
    monthLabels,
  );
  const chargesMonthly = toChartData(
    getMonthlyAmountsForYear(chargeBreakdown, chargeYear),
    monthLabels,
  );

  // ── Par camion ───────────────────────────────────────────────────────────
  const truckGains = trucks.map(truck => ({
    matricule: truck.matricule,
    value:
      getAnnualTotal(truck.revenueBreakdown ?? [])
      - getAnnualTotal(truck.fuelCostBreakdown ?? [])
      - getAnnualTotal(truck.repairCostBreakdown ?? [])
      - getAnnualTotal(truck.chargeCostBreakdown ?? []),
  })).sort((a, b) => b.value - a.value);

  // ── Rappels unifiés ─────────────────────────────────────────────────────
  const unifiedRappels: UnifiedRappel[] = [
    ...chargeRappels.filter(r => r.actif).map((r): UnifiedRappel => {
      const templateRemorque = r.templateId ? templateMap[r.templateId]?.remorqueMatricule : null;
      return {
        key: `c-${r.id}`,
        type: 'CHARGE',
        label: r.templateLibelle,
        matricule: r.camionMatricule,
        chauffeur: r.chauffeurNom ?? null,
        remorque: templateRemorque ?? null,
        group: statusGroupFromCharge(r.statut),
        sortValue: r.joursRestants,
        remaining: r.statut === 'DEPASSE'
          ? (language === 'fr' ? `${Math.abs(r.joursRestants)} j de retard` : `${Math.abs(r.joursRestants)} d late`)
          : (language === 'fr' ? `Dans ${r.joursRestants} j` : `In ${r.joursRestants} d`),
        due: r.prochaineDate,
        raw: r,
      };
    }),
    ...vidangeRappels.filter(r => r.actif).map((r): UnifiedRappel => {
      const truckInfo = r.camionMatricule ? truckMap[r.camionMatricule] : null;
      return {
        key: `v-${r.id}`,
        type: 'VIDANGE',
        label: language === 'fr' ? 'Vidange' : 'Oil change',
        matricule: r.camionMatricule,
        chauffeur: truckInfo?.chauffeurNom ?? null,
        remorque: truckInfo?.remorqueMatricule ?? null,
        group: statusGroupFromVidange(r.statut),
        sortValue: r.kmRestants ?? 999999,
        remaining: r.kmRestants == null
          ? '—'
          : r.kmRestants < 0
            ? (language === 'fr' ? `+${fmtKm(Math.abs(r.kmRestants))} dépassé` : `+${fmtKm(Math.abs(r.kmRestants))} overdue`)
            : fmtKm(r.kmRestants),
        due: fmtKm(r.kmProchaineVidange),
        raw: r,
      };
    }),
  ].sort((a, b) => {
    const rank = (g: StatusGroup) => (g === 'OVERDUE' ? 0 : g === 'SOON' ? 1 : 2);
    const diff = rank(a.group) - rank(b.group);
    if (diff !== 0) return diff;
    return a.sortValue - b.sortValue;
  });

  const overdueCount = unifiedRappels.filter(r => r.group === 'OVERDUE').length;
  const soonCount = unifiedRappels.filter(r => r.group === 'SOON').length;

  // ── KPI config ──────────────────────────────────────────────────────────
  const kpis = [
    {
      icon: TrendingUp,
      title: language === 'fr' ? 'Chiffre d\'affaires' : 'Total Revenue',
      subtitle: language === 'fr' ? 'Annuel — tous camions' : 'Annual — all trucks',
      value: fmtCurrency(totalRevenue),
      unit: 'TND',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      accentLine: 'bg-emerald-500',
      valueColor: 'text-emerald-600',
      prefix: '',
    },
    {
      icon: Fuel,
      title: language === 'fr' ? 'Coût carburant' : 'Fuel Cost',
      subtitle: language === 'fr' ? 'Annuel — tous camions' : 'Annual — all trucks',
      value: fmtCurrency(totalFuel),
      unit: 'TND',
      iconColor: darkMode ? 'text-orange-600' : 'text-primary',
      iconBg: darkMode ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-primary/10',
      accentLine: darkMode ? 'bg-orange-500' : 'bg-primary',
      valueColor: darkMode ? 'text-orange-600' : 'text-primary',
      prefix: '',
    },
    {
      icon: Wrench,
      title: language === 'fr' ? 'Coût réparations' : 'Repair Cost',
      subtitle: language === 'fr' ? 'Annuel — tous camions' : 'Annual — all trucks',
      value: fmtCurrency(totalRepair),
      unit: 'TND',
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50 dark:bg-red-900/20',
      accentLine: 'bg-red-500',
      valueColor: 'text-red-600',
      prefix: '',
    },
    {
      icon: Receipt,
      title: language === 'fr' ? 'Charges (dépenses)' : 'Charges (Expenses)',
      subtitle: language === 'fr' ? 'Annuel — toutes charges' : 'Annual — all expenses',
      value: fmtCurrency(totalCharges),
      unit: 'TND',
      iconColor: 'text-[#A0522D]',
      iconBg: 'bg-[#A0522D]/10 dark:bg-[#A0522D]/20',
      accentLine: 'bg-[#A0522D]',
      valueColor: 'text-[#A0522D]',
      prefix: '',
    },
    {
      icon: BadgeDollarSign,
      title: language === 'fr' ? 'Marge nette d\'exploitation' : 'Net Operating Margin',
      subtitle: language === 'fr' ? 'CA − (Carburant + Réparations + Charges)' : 'Revenue − (Fuel + Repairs + Charges)',
      value: fmtCurrency(Math.abs(netProfit)),
      unit: 'TND',
      iconColor: isProfit ? 'text-emerald-600' : 'text-red-600',
      iconBg: isProfit ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
      accentLine: isProfit ? 'bg-emerald-500' : 'bg-red-500',
      valueColor: isProfit ? 'text-emerald-600' : 'text-red-600',
      prefix: netProfit < 0 ? '−' : '+',
    },
  ];

  if (loading) {
    return <Loading fullScreen text={language === 'fr' ? 'Chargement du tableau de bord...' : 'Loading dashboard...'} />;
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Page intro ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {language === 'fr' ? 'Vue d\'ensemble' : 'Overview'}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {language === 'fr'
            ? `Indicateurs annuels ${new Date().getFullYear()} — tous camions`
            : `Annual indicators ${new Date().getFullYear()} — all trucks`}
        </p>
      </div>

      {/* ── Ligne 1 : 5 KPI ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(({ icon: Icon, title, subtitle, value, unit, iconColor, iconBg, accentLine, valueColor, prefix }) => (
          <div key={title} className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className={`absolute inset-x-0 top-0 h-[2px] ${accentLine}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest leading-snug max-w-[130px]">{title}</p>
                <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </div>
              </div>
              <p className={`text-xl font-bold leading-none ${valueColor}`}>
                {prefix && <span className="mr-0.5">{prefix}</span>}
                {loading ? '—' : value}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-muted-foreground">{unit} · {subtitle}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Ligne 2 : 4 graphiques (Revenue, Fuel, Repairs, Charges) ──── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map(i => <div key={i} className="bg-card rounded-2xl border border-border h-[300px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <ChartCard
            accentColor="#10b981"
            icon={<TrendingUp size={18} className="text-emerald-600" />}
            title={language === 'fr' ? 'Chiffre d\'affaires' : 'Revenue'}
            subtitle={language === 'fr' ? 'En TND par mois' : 'In TND per month'}
            right={<YearSelector years={revenueYears} selected={revenueYear} onChange={setRevenueYear} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueMonthly} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} />
                <YAxis stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
                <Tooltip content={<ChartTooltip color="#10b981" />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            accentColor={fuelColor}
            icon={<Fuel size={18} style={{ color: fuelColor }} />}
            title={language === 'fr' ? 'Coût carburant' : 'Fuel Cost'}
            subtitle={language === 'fr' ? 'En TND par mois' : 'In TND per month'}
            right={<YearSelector years={fuelYears} selected={fuelYear} onChange={setFuelYear} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fuelMonthly} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} />
                <YAxis stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
                <Tooltip content={<ChartTooltip color={fuelColor} />} cursor={{ fill: `${fuelColor}1a` }} />
                <Bar dataKey="value" fill={fuelColor} radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            accentColor="#ef4444"
            icon={<Wrench size={18} className="text-red-600" />}
            title={language === 'fr' ? 'Coût réparations' : 'Repair Cost'}
            subtitle={language === 'fr' ? 'En TND par mois' : 'In TND per month'}
            right={<YearSelector years={repairYears} selected={repairYear} onChange={setRepairYear} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={repairMonthly} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} />
                <YAxis stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
                <Tooltip content={<ChartTooltip color="#ef4444" />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2.5}
                  dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            accentColor={CHARGE_HEX}
            icon={<Receipt size={18} className="text-[#A0522D]" />}
            title={language === 'fr' ? 'Charges (dépenses)' : 'Charges (Expenses)'}
            subtitle={language === 'fr' ? 'En TND par mois' : 'In TND per month'}
            right={<YearSelector years={chargeYears} selected={chargeYear} onChange={setChargeYear} />}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chargesMonthly} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} />
                <YAxis stroke="transparent" tick={{ fill: textColor, fontSize: 10 }} tickFormatter={tickFmt} />
                <Tooltip content={<ChartTooltip color={CHARGE_HEX} />} cursor={{ fill: 'rgba(160,82,45,0.08)' }} />
                <Bar dataKey="value" fill={CHARGE_HEX} radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* ── Ligne 3 : Marge nette par camion (design compact) ──────────── */}
      {loading ? (
        <div className="bg-card rounded-2xl border border-border h-[200px] animate-pulse" />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <TruckIcon size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {language === 'fr' ? 'Marge nette par camion' : 'Net Margin per Truck'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'fr' ? `Année ${new Date().getFullYear()}` : `Year ${new Date().getFullYear()}`}
                  </p>
                </div>
              </div>

              {truckGains.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40">
                    <ArrowUpRight size={12} className="text-emerald-600" />
                    <span className="text-[11px] font-bold text-foreground">{truckGains[0]?.matricule}</span>
                    <span className="text-[11px] font-bold text-emerald-600">
                      +{fmtCurrency(Math.abs(truckGains[0]?.value ?? 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/40">
                    <ArrowDownRight size={12} className="text-red-600" />
                    <span className="text-[11px] font-bold text-foreground">
                      {truckGains[truckGains.length - 1]?.matricule}
                    </span>
                    <span className={`text-[11px] font-bold ${truckGains[truckGains.length - 1]?.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {truckGains[truckGains.length - 1]?.value >= 0 ? '+' : '−'}
                      {fmtCurrency(Math.abs(truckGains[truckGains.length - 1]?.value ?? 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border">
                    <span className="text-[11px] font-bold text-foreground">
                      {truckGains.filter(t => t.value >= 0).length}/{truckGains.length}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {language === 'fr' ? 'rentables' : 'profitable'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {truckGains.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <TruckIcon size={20} className="opacity-30" />
                <p className="text-xs">{language === 'fr' ? 'Aucun camion enregistré' : 'No trucks on record'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                {truckGains.map((truck, idx) => (
                  <NetMarginRankRow
                    key={truck.matricule}
                    rank={idx + 1}
                    matricule={truck.matricule}
                    value={truck.value}
                    maxAbs={Math.max(1, ...truckGains.map(t => Math.abs(t.value)))}
                    language={language}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Ligne 4 : Tableau des rappels (pleine largeur) ────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Bell size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {language === 'fr' ? 'Rappels & Échéances' : 'Reminders & Due Dates'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'fr' ? 'Charges fixes et vidanges à venir' : 'Fixed charges and upcoming oil changes'}
              </p>
            </div>
          </div>
          {(overdueCount > 0 || soonCount > 0) && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${overdueCount > 0
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700'}`}>
              <AlertTriangle size={9} />
              {overdueCount > 0
                ? `${overdueCount} ${language === 'fr' ? 'en retard' : 'overdue'}`
                : `${soonCount} ${language === 'fr' ? 'proche(s)' : 'soon'}`}
            </span>
          )}
        </div>

        {loading ? (
          <div className="px-6 pb-6 space-y-2 animate-pulse">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-secondary rounded-xl" />)}
          </div>
        ) : unifiedRappels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
            <Bell size={26} className="opacity-30" />
            <p className="text-sm">{language === 'fr' ? 'Aucun rappel actif' : 'No active reminders'}</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[440px] custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="bg-secondary border-b border-border">
                  {[
                    language === 'fr' ? 'Libellé' : 'Label',
                    language === 'fr' ? 'Camion' : 'Truck',
                    language === 'fr' ? 'Chauffeur' : 'Driver',
                    language === 'fr' ? 'Remorque' : 'Trailer',
                    language === 'fr' ? 'Restant' : 'Remaining',
                    language === 'fr' ? 'Actions' : 'Actions',
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {unifiedRappels.map((r) => {
                  const cfg = groupConfig(r.group, language);
                  const isCharge = r.type === 'CHARGE';
                  return (
                    <tr key={r.key} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isCharge ? 'bg-[#A0522D]/10' : 'bg-primary/10'}`}>
                            {isCharge
                              ? <Receipt size={11} className="text-[#A0522D]" />
                              : <Gauge size={11} className="text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate max-w-[140px]">{r.label}</p>
                            <p className="text-[10px] text-muted-foreground">{r.due}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground/80 whitespace-nowrap">
                        {r.matricule ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground/80 whitespace-nowrap">
                        {r.chauffeur ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground/80 whitespace-nowrap">
                        {r.remorque ?? '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap ${cfg.text}`}>
                        {r.remaining}
                      </td>
                      <td className="px-4 py-2.5">
                        {isCharge ? (
                          <button
                            onClick={() => handleAvancerCharge((r.raw as RappelChargeResponse).id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 transition-all cursor-pointer text-[10px] font-bold whitespace-nowrap"
                            title={language === 'fr' ? 'Avancer (cycle suivant)' : 'Advance (next cycle)'}
                          >
                            <Play size={11} className="fill-current" />
                            {language === 'fr' ? 'Avancer' : 'Advance'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setReinitRappel(r.raw as RappelVidangeResponse)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 dark:bg-amber-900/20 hover:bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30 dark:border-amber-700/40 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <RotateCcw size={11} />{language === 'fr' ? 'Faite' : 'Done'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal "Faite" (vidange) — identique à la page Réparations ──── */}
      {reinitRappel && (
        <ReinitVidangeModal
          rappel={reinitRappel}
          camions={trucks}
          language={language}
          onClose={() => setReinitRappel(null)}
          onConfirm={handleReinitVidange}
        />
      )}
    </div>
  );
}
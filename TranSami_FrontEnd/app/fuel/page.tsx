'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import {
  prixCarburantApi,
  bonCarburantApi,
  stationApi,
  camionApi,
} from '@/lib/api-client';
import type {
  PrixCarburantResponse,
  BonCarburantResponse,
  StationResponse,
  CamionResponse,
} from '@/lib/api-client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Fuel, DollarSign, Activity, MapPin,
  Plus, Filter, X, Calendar, Truck,
  FileDown, Loader2, Edit2, Trash2,
  ArrowUpRight, FileText, Route, Droplet,
} from 'lucide-react';
import PriceConfig from './components/PriceConfig';
import AddBonCarburantModal from './components/AddBonCarburantModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

const inp =
  'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const lbl =
  'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;

// -- Date helpers ------------------------------------------------------------
/** Formate un objet Date en "YYYY-MM-DD" en heure locale (sans décalage UTC) */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse une chaîne "YYYY-MM-DD" en Date locale (sans décalage UTC) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface StatCardProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accentLine: string; iconBg: string; valueColor: string;
}

function StatCard({ label, value, sub, icon, accentLine, iconBg, valueColor }: StatCardProps) {
  return (
    <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className={`absolute inset-x-0 top-0 h-[2px] ${accentLine}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <p className={lbl}>{label}</p>
          <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
        </div>
        <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <ArrowUpRight size={11} />{sub}
          </p>
        )}
      </div>
    </div>
  );
}

function DeleteModal({ bon, language, onClose, onConfirm }: {
  bon: BonCarburantResponse; language: string; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={16} className="text-destructive" /></div>
            <h2 className="text-base font-bold text-foreground">
              {language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="px-7 py-6">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {language === 'fr'
              ? 'Êtes-vous sûr de vouloir supprimer ce bon de carburant ? Cette action est irréversible.'
              : 'Are you sure you want to delete this fuel receipt? This action cannot be undone.'}
          </p>
          <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
            <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Bon' : 'Receipt'} #{bon.numero ?? bon.id}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bon.date} à <span className="text-primary font-semibold">{Number(bon.montantTotal).toLocaleString()} TND</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all cursor-pointer text-sm">
            {language === 'fr' ? 'Supprimer' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsoBadge({ statut, value }: { statut: string; value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const colorMap: Record<string, string> = { BONNE: 'text-emerald-600', MOYENNE: 'text-yellow-600', MAUVAISE: 'text-red-600' };
  return (
    <span className={`text-xs font-semibold ${colorMap[statut] ?? 'text-foreground'}`}>
      {value.toFixed(1)} <span className="text-muted-foreground font-normal">L/100</span>
    </span>
  );
}

export default function FuelPage() {
  const { language, darkMode } = useApp();
  const [prices, setPrices] = useState<PrixCarburantResponse | null>(null);
  const [bons, setBons] = useState<BonCarburantResponse[]>([]);
  const [stations, setStations] = useState<StationResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BonCarburantResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BonCarburantResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    dateStart: null as Date | null,
    dateEnd: null as Date | null,
    numero: '',
    stationId: 'all',
    camionId: 'all',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pricesData, bonsData, stationsData, camionsData] = await Promise.all([
        prixCarburantApi.get().catch(() => null),
        bonCarburantApi.getAll(),
        stationApi.getAll(),
        camionApi.getAll(),
      ]);
      setPrices(pricesData); setBons(bonsData); setStations(stationsData); setCamions(camionsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally { setLoading(false); }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // -- KPI : utilise parseLocalDate pour éviter le décalage UTC -------------
  const bonsThisMonth = bons.filter(b => {
    const d = parseLocalDate(b.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalCostMonth = bonsThisMonth.reduce((sum, b) => sum + (Number(b.montantTotal) ?? 0), 0);
  const bonsWithConsumption = bons.filter(b => b.consommationReelle != null);
  const avgConsumption = bonsWithConsumption.length > 0
    ? bonsWithConsumption.reduce((sum, b) => sum + (b.consommationReelle || 0), 0) / bonsWithConsumption.length
    : 0;
  const stationUsage = new Map<number, number>();
  bons.forEach(b => stationUsage.set(b.stationId, (stationUsage.get(b.stationId) || 0) + 1));
  const mostUsedStationId = Array.from(stationUsage.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostUsedStation = stations.find(s => s.id === mostUsedStationId);

  // -- Filtered à dateEnd inclusive, utilise parseLocalDate -----------------
  const filtered = useMemo(() => bons.filter(b => {
    if (filters.stationId !== 'all' && b.stationId !== Number(filters.stationId)) return false;
    if (filters.camionId !== 'all' && b.camionId !== Number(filters.camionId)) return false;
    if (filters.numero && !String(b.numero ?? b.id).toLowerCase().includes(filters.numero.toLowerCase())) return false;

    if (filters.dateStart || filters.dateEnd) {
      const d = parseLocalDate(b.date);

      if (filters.dateStart) {
        const start = new Date(
          filters.dateStart.getFullYear(),
          filters.dateStart.getMonth(),
          filters.dateStart.getDate(),
        );
        if (d < start) return false;
      }
      if (filters.dateEnd) {
        const end = new Date(
          filters.dateEnd.getFullYear(),
          filters.dateEnd.getMonth(),
          filters.dateEnd.getDate(),
        );
        if (d > end) return false;
      }
    }
    return true;
  }).sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()),
    [bons, filters]);

  const hasFilters = filters.stationId !== 'all' || filters.camionId !== 'all' ||
    filters.numero !== '' || filters.dateStart !== null || filters.dateEnd !== null;

  const clearFilters = () => {
    setFilters({ dateStart: null, dateEnd: null, numero: '', stationId: 'all', camionId: 'all' });
    setExportError(null);
  };

  const canExport = !!(filters.dateStart && filters.dateEnd);

  // -- Export à utiliser formatLocalDate au lieu de toISOString --------------
  const handleExportPdf = async () => {
    setExportError(null);
    if (!filters.dateStart || !filters.dateEnd) {
      setExportError(language === 'fr' ? 'Veuillez sélectionner une période.' : 'Please select a date range.');
      return;
    }
    setExporting(true);
    try {
      await bonCarburantApi.downloadEtat({
        dateFrom: formatLocalDate(filters.dateStart),
        dateTo: formatLocalDate(filters.dateEnd),
        stationId: filters.stationId !== 'all' ? Number(filters.stationId) : null,
        camionId: filters.camionId !== 'all' ? Number(filters.camionId) : null,
      });
    } catch (e: any) {
      setExportError(e.message || 'Erreur lors de la génération du PDF');
    } finally { setExporting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await bonCarburantApi.delete(deleteTarget.id); await loadData(); setDeleteTarget(null); }
    catch (e: any) { alert(e.message); }
  };

  const fuelLabel = (type: string) =>
    type === 'DIESEL_50' ? 'Diesel 50' : type.charAt(0) + type.slice(1).toLowerCase();

  const formatQuantity = (liters: number | null | undefined) =>
    liters == null ? '—' : `${liters.toFixed(1)} L`;

  if (loading) return <ProtectedRoute><Loading fullScreen text={t(language, 'loading')} /></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {language === 'fr' ? 'Gestion du Carburant' : 'Fuel Management'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {bons.length} {language === 'fr' ? 'bon(s) enregistré(s)' : 'receipt(s) on record'}
            </p>
          </div>
          <button onClick={() => { setEditTarget(null); setShowAddModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm shadow-sm">
            <Plus size={16} />{t(language, 'newBon')}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={language === 'fr' ? 'Total bons' : 'Total receipts'} value={bons.length}
            sub={`${bonsThisMonth.length} ${language === 'fr' ? 'ce mois' : 'this month'}`}
            icon={<Fuel size={16} className="text-primary" />} accentLine="bg-primary"
            iconBg="bg-primary/10" valueColor="text-primary" />
          <StatCard label={language === 'fr' ? 'Coût mensuel' : 'Monthly cost'}
            value={`${formatCurrency(totalCostMonth)} TND`}
            icon={<DollarSign size={16} className="text-emerald-600" />} accentLine="bg-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20" valueColor="text-emerald-600" />
          <StatCard label={language === 'fr' ? 'Consommation moy.' : 'Avg consumption'}
            value={avgConsumption > 0 ? `${avgConsumption.toFixed(1)} L/100` : '—'}
            icon={<Activity size={16} className="text-purple-600" />} accentLine="bg-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-900/20" valueColor="text-purple-600" />
          <StatCard label={language === 'fr' ? 'Station favorite' : 'Top station'}
            value={mostUsedStation?.nom ?? '—'}
            sub={mostUsedStation ? `${stationUsage.get(mostUsedStationId!)} ${language === 'fr' ? 'pleins' : 'refills'}` : undefined}
            icon={<MapPin size={16} className={darkMode ? "text-orange-600" : "text-primary"} />}
            accentLine={darkMode ? "bg-orange-500" : "bg-primary"}
            iconBg={darkMode ? "bg-orange-50 dark:bg-orange-900/20" : "bg-primary/10"}
            valueColor={darkMode ? "text-orange-600" : "text-primary"} />
        </div>

        <PriceConfig prices={prices} language={language} onUpdate={loadData} />

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl"><Filter size={14} className="text-primary" /></div>
                <div>
                  <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{language === 'fr' ? 'Affinez les résultats et exportez' : 'Refine results and export'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {filtered.length} {language === 'fr' ? 'résultats' : 'results'}
                </span>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
                    <X size={10} />{language === 'fr' ? 'Réinitialiser' : 'Reset'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date début' : 'Start date'}</span></label>
                <DatePicker
                  selected={filters.dateStart}
                  onChange={(date: Date | null) => { setExportError(null); setFilters(f => ({ ...f, dateStart: date })); }}
                  placeholderText={language === 'fr' ? 'Début' : 'Start'}
                  className={inp}
                  dateFormat="yyyy-MM-dd"
                  isClearable
                />
              </div>
              <div>
                <label className={lbl}>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />{language === 'fr' ? 'Date fin (incluse)' : 'End date (inclusive)'}
                  </span>
                </label>
                <DatePicker
                  selected={filters.dateEnd}
                  onChange={(date: Date | null) => { setExportError(null); setFilters(f => ({ ...f, dateEnd: date })); }}
                  placeholderText={language === 'fr' ? 'Fin (incluse)' : 'End (inclusive)'}
                  className={inp}
                  dateFormat="yyyy-MM-dd"
                  isClearable
                />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><FileText size={10} />{language === 'fr' ? 'N° de bon' : 'Receipt no.'}</span></label>
                <input type="text" className={inp} value={filters.numero}
                  onChange={(e) => setFilters(f => ({ ...f, numero: e.target.value }))}
                  placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'} />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><MapPin size={10} />{language === 'fr' ? 'Station' : 'Station'}</span></label>
                <select className={sel} value={filters.stationId} onChange={(e) => setFilters(f => ({ ...f, stationId: e.target.value }))}>
                  <option value="all">{language === 'fr' ? 'Toutes les stations' : 'All stations'}</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Truck size={10} />{language === 'fr' ? 'Camion' : 'Truck'}</span></label>
                <select className={sel} value={filters.camionId} onChange={(e) => setFilters(f => ({ ...f, camionId: e.target.value }))}>
                  <option value="all">{language === 'fr' ? 'Tous les camions' : 'All trucks'}</option>
                  {camions.map(c => <option key={c.id} value={c.id}>{c.matricule}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-border/50">
              <button onClick={handleExportPdf} disabled={exporting || !canExport}
                title={!canExport ? (language === 'fr' ? 'Sélectionnez une période pour exporter' : 'Select a date range to export') : undefined}
                className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm ${canExport ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}>
                {exporting
                  ? <><Loader2 size={14} className="animate-spin" />{language === 'fr' ? 'Génération...' : 'Generating...'}</>
                  : <><FileDown size={14} />{language === 'fr' ? 'Exporter État Carburant (PDF)' : 'Export Fuel Report (PDF)'}</>}
              </button>
              {!canExport && !exportError && (
                <p className="text-xs text-muted-foreground italic">
                  {language === 'fr' ? "? Sélectionnez une période pour activer l'export" : '? Select a date range to enable export'}
                </p>
              )}
              {exportError && <p className="text-xs text-destructive font-medium">{exportError}</p>}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
          <div className="overflow-x-auto overflow-y-auto max-h-[440px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="bg-secondary border-b border-border">
                  {[
                    language === 'fr' ? 'N° Bon' : 'Receipt No',
                    language === 'fr' ? 'Station' : 'Station',
                    language === 'fr' ? 'Date' : 'Date',
                    language === 'fr' ? 'Camion' : 'Truck',
                    language === 'fr' ? 'Type carburant' : 'Fuel type',
                    language === 'fr' ? 'Quantité (L)' : 'Quantity (L)',
                    language === 'fr' ? 'Montant total' : 'Total amount',
                    language === 'fr' ? 'Kilométrage' : 'Mileage',
                    language === 'fr' ? 'Distance parcourue' : 'Distance driven',
                    language === 'fr' ? 'Consommation' : 'Consumption',
                    language === 'fr' ? 'Actions' : 'Actions',
                  ].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="px-5 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="p-4 bg-secondary rounded-2xl"><Fuel size={28} className="opacity-40" /></div>
                      <p className="text-sm font-medium">{language === 'fr' ? 'Aucun bon de carburant trouvé' : 'No fuel receipts found'}</p>
                    </div>
                  </td></tr>
                ) : filtered.map(bon => (
                  <tr key={bon.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">#{bon.numero ?? bon.id}</span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={11} className="text-orange-500 shrink-0" />
                        <span className="text-xs font-semibold text-foreground">{bon.stationNom ?? `#${bon.stationId}`}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-xs font-medium text-foreground whitespace-nowrap">{bon.date}</td>
                    <td className="px-2 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Truck size={11} className="text-primary shrink-0" />{bon.camionMatricule ?? `#${bon.camionId}`}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30 text-[10px] font-semibold">
                        {fuelLabel(bon.typCarburant)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Droplet size={11} className="text-blue-500 shrink-0" />
                        <span className="text-xs font-semibold text-foreground">{formatQuantity(bon.quantiteLitres)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="text-xs font-bold text-primary">
                        {formatCurrency(Number(bon.montantTotal))} <span className="text-muted-foreground font-normal">TND</span>
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-xs font-medium text-foreground">
                      {bon.kilometrageActuel != null ? `${bon.kilometrageActuel.toLocaleString()} km` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      {bon.distanceParcourue != null && bon.distanceParcourue > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Route size={11} className="text-violet-500 shrink-0" />
                          <span className="text-xs font-semibold text-foreground">
                            {bon.distanceParcourue.toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                          </span>
                          <span className="text-xs text-muted-foreground">km</span>
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3.5"><ConsoBadge statut={bon.consommationStatut} value={bon.consommationReelle} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => { setEditTarget(bon); setShowAddModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteTarget(bon)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AddBonCarburantModal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditTarget(null); }}
        language={language} onSuccess={loadData} editBon={editTarget} />
      {deleteTarget && <DeleteModal bon={deleteTarget} language={language} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
    </ProtectedRoute>
  );
}
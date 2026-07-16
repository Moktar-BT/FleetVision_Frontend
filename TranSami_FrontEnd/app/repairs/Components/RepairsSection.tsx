'use client';

import { useState, useMemo } from 'react';
import {
    Plus, Edit2, Trash2, X, Filter, Wrench,
    Truck, BadgeDollarSign, RefreshCw,
    CheckCircle2, Calendar, FileDown, Loader2, ArrowUpRight,
    Gauge,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { reparationApi } from '@/lib/api-client';
import type {
    ReparationResponse, ReparationRequest, CamionResponse,
} from '@/lib/api-client';

// ─── Styles partagés ─────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;

// Ajout de la classe no-spinner pour les inputs number
const numberInputClass = `${inp} no-spinner`;

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    return new Date(y, m - 1, d);
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accentLine, iconBg, valueColor, sub }: {
    icon: React.ReactNode; label: string; value: string | number;
    accentLine: string; iconBg: string; valueColor: string; sub?: string;
}) {
    return (
        <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className={`absolute inset-x-0 top-0 h-[2px] ${accentLine}`} />
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <p className={lbl}>{label}</p>
                    <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
                </div>
                <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><ArrowUpRight size={11} />{sub}</p>}
            </div>
        </div>
    );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────
function DeleteModal({ repair, language, onClose, onConfirm }: {
    repair: ReparationResponse; language: string; onClose: () => void; onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
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
                        {language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette réparation ?' : 'Are you sure you want to delete this repair?'}
                    </p>
                    <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                        <p className="text-sm font-bold text-foreground">{repair.typeReparation}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {repair.camionMatricule} · {String(repair.date)} · <span className="text-primary font-semibold">{fmt(Number(repair.cout))} TND</span>
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

// ─── RepairModal ──────────────────────────────────────────────────────────────
function RepairModal({ mode, repair, camions, language, onClose, onSave }: {
    mode: 'add' | 'edit'; repair?: ReparationResponse; camions: CamionResponse[];
    language: string; onClose: () => void; onSave: (data: ReparationRequest) => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        camionId: repair ? String(repair.camionId) : (camions[0] ? String(camions[0].id) : ''),
        date: repair ? parseLocalDate(String(repair.date)) : new Date(),
        typeReparation: repair?.typeReparation ?? '',
        cout: repair ? String(repair.cout) : '',
        notes: repair?.notes ?? '',
    });

    const handleSubmit = async () => {
        if (!form.typeReparation || !form.cout || !form.camionId) return;
        setSaving(true);
        try {
            await onSave({
                camionId: Number(form.camionId),
                date: formatLocalDate(form.date),
                typeReparation: form.typeReparation,
                cout: Number(form.cout),
                notes: form.notes || undefined,
            });
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                    <h2 className="text-base font-bold text-foreground">
                        {mode === 'add'
                            ? (language === 'fr' ? 'Nouvelle Réparation' : 'New Repair')
                            : (language === 'fr' ? 'Modifier la Réparation' : 'Edit Repair')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                        <X size={16} className="text-muted-foreground" />
                    </button>
                </div>
                <div className="px-7 py-6 space-y-4">
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Truck size={10} />{language === 'fr' ? 'Camion *' : 'Truck *'}</span></label>
                        <select className={sel} value={form.camionId} onChange={(e) => setForm(f => ({ ...f, camionId: e.target.value }))}>
                            <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                            {camions.map(c => <option key={c.id} value={c.id}>{c.matricule} — {c.nomChauffeur}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date *' : 'Date *'}</span></label>
                        <DatePicker
                            selected={form.date}
                            onChange={(date: Date | null) => setForm(f => ({ ...f, date: date || new Date() }))}
                            className={`${inp} w-full`} wrapperClassName="w-full" popperClassName="z-[9999]"
                            dateFormat="yyyy-MM-dd" placeholderText={language === 'fr' ? 'Sélectionner une date' : 'Select a date'}
                        />
                    </div>
                    <div>
                        <label className={lbl}>{language === 'fr' ? 'Type de réparation *' : 'Repair type *'}</label>
                        <input type="text" className={inp} value={form.typeReparation}
                            onChange={(e) => setForm(f => ({ ...f, typeReparation: e.target.value }))}
                            placeholder={language === 'fr' ? 'Ex: Vidange et filtre' : 'Ex: Oil Change'} />
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><BadgeDollarSign size={10} />{language === 'fr' ? 'Coût (TND) *' : 'Cost (TND) *'}</span></label>
                        <input
                            type="number"
                            className={numberInputClass}
                            value={form.cout}
                            onChange={(e) => setForm(f => ({ ...f, cout: e.target.value }))}
                            placeholder="0.000"
                            min="0"
                            step="0.001"
                            onWheel={(e) => e.preventDefault()}
                        />
                    </div>
                    <div>
                        <label className={lbl}>{language === 'fr' ? 'Notes' : 'Notes'}</label>
                        <textarea className={`${inp} resize-none`} rows={3} value={form.notes}
                            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder={language === 'fr' ? 'Notes supplémentaires...' : 'Additional notes...'} />
                    </div>
                </div>
                <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.typeReparation || !form.cout || !form.camionId}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving && <RefreshCw size={13} className="animate-spin" />}
                        {saving
                            ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
                            : mode === 'add'
                                ? (language === 'fr' ? 'Ajouter' : 'Add')
                                : (language === 'fr' ? 'Enregistrer' : 'Save changes')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RepairsSectionProps {
    repairs: ReparationResponse[];
    camions: CamionResponse[];
    language: string;
    loadRepairs: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function RepairsSection({ repairs, camions, language, loadRepairs }: RepairsSectionProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState<ReparationResponse | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ReparationResponse | null>(null);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        dateStart: null as Date | null,
        dateEnd: null as Date | null,
        camionId: 'all',
        type: '',
        minCost: '',
        maxCost: '',
    });

    // ── Filtrage ──────────────────────────────────────────────────
    const filtered = useMemo(() => repairs.filter(r => {
        if (filters.camionId !== 'all' && r.camionId !== Number(filters.camionId)) return false;
        if (filters.type && !r.typeReparation.toLowerCase().includes(filters.type.toLowerCase())) return false;
        if (filters.minCost && Number(r.cout) < Number(filters.minCost)) return false;
        if (filters.maxCost && Number(r.cout) > Number(filters.maxCost)) return false;
        if (filters.dateStart || filters.dateEnd) {
            const d = parseLocalDate(String(r.date));
            if (filters.dateStart) {
                const s = new Date(filters.dateStart.getFullYear(), filters.dateStart.getMonth(), filters.dateStart.getDate());
                if (d < s) return false;
            }
            if (filters.dateEnd) {
                const e = new Date(filters.dateEnd.getFullYear(), filters.dateEnd.getMonth(), filters.dateEnd.getDate());
                if (d > e) return false;
            }
        }
        return true;
    }).sort((a, b) => parseLocalDate(String(b.date)).getTime() - parseLocalDate(String(a.date)).getTime()),
        [repairs, filters]);

    const totalCostFiltered = filtered.reduce((s, r) => s + Number(r.cout), 0);
    const avgCost = repairs.length ? repairs.reduce((s, r) => s + Number(r.cout), 0) / repairs.length : 0;
    const maxSingleCost = repairs.length ? Math.max(...repairs.map(r => Number(r.cout))) : 0;
    const canExport = !!(filters.dateStart && filters.dateEnd);
    const hasFilters = filters.camionId !== 'all' || filters.type !== '' || filters.minCost !== '' || filters.maxCost !== '' || filters.dateStart !== null || filters.dateEnd !== null;

    // ── CRUD ──────────────────────────────────────────────────────
    const handleAdd = async (data: ReparationRequest) => {
        await reparationApi.create(data);
        await loadRepairs();
        setShowAdd(false);
    };

    const handleEdit = async (data: ReparationRequest) => {
        if (!editTarget) return;
        await reparationApi.update(editTarget.id, data);
        await loadRepairs();
        setEditTarget(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await reparationApi.delete(deleteTarget.id);
            await loadRepairs();
            setDeleteTarget(null);
        } catch (e: any) { alert(e.message); }
    };

    const handleExportPdf = async () => {
        setExportError(null);
        if (!filters.dateStart || !filters.dateEnd) {
            setExportError(language === 'fr' ? 'Sélectionnez une période.' : 'Select a date range.');
            return;
        }
        setExporting(true);
        try {
            await reparationApi.downloadHistorique({
                dateFrom: formatLocalDate(filters.dateStart),
                dateTo: formatLocalDate(filters.dateEnd),
                camionId: filters.camionId !== 'all' ? Number(filters.camionId) : null,
            });
        } catch (e: any) { setExportError(e.message || 'Erreur PDF'); }
        finally { setExporting(false); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        {language === 'fr' ? 'Gestion des Réparations' : 'Repair Management'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {repairs.length} {language === 'fr' ? 'réparation(s) enregistrée(s)' : 'repair(s) on record'}
                    </p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm"
                >
                    <Plus size={16} />{language === 'fr' ? 'Nouvelle Réparation' : 'New Repair'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={<Wrench size={16} className="text-primary" />}
                    label={language === 'fr' ? 'Total réparations' : 'Total repairs'}
                    value={repairs.length} accentLine="bg-primary" iconBg="bg-primary/10" valueColor="text-primary"
                />
                <StatCard
                    icon={<BadgeDollarSign size={16} className="text-red-600" />}
                    label={language === 'fr' ? 'Coût total (filtré)' : 'Total cost (filtered)'}
                    value={`${fmt(totalCostFiltered)} TND`} accentLine="bg-red-500"
                    iconBg="bg-red-50 dark:bg-red-900/20" valueColor="text-red-600"
                />
                <StatCard
                    icon={<CheckCircle2 size={16} className="text-emerald-600" />}
                    label={language === 'fr' ? 'Coût moyen' : 'Average cost'}
                    value={`${fmt(avgCost)} TND`} accentLine="bg-emerald-500"
                    iconBg="bg-emerald-50 dark:bg-emerald-900/20" valueColor="text-emerald-600"
                />
            </div>

            {/* Filtres */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-xl"><Filter size={14} className="text-primary" /></div>
                            <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />{filtered.length} {language === 'fr' ? 'résultats' : 'results'}
                            </span>
                            {hasFilters && (
                                <button
                                    onClick={() => { setExportError(null); setFilters({ dateStart: null, dateEnd: null, camionId: 'all', type: '', minCost: '', maxCost: '' }); }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                                >
                                    <X size={10} />{language === 'fr' ? 'Réinitialiser' : 'Reset'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date fin' : 'End date'}</span></label>
                            <DatePicker
                                selected={filters.dateEnd}
                                onChange={(date: Date | null) => { setExportError(null); setFilters(f => ({ ...f, dateEnd: date })); }}
                                placeholderText={language === 'fr' ? 'Fin' : 'End'}
                                className={inp}
                                dateFormat="yyyy-MM-dd"
                                isClearable
                            />
                        </div>
                        <div>
                            <label className={lbl}><span className="flex items-center gap-1"><Truck size={10} />{language === 'fr' ? 'Camion' : 'Truck'}</span></label>
                            <select className={sel} value={filters.camionId} onChange={(e) => setFilters(f => ({ ...f, camionId: e.target.value }))}>
                                <option value="all">{language === 'fr' ? 'Tous les camions' : 'All trucks'}</option>
                                {camions.map(c => <option key={c.id} value={c.id}>{c.matricule}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>{language === 'fr' ? 'Type' : 'Type'}</label>
                            <input type="text" className={inp} placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                                value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={lbl}>{language === 'fr' ? 'Coût min (TND)' : 'Min cost (TND)'}</label>
                            <input
                                type="number"
                                className={numberInputClass}
                                placeholder="0"
                                value={filters.minCost}
                                onChange={(e) => setFilters(f => ({ ...f, minCost: e.target.value }))}
                                onWheel={(e) => e.preventDefault()}
                            />
                        </div>
                        <div>
                            <label className={lbl}>{language === 'fr' ? 'Coût max (TND)' : 'Max cost (TND)'}</label>
                            <input
                                type="number"
                                className={numberInputClass}
                                placeholder="∞"
                                value={filters.maxCost}
                                onChange={(e) => setFilters(f => ({ ...f, maxCost: e.target.value }))}
                                onWheel={(e) => e.preventDefault()}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                        <button
                            onClick={handleExportPdf}
                            disabled={exporting || !canExport}
                            className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm ${canExport ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
                        >
                            {exporting
                                ? <><Loader2 size={14} className="animate-spin" />{language === 'fr' ? 'Génération...' : 'Generating...'}</>
                                : <><FileDown size={14} />{language === 'fr' ? 'Exporter PDF' : 'Export PDF'}</>}
                        </button>
                        {exportError && <p className="text-xs text-destructive font-medium">{exportError}</p>}
                        {!canExport && !exportError && (
                            <p className="text-xs text-muted-foreground italic">{language === 'fr' ? '← Sélectionnez une période' : '← Select a date range'}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tableau */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card z-10">
                            <tr className="bg-secondary border-b border-border">
                                {[
                                    language === 'fr' ? 'Date' : 'Date',
                                    language === 'fr' ? 'Camion' : 'Truck',
                                    language === 'fr' ? 'Type' : 'Type',
                                    language === 'fr' ? 'Coût' : 'Cost',
                                    language === 'fr' ? 'Notes' : 'Notes',
                                    language === 'fr' ? 'Actions' : 'Actions',
                                ].map(h => (
                                    <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <div className="p-4 bg-secondary rounded-2xl"><Wrench size={28} className="opacity-40" /></div>
                                            <p className="text-sm font-medium">{language === 'fr' ? 'Aucune réparation trouvée' : 'No repairs found'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(r => {
                                const pct = maxSingleCost > 0 ? (Number(r.cout) / maxSingleCost) * 100 : 0;
                                const isVidange = r.typeReparation.toLowerCase().startsWith('vidange') || r.typeReparation.toLowerCase().startsWith('oil change');
                                return (
                                    <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-4 py-3.5 text-xs font-medium text-foreground whitespace-nowrap">{String(r.date)}</td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                                                <Truck size={10} />{r.camionMatricule}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                {isVidange && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wide">
                                                        <Gauge size={9} className="mr-0.5" />
                                                        {language === 'fr' ? 'vidange' : 'oil'}
                                                    </span>
                                                )}
                                                <span className="text-xs font-semibold text-foreground">{r.typeReparation}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1 min-w-[110px]">
                                                <span className="text-xs font-bold text-primary">{fmt(Number(r.cout))} TND</span>
                                                <div className="h-1 bg-secondary rounded-full overflow-hidden w-20">
                                                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">{r.notes || '—'}</td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-0.5">
                                                <button onClick={() => setEditTarget(r)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showAdd && (
                <RepairModal mode="add" camions={camions} language={language} onClose={() => setShowAdd(false)} onSave={handleAdd} />
            )}
            {editTarget && (
                <RepairModal mode="edit" repair={editTarget} camions={camions} language={language} onClose={() => setEditTarget(null)} onSave={handleEdit} />
            )}
            {deleteTarget && (
                <DeleteModal repair={deleteTarget} language={language} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
            )}
        </div>
    );
}
'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import {
    Plus,
    Edit2,
    Trash2,
    X,
    DollarSign,
    AlertTriangle,
    Truck,
    Users,
    Box,
    Filter,
    Calendar,
    FileDown,
    Loader2,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
    chargeApi,
    ChargeResponse,
    ChargeTemplateResponse,
    TypeCharge,
    StatutCharge,
    CamionResponse,
    ChauffeurResponse,
    RemorqueResponse,
} from '@/lib/api-client';
import { inp, lbl, sel, formatLocalDate, getCategoryLabel, getRappelLabel, getTemplateLabel, getChargeLabel, fmtTND } from './utils';

// Ajout de la classe pour les inputs number
const numberInputClass = `${inp} no-spinner`;

const TrailerIcon = Box;

const OTHER_VALUE = '__OTHER__';
const ALL_VALUE = 'ALL';

interface DepensesSectionProps {
    charges: ChargeResponse[];
    templates: ChargeTemplateResponse[];
    camions: CamionResponse[];
    chauffeurs: ChauffeurResponse[];
    remorques: RemorqueResponse[];
    language: string;
    loadAllData: () => Promise<void>;
    onDeleteClick: (id: number) => void;
}

export default function DepensesSection({
    charges,
    templates,
    camions,
    chauffeurs,
    remorques,
    language,
    loadAllData,
    onDeleteClick,
}: DepensesSectionProps) {
    const { darkMode } = useApp();
    // ─── Filtres ──────────────────────────────────────────────────────
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | StatutCharge>('ALL');
    const [typeFilter, setTypeFilter] = useState<'ALL' | TypeCharge>('ALL');

    // ─── Filtres entités ───────────────────────────────────────────
    const [filterCamion, setFilterCamion] = useState<string>(ALL_VALUE);
    const [filterChauffeur, setFilterChauffeur] = useState<string>(ALL_VALUE);
    const [filterRemorque, setFilterRemorque] = useState<string>(ALL_VALUE);

    // ─── Export ──────────────────────────────────────────────────────
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    // ─── Modal & form ────────────────────────────────────────────────────
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseFormData, setExpenseFormData] = useState({
        id: 0,
        templateId: '',
        date: new Date(),
        montant: '',
        statut: 'EN_ATTENTE' as StatutCharge,
        notes: '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const NO_ENTITY_LABEL = language === 'fr' ? '—' : '—';

    const getRemorqueMatricule = (c: ChargeResponse): string | null => {
        const template = templates.find((t) => t.id === c.templateId);
        return template?.remorqueMatricule ?? null;
    };

    const sortedCamions = useMemo(
        () => [...camions].sort((a, b) => a.matricule.localeCompare(b.matricule)),
        [camions]
    );
    const sortedChauffeurs = useMemo(
        () => [...chauffeurs].sort((a, b) => a.nomComplet.localeCompare(b.nomComplet)),
        [chauffeurs]
    );
    const sortedRemorques = useMemo(
        () => [...remorques].sort((a, b) => a.matricule.localeCompare(b.matricule)),
        [remorques]
    );

    // ─── Filtrage ────────────────────────────────────────────────────────
    const filteredCharges = useMemo(() => {
        return charges.filter((c) => {
            if (dateFrom) {
                const cDate = new Date(c.date);
                cDate.setHours(0, 0, 0, 0);
                const fDate = new Date(dateFrom);
                fDate.setHours(0, 0, 0, 0);
                if (cDate < fDate) return false;
            }
            if (dateTo) {
                const cDate = new Date(c.date);
                cDate.setHours(0, 0, 0, 0);
                const tDate = new Date(dateTo);
                tDate.setHours(0, 0, 0, 0);
                if (cDate > tDate) return false;
            }
            if (statusFilter !== 'ALL' && c.statut !== statusFilter) return false;
            if (typeFilter !== 'ALL' && c.templateType !== typeFilter) return false;

            if (filterCamion !== ALL_VALUE) {
                if (filterCamion === OTHER_VALUE) {
                    if (c.camionMatricule) return false;
                } else {
                    if (c.camionMatricule !== filterCamion) return false;
                }
            }

            if (filterChauffeur !== ALL_VALUE) {
                if (filterChauffeur === OTHER_VALUE) {
                    if (c.chauffeurNom) return false;
                } else {
                    if (c.chauffeurNom !== filterChauffeur) return false;
                }
            }

            if (filterRemorque !== ALL_VALUE) {
                const remorqueMatricule = getRemorqueMatricule(c);
                if (filterRemorque === OTHER_VALUE) {
                    if (remorqueMatricule) return false;
                } else {
                    if (remorqueMatricule !== filterRemorque) return false;
                }
            }

            return true;
        });
    }, [charges, dateFrom, dateTo, statusFilter, typeFilter, filterCamion, filterChauffeur, filterRemorque, templates]);

    // ─── KPIs ────────────────────────────────────────────────────────────
    const monthlyTotal = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return charges
            .filter((c) => {
                const d = new Date(c.date);
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth && c.statut === 'PAYEE';
            })
            .reduce((sum, c) => sum + c.montant, 0);
    }, [charges]);

    const yearlyTotal = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        return charges
            .filter((c) => {
                const d = new Date(c.date);
                return d.getFullYear() === currentYear && c.statut === 'PAYEE';
            })
            .reduce((sum, c) => sum + c.montant, 0);
    }, [charges]);

    const pendingCount = useMemo(() => {
        return charges.filter((c) => c.statut === 'EN_ATTENTE').length;
    }, [charges]);

    // ─── CRUD actions ────────────────────────────────────────────────────
    const handleNewExpenseClick = () => {
        setFormError(null);
        setExpenseFormData({
            id: 0,
            templateId: templates[0]?.id ? String(templates[0].id) : '',
            date: new Date(),
            montant: templates[0]?.montantReference ? String(templates[0].montantReference) : '',
            statut: 'EN_ATTENTE',
            notes: '',
        });
        setShowExpenseModal(true);
    };

    const handleExpenseTemplateChange = (templateIdStr: string) => {
        const template = templates.find((t) => String(t.id) === templateIdStr);
        setExpenseFormData({
            ...expenseFormData,
            templateId: templateIdStr,
            montant: template?.montantReference ? String(template.montantReference) : '',
        });
    };

    const handleExpenseSave = async () => {
        setFormError(null);
        if (!expenseFormData.templateId || !expenseFormData.date || !expenseFormData.montant) {
            setFormError(language === 'fr' ? 'Champs obligatoires manquants' : 'Missing required fields');
            return;
        }
        const payload = {
            templateId: Number(expenseFormData.templateId),
            date: formatLocalDate(expenseFormData.date),
            montant: parseFloat(expenseFormData.montant),
            statut: expenseFormData.statut,
            notes: expenseFormData.notes || null,
        };
        try {
            if (expenseFormData.id === 0) {
                await chargeApi.create(payload);
            } else {
                await chargeApi.update(expenseFormData.id, payload);
            }
            await loadAllData();
            setShowExpenseModal(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleEditExpenseClick = (c: ChargeResponse) => {
        setFormError(null);
        setExpenseFormData({
            id: c.id,
            templateId: String(c.templateId),
            date: new Date(c.date),
            montant: String(c.montant),
            statut: c.statut,
            notes: c.notes || '',
        });
        setShowExpenseModal(true);
    };

    const handleToggleExpenseStatus = async (id: number, currentStatut: StatutCharge) => {
        try {
            const nextStatut: StatutCharge = currentStatut === 'PAYEE' ? 'EN_ATTENTE' : 'PAYEE';
            await chargeApi.updateStatut(id, nextStatut);
            await loadAllData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erreur');
        }
    };

    // ─── Réinitialisation des filtres ──────────────────────────────────
    const resetFilters = () => {
        setDateFrom(null);
        setDateTo(null);
        setStatusFilter('ALL');
        setTypeFilter('ALL');
        setFilterCamion(ALL_VALUE);
        setFilterChauffeur(ALL_VALUE);
        setFilterRemorque(ALL_VALUE);
        setExportError(null);
    };

    // ─── Export PDF ──────────────────────────────────────────────────────
    const handleExportPdf = async () => {
        setExportError(null);
        if (!dateFrom || !dateTo) {
            setExportError(
                language === 'fr'
                    ? 'Veuillez sélectionner une période (dates début et fin).'
                    : 'Please select a date range (start and end dates).'
            );
            return;
        }
        setExporting(true);
        try {
            const params: any = {
                dateFrom: formatLocalDate(dateFrom),
                dateTo: formatLocalDate(dateTo),
            };

            if (statusFilter !== 'ALL') params.statut = statusFilter;
            if (typeFilter !== 'ALL') params.type = typeFilter;

            if (filterCamion !== ALL_VALUE) {
                params.camionMatricule = filterCamion;
            }
            if (filterChauffeur !== ALL_VALUE) {
                params.chauffeurNom = filterChauffeur;
            }
            if (filterRemorque !== ALL_VALUE) {
                params.remorqueMatricule = filterRemorque;
            }

            await chargeApi.downloadEtat(params);
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'Erreur lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* ─── KPIs ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500" />
                    <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                            <p className={lbl}>{language === 'fr' ? 'Dépenses ce mois' : 'Spent This Month'}</p>
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                                <DollarSign size={16} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold leading-none text-emerald-600">{fmtTND(monthlyTotal)} TND</p>
                    </div>
                </div>

                <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500" />
                    <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                            <p className={lbl}>{language === 'fr' ? 'Dépenses cette année' : 'Spent This Year'}</p>
                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                <DollarSign size={16} className="text-blue-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold leading-none text-blue-600">{fmtTND(yearlyTotal)} TND</p>
                    </div>
                </div>

                <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className={`absolute inset-x-0 top-0 h-[2px] ${darkMode ? 'bg-amber-500' : 'bg-primary'}`} />
                    <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                            <p className={lbl}>{language === 'fr' ? 'Charges En Attente' : 'Pending Expenses'}</p>
                            <div className={`p-2 rounded-xl ${darkMode ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/10'}`}>
                                <AlertTriangle size={16} className={darkMode ? 'text-amber-600' : 'text-primary'} />
                            </div>
                        </div>
                        <p className={`text-2xl font-bold leading-none ${darkMode ? 'text-amber-600' : 'text-primary'}`}>{pendingCount}</p>
                    </div>
                </div>
            </div>

            {/* ─── Header avec bouton "Nouvelle Dépense" ──────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        {language === 'fr' ? 'Dépenses' : 'Expenses'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {charges.length} {language === 'fr' ? 'charge(s) enregistrée(s)' : 'expense(s) on record'}
                    </p>
                </div>
                <button
                    onClick={handleNewExpenseClick}
                    className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm"
                >
                    <Plus size={16} />
                    {language === 'fr' ? 'Nouvelle Dépense' : 'New Expense'}
                </button>
            </div>

            {/* ─── Panneau de filtres ─────────────────────────────────────── */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />

                <div className="p-5 space-y-4">
                    {/* En-tête des filtres */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Filter size={14} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground">
                                    {language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {language === 'fr' ? 'Affinez les résultats' : 'Refine results'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {filteredCharges.length} {language === 'fr' ? 'résultats' : 'results'}
                            </span>
                            <button
                                onClick={resetFilters}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <X size={10} />
                                {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                            </button>
                        </div>
                    </div>

                    {/* Première ligne : Dates, Statut, Type */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className={lbl}>
                                <span className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    {language === 'fr' ? 'Date début' : 'Start date'}
                                </span>
                            </label>
                            <DatePicker
                                selected={dateFrom}
                                onChange={(date: Date | null) => setDateFrom(date)}
                                className={inp}
                                placeholderText="YYYY-MM-DD"
                                dateFormat="yyyy-MM-dd"
                                isClearable
                            />
                        </div>
                        <div>
                            <label className={lbl}>
                                <span className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    {language === 'fr' ? 'Date fin' : 'End date'}
                                </span>
                            </label>
                            <DatePicker
                                selected={dateTo}
                                onChange={(date: Date | null) => setDateTo(date)}
                                className={inp}
                                placeholderText="YYYY-MM-DD"
                                dateFormat="yyyy-MM-dd"
                                isClearable
                            />
                        </div>
                        <div>
                            <label className={lbl}>Statut</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className={sel}
                            >
                                <option value="ALL">{language === 'fr' ? 'Tous' : 'All'}</option>
                                <option value="EN_ATTENTE">{language === 'fr' ? 'En attente' : 'Pending'}</option>
                                <option value="PAYEE">{language === 'fr' ? 'Payée' : 'Paid'}</option>
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as any)}
                                className={sel}
                            >
                                <option value="ALL">{language === 'fr' ? 'Tous' : 'All'}</option>
                                <option value="FIXE">FIXE</option>
                                <option value="VARIABLE">VARIABLE</option>
                            </select>
                        </div>
                    </div>

                    {/* Deuxième ligne : Filtres entités */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                        <div>
                            <label className={lbl}>
                                <span className="flex items-center gap-1">
                                    <Truck size={10} />
                                    Camion
                                </span>
                            </label>
                            <select
                                value={filterCamion}
                                onChange={(e) => setFilterCamion(e.target.value)}
                                className={sel}
                            >
                                <option value={ALL_VALUE}>{language === 'fr' ? 'Tous les camions' : 'All trucks'}</option>
                                <option value={OTHER_VALUE}>{language === 'fr' ? 'Autre (sans camion)' : 'Other (no truck)'}</option>
                                {sortedCamions.map((cam) => (
                                    <option key={cam.id} value={cam.matricule}>
                                        {cam.matricule}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>
                                <span className="flex items-center gap-1">
                                    <Users size={10} />
                                    Chauffeur
                                </span>
                            </label>
                            <select
                                value={filterChauffeur}
                                onChange={(e) => setFilterChauffeur(e.target.value)}
                                className={sel}
                            >
                                <option value={ALL_VALUE}>{language === 'fr' ? 'Tous les chauffeurs' : 'All drivers'}</option>
                                <option value={OTHER_VALUE}>{language === 'fr' ? 'Autre (sans chauffeur)' : 'Other (no driver)'}</option>
                                {sortedChauffeurs.map((ch) => (
                                    <option key={ch.id} value={ch.nomComplet}>
                                        {ch.nomComplet}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={lbl}>
                                <span className="flex items-center gap-1">
                                    <TrailerIcon size={10} />
                                    Remorque
                                </span>
                            </label>
                            <select
                                value={filterRemorque}
                                onChange={(e) => setFilterRemorque(e.target.value)}
                                className={sel}
                            >
                                <option value={ALL_VALUE}>{language === 'fr' ? 'Toutes les remorques' : 'All trailers'}</option>
                                <option value={OTHER_VALUE}>{language === 'fr' ? 'Autre (sans remorque)' : 'Other (no trailer)'}</option>
                                {sortedRemorques.map((r) => (
                                    <option key={r.id} value={r.matricule}>
                                        {r.matricule}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Export */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                        <button
                            onClick={handleExportPdf}
                            disabled={exporting || !dateFrom || !dateTo}
                            title={
                                !dateFrom || !dateTo
                                    ? language === 'fr'
                                        ? 'Sélectionnez une période pour exporter'
                                        : 'Select a date range to export'
                                    : undefined
                            }
                            className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm ${dateFrom && dateTo
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm'
                                : 'bg-secondary text-muted-foreground cursor-not-allowed'
                                }`}
                        >
                            {exporting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    {language === 'fr' ? 'Génération...' : 'Generating...'}
                                </>
                            ) : (
                                <>
                                    <FileDown size={14} />
                                    {language === 'fr' ? 'Exporter État Dépenses (PDF)' : 'Export Expenses Report (PDF)'}
                                </>
                            )}
                        </button>
                        {!dateFrom || !dateTo ? (
                            <p className="text-xs text-muted-foreground italic">
                                {language === 'fr'
                                    ? '← Sélectionnez une période pour activer l\'export'
                                    : '← Select a date range to enable export'}
                            </p>
                        ) : null}
                        {exportError && (
                            <p className="text-xs text-destructive font-medium">{exportError}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Table ───────────────────────────────────────────────────── */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card z-10">
                            <tr className="bg-secondary border-b border-border">
                                {[
                                    language === 'fr' ? 'Date' : 'Date',
                                    language === 'fr' ? 'Libellé' : 'Label',
                                    language === 'fr' ? 'Catégorie' : 'Category',
                                    language === 'fr' ? 'Type' : 'Type',
                                    language === 'fr' ? 'Camion' : 'Truck',
                                    language === 'fr' ? 'Remorque' : 'Trailer',
                                    language === 'fr' ? 'Chauffeur' : 'Driver',
                                    language === 'fr' ? 'Montant' : 'Amount',
                                    language === 'fr' ? 'Statut' : 'Status',
                                    language === 'fr' ? 'Actions' : 'Actions',
                                ].map((h, i) => (
                                    <th
                                        key={i}
                                        className="px-4 py-3.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filteredCharges.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-xs italic">
                                        {language === 'fr' ? 'Aucune charge enregistrée' : 'No expenses recorded'}
                                    </td>
                                </tr>
                            ) : (
                                filteredCharges.map((c) => (
                                    <tr key={c.id} className="hover:bg-secondary/10 transition-colors">
                                        <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{c.date}</td>
                                        <td className="px-4 py-3 text-xs text-foreground font-semibold">{getChargeLabel(c, language)}</td>
                                        <td className="px-4 py-3 text-xs">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {getCategoryLabel(c.templateCategorie, language)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.templateType === 'FIXE'
                                                    ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200/50'
                                                    : 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200/50'
                                                    }`}
                                            >
                                                {c.templateType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-foreground/80">
                                            {c.camionMatricule || (
                                                <span className="italic font-sans text-muted-foreground">{NO_ENTITY_LABEL}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-foreground/80">
                                            {getRemorqueMatricule(c) || (
                                                <span className="italic font-sans text-muted-foreground">{NO_ENTITY_LABEL}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-foreground/80">
                                            {c.chauffeurNom || (
                                                <span className="italic text-muted-foreground">{NO_ENTITY_LABEL}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-foreground">{fmtTND(c.montant)} TND</td>
                                        <td className="px-4 py-3 text-xs">
                                            <button
                                                onClick={() => handleToggleExpenseStatus(c.id, c.statut)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${c.statut === 'PAYEE'
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 hover:bg-emerald-100'
                                                    : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50 hover:bg-amber-100'
                                                    }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.statut === 'PAYEE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                {c.statut === 'PAYEE'
                                                    ? language === 'fr' ? 'PAYÉE' : 'PAID'
                                                    : language === 'fr' ? 'EN ATTENTE' : 'PENDING'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditExpenseClick(c)}
                                                    className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"
                                                    title={language === 'fr' ? 'Modifier' : 'Edit'}
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteClick(c.id)}
                                                    className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"
                                                    title={language === 'fr' ? 'Supprimer' : 'Delete'}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── MODAL ─────────────────────────────────────────────────────── */}
            {showExpenseModal && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
                        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                            <h2 className="text-base font-bold text-foreground">
                                {expenseFormData.id === 0
                                    ? language === 'fr' ? 'Nouvelle Dépense' : 'New Expense'
                                    : language === 'fr' ? 'Modifier la Dépense' : 'Edit Expense'}
                            </h2>
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                            >
                                <X size={16} className="text-muted-foreground" />
                            </button>
                        </div>

                        <div className="px-7 py-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <div>
                                <label className={lbl}>{language === 'fr' ? 'Modèle de Charge *' : 'Charge Template *'}</label>
                                <select
                                    value={expenseFormData.templateId}
                                    onChange={(e) => handleExpenseTemplateChange(e.target.value)}
                                    className={sel}
                                    disabled={expenseFormData.id !== 0}
                                >
                                    <option value="">{language === 'fr' ? 'Sélectionner un modèle' : 'Select a template'}</option>
                                    {templates
                                        .filter((t) => t.active || String(t.id) === expenseFormData.templateId)
                                        .map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {getTemplateLabel(t, language)} ({getCategoryLabel(t.categorie, language)})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Date *</label>
                                    <DatePicker
                                        selected={expenseFormData.date}
                                        onChange={(date: Date | null) => setExpenseFormData({ ...expenseFormData, date: date || new Date() })}
                                        className={inp}
                                        placeholderText="YYYY-MM-DD"
                                        dateFormat="yyyy-MM-dd"
                                    />
                                </div>
                                <div>
                                    <label className={lbl}>{language === 'fr' ? 'Montant (TND) *' : 'Amount (TND) *'}</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={expenseFormData.montant}
                                        onChange={(e) => setExpenseFormData({ ...expenseFormData, montant: e.target.value })}
                                        className={numberInputClass}
                                        placeholder="Ex: 250.000"
                                        onWheel={(e) => e.preventDefault()}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={lbl}>Statut</label>
                                <select
                                    value={expenseFormData.statut}
                                    onChange={(e) => setExpenseFormData({ ...expenseFormData, statut: e.target.value as any })}
                                    className={sel}
                                >
                                    <option value="EN_ATTENTE">{language === 'fr' ? 'En attente' : 'Pending'}</option>
                                    <option value="PAYEE">{language === 'fr' ? 'Payée' : 'Paid'}</option>
                                </select>
                            </div>

                            <div>
                                <label className={lbl}>Notes</label>
                                <textarea
                                    value={expenseFormData.notes}
                                    onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                                    className={`${inp} h-20 resize-none`}
                                    placeholder={language === 'fr' ? 'Notes ou commentaires' : 'Notes or comments'}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all text-sm cursor-pointer"
                            >
                                {language === 'fr' ? 'Annuler' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleExpenseSave}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all text-sm cursor-pointer"
                            >
                                {language === 'fr' ? 'Enregistrer' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
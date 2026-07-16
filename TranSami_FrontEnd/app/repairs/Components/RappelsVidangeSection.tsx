'use client';

import { useState } from 'react';
import {
    Plus, Edit2, Trash2, X, RefreshCw, CheckCircle2,
    Calendar, Gauge, AlertTriangle, RotateCcw, Settings,
    BadgeDollarSign, AlertCircle, Truck,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { rappelVidangeApi, reparationApi } from '@/lib/api-client';
import type {
    RappelVidangeResponse, RappelVidangeRequest, CamionResponse,
} from '@/lib/api-client';

// ─── Styles partagés ─────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;
const numberInputClass = `${inp} no-spinner`; // ← ajout pour les inputs number

const fmtKm = (n: number | null | undefined) =>
    n == null ? '—' : new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' km';

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

// ─── Config statut vidange ────────────────────────────────────────────────────
const VIDANGE_STATUT_CONFIG = {
    OK: { label: 'OK', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700/40', bar: 'bg-emerald-500', icon: CheckCircle2 },
    PROCHE: { label: 'Proche', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700/40', bar: 'bg-amber-500', icon: AlertTriangle },
    DEPASSEE: { label: 'Dépassée', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700/40', bar: 'bg-red-500', icon: AlertTriangle },
    INCONNU: { label: 'Inconnu', color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border', bar: 'bg-secondary', icon: Gauge },
};

// ─── RappelVidangeRow ─────────────────────────────────────────────────────────
function RappelVidangeRow({ rappel, language, onReinit, onEdit, onDelete }: {
    rappel: RappelVidangeResponse;
    language: string;
    onReinit: (r: RappelVidangeResponse) => void;
    onEdit: (r: RappelVidangeResponse) => void;
    onDelete: (r: RappelVidangeResponse) => void;
}) {
    const cfg = VIDANGE_STATUT_CONFIG[rappel.statut] ?? VIDANGE_STATUT_CONFIG.INCONNU;
    const Icon = cfg.icon;
    const pct = Math.min(rappel.pourcentageAvancement ?? 0, 100);
    const kmRestants = rappel.kmRestants;
    const isOverdue = rappel.statut === 'DEPASSEE';

    return (
        <tr className="hover:bg-secondary/30 transition-colors">
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><Truck size={12} className="text-primary" /></div>
                    <div>
                        <p className="text-xs font-bold text-foreground">{rappel.camionMatricule}</p>
                        <p className="text-[10px] text-muted-foreground">{rappel.camionModele}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3.5">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    <Icon size={10} />{cfg.label}
                </span>
            </td>
            <td className="px-4 py-3.5 text-xs font-medium text-foreground whitespace-nowrap">
                {fmtKm(rappel.kmActuel)}
            </td>
            <td className="px-4 py-3.5">
                <span className={`text-xs font-bold ${cfg.color}`}>{fmtKm(rappel.kmProchaineVidange)}</span>
            </td>
            <td className="px-4 py-3.5">
                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <span className={`text-sm font-bold ${isOverdue ? 'text-red-600' : rappel.statut === 'PROCHE' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {kmRestants == null ? '—' :
                            kmRestants < 0
                                ? `+${fmtKm(Math.abs(kmRestants))} ${language === 'fr' ? 'dépassé' : 'overdue'}`
                                : fmtKm(kmRestants)
                        }
                    </span>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden w-28">
                        <div
                            className={`h-full rounded-full transition-all ${cfg.bar} ${pct >= 100 ? 'animate-pulse' : ''}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{Math.round(pct)}%</span>
                </div>
            </td>
            <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                {fmtKm(rappel.intervalleKm)}
            </td>
            <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                {rappel.dateDerniereVidange ?? '—'}
            </td>
            <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[140px] truncate">
                {rappel.notes ?? '—'}
            </td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => onReinit(rappel)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 dark:bg-amber-900/20 hover:bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30 dark:border-amber-700/40 transition-colors cursor-pointer whitespace-nowrap"
                    >
                        <RotateCcw size={11} />{language === 'fr' ? 'Faite' : 'Done'}
                    </button>
                    <button onClick={() => onEdit(rappel)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => onDelete(rappel)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer">
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ─── ReinitVidangeModal ───────────────────────────────────────────────────────
export function ReinitVidangeModal({ rappel, camions, language, onClose, onConfirm }: {
    rappel: RappelVidangeResponse;
    camions: CamionResponse[];
    language: string;
    onClose: () => void;
    onConfirm: (params: { kmSaisi: number; cout: number; dateVidange: Date; notes: string; intervalleKm: number }) => Promise<void>;
}) {
    const camion = camions.find(c => c.id === rappel.camionId);
    const kmActuelCamion = camion?.mileage ?? rappel.kmActuel ?? rappel.kmDerniereVidange;

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        kmSaisi: String(kmActuelCamion != null ? Math.round(kmActuelCamion) : ''),
        cout: '',
        dateVidange: new Date(),
        notes: '',
        intervalleKm: String(rappel.intervalleKm),
    });

    const kmMin = kmActuelCamion ?? 0;
    const kmSaisiNum = Number(form.kmSaisi);
    const kmValide = form.kmSaisi !== '' && kmSaisiNum >= kmMin;
    const coutValide = form.cout !== '' && Number(form.cout) >= 0;

    const handleSubmit = async () => {
        setError('');
        if (!form.kmSaisi || kmSaisiNum < kmMin) {
            setError(language === 'fr'
                ? `Le kilométrage doit être ≥ ${fmtKm(kmMin)} (valeur actuelle du camion).`
                : `Mileage must be ≥ ${fmtKm(kmMin)} (current truck value).`);
            return;
        }
        if (!coutValide) {
            setError(language === 'fr' ? 'Veuillez saisir le coût de la vidange.' : 'Please enter the oil change cost.');
            return;
        }
        setSaving(true);
        try {
            await onConfirm({
                kmSaisi: kmSaisiNum,
                cout: Number(form.cout),
                dateVidange: form.dateVidange,
                notes: form.notes,
                intervalleKm: Number(form.intervalleKm) || rappel.intervalleKm,
            });
        } catch (e: any) {
            setError(e.message || 'Erreur');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/70 to-primary/20" />
                <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 dark:bg-amber-900/20 rounded-xl"><RotateCcw size={16} className="text-primary" /></div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">
                                {language === 'fr' ? 'Valider la vidange effectuée' : 'Confirm completed oil change'}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">{rappel.camionMatricule} · {rappel.camionModele}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
                </div>

                <div className="px-7 py-6 space-y-4 bg-primary/10 dark:bg-amber-900/20 border border-primary/30 dark:border-amber-700/40 flex items-start gap-2.5">
                    <Gauge size={14} className="text-primary mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                        <p className="font-semibold">
                            {language === 'fr' ? 'Vidange prévue à' : 'Oil change due at'}{' '}
                            <span className="text-primary dark:text-amber-300">{fmtKm(rappel.kmProchaineVidange)}</span>
                        </p>
                        <p className="mt-0.5 text-amber-700/80 dark:text-amber-400">
                            {language === 'fr' ? 'Km actuel du camion :' : 'Current truck mileage:'}{' '}
                            <span className="font-semibold">{fmtKm(kmActuelCamion)}</span>
                            {' · '}{language === 'fr' ? 'issu du dernier bon carburant' : 'from last fuel voucher'}
                        </p>
                    </div>
                </div>

                <div className="px-7 py-5 space-y-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl px-4 py-3 flex items-start gap-2">
                            <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
                        </div>
                    )}
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Gauge size={10} />{language === 'fr' ? 'Kilométrage au moment de la vidange *' : 'Mileage at oil change time *'}</span></label>
                        <input
                            type="number"
                            className={`${numberInputClass} ${form.kmSaisi && !kmValide ? 'border-destructive ring-1 ring-destructive/40' : ''}`}
                            value={form.kmSaisi}
                            onChange={(e) => { setError(''); setForm(f => ({ ...f, kmSaisi: e.target.value })); }}
                            placeholder={String(Math.round(kmMin))} min={kmMin} step="1"
                            onWheel={(e) => e.preventDefault()}
                        />
                        {form.kmSaisi && !kmValide && (
                            <p className="text-xs text-destructive mt-1">{language === 'fr' ? `Doit être ≥ ${fmtKm(kmMin)}` : `Must be ≥ ${fmtKm(kmMin)}`}</p>
                        )}
                        {kmValide && (
                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <CheckCircle2 size={11} />
                                {language === 'fr'
                                    ? `Prochaine vidange prévue à ${fmtKm(kmSaisiNum + Number(form.intervalleKm))}`
                                    : `Next oil change due at ${fmtKm(kmSaisiNum + Number(form.intervalleKm))}`}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><BadgeDollarSign size={10} />{language === 'fr' ? 'Coût de la vidange (TND) *' : 'Oil change cost (TND) *'}</span></label>
                        <input
                            type="number"
                            className={numberInputClass}
                            value={form.cout}
                            onChange={(e) => { setError(''); setForm(f => ({ ...f, cout: e.target.value })); }}
                            placeholder="0.000" min="0" step="0.001"
                            onWheel={(e) => e.preventDefault()}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {language === 'fr'
                                ? 'Une réparation de type "Vidange" sera créée automatiquement avec ce montant.'
                                : 'A "Oil Change" repair will be created automatically with this amount.'}
                        </p>
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date de la vidange *' : 'Oil change date *'}</span></label>
                        <DatePicker
                            selected={form.dateVidange}
                            onChange={(date: Date | null) => setForm(f => ({ ...f, dateVidange: date || new Date() }))}
                            className={`${inp} w-full`} wrapperClassName="w-full" popperClassName="z-[9999]"
                            dateFormat="yyyy-MM-dd" maxDate={new Date()}
                        />
                    </div>
                    <div>
                        <label className={lbl}>{language === 'fr' ? 'Notes (type huile, filtre…)' : 'Notes (oil type, filter…)'}</label>
                        <textarea className={`${inp} resize-none`} rows={2} value={form.notes}
                            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder={language === 'fr' ? 'Ex: Huile 15W40 Total, filtre MANN…' : 'Ex: 15W40 Total oil, MANN filter…'} />
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Settings size={10} />{language === 'fr' ? 'Intervalle prochain (km)' : 'Next interval (km)'}</span></label>
                        <input
                            type="number"
                            className={numberInputClass}
                            value={form.intervalleKm}
                            onChange={(e) => setForm(f => ({ ...f, intervalleKm: e.target.value }))}
                            placeholder="10000" min="1" step="500"
                            onWheel={(e) => e.preventDefault()}
                        />
                    </div>
                </div>

                <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <RefreshCw size={13} className="animate-spin" />}
                        {saving ? (language === 'fr' ? 'Validation...' : 'Confirming...') : (language === 'fr' ? 'Valider la vidange' : 'Confirm oil change')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── RappelVidangeModal (add / edit) ─────────────────────────────────────────
export function RappelVidangeModal({ mode, rappel, camions, language, onClose, onSave }: {
    mode: 'add' | 'edit';
    rappel?: RappelVidangeResponse;
    camions: CamionResponse[];
    language: string;
    onClose: () => void;
    onSave: (data: RappelVidangeRequest) => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        camionId: rappel ? String(rappel.camionId) : (camions[0] ? String(camions[0].id) : ''),
        kmDerniereVidange: rappel ? String(rappel.kmDerniereVidange) : '',
        intervalleKm: rappel ? String(rappel.intervalleKm) : '10000',
        dateDerniereVidange: rappel?.dateDerniereVidange ? parseLocalDate(rappel.dateDerniereVidange) : null as Date | null,
        notes: rappel?.notes ?? '',
    });

    const camionSelectionne = camions.find(c => c.id === Number(form.camionId));

    const handleSubmit = async () => {
        if (!form.camionId || !form.kmDerniereVidange || !form.intervalleKm) {
            setError(language === 'fr' ? 'Veuillez remplir tous les champs obligatoires.' : 'Please fill all required fields.');
            return;
        }
        setSaving(true); setError('');
        try {
            await onSave({
                camionId: Number(form.camionId),
                kmDerniereVidange: Number(form.kmDerniereVidange),
                intervalleKm: Number(form.intervalleKm),
                dateDerniereVidange: form.dateDerniereVidange ? formatLocalDate(form.dateDerniereVidange) : null,
                notes: form.notes || null,
            });
        } catch (e: any) {
            setError(e.message || 'Erreur');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 dark:bg-amber-900/20 rounded-xl"><Gauge size={16} className="text-primary" /></div>
                        <h2 className="text-base font-bold text-foreground">
                            {mode === 'add'
                                ? (language === 'fr' ? 'Nouveau rappel de vidange' : 'New oil change reminder')
                                : (language === 'fr' ? 'Modifier le rappel' : 'Edit reminder')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
                </div>

                <div className="px-7 py-6 space-y-4">
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                            <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
                        </div>
                    )}
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Truck size={10} />{language === 'fr' ? 'Camion *' : 'Truck *'}</span></label>
                        {mode === 'add' ? (
                            <select className={sel} value={form.camionId} onChange={(e) => setForm(f => ({ ...f, camionId: e.target.value }))}>
                                <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                                {camions.map(c => <option key={c.id} value={c.id}>{c.matricule} — {c.nomChauffeur}</option>)}
                            </select>
                        ) : (
                            <div className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-foreground">
                                {camions.find(c => c.id === Number(form.camionId))?.matricule ?? '—'}
                                {camionSelectionne?.mileage != null && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        · {language === 'fr' ? 'km actuel' : 'current km'}: {fmtKm(camionSelectionne.mileage)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Gauge size={10} />{language === 'fr' ? 'Kilométrage dernière vidange *' : 'Last oil change mileage *'}</span></label>
                        <input
                            type="number"
                            className={numberInputClass}
                            value={form.kmDerniereVidange}
                            onChange={(e) => setForm(f => ({ ...f, kmDerniereVidange: e.target.value }))}
                            placeholder="Ex: 125000" min="0" step="1"
                            onWheel={(e) => e.preventDefault()}
                        />
                        {camionSelectionne?.mileage != null && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {language === 'fr' ? 'Km actuel :' : 'Current mileage:'}{' '}
                                <button type="button"
                                    onClick={() => setForm(f => ({ ...f, kmDerniereVidange: String(Math.round(camionSelectionne.mileage!)) }))}
                                    className="text-primary font-semibold hover:underline cursor-pointer">
                                    {fmtKm(camionSelectionne.mileage)} ← utiliser
                                </button>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Settings size={10} />{language === 'fr' ? 'Intervalle (km) *' : 'Interval (km) *'}</span></label>
                        <input
                            type="number"
                            className={numberInputClass}
                            value={form.intervalleKm}
                            onChange={(e) => setForm(f => ({ ...f, intervalleKm: e.target.value }))}
                            placeholder="10000" min="1" step="500"
                            onWheel={(e) => e.preventDefault()}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {language === 'fr' ? 'Prochaine vidange à :' : 'Next oil change at:'}{' '}
                            <span className="text-foreground font-semibold">
                                {form.kmDerniereVidange && form.intervalleKm
                                    ? fmtKm(Number(form.kmDerniereVidange) + Number(form.intervalleKm))
                                    : '—'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date de la dernière vidange' : 'Last oil change date'}</span></label>
                        <DatePicker
                            selected={form.dateDerniereVidange}
                            onChange={(date: Date | null) => setForm(f => ({ ...f, dateDerniereVidange: date }))}
                            className={`${inp} w-full`} wrapperClassName="w-full" popperClassName="z-[9999]"
                            dateFormat="yyyy-MM-dd" placeholderText={language === 'fr' ? 'Optionnel' : 'Optional'} isClearable
                        />
                    </div>
                    <div>
                        <label className={lbl}>{language === 'fr' ? 'Notes' : 'Notes'}</label>
                        <textarea className={`${inp} resize-none`} rows={2} value={form.notes}
                            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder={language === 'fr' ? 'Ex: Huile 15W40 Total...' : 'Ex: 15W40 Total oil...'} />
                    </div>
                </div>

                <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <RefreshCw size={13} className="animate-spin" />}
                        {saving
                            ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
                            : mode === 'add'
                                ? (language === 'fr' ? 'Créer le rappel' : 'Create reminder')
                                : (language === 'fr' ? 'Enregistrer' : 'Save')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── DeleteRappelModal ────────────────────────────────────────────────────────
function DeleteRappelModal({ rappel, language, onClose, onConfirm }: {
    rappel: RappelVidangeResponse; language: string; onClose: () => void; onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-destructive/60 to-destructive/20" />
                <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={16} className="text-destructive" /></div>
                        <h2 className="text-base font-bold text-foreground">
                            {language === 'fr' ? 'Supprimer le rappel' : 'Delete reminder'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
                </div>
                <div className="px-7 py-6">
                    <p className="text-sm text-foreground/80">
                        {language === 'fr' ? 'Supprimer le rappel de vidange pour ce camion ?' : 'Delete the oil change reminder for this truck?'}
                    </p>
                    <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                        <p className="text-sm font-bold text-foreground">{rappel.camionMatricule}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {language === 'fr' ? 'Prochaine vidange à' : 'Next oil change at'} {fmtKm(rappel.kmProchaineVidange)}
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

// ─── Props ────────────────────────────────────────────────────────────────────
interface RappelsVidangeSectionProps {
    rappels: RappelVidangeResponse[];
    camions: CamionResponse[];
    language: string;
    loadRappels: () => Promise<void>;
    loadRepairs: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function RappelsVidangeSection({
    rappels, camions, language, loadRappels, loadRepairs,
}: RappelsVidangeSectionProps) {
    const [showAdd, setShowAdd] = useState(false);
    const [editRappel, setEditRappel] = useState<RappelVidangeResponse | null>(null);
    const [reinitRappel, setReinitRappel] = useState<RappelVidangeResponse | null>(null);
    const [deleteRappel, setDeleteRappel] = useState<RappelVidangeResponse | null>(null);

    const rappelsDepassees = rappels.filter(r => r.statut === 'DEPASSEE').length;
    const rappelsProches = rappels.filter(r => r.statut === 'PROCHE').length;

    // ── CRUD ──────────────────────────────────────────────────────
    const handleAdd = async (data: RappelVidangeRequest) => {
        await rappelVidangeApi.create(data);
        await loadRappels();
        setShowAdd(false);
    };

    const handleEdit = async (data: RappelVidangeRequest) => {
        if (!editRappel) return;
        await rappelVidangeApi.update(editRappel.id, data);
        await loadRappels();
        setEditRappel(null);
    };

    const handleDelete = async () => {
        if (!deleteRappel) return;
        try {
            await rappelVidangeApi.delete(deleteRappel.id);
            await loadRappels();
            setDeleteRappel(null);
        } catch (e: any) { alert(e.message); }
    };

    const handleReinit = async (params: { kmSaisi: number; cout: number; dateVidange: Date; notes: string; intervalleKm: number }) => {
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

        await Promise.all([loadRappels(), loadRepairs()]);
        setReinitRappel(null);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">
                            {language === 'fr' ? 'Rappels de vidange' : 'Oil Change Reminders'}
                        </h2>
                        {(rappelsDepassees > 0 || rappelsProches > 0) && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${rappelsDepassees > 0
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700'}`}>
                                <AlertTriangle size={9} />
                                {rappelsDepassees > 0
                                    ? `${rappelsDepassees} ${language === 'fr' ? 'dépassée(s)' : 'overdue'}`
                                    : `${rappelsProches} ${language === 'fr' ? 'proche(s)' : 'soon'}`}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {rappels.length} {language === 'fr' ? 'rappel(s) configuré(s)' : 'reminder(s) configured'}
                    </p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm"
                >
                    <Plus size={16} />{language === 'fr' ? 'Nouveau rappel' : 'New reminder'}
                </button>
            </div>

            {/* Table */}
            {rappels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 bg-card rounded-2xl border border-border text-muted-foreground gap-3">
                    <div className="p-4 bg-secondary rounded-2xl"><Gauge size={28} className="opacity-40" /></div>
                    <p className="text-sm font-medium">{language === 'fr' ? 'Aucun rappel de vidange configuré' : 'No oil change reminders configured'}</p>
                    <button onClick={() => setShowAdd(true)} className="text-xs text-primary hover:underline cursor-pointer">
                        {language === 'fr' ? 'Créer le premier rappel →' : 'Create the first reminder →'}
                    </button>
                </div>
            ) : (
                <div className="bg-card rounded-2xl border border-primary/30 dark:border-border overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                    <div className="overflow-x-auto overflow-y-auto max-h-[360px]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-card z-10">
                                <tr className="bg-secondary border-b border-border">
                                    {[
                                        language === 'fr' ? 'Camion' : 'Truck',
                                        language === 'fr' ? 'Statut' : 'Status',
                                        language === 'fr' ? 'Km actuel' : 'Current km',
                                        language === 'fr' ? 'Prochaine vidange' : 'Next change',
                                        language === 'fr' ? 'Km restants' : 'Km remaining',
                                        language === 'fr' ? 'Intervalle' : 'Interval',
                                        language === 'fr' ? 'Dernière vidange' : 'Last change',
                                        'Notes',
                                        language === 'fr' ? 'Actions' : 'Actions',
                                    ].map(h => (
                                        <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {rappels.map(r => (
                                    <RappelVidangeRow
                                        key={r.id} rappel={r} language={language}
                                        onReinit={setReinitRappel}
                                        onEdit={setEditRappel}
                                        onDelete={setDeleteRappel}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showAdd && (
                <RappelVidangeModal mode="add" camions={camions} language={language} onClose={() => setShowAdd(false)} onSave={handleAdd} />
            )}
            {editRappel && (
                <RappelVidangeModal mode="edit" rappel={editRappel} camions={camions} language={language} onClose={() => setEditRappel(null)} onSave={handleEdit} />
            )}
            {deleteRappel && (
                <DeleteRappelModal rappel={deleteRappel} language={language} onClose={() => setDeleteRappel(null)} onConfirm={handleDelete} />
            )}
            {reinitRappel && (
                <ReinitVidangeModal rappel={reinitRappel} camions={camions} language={language} onClose={() => setReinitRappel(null)} onConfirm={handleReinit} />
            )}
        </div>
    );
}
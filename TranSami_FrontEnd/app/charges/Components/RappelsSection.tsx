'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Play, AlertTriangle } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
    rappelChargeApi,
    RappelChargeResponse,
    ChargeTemplateResponse,
    FrequenceRappel,
} from '@/lib/api-client';
import { inp, lbl, sel, formatLocalDate, getCategoryLabel, getTemplateLabel, getRappelLabel } from './utils';

// Classe pour les inputs number sans flèches
const numberInputClass = `${inp} no-spinner`;

interface RappelsSectionProps {
    rappels: RappelChargeResponse[];
    templates: ChargeTemplateResponse[];
    language: string;
    loadAllData: () => Promise<void>;
    onDeleteClick: (id: number) => void;
}

export default function RappelsSection({
    rappels,
    templates,
    language,
    loadAllData,
    onDeleteClick,
}: RappelsSectionProps) {
    const [showRappelModal, setShowRappelModal] = useState(false);
    const [rappelFormData, setRappelFormData] = useState({
        id: 0,
        templateId: '',
        frequence: 'MENSUEL' as FrequenceRappel,
        prochaineDate: new Date(),
        joursAvant: '15',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const activeFixeTemplates = templates.filter((t) => t.type === 'FIXE' && t.active);

    const handleNewRappelClick = () => {
        setFormError(null);
        setRappelFormData({
            id: 0,
            templateId: activeFixeTemplates[0]?.id ? String(activeFixeTemplates[0].id) : '',
            frequence: 'MENSUEL',
            prochaineDate: new Date(),
            joursAvant: '15',
        });
        setShowRappelModal(true);
    };

    const handleRappelSave = async () => {
        setFormError(null);
        if (!rappelFormData.templateId || !rappelFormData.frequence || !rappelFormData.prochaineDate) {
            setFormError(language === 'fr' ? 'Champs obligatoires manquants' : 'Missing required fields');
            return;
        }
        const payload = {
            templateId: Number(rappelFormData.templateId),
            frequence: rappelFormData.frequence,
            prochaineDate: formatLocalDate(rappelFormData.prochaineDate),
            joursAvant: rappelFormData.joursAvant ? Number(rappelFormData.joursAvant) : 15,
        };
        try {
            if (rappelFormData.id === 0) {
                await rappelChargeApi.create(payload);
            } else {
                await rappelChargeApi.update(rappelFormData.id, payload);
            }
            await loadAllData();
            setShowRappelModal(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleEditRappelClick = (r: RappelChargeResponse) => {
        setFormError(null);
        setRappelFormData({
            id: r.id,
            templateId: String(r.templateId),
            frequence: r.frequence,
            prochaineDate: new Date(r.prochaineDate),
            joursAvant: String(r.joursAvant),
        });
        setShowRappelModal(true);
    };

    const handleToggleRappelActif = async (id: number, currentActif: boolean) => {
        try {
            await rappelChargeApi.toggleActif(id, !currentActif);
            await loadAllData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleAvancerRappel = async (id: number) => {
        try {
            await rappelChargeApi.avancer(id);
            await loadAllData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erreur');
        }
    };

    return (
        <div className="space-y-4 ">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-foreground">
                        {language === 'fr' ? 'Rappels de Charges Récurrents' : 'Charges Reminders'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {language === 'fr' ? 'Suivez et anticipez les charges fixes à payer' : 'Track and plan fixed expenses'}
                    </p>
                </div>
                <button
                    onClick={handleNewRappelClick}
                    disabled={activeFixeTemplates.length === 0}
                    className="flex items-center gap-1.5 bg-primary hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title={activeFixeTemplates.length === 0 ? (language === 'fr' ? 'Créez un template FIXE actif d\'abord' : 'Create an active FIXED template first') : ''}
                >
                    <Plus size={14} />
                    <span>{language === 'fr' ? 'Nouveau Rappel' : 'New Reminder'}</span>
                </button>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
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
                                    language === 'fr' ? 'Avancer' : 'Advance',
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
                            {rappels.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-xs italic">
                                        {language === 'fr' ? 'Aucun rappel de charge configuré' : 'No reminders configured'}
                                    </td>
                                </tr>
                            ) : (
                                rappels.map((r) => {
                                    const isOverdue = r.statut === 'DEPASSE';
                                    const isNear = r.statut === 'PROCHE';

                                    return (
                                        <tr key={r.id} className="hover:bg-secondary/10 transition-colors">
                                            <td className="px-4 py-3 text-xs font-semibold text-foreground">{r.templateLibelle}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                    {getCategoryLabel(r.templateCategorie, language)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-foreground/80 font-medium">{r.frequence}</td>
                                            <td className="px-4 py-3 text-xs font-mono text-foreground/80 whitespace-nowrap">{r.prochaineDate}</td>
                                            <td className={`px-4 py-3 text-xs font-bold ${isOverdue ? 'text-red-500' : isNear ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {isOverdue
                                                    ? language === 'fr' ? `${Math.abs(r.joursRestants)} j de retard` : `${Math.abs(r.joursRestants)} d late`
                                                    : language === 'fr' ? `Dans ${r.joursRestants} j` : `In ${r.joursRestants} d`}
                                            </td>
                                            {/* Colonne Avancer */}
                                            <td className="px-4 py-3 text-xs">
                                                <button
                                                    onClick={() => handleAvancerRappel(r.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 transition-all cursor-pointer text-[10px] font-bold"
                                                    title={language === 'fr' ? 'Avancer (cycle suivant)' : 'Advance (next cycle)'}
                                                >
                                                    <Play size={11} className="fill-current" />
                                                    <span>{language === 'fr' ? 'Avancer' : 'Advance'}</span>
                                                </button>
                                            </td>
                                            {/* Colonne Actions */}
                                            <td className="px-4 py-3 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleToggleRappelActif(r.id, r.actif)}
                                                        className={`p-1 rounded transition-all cursor-pointer ${r.actif
                                                            ? 'hover:bg-amber-100 text-amber-600/60'
                                                            : 'hover:bg-emerald-100 text-emerald-600/60'
                                                            }`}
                                                        title={r.actif ? 'Désactiver' : 'Activer'}
                                                    >
                                                        {r.actif ? <X size={13} /> : <Check size={13} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditRappelClick(r)}
                                                        className="p-1 rounded hover:bg-blue-100 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteClick(r.id)}
                                                        className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: NEW / EDIT RAPPEL */}
            {showRappelModal && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
                        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                            <h2 className="text-base font-bold text-foreground">
                                {rappelFormData.id === 0
                                    ? language === 'fr' ? 'Nouveau Rappel de Charge' : 'New Charge Reminder'
                                    : language === 'fr' ? 'Modifier le Rappel' : 'Edit Reminder'}
                            </h2>
                            <button
                                onClick={() => setShowRappelModal(false)}
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
                                <label className={lbl}>{language === 'fr' ? 'Modèle de Charge (FIXE actif) *' : 'Charge Template (Active FIXED) *'}</label>
                                <select
                                    value={rappelFormData.templateId}
                                    onChange={(e) => setRappelFormData({ ...rappelFormData, templateId: e.target.value })}
                                    className={sel}
                                    disabled={rappelFormData.id !== 0}
                                >
                                    <option value="">{language === 'fr' ? 'Sélectionner un modèle' : 'Select a template'}</option>
                                    {activeFixeTemplates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {getTemplateLabel(t, language)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={lbl}>{language === 'fr' ? 'Fréquence *' : 'Frequency *'}</label>
                                <select
                                    value={rappelFormData.frequence}
                                    onChange={(e) => setRappelFormData({ ...rappelFormData, frequence: e.target.value as any })}
                                    className={sel}
                                >
                                    <option value="MENSUEL">{language === 'fr' ? 'Mensuel' : 'Monthly'}</option>
                                    <option value="TRIMESTRIEL">{language === 'fr' ? 'Trimestriel' : 'Quarterly'}</option>
                                    <option value="SEMESTRIEL">{language === 'fr' ? 'Semestriel' : 'Semi-annual'}</option>
                                    <option value="ANNUEL">{language === 'fr' ? 'Annuel' : 'Annual'}</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>{language === 'fr' ? 'Prochaine Date d\'échéance *' : 'Next Due Date *'}</label>
                                    <DatePicker
                                        selected={rappelFormData.prochaineDate}
                                        onChange={(date: Date | null) => setRappelFormData({ ...rappelFormData, prochaineDate: date || new Date() })}
                                        className={inp}
                                        placeholderText="YYYY-MM-DD"
                                        dateFormat="yyyy-MM-dd"
                                    />
                                </div>
                                <div>
                                    <label className={lbl}>{language === 'fr' ? 'Alerter N jours avant' : 'Alert N days before'}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={rappelFormData.joursAvant}
                                        onChange={(e) => setRappelFormData({ ...rappelFormData, joursAvant: e.target.value })}
                                        className={numberInputClass}
                                        placeholder="Défaut: 15"
                                        onWheel={(e) => e.preventDefault()}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                            <button
                                onClick={() => setShowRappelModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all text-sm cursor-pointer"
                            >
                                {language === 'fr' ? 'Annuler' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleRappelSave}
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
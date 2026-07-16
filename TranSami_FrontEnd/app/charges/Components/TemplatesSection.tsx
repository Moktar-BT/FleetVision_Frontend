'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Truck, Users, Settings, AlertTriangle, DollarSign } from 'lucide-react';
import {
    chargeTemplateApi,
    ChargeTemplateResponse,
    CamionResponse,
    ChauffeurResponse,
    RemorqueResponse,
    TypeCharge,
    CategorieCharge,
} from '@/lib/api-client';
import { inp, lbl, sel, fmtTND, getCategoryLabel, getTemplateLabel } from './utils';

// Classe pour les inputs number sans flèches
const numberInputClass = `${inp} no-spinner`;

interface TemplatesSectionProps {
    templates: ChargeTemplateResponse[];
    camions: CamionResponse[];
    chauffeurs: ChauffeurResponse[];
    remorques: RemorqueResponse[];
    language: string;
    loadAllData: () => Promise<void>;
    onDeleteClick: (id: number) => void;
}

export default function TemplatesSection({
    templates,
    camions,
    chauffeurs,
    remorques,
    language,
    loadAllData,
    onDeleteClick,
}: TemplatesSectionProps) {
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateFormData, setTemplateFormData] = useState({
        id: 0,
        libelle: '',
        type: 'FIXE' as TypeCharge,
        categorie: 'SALAIRE' as CategorieCharge,
        montantReference: '',
        camionId: '',
        chauffeurId: '',
        remorqueId: '',
    });
    const [formError, setFormError] = useState<string | null>(null);

    const handleNewTemplateClick = () => {
        setFormError(null);
        setTemplateFormData({
            id: 0,
            libelle: '',
            type: 'FIXE',
            categorie: 'SALAIRE',
            montantReference: '',
            camionId: '',
            chauffeurId: '',
            remorqueId: '',
        });
        setShowTemplateModal(true);
    };

    const handleTemplateSave = async () => {
        setFormError(null);
        if (!templateFormData.libelle || !templateFormData.type || !templateFormData.categorie) {
            setFormError(language === 'fr' ? 'Champs obligatoires manquants' : 'Missing required fields');
            return;
        }
        const payload = {
            libelle: templateFormData.libelle,
            type: templateFormData.type,
            categorie: templateFormData.categorie,
            montantReference: templateFormData.montantReference ? parseFloat(templateFormData.montantReference) : null,
            camionId: templateFormData.camionId ? Number(templateFormData.camionId) : null,
            chauffeurId: templateFormData.chauffeurId ? Number(templateFormData.chauffeurId) : null,
            remorqueId: templateFormData.remorqueId ? Number(templateFormData.remorqueId) : null,
        };
        try {
            if (templateFormData.id === 0) {
                await chargeTemplateApi.create(payload);
            } else {
                await chargeTemplateApi.update(templateFormData.id, payload);
            }
            await loadAllData();
            setShowTemplateModal(false);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Erreur');
        }
    };

    const handleEditTemplateClick = (t: ChargeTemplateResponse) => {
        setFormError(null);
        setTemplateFormData({
            id: t.id,
            libelle: t.libelle,
            type: t.type,
            categorie: t.categorie,
            montantReference: t.montantReference !== null ? String(t.montantReference) : '',
            camionId: t.camionId !== null ? String(t.camionId) : '',
            chauffeurId: t.chauffeurId !== null ? String(t.chauffeurId) : '',
            remorqueId: t.remorqueId !== null ? String(t.remorqueId) : '',
        });
        setShowTemplateModal(true);
    };

    const handleToggleTemplateActive = async (id: number, currentActive: boolean) => {
        try {
            await chargeTemplateApi.toggleActive(id, !currentActive);
            await loadAllData();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Erreur');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-foreground">
                        {language === 'fr' ? 'Modèles de Charges (Templates)' : 'Expense Templates'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {language === 'fr' ? 'Définissez les modèles de charges récurrentes ou ponctuelles' : 'Define templates for recurring or one-time expenses'}
                    </p>
                </div>
                <button
                    onClick={handleNewTemplateClick}
                    className="flex items-center gap-1.5 bg-primary hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs"
                >
                    <Plus size={14} />
                    <span>{language === 'fr' ? 'Nouveau Template' : 'New Template'}</span>
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                    <div className="p-4 bg-secondary rounded-2xl">
                        <Settings size={32} className="opacity-40" />
                    </div>
                    <p className="text-sm font-medium">
                        {language === 'fr' ? 'Aucun modèle défini' : 'No templates defined'}
                    </p>
                    <button
                        onClick={handleNewTemplateClick}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm"
                    >
                        <Plus size={16} />
                        {language === 'fr' ? 'Ajouter votre premier modèle' : 'Add your first template'}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((t) => (
                        <div
                            key={t.id}
                            className="bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                            <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
                            <div className="p-5 space-y-3">
                                {/* En‑tête : libellé + actions */}
                                <div className="flex items-start justify-between">
                                    <h4 className="text-xs font-bold text-foreground truncate max-w-[170px]" title={getTemplateLabel(t, language)}>
                                        {getTemplateLabel(t, language)}
                                    </h4>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => handleToggleTemplateActive(t.id, t.active)}
                                            className={`p-1 rounded transition-all cursor-pointer ${t.active
                                                ? 'hover:bg-amber-100 text-amber-600/60 hover:text-amber-600'
                                                : 'hover:bg-emerald-100 text-emerald-600/60 hover:text-emerald-600'
                                                }`}
                                            title={
                                                t.active
                                                    ? language === 'fr' ? 'Désactiver' : 'Deactivate'
                                                    : language === 'fr' ? 'Activer' : 'Activate'
                                            }
                                        >
                                            {t.active ? <X size={13} /> : <Check size={13} />}
                                        </button>
                                        <button
                                            onClick={() => handleEditTemplateClick(t)}
                                            className="p-1 rounded hover:bg-blue-100 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"
                                        >
                                            <Edit2 size={13} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteClick(t.id)}
                                            className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tags : type + catégorie */}
                                <div className="flex flex-wrap gap-1.5">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${t.type === 'FIXE'
                                            ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200/50'
                                            : 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200/50'
                                            }`}
                                    >
                                        {t.type}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                        {getCategoryLabel(t.categorie, language)}
                                    </span>
                                    {!t.active && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-700">
                                            {language === 'fr' ? 'Inactif' : 'Inactive'}
                                        </span>
                                    )}
                                </div>

                                {/* Entités liées */}
                                <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground space-y-1">
                                    {t.camionMatricule && (
                                        <div className="flex items-center gap-1">
                                            <Truck size={10} />
                                            <span>Camion: {t.camionMatricule}</span>
                                        </div>
                                    )}
                                    {t.chauffeurNom && (
                                        <div className="flex items-center gap-1">
                                            <Users size={10} />
                                            <span>Chauffeur: {t.chauffeurNom}</span>
                                        </div>
                                    )}
                                    {t.remorqueMatricule && (
                                        <div className="flex items-center gap-1">
                                            <Truck size={10} />
                                            <span>Remorque: {t.remorqueMatricule}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Pied de carte : montant de référence + statut actif/inactif */}
                                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                                        <DollarSign size={14} />
                                        <span>
                                            {t.montantReference !== null ? `${fmtTND(t.montantReference)} TND` : '—'}
                                        </span>
                                    </div>
                                    <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${t.active
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200/50'
                                            }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${t.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                        {t.active
                                            ? (language === 'fr' ? 'Actif' : 'Active')
                                            : (language === 'fr' ? 'Inactif' : 'Inactive')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL: NEW / EDIT TEMPLATE */}
            {showTemplateModal && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
                        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                            <h2 className="text-base font-bold text-foreground">
                                {templateFormData.id === 0
                                    ? language === 'fr' ? 'Nouveau Modèle de Charge' : 'New Charge Template'
                                    : language === 'fr' ? 'Modifier le Modèle de Charge' : 'Edit Charge Template'}
                            </h2>
                            <button
                                onClick={() => setShowTemplateModal(false)}
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
                                <label className={lbl}>{language === 'fr' ? 'Libellé *' : 'Label *'}</label>
                                <input
                                    type="text"
                                    value={templateFormData.libelle}
                                    onChange={(e) => setTemplateFormData({ ...templateFormData, libelle: e.target.value })}
                                    className={inp}
                                    placeholder="Ex: Assurance camion 123TU456"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={lbl}>Type *</label>
                                    <select
                                        value={templateFormData.type}
                                        onChange={(e) => setTemplateFormData({ ...templateFormData, type: e.target.value as any })}
                                        className={sel}
                                    >
                                        <option value="FIXE">FIXE</option>
                                        <option value="VARIABLE">VARIABLE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>{language === 'fr' ? 'Catégorie *' : 'Category *'}</label>
                                    <select
                                        value={templateFormData.categorie}
                                        onChange={(e) => setTemplateFormData({ ...templateFormData, categorie: e.target.value as any })}
                                        className={sel}
                                    >
                                        {[
                                            'SALAIRE',
                                            'CNSS',
                                            'ASSURANCE',
                                            'VIGNETTE',
                                            'VISITE_TECHNIQUE',
                                            'LAVAGE',
                                            'ASSURANCE_REMORQUE',
                                            'VIGNETTE_REMORQUE',
                                            'AUTRE',
                                        ].map((cat) => (
                                            <option key={cat} value={cat}>
                                                {getCategoryLabel(cat as CategorieCharge, language)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={lbl}>{language === 'fr' ? 'Montant de Référence (TND)' : 'Reference Amount (TND)'}</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={templateFormData.montantReference}
                                    onChange={(e) => setTemplateFormData({ ...templateFormData, montantReference: e.target.value })}
                                    className={numberInputClass}
                                    placeholder="Ex: 850.000"
                                    onWheel={(e) => e.preventDefault()}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={lbl}>{language === 'fr' ? 'Camion lié' : 'Linked Truck'}</label>
                                    <select
                                        value={templateFormData.camionId}
                                        onChange={(e) => setTemplateFormData({ ...templateFormData, camionId: e.target.value })}
                                        className={sel}
                                    >
                                        <option value="">{language === 'fr' ? 'Aucun' : 'None'}</option>
                                        {camions.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.matricule}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>{language === 'fr' ? 'Chauffeur lié' : 'Linked Driver'}</label>
                                    <select
                                        value={templateFormData.chauffeurId}
                                        onChange={(e) => setTemplateFormData({ ...templateFormData, chauffeurId: e.target.value })}
                                        className={sel}
                                    >
                                        <option value="">{language === 'fr' ? 'Aucun' : 'None'}</option>
                                        {chauffeurs.map((ch) => (
                                            <option key={ch.id} value={ch.id}>
                                                {ch.nomComplet}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={lbl}>{language === 'fr' ? 'Remorque liée' : 'Linked Trailer'}</label>
                                    <select
                                        value={templateFormData.remorqueId}
                                        onChange={(e) => setTemplateFormData({ ...templateFormData, remorqueId: e.target.value })}
                                        className={sel}
                                    >
                                        <option value="">{language === 'fr' ? 'Aucun' : 'None'}</option>
                                        {remorques.map((rem) => (
                                            <option key={rem.id} value={rem.id}>
                                                {rem.matricule}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                            <button
                                onClick={() => setShowTemplateModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all text-sm cursor-pointer"
                            >
                                {language === 'fr' ? 'Annuler' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleTemplateSave}
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
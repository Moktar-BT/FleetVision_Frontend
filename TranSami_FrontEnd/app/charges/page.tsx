'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Plus, X, AlertTriangle, Trash2 } from 'lucide-react';
import {
  chargeApi,
  chargeTemplateApi,
  rappelChargeApi,
  camionApi,
  chauffeurApi,
  remorqueApi,
  ChargeResponse,
  ChargeTemplateResponse,
  RappelChargeResponse,
  CamionResponse,
  ChauffeurResponse,
  RemorqueResponse,
} from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';
import DepensesSection from './Components/DepensesSection';
import TemplatesSection from './Components/TemplatesSection';
import RappelsSection from './Components/RappelsSection';

export default function ChargesPage() {
  const { language } = useApp();

  const [activeTab, setActiveTab] = useState<'DEPENSES' | 'TEMPLATES' | 'RAPPELS'>('DEPENSES');

  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [templates, setTemplates] = useState<ChargeTemplateResponse[]>([]);
  const [rappels, setRappels] = useState<RappelChargeResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [chauffeurs, setChauffeurs] = useState<ChauffeurResponse[]>([]);
  const [remorques, setRemorques] = useState<RemorqueResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'EXPENSE' | 'TEMPLATE' | 'RAPPEL' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        chargesData,
        templatesData,
        rappelsData,
        camionsData,
        chauffeursData,
        remorquesData,
      ] = await Promise.all([
        chargeApi.getAll(),
        chargeTemplateApi.getAll(),
        rappelChargeApi.getAll(),
        camionApi.getAll(),
        chauffeurApi.getAll(),
        remorqueApi.getAll(),
      ]);
      setCharges(chargesData);
      setTemplates(templatesData);
      setRappels(rappelsData);
      setCamions(camionsData);
      setChauffeurs(chauffeursData);
      setRemorques(remorquesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleDeleteClick = (type: 'EXPENSE' | 'TEMPLATE' | 'RAPPEL', id: number) => {
    setDeleteType(type);
    setDeleteTargetId(id);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null || deleteType === null) return;
    try {
      if (deleteType === 'EXPENSE') {
        await chargeApi.delete(deleteTargetId);
      } else if (deleteType === 'TEMPLATE') {
        await chargeTemplateApi.delete(deleteTargetId);
      } else if (deleteType === 'RAPPEL') {
        await rappelChargeApi.delete(deleteTargetId);
      }
      await loadAllData();
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la suppression. Des données dépendantes empêchent cette opération.'
      );
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Loading fullScreen text={t(language, 'loading')} />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-destructive text-sm">Erreur : {error}</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('DEPENSES')}
            className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 ${activeTab === 'DEPENSES'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {language === 'fr' ? 'Dépenses' : 'Expenses'}
          </button>
          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 ${activeTab === 'TEMPLATES'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {language === 'fr' ? 'Templates' : 'Templates'}
          </button>
          <button
            onClick={() => setActiveTab('RAPPELS')}
            className={`px-5 py-3 text-sm font-semibold transition-all cursor-pointer border-b-2 ${activeTab === 'RAPPELS'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {language === 'fr' ? 'Rappels' : 'Reminders'}
          </button>
        </div>

        {activeTab === 'DEPENSES' && (
          <DepensesSection
            charges={charges}
            templates={templates}
            camions={camions}
            chauffeurs={chauffeurs}
            remorques={remorques}
            language={language}
            loadAllData={loadAllData}
            onDeleteClick={(id) => handleDeleteClick('EXPENSE', id)}
          />
        )}

        {activeTab === 'TEMPLATES' && (
          <TemplatesSection
            templates={templates}
            camions={camions}
            chauffeurs={chauffeurs}
            remorques={remorques}
            language={language}
            loadAllData={loadAllData}
            onDeleteClick={(id) => handleDeleteClick('TEMPLATE', id)}
          />
        )}

        {activeTab === 'RAPPELS' && (
          <RappelsSection
            rappels={rappels}
            templates={templates}
            language={language}
            loadAllData={loadAllData}
            onDeleteClick={(id) => handleDeleteClick('RAPPEL', id)}
          />
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl">
                  <Trash2 size={18} className="text-destructive" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}
                </h2>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-3">
              {deleteError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{deleteError}</span>
                </div>
              )}
              <p className="text-sm text-foreground/80 leading-relaxed">
                {language === 'fr'
                  ? 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.'
                  : 'Are you sure you want to delete this item? This action cannot be undone.'}
              </p>
            </div>

            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
              >
                {t(language, 'cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all cursor-pointer text-sm"
              >
                {language === 'fr' ? 'Supprimer' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
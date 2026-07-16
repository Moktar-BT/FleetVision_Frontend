'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Plus, Edit2, Trash2, X, MapPin, Building2, Search, Package } from 'lucide-react';
import { fournisseurApi, FournisseurResponse } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

export default function FournisseursPage() {
  const { language } = useApp();
  const [fournisseurs, setFournisseurs] = useState<FournisseurResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ nom: '', localisation: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: 0, nom: '', localisation: '' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFournisseurId, setDeleteFournisseurId] = useState<number | null>(null);

  useEffect(() => {
    loadFournisseurs();
  }, []);

  const loadFournisseurs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fournisseurApi.getAll();
      setFournisseurs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredFournisseurs = useMemo(() => {
    return fournisseurs.filter(f =>
      f.nom.toLowerCase().includes(nameFilter.toLowerCase())
    );
  }, [fournisseurs, nameFilter]);

  const handleAddFournisseur = async () => {
    if (formData.nom && formData.localisation) {
      try {
        await fournisseurApi.create({ nom: formData.nom, localisation: formData.localisation });
        await loadFournisseurs();
        setFormData({ nom: '', localisation: '' });
        setShowAddModal(false);
      } catch (err) {
        alert('Erreur lors de la création');
      }
    }
  };

  const handleEditClick = (fournisseur: FournisseurResponse) => {
    setEditFormData({ id: fournisseur.id, nom: fournisseur.nom, localisation: fournisseur.localisation });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (editFormData.nom && editFormData.localisation) {
      try {
        await fournisseurApi.update(editFormData.id, {
          nom: editFormData.nom,
          localisation: editFormData.localisation,
        });
        await loadFournisseurs();
        setShowEditModal(false);
        setEditFormData({ id: 0, nom: '', localisation: '' });
      } catch (err) {
        alert('Erreur lors de la modification');
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteFournisseurId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteFournisseurId !== null) {
      try {
        await fournisseurApi.delete(deleteFournisseurId);
        await loadFournisseurs();
        setShowDeleteModal(false);
        setDeleteFournisseurId(null);
      } catch (err) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  // ─── Shared styles ────────────────────────────────────────────────────────────
  const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
  const labelClass = 'block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide';

  if (loading) {
    return (
      <ProtectedRoute>
        <Loading fullScreen={true} text={t(language, 'loading')} />
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-destructive text-sm">Erreur : {error}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>

      
      <div className="p-6 space-y-6">

        {/* ─── Top bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder={language === 'fr' ? 'Rechercher un fournisseur...' : 'Search supplier...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
          >
            <Plus size={16} />
            {t(language, 'addFournisseur')}
          </button>
        </div>

        {/* ─── Stats bar ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {filteredFournisseurs.length} {language === 'fr' ? 'fournisseur(s)' : 'supplier(s)'}
          </span>
          {nameFilter && (
            <span className="text-xs text-muted-foreground">
              · {language === 'fr' ? `sur ${fournisseurs.length} au total` : `of ${fournisseurs.length} total`}
            </span>
          )}
        </div>

        {/* ─── Cards grid ───────────────────────────────────────────────── */}
        {filteredFournisseurs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <div className="p-4 bg-secondary rounded-2xl">
              <Package size={32} className="opacity-40" />
            </div>
            <p className="text-sm font-medium">
              {language === 'fr' ? 'Aucun fournisseur trouvé' : 'No suppliers found'}
            </p>
            {fournisseurs.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm"
              >
                <Plus size={16} />
                {language === 'fr' ? 'Ajouter votre premier fournisseur' : 'Add your first supplier'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFournisseurs.map((fournisseur) => (
              <div
                key={fournisseur.id}
                className="bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Card top accent */}
                <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    {/* Icon + Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                        <Building2 size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-foreground truncate">
                          {fournisseur.nom}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                          <MapPin size={13} className="shrink-0" />
                          <span className="text-xs truncate">{fournisseur.localisation}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions (always visible) */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleEditClick(fournisseur)}
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"
                        title={language === 'fr' ? 'Modifier' : 'Edit'}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(fournisseur.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"
                        title={language === 'fr' ? 'Supprimer' : 'Delete'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Footer (ID removed) */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'Fournisseur' : 'Supplier'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {language === 'fr' ? 'Actif' : 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Add Modal ────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">

            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {t(language, 'addFournisseur')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'fr' ? 'Remplissez les informations du fournisseur' : 'Fill in the supplier information'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-4">
              <div>
                <label className={labelClass}>{t(language, 'supplierName')}</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder={language === 'fr' ? 'Nom du fournisseur' : 'Supplier name'}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t(language, 'location')}</label>
                <input
                  type="text"
                  value={formData.localisation}
                  onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                  placeholder={language === 'fr' ? 'Ville / Région' : 'City / Region'}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
              >
                {t(language, 'cancel')}
              </button>
              <button
                onClick={handleAddFournisseur}
                disabled={!formData.nom || !formData.localisation}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t(language, 'save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ───────────────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">

            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {t(language, 'editFournisseur')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'fr' ? 'Modifiez les informations du fournisseur' : 'Edit the supplier information'}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-4">
              <div>
                <label className={labelClass}>{t(language, 'supplierName')}</label>
                <input
                  type="text"
                  value={editFormData.nom}
                  onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                  placeholder={language === 'fr' ? 'Nom du fournisseur' : 'Supplier name'}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t(language, 'location')}</label>
                <input
                  type="text"
                  value={editFormData.localisation}
                  onChange={(e) => setEditFormData({ ...editFormData, localisation: e.target.value })}
                  placeholder={language === 'fr' ? 'Ville / Région' : 'City / Region'}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
              >
                {t(language, 'cancel')}
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editFormData.nom || !editFormData.localisation}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t(language, 'save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ─────────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
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

            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {language === 'fr'
                  ? 'Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.'
                  : 'Are you sure you want to delete this supplier? This action cannot be undone.'}
              </p>

              {/* Fournisseur info */}
              {deleteFournisseurId != null && (() => {
                const f = fournisseurs.find(f => f.id === deleteFournisseurId);
                return f ? (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-sm font-semibold text-foreground">{f.nom}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                      <MapPin size={12} />
                      <span className="text-xs">{f.localisation}</span>
                    </div>
                  </div>
                ) : null;
              })()}
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
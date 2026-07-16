'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import {
  Plus, Edit2, Trash2, X, Search, Calendar, Truck, FileText,
  Weight, HelpCircle, Link as LinkIcon, CheckCircle2,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { remorqueApi, RemorqueResponse, camionApi, CamionResponse } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;
// Classe pour les inputs number sans flèches
const numberInputClass = `${inp} no-spinner`;

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function RemorquesPage() {
  const { language, darkMode } = useApp();
  const [remorques, setRemorques] = useState<RemorqueResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matriculeFilter, setMatriculeFilter] = useState('');
  const [camionFilter, setCamionFilter] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    matricule: '',
    camionId: '' as string | number,
    typeRemorque: '',
    capaciteTonnes: '',
    dateAchat: null as Date | null,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: 0,
    matricule: '',
    camionId: '' as string | number,
    typeRemorque: '',
    capaciteTonnes: '',
    dateAchat: null as Date | null,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRemorqueId, setDeleteRemorqueId] = useState<number | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const [remorqueData, camionData] = await Promise.all([remorqueApi.getAll(), camionApi.getAll()]);
      setRemorques(remorqueData);
      setCamions(camionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  const filteredRemorques = useMemo(() => {
    return remorques.filter((r) => {
      const matchesMatricule = r.matricule.toLowerCase().includes(matriculeFilter.toLowerCase());
      const matchesCamion =
        camionFilter === 'ALL' ||
        (camionFilter === 'NONE' && r.camionId === null) ||
        (r.camionId !== null && String(r.camionId) === camionFilter);
      return matchesMatricule && matchesCamion;
    });
  }, [remorques, matriculeFilter, camionFilter]);

  const totalCount = remorques.length;
  const assignedCount = useMemo(() => remorques.filter((r) => r.camionId !== null).length, [remorques]);
  const availableCount = useMemo(() => remorques.filter((r) => r.camionId === null).length, [remorques]);

  // Build a map camionId -> camion for quick lookup
  const camionMap = useMemo(() => {
    const map: Record<number, CamionResponse> = {};
    camions.forEach(c => { map[c.id] = c; });
    return map;
  }, [camions]);

  const handleAddRemorque = async () => {
    setFormError(null);
    if (!formData.matricule) {
      setFormError(language === 'fr' ? 'Matricule obligatoire' : 'License plate is required');
      return;
    }
    try {
      await remorqueApi.create({
        matricule: formData.matricule,
        camionId: formData.camionId === '' ? null : Number(formData.camionId),
        typeRemorque: formData.typeRemorque || null,
        capaciteTonnes: formData.capaciteTonnes ? parseFloat(formData.capaciteTonnes) : null,
        dateAchat: formData.dateAchat ? formatLocalDate(formData.dateAchat) : null,
      });
      await loadData();
      setFormData({ matricule: '', camionId: '', typeRemorque: '', capaciteTonnes: '', dateAchat: null });
      setShowAddModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleEditClick = (remorque: RemorqueResponse) => {
    setEditFormData({
      id: remorque.id,
      matricule: remorque.matricule,
      camionId: remorque.camionId === null ? '' : remorque.camionId,
      typeRemorque: remorque.typeRemorque || '',
      capaciteTonnes: remorque.capaciteTonnes ? String(remorque.capaciteTonnes) : '',
      dateAchat: remorque.dateAchat ? new Date(remorque.dateAchat) : null,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    setFormError(null);
    if (!editFormData.matricule) {
      setFormError(language === 'fr' ? 'Matricule obligatoire' : 'License plate is required');
      return;
    }
    try {
      await remorqueApi.update(editFormData.id, {
        matricule: editFormData.matricule,
        camionId: editFormData.camionId === '' ? null : Number(editFormData.camionId),
        typeRemorque: editFormData.typeRemorque || null,
        capaciteTonnes: editFormData.capaciteTonnes ? parseFloat(editFormData.capaciteTonnes) : null,
        dateAchat: editFormData.dateAchat ? formatLocalDate(editFormData.dateAchat) : null,
      });
      await loadData();
      setShowEditModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    }
  };

  const handleDeleteClick = (id: number) => { setDeleteRemorqueId(id); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (deleteRemorqueId !== null) {
      try {
        await remorqueApi.delete(deleteRemorqueId);
        await loadData();
        setShowDeleteModal(false);
        setDeleteRemorqueId(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    }
  };

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
          <div className="text-destructive text-sm">Erreur : {error}</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        {/* ─── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={lbl}>{language === 'fr' ? 'Total Remorques' : 'Total Trailers'}</p>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20"><FileText size={16} className="text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold leading-none text-blue-600">{totalCount}</p>
            </div>
          </div>

          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={lbl}>{language === 'fr' ? 'Remorques Assignées' : 'Assigned Trailers'}</p>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><Truck size={16} className="text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold leading-none text-emerald-600">{assignedCount}</p>
            </div>
          </div>

          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className={`absolute inset-x-0 top-0 h-[2px] ${darkMode ? 'bg-amber-500' : 'bg-primary'}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={lbl}>{language === 'fr' ? 'Remorques Disponibles' : 'Available Trailers'}</p>
                <div className={`p-2 rounded-xl ${darkMode ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/10'}`}><HelpCircle size={16} className={darkMode ? 'text-amber-600' : 'text-primary'} /></div>
              </div>
              <p className={`text-2xl font-bold leading-none ${darkMode ? 'text-amber-600' : 'text-primary'}`}>{availableCount}</p>
            </div>
          </div>
        </div>

        {/* ─── Filters ── */}
        <div className="flex flex-col md:flex-row gap-3 bg-card p-4 rounded-2xl border border-border">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={matriculeFilter}
              onChange={(e) => setMatriculeFilter(e.target.value)}
              placeholder={language === 'fr' ? 'Rechercher par matricule...' : 'Search by license plate...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <select value={camionFilter} onChange={(e) => setCamionFilter(e.target.value)} className={`${sel} min-w-[200px]`}>
              <option value="ALL">{language === 'fr' ? 'Tous les camions tracteurs' : 'All tractor trucks'}</option>
              <option value="NONE">{language === 'fr' ? 'Non assignées (Disponibles)' : 'Unassigned (Available)'}</option>
              {camions.map((c) => (
                <option key={c.id} value={c.id}>{c.matricule} ({c.nomChauffeur})</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
            >
              <Plus size={16} />{language === 'fr' ? 'Ajouter une Remorque' : 'Add Trailer'}
            </button>
          </div>
        </div>

        {/* ─── Grid ── */}
        {filteredRemorques.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <div className="p-4 bg-secondary rounded-2xl"><FileText size={32} className="opacity-40" /></div>
            <p className="text-sm font-medium">{language === 'fr' ? 'Aucune remorque trouvée' : 'No trailers found'}</p>
            {remorques.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm"
              >
                <Plus size={16} />
                {language === 'fr' ? 'Ajouter votre première remorque' : 'Add your first trailer'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRemorques.map((remorque) => {
              const linkedCamion = remorque.camionId ? camionMap[remorque.camionId] : null;
              return (
                <div key={remorque.id} className="bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
                  <div className="p-5 space-y-4">
                    {/* Plate + Actions */}
                    <div className="flex items-start justify-between">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${darkMode ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/40' : 'bg-primary/10 text-primary border-primary/30'}`}>
                        {remorque.matricule}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleEditClick(remorque)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"><Edit2 size={15} /></button>
                        <button onClick={() => handleDeleteClick(remorque.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"><Trash2 size={15} /></button>
                      </div>
                    </div>

                    {/* Linked truck — enriched with driver info */}
                    {remorque.camionId ? (
                      <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 space-y-1">
                        <div className="flex items-center gap-2">
                          <LinkIcon size={12} className="text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{remorque.camionMatricule}</span>
                        </div>
                        {linkedCamion && (
                          <p className="text-[10px] text-muted-foreground pl-5">{linkedCamion.nomChauffeur} · {linkedCamion.truckModel}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl p-3 bg-secondary border border-border/50">
                        <div className="flex items-center gap-2">
                          <Truck size={12} className="text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground italic">{language === 'fr' ? 'Non assignée' : 'Unassigned'}</span>
                        </div>
                      </div>
                    )}

                    {/* Fields */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0" />
                        <span>{language === 'fr' ? 'Type: ' : 'Type: '}{remorque.typeRemorque || (language === 'fr' ? 'Non spécifié' : 'N/A')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight size={14} className="shrink-0" />
                        <span>{language === 'fr' ? 'Capacité: ' : 'Capacity: '}{remorque.capaciteTonnes !== null ? `${remorque.capaciteTonnes} T` : (language === 'fr' ? 'Non spécifiée' : 'N/A')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="shrink-0" />
                        <span>{language === 'fr' ? "Date d'achat: " : 'Purchase Date: '}{remorque.dateAchat || (language === 'fr' ? 'Non renseignée' : 'N/A')}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="pt-3 border-t border-border/50 flex justify-end">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${remorque.camionId !== null ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200/50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${remorque.camionId !== null ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        {remorque.camionId !== null ? (language === 'fr' ? 'Assignée' : 'Assigned') : (language === 'fr' ? 'Disponible' : 'Available')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Add Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Nouvelle Remorque' : 'New Trailer'}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2"><X size={14} /><span>{formError}</span></div>
              )}
              <div>
                <label className={lbl}>{language === 'fr' ? 'Matricule *' : 'License Plate *'}</label>
                <input type="text" value={formData.matricule} onChange={(e) => setFormData({ ...formData, matricule: e.target.value })} className={inp} placeholder="Ex: 123TU5678" />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Camion tracteur' : 'Tractor truck'}</label>
                <select value={formData.camionId} onChange={(e) => setFormData({ ...formData, camionId: e.target.value })} className={sel}>
                  <option value="">{language === 'fr' ? 'Aucun camion (disponible)' : 'No truck (available)'}</option>
                  {camions.map((c) => (
                    <option key={c.id} value={c.id}>{c.matricule} — {c.nomChauffeur}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Type de remorque' : 'Trailer type'}</label>
                <input type="text" value={formData.typeRemorque} onChange={(e) => setFormData({ ...formData, typeRemorque: e.target.value })} className={inp} placeholder="Ex: Benne, Citerne, Plateau" />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Capacité (Tonnes)' : 'Capacity (Tons)'}</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.capaciteTonnes}
                  onChange={(e) => setFormData({ ...formData, capaciteTonnes: e.target.value })}
                  className={numberInputClass}
                  placeholder="Ex: 25.5"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? "Date d'achat" : 'Purchase Date'}</label>
                <DatePicker selected={formData.dateAchat} onChange={(date: Date | null) => setFormData({ ...formData, dateAchat: date })} className={inp} placeholderText="YYYY-MM-DD" dateFormat="yyyy-MM-dd" />
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all text-sm cursor-pointer">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleAddRemorque} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all text-sm cursor-pointer">{language === 'fr' ? 'Valider' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Modifier la Remorque' : 'Edit Trailer'}</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2"><X size={14} /><span>{formError}</span></div>
              )}
              <div>
                <label className={lbl}>{language === 'fr' ? 'Matricule *' : 'License Plate *'}</label>
                <input type="text" value={editFormData.matricule} onChange={(e) => setEditFormData({ ...editFormData, matricule: e.target.value })} className={inp} />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Camion tracteur' : 'Tractor truck'}</label>
                <select value={editFormData.camionId} onChange={(e) => setEditFormData({ ...editFormData, camionId: e.target.value })} className={sel}>
                  <option value="">{language === 'fr' ? 'Aucun camion / Détacher' : 'No truck / Detach'}</option>
                  {camions.map((c) => (
                    <option key={c.id} value={c.id}>{c.matricule} — {c.nomChauffeur}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Type de remorque' : 'Trailer type'}</label>
                <input type="text" value={editFormData.typeRemorque} onChange={(e) => setEditFormData({ ...editFormData, typeRemorque: e.target.value })} className={inp} />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Capacité (Tonnes)' : 'Capacity (Tons)'}</label>
                <input
                  type="number"
                  step="0.5"
                  value={editFormData.capaciteTonnes}
                  onChange={(e) => setEditFormData({ ...editFormData, capaciteTonnes: e.target.value })}
                  className={numberInputClass}
                  onWheel={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? "Date d'achat" : 'Purchase Date'}</label>
                <DatePicker selected={editFormData.dateAchat} onChange={(date: Date | null) => setEditFormData({ ...editFormData, dateAchat: date })} className={inp} placeholderText="YYYY-MM-DD" dateFormat="yyyy-MM-dd" />
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all text-sm cursor-pointer">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleEditSave} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all text-sm cursor-pointer">{language === 'fr' ? 'Enregistrer' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={18} className="text-destructive" /></div>
                <h2 className="text-lg font-bold text-foreground">{language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}</h2>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette remorque ? Cette action est irréversible.' : 'Are you sure you want to delete this trailer? This action cannot be undone.'}
              </p>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">{t(language, 'cancel')}</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all cursor-pointer text-sm">{language === 'fr' ? 'Supprimer' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
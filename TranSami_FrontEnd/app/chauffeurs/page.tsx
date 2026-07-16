'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import {
  Plus, Edit2, Trash2, X, Search, Phone, Calendar, CreditCard,
  DollarSign, UserCheck, UserX, AlertTriangle, Users, Truck as TruckIcon,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { chauffeurApi, ChauffeurResponse, ChauffeurRequest, camionApi, CamionResponse } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const fmtTND = (n: number) =>
  new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

export default function ChauffeursPage() {
  const { language, darkMode } = useApp();
  const [chauffeurs, setChauffeurs] = useState<ChauffeurResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', cin: '', telephone: '',
    dateEmbauche: null as Date | null,
    salaire: '',
    camionId: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: 0, nom: '', prenom: '', cin: '', telephone: '',
    dateEmbauche: null as Date | null,
    salaire: '',
    camionId: '',
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChauffeurId, setDeleteChauffeurId] = useState<number | null>(null);
  const [deleteConflictError, setDeleteConflictError] = useState<string | null>(null);

  useEffect(() => { loadChauffeurs(); }, []);

  const loadChauffeurs = async () => {
    setLoading(true); setError(null);
    try {
      const [chauffeurData, camionData] = await Promise.all([
        chauffeurApi.getAll(),
        camionApi.getAll(),
      ]);
      setChauffeurs(chauffeurData);
      setCamions(camionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  const filteredChauffeurs = useMemo(() => {
    return chauffeurs.filter((c) => {
      const matchesName =
        c.nom.toLowerCase().includes(nameFilter.toLowerCase()) ||
        c.prenom.toLowerCase().includes(nameFilter.toLowerCase()) ||
        c.nomComplet.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && c.active) ||
        (statusFilter === 'INACTIVE' && !c.active);
      return matchesName && matchesStatus;
    });
  }, [chauffeurs, nameFilter, statusFilter]);

  const activeCount = useMemo(() => chauffeurs.filter((c) => c.active).length, [chauffeurs]);
  const inactiveCount = useMemo(() => chauffeurs.filter((c) => !c.active).length, [chauffeurs]);
  const assignedCount = useMemo(() => chauffeurs.filter((c) => c.active && c.camionId != null).length, [chauffeurs]);
  const freeCount = useMemo(() => chauffeurs.filter((c) => c.active && c.camionId == null).length, [chauffeurs]);
  const totalPayroll = useMemo(() =>
    chauffeurs.filter((c) => c.active).reduce((sum, c) => sum + Number(c.salaire), 0),
    [chauffeurs]);

  const handleAddChauffeur = async () => {
    setFormError(null);
    if (!formData.nom || !formData.prenom || !formData.cin || !formData.salaire) {
      setFormError(language === 'fr' ? 'Champs obligatoires manquants' : 'Missing required fields');
      return;
    }
    try {
      await chauffeurApi.create({
        nom: formData.nom,
        prenom: formData.prenom,
        cin: formData.cin,
        telephone: formData.telephone || null,
        dateEmbauche: formData.dateEmbauche ? formatLocalDate(formData.dateEmbauche) : null,
        salaire: parseFloat(formData.salaire),
        camionId: formData.camionId ? Number(formData.camionId) : null,
      });
      await loadChauffeurs();
      setFormData({ nom: '', prenom: '', cin: '', telephone: '', dateEmbauche: null, salaire: '', camionId: '' });
      setShowAddModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleEditClick = (chauffeur: ChauffeurResponse) => {
    setEditFormData({
      id: chauffeur.id,
      nom: chauffeur.nom,
      prenom: chauffeur.prenom,
      cin: chauffeur.cin,
      telephone: chauffeur.telephone || '',
      dateEmbauche: chauffeur.dateEmbauche ? new Date(chauffeur.dateEmbauche) : null,
      salaire: String(chauffeur.salaire),
      camionId: chauffeur.camionId ? String(chauffeur.camionId) : '',
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    setFormError(null);
    if (!editFormData.nom || !editFormData.prenom || !editFormData.cin || !editFormData.salaire) {
      setFormError(language === 'fr' ? 'Champs obligatoires manquants' : 'Missing required fields');
      return;
    }
    try {
      await chauffeurApi.update(editFormData.id, {
        nom: editFormData.nom,
        prenom: editFormData.prenom,
        cin: editFormData.cin,
        telephone: editFormData.telephone || null,
        dateEmbauche: editFormData.dateEmbauche ? formatLocalDate(editFormData.dateEmbauche) : null,
        salaire: parseFloat(editFormData.salaire),
        camionId: editFormData.camionId ? Number(editFormData.camionId) : null,
      });
      await loadChauffeurs();
      setShowEditModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    }
  };

  // Nouvelle fonction pour le toggle d'activation avec détachement automatique en cas de désactivation
  const handleToggleActive = async (chauffeur: ChauffeurResponse) => {
    try {
      const newActive = !chauffeur.active;
      // Construction de l'objet de mise à jour
      const updateData: ChauffeurRequest = {
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        cin: chauffeur.cin,
        telephone: chauffeur.telephone,
        dateEmbauche: chauffeur.dateEmbauche,
        salaire: chauffeur.salaire,
        // Si on désactive, on met camionId à null ; sinon on garde la valeur existante
        camionId: newActive ? chauffeur.camionId : null,
      };
      await chauffeurApi.update(chauffeur.id, updateData);
      await loadChauffeurs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteChauffeurId(id);
    setDeleteConflictError(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteChauffeurId !== null) {
      try {
        await chauffeurApi.delete(deleteChauffeurId);
        await loadChauffeurs();
        setShowDeleteModal(false);
        setDeleteChauffeurId(null);
      } catch (err) {
        setDeleteConflictError(
          err instanceof Error ? err.message : 'Erreur lors de la suppression.'
        );
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active */}
          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={lbl}>{language === 'fr' ? 'Chauffeurs Actifs' : 'Active Drivers'}</p>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><UserCheck size={16} className="text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold leading-none text-emerald-600">{activeCount}</p>
              <div className="flex gap-3 mt-2">
                <span className="text-[10px] text-muted-foreground">
                  <span className="font-bold text-blue-600">{assignedCount}</span> {language === 'fr' ? 'assignés' : 'assigned'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  <span className="font-bold text-amber-600">{freeCount}</span> {language === 'fr' ? 'libres' : 'free'}
                </span>
              </div>
            </div>
          </div>

          {/* Payroll */}
          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={lbl}>{language === 'fr' ? 'Masse Salariale Mensuelle' : 'Total Monthly Payroll'}</p>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20"><DollarSign size={16} className="text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold leading-none text-blue-600">{fmtTND(totalPayroll)} TND</p>
            </div>
          </div>

          {/* Inactive */}
          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className={`absolute inset-x-0 top-0 h-[2px] ${darkMode ? 'bg-amber-500' : 'bg-primary'}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={lbl}>{language === 'fr' ? 'Chauffeurs Inactifs' : 'Inactive Drivers'}</p>
                <div className={`p-2 rounded-xl ${darkMode ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/10'}`}><UserX size={16} className={darkMode ? 'text-amber-600' : 'text-primary'} /></div>
              </div>
              <p className={`text-2xl font-bold leading-none ${darkMode ? 'text-amber-600' : 'text-primary'}`}>{inactiveCount}</p>
            </div>
          </div>

          {/* Total */}
          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-violet-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={lbl}>{language === 'fr' ? 'Total Chauffeurs' : 'Total Drivers'}</p>
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20"><Users size={16} className="text-violet-600" /></div>
              </div>
              <p className="text-2xl font-bold leading-none text-violet-600">{chauffeurs.length}</p>
            </div>
          </div>
        </div>

        {/* ─── Search & Filters ── */}
        <div className="flex flex-col md:flex-row gap-3 bg-card p-4 rounded-2xl border border-border">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder={language === 'fr' ? 'Rechercher un chauffeur...' : 'Search driver...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className={`${sel} min-w-[200px]`}
            >
              <option value="ALL">{language === 'fr' ? 'Tous les statuts' : 'All statuses'}</option>
              <option value="ACTIVE">{language === 'fr' ? 'Actifs' : 'Active'}</option>
              <option value="INACTIVE">{language === 'fr' ? 'Inactifs' : 'Inactive'}</option>
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
            >
              <Plus size={16} />{language === 'fr' ? 'Ajouter un Chauffeur' : 'Add Driver'}
            </button>
          </div>
        </div>

        {/* ─── Drivers Grid ── */}
        {filteredChauffeurs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <div className="p-4 bg-secondary rounded-2xl"><Users size={32} className="opacity-40" /></div>
            <p className="text-sm font-medium">{language === 'fr' ? 'Aucun chauffeur trouvé' : 'No drivers found'}</p>
            {chauffeurs.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm"
              >
                <Plus size={16} />
                {language === 'fr' ? 'Ajouter votre premier chauffeur' : 'Add your first driver'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChauffeurs.map((chauffeur) => (
              <div key={chauffeur.id} className="bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="p-5 space-y-4">
                  {/* Name + Actions */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-foreground truncate">{chauffeur.nomComplet}</h3>
                      {/* Truck assignment badge */}
                      {chauffeur.camionId ? (
                        <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 text-blue-700 dark:text-blue-400">
                          <TruckIcon size={10} />
                          {chauffeur.camionMatricule ?? `#${chauffeur.camionId}`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-secondary border border-border text-muted-foreground">
                          <TruckIcon size={10} />
                          {language === 'fr' ? 'Non assigné' : 'Unassigned'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleToggleActive(chauffeur)} // ← appel modifié
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${chauffeur.active ? 'hover:bg-amber-100 dark:hover:bg-amber-900/20 text-amber-600/60 hover:text-amber-600' : 'hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-600/60 hover:text-emerald-600'}`}
                        title={chauffeur.active ? (language === 'fr' ? 'Désactiver' : 'Deactivate') : (language === 'fr' ? 'Activer' : 'Activate')}
                      >
                        {chauffeur.active ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button
                        onClick={() => handleEditClick(chauffeur)}
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(chauffeur.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Info Fields */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="shrink-0" />
                      <span>CIN: {chauffeur.cin}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="shrink-0" />
                      <span>{chauffeur.telephone || (language === 'fr' ? 'Non renseigné' : 'No phone')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="shrink-0" />
                      <span>{language === 'fr' ? 'Embauche: ' : 'Hired: '}{chauffeur.dateEmbauche || (language === 'fr' ? 'Non spécifiée' : 'N/A')}</span>
                    </div>
                  </div>

                  {/* Salary & Status */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                      <DollarSign size={14} />
                      <span>{fmtTND(Number(chauffeur.salaire))} TND</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${chauffeur.active ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200/50'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${chauffeur.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {chauffeur.active ? (language === 'fr' ? 'Actif' : 'Active') : (language === 'fr' ? 'Inactif' : 'Inactive')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Add Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Nouveau Chauffeur' : 'New Driver'}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /><span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Prénom *' : 'First Name *'}</label>
                  <input type="text" value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} className={inp} placeholder="Mohamed" />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Nom *' : 'Last Name *'}</label>
                  <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} className={inp} placeholder="Ben Ali" />
                </div>
              </div>
              <div>
                <label className={lbl}>CIN *</label>
                <input type="text" value={formData.cin} onChange={(e) => setFormData({ ...formData, cin: e.target.value })} className={inp} placeholder={language === 'fr' ? 'Numéro CIN (8 chiffres)' : 'CIN Number (8 digits)'} />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Téléphone' : 'Phone'}</label>
                <input type="text" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} className={inp} placeholder="+216 20 123 456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{language === 'fr' ? "Date d'embauche" : 'Hire Date'}</label>
                  <DatePicker selected={formData.dateEmbauche} onChange={(date: Date | null) => setFormData({ ...formData, dateEmbauche: date })} className={inp} placeholderText="YYYY-MM-DD" dateFormat="yyyy-MM-dd" />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Salaire mensuel (TND) *' : 'Monthly Salary (TND) *'}</label>
                  <input type="number" step="0.001" value={formData.salaire} onChange={(e) => setFormData({ ...formData, salaire: e.target.value })} className={inp} placeholder="1200.000" />
                </div>
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Camion' : 'Truck'}</label>
                <select value={formData.camionId} onChange={(e) => setFormData({ ...formData, camionId: e.target.value })} className={sel}>
                  <option value="">{language === 'fr' ? 'Aucun camion / Libre' : 'No truck / Free'}</option>
                  {camions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.matricule} {c.nomChauffeur ? `(${c.nomChauffeur})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all text-sm cursor-pointer">{language === 'fr' ? 'Annuler' : 'Cancel'}</button>
              <button onClick={handleAddChauffeur} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all text-sm cursor-pointer">{language === 'fr' ? 'Valider' : 'Submit'}</button>
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
              <h2 className="text-base font-bold text-foreground">{language === 'fr' ? 'Modifier Chauffeur' : 'Edit Driver'}</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /><span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Prénom *' : 'First Name *'}</label>
                  <input type="text" value={editFormData.prenom} onChange={(e) => setEditFormData({ ...editFormData, prenom: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Nom *' : 'Last Name *'}</label>
                  <input type="text" value={editFormData.nom} onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>CIN *</label>
                <input type="text" value={editFormData.cin} onChange={(e) => setEditFormData({ ...editFormData, cin: e.target.value })} className={inp} />
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Téléphone' : 'Phone'}</label>
                <input type="text" value={editFormData.telephone} onChange={(e) => setEditFormData({ ...editFormData, telephone: e.target.value })} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{language === 'fr' ? "Date d'embauche" : 'Hire Date'}</label>
                  <DatePicker selected={editFormData.dateEmbauche} onChange={(date: Date | null) => setEditFormData({ ...editFormData, dateEmbauche: date })} className={inp} placeholderText="YYYY-MM-DD" dateFormat="yyyy-MM-dd" />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Salaire mensuel (TND) *' : 'Monthly Salary (TND) *'}</label>
                  <input type="number" step="0.001" value={editFormData.salaire} onChange={(e) => setEditFormData({ ...editFormData, salaire: e.target.value })} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>{language === 'fr' ? 'Camion' : 'Truck'}</label>
                <select value={editFormData.camionId} onChange={(e) => setEditFormData({ ...editFormData, camionId: e.target.value })} className={sel}>
                  <option value="">{language === 'fr' ? 'Aucun camion / Libre' : 'No truck / Free'}</option>
                  {camions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.matricule} {c.nomChauffeur ? `(${c.nomChauffeur})` : ''}
                    </option>
                  ))}
                </select>
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
            <div className="px-7 py-6 space-y-4">
              {deleteConflictError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">{language === 'fr' ? 'Impossible de supprimer' : 'Cannot delete'}</span>
                    <span>{deleteConflictError}</span>
                  </div>
                </div>
              )}
              <p className="text-sm text-foreground/80 leading-relaxed">
                {language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce chauffeur ? Cette action est irréversible.' : 'Are you sure you want to delete this driver? This action cannot be undone.'}
              </p>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 text-amber-700 dark:text-amber-400 text-xs flex gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{language === 'fr' ? "Conseil : Désactivez plutôt le chauffeur s'il est assigné à un camion." : 'Tip: Consider deactivating the driver instead if they are assigned to a truck.'}</span>
              </div>
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
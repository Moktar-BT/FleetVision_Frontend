'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Plus, Edit2, Trash2, X, MapPin, Building2, TrendingUp, Search, Users, SlidersHorizontal, FileText } from 'lucide-react';
import { clientApi, ClientResponse } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

export default function ClientsPage() {
  const { language } = useApp();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [monthlyThreshold, setMonthlyThreshold] = useState(0);
  const [annualThreshold, setAnnualThreshold] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ nom: '', localisation: '', matF: '' });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: 0, nom: '', localisation: '', matF: '' });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientApi.getAll();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const maxMonthly = useMemo(() => Math.max(...clients.map(c => c.monthlyTurnover), 0), [clients]);
  const maxAnnual = useMemo(() => Math.max(...clients.map(c => c.annualTurnover), 0), [clients]);

  const filteredClients = useMemo(() => clients.filter(client => {
    const nameMatch = client.nom.toLowerCase().includes(nameFilter.toLowerCase());
    const monthlyMatch = client.monthlyTurnover >= monthlyThreshold;
    const annualMatch = client.annualTurnover >= annualThreshold;
    return nameMatch && monthlyMatch && annualMatch;
  }), [clients, nameFilter, monthlyThreshold, annualThreshold]);

  const handleAddClient = async () => {
    if (formData.nom && formData.localisation) {
      try {
        await clientApi.create({ nom: formData.nom, localisation: formData.localisation, matF: formData.matF });
        await loadClients();
        setFormData({ nom: '', localisation: '', matF: '' });
        setShowAddModal(false);
      } catch (err) { alert('Erreur lors de la création'); }
    }
  };

  const handleEditClick = (client: ClientResponse) => {
    setEditFormData({ id: client.id, nom: client.nom, localisation: client.localisation, matF: client.matF || '' });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (editFormData.nom && editFormData.localisation) {
      try {
        await clientApi.update(editFormData.id, { nom: editFormData.nom, localisation: editFormData.localisation, matF: editFormData.matF });
        await loadClients();
        setShowEditModal(false);
        setEditFormData({ id: 0, nom: '', localisation: '', matF: '' });
      } catch (err) { alert('Erreur lors de la modification'); }
    }
  };

  const handleDeleteClick = (id: number) => { setDeleteClientId(id); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (deleteClientId !== null) {
      try {
        await clientApi.delete(deleteClientId);
        await loadClients();
        setShowDeleteModal(false);
        setDeleteClientId(null);
      } catch (err) { alert('Erreur lors de la suppression'); }
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
  const labelClass = 'block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide';

  if (loading) return <ProtectedRoute><Loading fullScreen text={t(language, 'loading')} /></ProtectedRoute>;

  if (error) return (
    <ProtectedRoute>
      <div className="flex-1 flex items-center justify-center">
          <div className="text-destructive text-sm">Erreur : {error}</div>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      
          
          <div className="p-6 space-y-6">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder={language === 'fr' ? 'Rechercher un client...' : 'Search client...'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-foreground hover:bg-secondary'}`}
              >
                <SlidersHorizontal size={16} />
                {language === 'fr' ? 'Filtres CA' : 'Revenue Filters'}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                <Plus size={16} />
                {t(language, 'addClient')}
              </button>
            </div>

            {/* ── Revenue filters ─────────────────────────────────────────── */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-card rounded-2xl border border-border">
                <div>
                  <label className={labelClass}>
                    {language === 'fr' ? 'CA mensuel min.' : 'Min monthly revenue'} — {monthlyThreshold.toLocaleString()} TND
                  </label>
                  <input type="range" min="0" max={maxMonthly} step="100" value={monthlyThreshold}
                    onChange={(e) => setMonthlyThreshold(Number(e.target.value))}
                    className="w-full accent-primary mt-1" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span><span>{maxMonthly.toLocaleString()} TND</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    {language === 'fr' ? 'CA annuel min.' : 'Min annual revenue'} — {annualThreshold.toLocaleString()} TND
                  </label>
                  <input type="range" min="0" max={maxAnnual} step="1000" value={annualThreshold}
                    onChange={(e) => setAnnualThreshold(Number(e.target.value))}
                    className="w-full accent-primary mt-1" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span><span>{maxAnnual.toLocaleString()} TND</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Count ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {filteredClients.length} {language === 'fr' ? 'client(s)' : 'client(s)'}
              </span>
              {(nameFilter || monthlyThreshold > 0 || annualThreshold > 0) && (
                <span className="text-xs text-muted-foreground">
                  · {language === 'fr' ? `sur ${clients.length} au total` : `of ${clients.length} total`}
                </span>
              )}
            </div>

            {/* ── Cards ───────────────────────────────────────────────────── */}
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                <div className="p-4 bg-secondary rounded-2xl">
                  <Users size={32} className="opacity-40" />
                </div>
                <p className="text-sm font-medium">{language === 'fr' ? 'Aucun client trouvé' : 'No clients found'}</p>
                {clients.length === 0 && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm"
                  >
                    <Plus size={16} />
                    {language === 'fr' ? 'Ajouter votre premier client' : 'Add your first client'}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                  <div key={client.id} className="bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                            <Building2 size={18} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-foreground truncate">{client.nom}</h3>
                            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                              <MapPin size={13} className="shrink-0" />
                              <span className="text-xs truncate">{client.localisation}</span>
                            </div>
                            {/* Affichage du matricule fiscal */}
                            {client.matF && (
                              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                                <FileText size={11} className="shrink-0" />
                                <span className="text-[10px] truncate font-mono">{client.matF}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={() => handleEditClick(client)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDeleteClick(client.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-200/50 dark:border-blue-800/30">
                          <p className="text-xs text-muted-foreground mb-1">
                            {language === 'fr' ? 'CA mensuel' : 'Monthly'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-blue-600 shrink-0" />
                            <span className="text-sm font-bold text-blue-600 truncate">
                              {client.monthlyTurnover.toLocaleString()} TND
                            </span>
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 border border-green-200/50 dark:border-green-800/30">
                          <p className="text-xs text-muted-foreground mb-1">
                            {language === 'fr' ? 'CA annuel' : 'Annual'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-green-600 shrink-0" />
                            <span className="text-sm font-bold text-green-600 truncate">
                              {client.annualTurnover.toLocaleString()} TND
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {language === 'fr' ? 'Client' : 'Client'}
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

        {/* ── Add Modal ─────────────────────────────────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t(language, 'addClient')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'fr' ? 'Remplissez les informations du client' : 'Fill in the client information'}
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>
              <div className="px-7 py-6 space-y-4">
                <div>
                  <label className={labelClass}>{t(language, 'clientName')}</label>
                  <input type="text" value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder={language === 'fr' ? 'Nom du client' : 'Client name'}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t(language, 'location')}</label>
                  <input type="text" value={formData.localisation}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    placeholder={language === 'fr' ? 'Ville / Région' : 'City / Region'}
                    className={inputClass} />
                </div>
                {/* Nouveau champ Matricule fiscal */}
                <div>
                  <label className={labelClass}>
                    {language === 'fr' ? 'Matricule fiscal' : 'Tax registration number'}
                  </label>
                  <input type="text" value={formData.matF}
                    onChange={(e) => setFormData({ ...formData, matF: e.target.value })}
                    placeholder="1234567X"
                    className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                  {t(language, 'cancel')}
                </button>
                <button onClick={handleAddClient} disabled={!formData.nom || !formData.localisation}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {t(language, 'save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Modal ────────────────────────────────────────────────── */}
        {showEditModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t(language, 'editClient')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'fr' ? 'Modifiez les informations du client' : 'Edit the client information'}
                  </p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>
              <div className="px-7 py-6 space-y-4">
                <div>
                  <label className={labelClass}>{t(language, 'clientName')}</label>
                  <input type="text" value={editFormData.nom}
                    onChange={(e) => setEditFormData({ ...editFormData, nom: e.target.value })}
                    placeholder={language === 'fr' ? 'Nom du client' : 'Client name'}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t(language, 'location')}</label>
                  <input type="text" value={editFormData.localisation}
                    onChange={(e) => setEditFormData({ ...editFormData, localisation: e.target.value })}
                    placeholder={language === 'fr' ? 'Ville / Région' : 'City / Region'}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    {language === 'fr' ? 'Matricule fiscal' : 'Tax registration number'}
                  </label>
                  <input type="text" value={editFormData.matF}
                    onChange={(e) => setEditFormData({ ...editFormData, matF: e.target.value })}
                    placeholder="1234567X"
                    className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                <button onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                  {t(language, 'cancel')}
                </button>
                <button onClick={handleEditSave} disabled={!editFormData.nom || !editFormData.localisation}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {t(language, 'save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Modal (inchangé) ───────────────────────────────────── */}
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
                <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>
              <div className="px-7 py-6">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {language === 'fr'
                    ? 'Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.'
                    : 'Are you sure you want to delete this client? This action cannot be undone.'}
                </p>
                {deleteClientId != null && (() => {
                  const c = clients.find(c => c.id === deleteClientId);
                  return c ? (
                    <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                      <p className="text-sm font-semibold text-foreground">{c.nom}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                        <MapPin size={12} /><span className="text-xs">{c.localisation}</span>
                      </div>
                      {c.matF && (
                        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                          <FileText size={10} /><span className="text-[10px] font-mono">{c.matF}</span>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                  {t(language, 'cancel')}
                </button>
                <button onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all cursor-pointer text-sm">
                  {language === 'fr' ? 'Supprimer' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
    </ProtectedRoute>
  );
}
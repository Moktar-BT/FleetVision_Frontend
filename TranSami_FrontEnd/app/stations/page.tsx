'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { stationApi, StationResponse, StationRequest } from '@/lib/api-client';
import { Plus, MapPin, Loader2, AlertCircle, X, Edit2, Trash2, TrendingUp, Search, SlidersHorizontal } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

export default function StationsPage() {
  const { language } = useApp();
  const [stations, setStations] = useState<StationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [nameFilter, setNameFilter] = useState('');
  const [monthlyThreshold, setMonthlyThreshold] = useState(0);
  const [annualThreshold, setAnnualThreshold] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState<StationResponse | null>(null);
  const [formData, setFormData] = useState<StationRequest>({ nom: '', localisation: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stationToDelete, setStationToDelete] = useState<StationResponse | null>(null);

  useEffect(() => { loadStations(); }, []);

  const loadStations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stationApi.getAll();
      setStations(data);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const maxMonthly = useMemo(() => Math.max(...stations.map(s => s.totalMensuelle), 0), [stations]);
  const maxAnnual = useMemo(() => Math.max(...stations.map(s => s.totalAnnuelle), 0), [stations]);

  const filteredStations = useMemo(() => stations.filter(station => {
    const nameMatch = station.nom.toLowerCase().includes(nameFilter.toLowerCase());
    const monthlyMatch = station.totalMensuelle >= monthlyThreshold;
    const annualMatch = station.totalAnnuelle >= annualThreshold;
    return nameMatch && monthlyMatch && annualMatch;
  }), [stations, nameFilter, monthlyThreshold, annualThreshold]);

  const handleOpenAdd = () => {
    setEditingStation(null);
    setFormData({ nom: '', localisation: '' });
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (station: StationResponse) => {
    setEditingStation(station);
    setFormData({ nom: station.nom, localisation: station.localisation });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.nom.trim() || !formData.localisation?.trim()) {
      setFormError(language === 'fr' ? 'Tous les champs sont obligatoires' : 'All fields are required');
      return;
    }
    try {
      setFormLoading(true);
      setFormError(null);
      if (editingStation) {
        await stationApi.update(editingStation.id, formData);
      } else {
        await stationApi.create(formData);
      }
      await loadStations();
      setShowModal(false);
      setFormData({ nom: '', localisation: '' });
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!stationToDelete) return;
    try {
      await stationApi.delete(stationToDelete.id);
      await loadStations();
      setShowDeleteModal(false);
      setStationToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(value);

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
  const labelClass =
    'block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide';

  if (loading)
    return (
      <ProtectedRoute>
        <Loading fullScreen text={t(language, 'loading')} />
      </ProtectedRoute>
    );

  if (error)
    return (
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
                  placeholder={language === 'fr' ? 'Rechercher une station...' : 'Search station...'}
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
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm whitespace-nowrap"
              >
                <Plus size={16} />
                {t(language, 'newStation')}
              </button>
            </div>

            {/* ── Revenue filters ─────────────────────────────────────────── */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-card rounded-2xl border border-border">
                <div>
                  <label className={labelClass}>
                    {language === 'fr' ? 'Total mensuel min.' : 'Min monthly total'} — {monthlyThreshold.toLocaleString()} TND
                  </label>
                  <input
                    type="range" min="0" max={maxMonthly} step="100" value={monthlyThreshold}
                    onChange={(e) => setMonthlyThreshold(Number(e.target.value))}
                    className="w-full accent-primary mt-1"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span><span>{maxMonthly.toLocaleString()} TND</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    {language === 'fr' ? 'Total annuel min.' : 'Min annual total'} — {annualThreshold.toLocaleString()} TND
                  </label>
                  <input
                    type="range" min="0" max={maxAnnual} step="1000" value={annualThreshold}
                    onChange={(e) => setAnnualThreshold(Number(e.target.value))}
                    className="w-full accent-primary mt-1"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span><span>{maxAnnual.toLocaleString()} TND</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Count ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {filteredStations.length} {language === 'fr' ? 'station(s)' : 'station(s)'}
              </span>
              {(nameFilter || monthlyThreshold > 0 || annualThreshold > 0) && (
                <span className="text-xs text-muted-foreground">
                  · {language === 'fr' ? `sur ${stations.length} au total` : `of ${stations.length} total`}
                </span>
              )}
            </div>

            {/* ── Cards ───────────────────────────────────────────────────── */}
            {filteredStations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
                <div className="p-4 bg-secondary rounded-2xl">
                  <MapPin size={32} className="opacity-40" />
                </div>
                <p className="text-sm font-medium">
                  {language === 'fr' ? 'Aucune station trouvée' : 'No stations found'}
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm"
                >
                  <Plus size={16} />
                  {language === 'fr' ? 'Ajouter votre première station' : 'Add your first station'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStations.map((station) => (
                  <div
                    key={station.id}
                    className="bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
                    <div className="p-5">

                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                            <MapPin size={18} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-foreground truncate">{station.nom}</h3>
                            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                              <MapPin size={13} className="shrink-0" />
                              <span className="text-xs truncate">{station.localisation}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleOpenEdit(station)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => { setStationToDelete(station); setShowDeleteModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Monthly / Annual */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 border border-blue-200/50 dark:border-blue-800/30">
                          <p className="text-xs text-muted-foreground mb-1">{t(language, 'totalMonthly')}</p>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-blue-600 shrink-0" />
                            <span className="text-sm font-bold text-blue-600 truncate">
                              {station.totalMensuelle.toLocaleString()} TND
                            </span>
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 border border-green-200/50 dark:border-green-800/30">
                          <p className="text-xs text-muted-foreground mb-1">{t(language, 'totalAnnual')}</p>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={13} className="text-green-600 shrink-0" />
                            <span className="text-sm font-bold text-green-600 truncate">
                              {station.totalAnnuelle.toLocaleString()} TND
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Fuel breakdown */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">
                          {language === 'fr' ? 'Ce mois par type' : 'This month by type'}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center px-2 py-1.5 rounded-lg bg-secondary/50">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Diesel</p>
                            <p className="text-xs font-bold text-blue-600">{station.totalDieselMois.toLocaleString()}</p>
                          </div>
                          <div className="text-center px-2 py-1.5 rounded-lg bg-secondary/50">
                            <p className="text-[10px] text-muted-foreground mb-0.5">D50</p>
                            <p className="text-xs font-bold text-cyan-600">{station.totalDiesel50Mois.toLocaleString()}</p>
                          </div>
                          <div className="text-center px-2 py-1.5 rounded-lg bg-secondary/50">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Essence</p>
                            <p className="text-xs font-bold text-green-600">{station.totalEssenceMois.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {language === 'fr' ? 'Station' : 'Station'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {language === 'fr' ? 'Active' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {editingStation ? t(language, 'editStation') : t(language, 'newStation')}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingStation
                      ? (language === 'fr' ? 'Modifiez les informations de la station' : 'Edit station information')
                      : (language === 'fr' ? 'Remplissez les informations de la station' : 'Fill in station information')}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="px-7 py-6 space-y-4">
                {formError && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    {formError}
                  </div>
                )}
                <div>
                  <label className={labelClass}>{t(language, 'stationName')} *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder={language === 'fr' ? 'Ex: Station Total Tunis' : 'Ex: Total Station Tunis'}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t(language, 'location')} *</label>
                  <input
                    type="text"
                    value={formData.localisation || ''}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    placeholder={language === 'fr' ? 'Ex: Avenue Habib Bourguiba' : 'Ex: Habib Bourguiba Avenue'}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
                >
                  {t(language, 'cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={formLoading || !formData.nom.trim() || !formData.localisation?.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 size={16} className="animate-spin" />}
                  {t(language, 'save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Modal ──────────────────────────────────────────────── */}
        {showDeleteModal && stationToDelete && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-7 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-xl">
                    <Trash2 size={18} className="text-destructive" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{t(language, 'confirmDelete')}</h2>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <div className="px-7 py-6">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {language === 'fr'
                    ? 'Êtes-vous sûr de vouloir supprimer cette station ? Cette action est irréversible.'
                    : 'Are you sure you want to delete this station? This action cannot be undone.'}
                </p>
                <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-sm font-semibold text-foreground">{stationToDelete.nom}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                    <MapPin size={12} />
                    <span className="text-xs">{stationToDelete.localisation}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
                >
                  {t(language, 'cancel')}
                </button>
                <button
                  onClick={handleDelete}
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
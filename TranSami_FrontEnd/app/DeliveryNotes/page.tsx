'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import {
  Plus, X, Calendar, Truck, Trash2, Filter, Edit2,
  FileText, FileClock, CheckCircle2, Clock, Building,
  FileDown, Loader2, ArrowUpRight,
} from 'lucide-react';
import {
  bonDeLivraisonApi, BonDeLivraisonResponse, BonDeLivraisonRequest,
  camionApi, CamionResponse,
  clientApi, ClientResponse,
  fournisseurApi, FournisseurResponse,
  codeProduitApi, CodeProduitResponse,
  etatBLApi,
} from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;

// ── Date helpers ─────────────────────────────────────────────────────────────
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accentLine: string;
  iconBg: string;
  valueColor: string;
  sub?: string;
}

function StatCard({ icon, label, value, accentLine, iconBg, valueColor, sub }: StatCardProps) {
  return (
    <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className={`absolute inset-x-0 top-0 h-[2px] ${accentLine}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <p className={lbl}>{label}</p>
          <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
        </div>
        <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><ArrowUpRight size={11} />{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeliveryNotesPage() {
  const { language, darkMode } = useApp();

  const [deliveryNotes, setDeliveryNotes] = useState<BonDeLivraisonResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [fournisseurs, setFournisseurs] = useState<FournisseurResponse[]>([]);
  const [codesProduit, setCodesProduit] = useState<CodeProduitResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<BonDeLivraisonResponse | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState({
    dateStart: null as Date | null,
    dateEnd: null as Date | null,
    camionId: 'all',
    clientId: 'all',
    noteNumber: '',
    status: 'tous',
    blNumFournisseur: '',
  });

  const emptyForm = {
    numero: '',
    blNumFournisseur: '' as string,
    date: new Date(),
    quantite: '' as string,
    montantHt: 0,
    montantTtc: 0,
    camionId: '' as string,
    clientId: '' as string,
    codeProduitId: '' as string,
    fournisseurId: '' as string,
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadAll();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new' && params.get('camionId')) {
        setForm(prev => ({ ...prev, camionId: params.get('camionId') as string }));
        setShowAddModal(true);
      }
    }
  }, []);

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [bdl, trucks, cls, frs, codes] = await Promise.all([
        bonDeLivraisonApi.getAll(),
        camionApi.getAll(),
        clientApi.getAll(),
        fournisseurApi.getAll(),
        codeProduitApi.getAll(),
      ]);
      setDeliveryNotes(bdl); setCamions(trucks); setClients(cls);
      setFournisseurs(frs); setCodesProduit(codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  const loadBDL = async () => {
    try { setDeliveryNotes(await bonDeLivraisonApi.getAll()); } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const product = codesProduit.find(p => p.id === Number(form.codeProduitId));
    if (!product) return;
    const qty = parseFloat(form.quantite as string) || 0;
    const ht = qty * Number(product.unitPrice);
    const ttc = ht * (1 + Number(product.vat) / 100);
    setForm(prev => ({ ...prev, montantHt: parseFloat(ht.toFixed(2)), montantTtc: parseFloat(ttc.toFixed(2)) }));
  }, [form.codeProduitId, form.quantite, codesProduit]);

  const selectedProduct = codesProduit.find(p => p.id === Number(form.codeProduitId));
  const canExport = !!(filters.dateStart && filters.dateEnd);

  const handleExportPdf = async () => {
    setExportError(null);
    if (!filters.dateStart || !filters.dateEnd) {
      setExportError(language === 'fr'
        ? 'Veuillez sélectionner une date de début et une date de fin.'
        : 'Please select a start date and end date.');
      return;
    }
    setExporting(true);
    try {
      await etatBLApi.downloadPdf({
        dateFrom: formatLocalDate(filters.dateStart),
        dateTo: formatLocalDate(filters.dateEnd),
        clientId: filters.clientId !== 'all' ? Number(filters.clientId) : null,
        camionId: filters.camionId !== 'all' ? Number(filters.camionId) : null,
        fournisseurId: null,
        statut: filters.status !== 'tous' ? (filters.status as 'FACTURE' | 'NON_FACTURE') : null,
      });
    } catch (e: any) {
      setExportError(e.message || 'Erreur lors de la génération du PDF');
    } finally { setExporting(false); }
  };

  const filteredNotes = useMemo(() => {
    return deliveryNotes.filter(note => {
      const camionMatch = filters.camionId === 'all' || note.camionId === Number(filters.camionId);
      const clientMatch = filters.clientId === 'all' || note.clientId === Number(filters.clientId);
      const statusMatch = filters.status === 'tous' || note.statut === filters.status;
      const numberMatch = !filters.noteNumber || note.numero.toLowerCase().includes(filters.noteNumber.toLowerCase());
      const blMatch = !filters.blNumFournisseur || (note.blNumFournisseur != null && String(note.blNumFournisseur).includes(filters.blNumFournisseur));

      let dateMatch = true;
      if (filters.dateStart || filters.dateEnd) {
        const noteDate = parseLocalDate(note.date);
        if (filters.dateStart) {
          const start = new Date(filters.dateStart.getFullYear(), filters.dateStart.getMonth(), filters.dateStart.getDate());
          if (noteDate < start) dateMatch = false;
        }
        if (filters.dateEnd && dateMatch) {
          const end = new Date(filters.dateEnd.getFullYear(), filters.dateEnd.getMonth(), filters.dateEnd.getDate());
          if (noteDate > end) dateMatch = false;
        }
      }

      return camionMatch && clientMatch && statusMatch && numberMatch && blMatch && dateMatch;
    }).sort((a, b) => {
      const diff = parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime();
      return diff !== 0 ? diff : b.numero.localeCompare(a.numero, undefined, { numeric: true });
    });
  }, [deliveryNotes, filters]);

  const handleSave = async () => {
    if (!form.numero || !form.camionId || !form.clientId || !form.codeProduitId) {
      alert(language === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill all required fields');
      return;
    }
    if (!form.quantite || parseFloat(form.quantite as string) <= 0) {
      alert(language === 'fr' ? 'La quantité doit être positive' : 'Quantity must be positive');
      return;
    }
    setSaving(true);
    try {
      const payload: BonDeLivraisonRequest = {
        numero: form.numero,
        blNumFournisseur: form.blNumFournisseur ? Number(form.blNumFournisseur) : null,
        date: formatLocalDate(form.date),
        quantite: parseFloat(form.quantite as string),
        montantHt: form.montantHt,
        montantTtc: form.montantTtc,
        statut: 'NON_FACTURE',
        camionId: Number(form.camionId),
        clientId: Number(form.clientId),
        codeProduitId: Number(form.codeProduitId),
        fournisseurId: form.fournisseurId ? Number(form.fournisseurId) : null,
      };
      if (editingNote) { await bonDeLivraisonApi.update(editingNote.id, payload); }
      else { await bonDeLivraisonApi.create(payload); }
      await loadBDL();
      setShowAddModal(false); setEditingNote(null); setForm(emptyForm);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const handleEdit = (note: BonDeLivraisonResponse) => {
    setEditingNote(note);
    setForm({
      numero: note.numero,
      blNumFournisseur: note.blNumFournisseur != null ? String(note.blNumFournisseur) : '',
      date: parseLocalDate(note.date),
      quantite: String(note.quantite),
      montantHt: Number(note.montantHt),
      montantTtc: Number(note.montantTtc),
      camionId: String(note.camionId),
      clientId: String(note.clientId),
      codeProduitId: String(note.codeProduitId),
      fournisseurId: note.fournisseurId ? String(note.fournisseurId) : '',
    });
    setShowAddModal(true);
  };

  const handleDeleteClick = (id: number) => { setDeleteNoteId(id); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (deleteNoteId === null) return;
    try {
      await bonDeLivraisonApi.delete(deleteNoteId);
      await loadBDL();
      setShowDeleteModal(false); setDeleteNoteId(null);
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur lors de la suppression'); }
  };

  const clearFilters = () => {
    setExportError(null);
    setFilters({ dateStart: null, dateEnd: null, camionId: 'all', clientId: 'all', noteNumber: '', status: 'tous', blNumFournisseur: '' });
  };

  const invoicedCount = deliveryNotes.filter(n => n.statut === 'FACTURE').length;
  const notInvoicedCount = deliveryNotes.filter(n => n.statut === 'NON_FACTURE').length;
  const totalHt = deliveryNotes.reduce((sum, n) => sum + Number(n.montantHt), 0);
  const getTruckMatricule = (camionId: number) => camions.find(c => c.id === camionId)?.matricule || `#${camionId}`;

  if (loading) return (
    <ProtectedRoute>
      <Loading fullScreen text={language === 'fr' ? 'Chargement...' : 'Loading...'} />
    </ProtectedRoute>
  );

  if (error) return (
    <ProtectedRoute>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-destructive text-sm">Erreur : {error}</p>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {language === 'fr' ? 'Gestion des Bons de Livraison' : 'Delivery Notes Management'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {deliveryNotes.length} {language === 'fr' ? 'bon(s) enregistré(s)' : 'note(s) on record'}
            </p>
          </div>
          <button
            onClick={() => { setEditingNote(null); setForm(emptyForm); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm"
          >
            <Plus size={16} />
            {language === 'fr' ? 'Nouveau Bon' : 'New Note'}
          </button>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<CheckCircle2 size={16} className="text-emerald-600" />}
            label={language === 'fr' ? 'Facturés' : 'Invoiced'}
            value={invoicedCount}
            accentLine="bg-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
            valueColor="text-emerald-600"
          />
          <StatCard
            icon={<Clock size={16} className={darkMode ? "text-amber-600" : "text-primary"} />}
            label={language === 'fr' ? 'Non facturés' : 'Not invoiced'}
            value={notInvoicedCount}
            accentLine={darkMode ? "bg-amber-500" : "bg-primary"}
            iconBg={darkMode ? "bg-amber-50 dark:bg-amber-900/20" : "bg-primary/10"}
            valueColor={darkMode ? "text-amber-600" : "text-primary"}
          />
          <StatCard
            icon={<FileText size={16} className="text-blue-600" />}
            label={language === 'fr' ? 'Total HT' : 'Total (excl. tax)'}
            value={`${totalHt.toLocaleString()} TND`}
            accentLine="bg-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-900/20"
            valueColor="text-blue-600"
          />
        </div>

        {/* ── Filters panel ────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
          <div className="p-5 space-y-4">

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
                    {language === 'fr' ? 'Affinez les résultats et exportez' : 'Refine results and export'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {filteredNotes.length} {language === 'fr' ? 'résultats' : 'results'}
                </span>
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
                  <X size={10} />{language === 'fr' ? 'Réinitialiser' : 'Reset'}
                </button>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date début' : 'Start date'}</span></label>
                <DatePicker
                  selected={filters.dateStart}
                  onChange={(date: Date | null) => { setExportError(null); setFilters({ ...filters, dateStart: date }); }}
                  placeholderText={language === 'fr' ? 'Début' : 'Start'}
                  className={inp}
                  dateFormat="yyyy-MM-dd"
                  isClearable
                />
              </div>
              <div>
                <label className={lbl}>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {language === 'fr' ? 'Date fin (incluse)' : 'End date (inclusive)'}
                  </span>
                </label>
                <DatePicker
                  selected={filters.dateEnd}
                  onChange={(date: Date | null) => { setExportError(null); setFilters({ ...filters, dateEnd: date }); }}
                  placeholderText={language === 'fr' ? 'Fin (incluse)' : 'End (inclusive)'}
                  className={inp}
                  dateFormat="yyyy-MM-dd"
                  isClearable
                />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><FileText size={10} />{language === 'fr' ? 'N° de bon' : 'Note number'}</span></label>
                <input type="text" value={filters.noteNumber}
                  onChange={(e) => setFilters({ ...filters, noteNumber: e.target.value })}
                  placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'} className={inp} />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><FileText size={10} />{language === 'fr' ? 'N° BL Fournisseur' : 'Supplier BL'}</span></label>
                <input type="text" value={filters.blNumFournisseur}
                  onChange={(e) => setFilters({ ...filters, blNumFournisseur: e.target.value })}
                  placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'} className={inp} />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Truck size={10} />{language === 'fr' ? 'Camion' : 'Truck'}</span></label>
                <select value={filters.camionId} onChange={(e) => setFilters({ ...filters, camionId: e.target.value })} className={sel}>
                  <option value="all">{language === 'fr' ? 'Tous les camions' : 'All trucks'}</option>
                  {camions.map(c => <option key={c.id} value={c.id}>{c.matricule} — {c.nomChauffeur}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Building size={10} />{language === 'fr' ? 'Client' : 'Customer'}</span></label>
                <select value={filters.clientId} onChange={(e) => setFilters({ ...filters, clientId: e.target.value })} className={sel}>
                  <option value="all">{language === 'fr' ? 'Tous les clients' : 'All customers'}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><FileClock size={10} />{language === 'fr' ? 'Statut' : 'Status'}</span></label>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={sel}>
                  <option value="tous">{language === 'fr' ? 'Tous' : 'All'}</option>
                  <option value="FACTURE">{language === 'fr' ? 'Facturé' : 'Invoiced'}</option>
                  <option value="NON_FACTURE">{language === 'fr' ? 'Non facturé' : 'Not invoiced'}</option>
                </select>
              </div>
            </div>

            {/* Export row */}
            <div className="flex items-center gap-3 pt-3 border-t border-border/50">
              <button
                onClick={handleExportPdf}
                disabled={exporting || !canExport}
                title={!canExport ? (language === 'fr' ? 'Sélectionnez une période pour exporter' : 'Select a period to export') : undefined}
                className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm ${canExport
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
              >
                {exporting
                  ? <><Loader2 size={14} className="animate-spin" />{language === 'fr' ? 'Génération...' : 'Generating...'}</>
                  : <><FileDown size={14} />{language === 'fr' ? 'Exporter État BL (PDF)' : 'Export BL Report (PDF)'}</>}
              </button>
              {!canExport && !exportError && (
                <p className="text-xs text-muted-foreground italic">
                  {language === 'fr' ? "← Sélectionnez une période pour activer l'export" : '← Select a date range to enable export'}
                </p>
              )}
              {exportError && <p className="text-xs text-destructive font-medium">{exportError}</p>}
            </div>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
          <div className="overflow-x-auto overflow-y-auto max-h-[440px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-secondary border-b border-border">
                  {[
                    language === 'fr' ? 'N° Bon' : 'Note No',
                    language === 'fr' ? 'Produit' : 'Product',
                    language === 'fr' ? 'Client' : 'Customer',
                    language === 'fr' ? 'N° BL Fourn.' : 'Supplier BL',
                    language === 'fr' ? 'Date' : 'Date',
                    language === 'fr' ? 'Camion' : 'Truck',
                    language === 'fr' ? 'Qté' : 'Qty',
                    'Montant HT',
                    'Montant TTC',
                    language === 'fr' ? 'Statut' : 'Status',
                    'Actions',
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="p-4 bg-secondary rounded-2xl">
                          <FileText size={28} className="opacity-40" />
                        </div>
                        <p className="text-sm font-medium">
                          {language === 'fr' ? 'Aucun bon de livraison trouvé' : 'No delivery notes found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map(note => (
                    <tr key={note.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                          {note.numero}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary text-foreground text-xs font-semibold">
                          {note.codeProduitCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground">{note.clientNom}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{note.blNumFournisseur ?? '—'}</td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">{note.date}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Truck size={11} className="text-primary shrink-0" />
                          {getTruckMatricule(note.camionId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-foreground">
                        {note.quantite} <span className="font-normal text-muted-foreground">{note.codeProduitUnit || ''}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground">
                        {Number(note.montantHt).toLocaleString()} <span className="text-muted-foreground font-normal">TND</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-primary">
                        {Number(note.montantTtc).toLocaleString()} <span className="text-muted-foreground font-normal">TND</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${note.statut === 'FACTURE'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-700/40'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-700/40'}`}>
                          {note.statut === 'FACTURE'
                            ? <><CheckCircle2 size={10} />{language === 'fr' ? 'Facturé' : 'Invoiced'}</>
                            : <><Clock size={10} />{language === 'fr' ? 'Non facturé' : 'Not invoiced'}</>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(note)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/80 hover:text-blue-600 transition-all cursor-pointer">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteClick(note.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/80 hover:text-destructive transition-all cursor-pointer">
                            <Trash2 size={14} />
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
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border/50">
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingNote ? (language === 'fr' ? 'Modifier le Bon' : 'Edit Delivery Note') : (language === 'fr' ? 'Nouveau Bon de Livraison' : 'New Delivery Note')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'fr' ? 'Remplissez les informations du bon' : 'Fill in the delivery note details'}
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingNote(null); }}
                className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-7 py-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>{language === 'fr' ? 'N° de Bon *' : 'Note Number *'}</label>
                  <input type="text" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    placeholder="Ex: BL-2024-001" className={inp} />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'N° BL Fournisseur' : 'Supplier BL Number'}</label>
                  <input type="number" value={form.blNumFournisseur} onChange={(e) => setForm({ ...form, blNumFournisseur: e.target.value })}
                    placeholder={language === 'fr' ? 'Optionnel' : 'Optional'} className={inp} />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>{language === 'fr' ? 'Code Produit *' : 'Product Code *'}</label>
                  <select value={form.codeProduitId} onChange={(e) => setForm({ ...form, codeProduitId: e.target.value, quantite: '' })} className={sel}>
                    <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                    {codesProduit.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code}{p.description ? ` — ${p.description}` : ''} ({Number(p.unitPrice).toLocaleString()} TND / {p.unit})
                      </option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {Number(selectedProduct.unitPrice).toLocaleString()} TND / {selectedProduct.unit} · TVA {Number(selectedProduct.vat)}%
                    </p>
                  )}
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Client *' : 'Customer *'}</label>
                  <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={sel}>
                    <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom} — {c.localisation}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Fournisseur' : 'Supplier'}</label>
                  <select value={form.fournisseurId} onChange={(e) => setForm({ ...form, fournisseurId: e.target.value })} className={sel}>
                    <option value="">{language === 'fr' ? 'Aucun' : 'None'}</option>
                    {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom} — {f.localisation}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date *' : 'Date *'}</span></label>
                  <DatePicker selected={form.date} onChange={(date: Date | null) => setForm({ ...form, date: date || new Date() })}
                    className={`${inp} w-full`} wrapperClassName="w-full" popperClassName="z-[9999]"
                    dateFormat="yyyy-MM-dd" placeholderText={language === 'fr' ? 'Sélectionner une date' : 'Select a date'} />
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Camion *' : 'Truck *'}</label>
                  <select value={form.camionId} onChange={(e) => setForm({ ...form, camionId: e.target.value })} className={sel}>
                    <option value="">{language === 'fr' ? 'Sélectionner' : 'Select'}</option>
                    {camions.map(c => <option key={c.id} value={c.id}>{c.matricule} — {c.nomChauffeur}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>
                    {language === 'fr' ? 'Quantité' : 'Quantity'}{selectedProduct ? ` (${selectedProduct.unit})` : ''} *
                  </label>
                  <input
                    type="number"
                    value={form.quantite}
                    min="0"
                    step="0.00001"
                    onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                    placeholder="0"
                    className={`${inp} no-spinner`}
                    onWheel={(e) => e.preventDefault()}   // ← empêche la molette de changer la valeur
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={lbl}>{language === 'fr' ? 'Récapitulatif' : 'Summary'}</p>
                        {selectedProduct && form.quantite && Number(form.quantite) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {form.quantite} {selectedProduct.unit} × {Number(selectedProduct.unitPrice).toLocaleString()} TND
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          HT : <span className="font-bold text-foreground">{form.montantHt.toLocaleString()} TND</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          TTC : <span className="text-xl font-bold text-primary">{form.montantTtc.toLocaleString()} TND</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => { setShowAddModal(false); setEditingNote(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving
                  ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
                  : editingNote
                    ? (language === 'fr' ? 'Modifier le Bon' : 'Update Note')
                    : (language === 'fr' ? 'Créer le Bon' : 'Create Note')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ──────────────────────────────────────────────── */}
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
                {language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce bon de livraison ? Cette action est irréversible.' : 'Are you sure you want to delete this delivery note? This action cannot be undone.'}
              </p>
              {deleteNoteId != null && (() => {
                const n = deliveryNotes.find(n => n.id === deleteNoteId);
                return n ? (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-sm font-bold text-foreground">{n.numero}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.clientNom} · {n.date}</p>
                  </div>
                ) : null;
              })()}
            </div>
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                {language === 'fr' ? 'Annuler' : 'Cancel'}
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
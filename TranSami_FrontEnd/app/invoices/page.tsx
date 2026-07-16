'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/lib/context';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Plus, X, Trash2, Filter, FileText, CheckCircle2,
  Clock, AlertCircle, ChevronDown, Download, Building,
  RefreshCw, Hash, BadgeDollarSign, Calendar, Eye, Pencil,
  FileStack, ArrowUpRight, Truck,
} from 'lucide-react';
import {
  factureApi, clientApi, bonDeLivraisonApi,
  camionApi, CamionResponse,
  FactureResponse, FactureRequest,
  BonDeLivraisonResponse, ClientResponse, InvoiceStatus,
} from '@/lib/api-client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | undefined | null) => {
  if (n == null) return '0,000';
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(n));
};

// Ajuste une date à la fin du jour (23:59:59.999) pour une comparaison inclusive
const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;
const disabledInp = 'w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-muted-foreground text-sm cursor-not-allowed';

// Classe pour les inputs number sans flèches
const numberInputClass = `${inp} no-spinner`;

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, {
  labelFr: string; labelEn: string;
  badge: string; dot: string;
  icon: React.ReactNode;
}> = {
  Enattente: {
    labelFr: 'En attente', labelEn: 'Pending',
    badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-700/40',
    dot: 'bg-amber-500',
    icon: <Clock size={10} />,
  },
  Payee: {
    labelFr: 'Payée', labelEn: 'Paid',
    badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-700/40',
    dot: 'bg-emerald-500',
    icon: <CheckCircle2 size={10} />,
  },
};

// ─── Amount summary block ─────────────────────────────────────────────────────

function AmountSummary({ rows, totalLabel, totalValue, language }: {
  rows: { label: string; value: number }[];
  totalLabel: string;
  totalValue: number;
  language: string;
}) {
  return (
    <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 space-y-2.5 text-sm">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between text-muted-foreground">
          <span>{label}</span>
          <span className="font-semibold text-foreground">{fmt(value)} TND</span>
        </div>
      ))}
      <div className="flex justify-between font-bold text-base pt-3 border-t border-primary/20">
        <span className="text-foreground">{totalLabel}</span>
        <span className="text-primary text-2xl">{fmt(totalValue)} <span className="text-sm">TND</span></span>
      </div>
    </div>
  );
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({ current, language, onChange }: {
  current: InvoiceStatus; language: string; onChange: (s: InvoiceStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[current];
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors text-sm cursor-pointer">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg.badge}`}>
          {cfg.icon}{language === 'fr' ? cfg.labelFr : cfg.labelEn}
        </span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card rounded-xl shadow-lg border border-border z-10 overflow-hidden">
          {(Object.keys(STATUS_CONFIG) as InvoiceStatus[]).map(s => {
            const c = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-secondary/40 text-sm text-left transition-colors cursor-pointer">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${c.badge}`}>
                  {c.icon}{language === 'fr' ? c.labelFr : c.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ facture, language, onClose, onUpdated }: {
  facture: FactureResponse; language: string;
  onClose: () => void; onUpdated: (f: FactureResponse) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ statut: facture.statut });
  const bdlList = facture.bonsDeLivraison as { id: number; numero: string; montantHt: number }[];

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      let updated = facture;
      if (form.statut !== facture.statut) updated = await factureApi.updateStatut(facture.id, form.statut);
      onUpdated(updated);
    } catch (e: any) { setError(e.message || 'Erreur lors de la modification.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border/50">
        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {language === 'fr' ? 'Modifier la Facture' : 'Edit Invoice'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'fr' ? 'Facture' : 'Invoice'}{' '}
              <span className="font-bold text-primary">{facture.numero}</span> — {facture.clientNom}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-7 py-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{language === 'fr' ? 'N° Facture' : 'Invoice No'}</label>
              <input className={disabledInp} value={facture.numero} readOnly />
            </div>
            <div>
              <label className={lbl}>{language === 'fr' ? 'Client' : 'Client'}</label>
              <input className={disabledInp} value={facture.clientNom} readOnly />
            </div>
            <div>
              <label className={lbl}>{language === 'fr' ? 'Date' : 'Date'}</label>
              <input className={disabledInp} value={String(facture.date)} readOnly />
            </div>
            <div>
              <label className={lbl}>{language === 'fr' ? 'Statut' : 'Status'}</label>
              <select className={sel} value={form.statut}
                onChange={(e) => setForm(f => ({ ...f, statut: e.target.value as InvoiceStatus }))}>
                <option value="Enattente">{language === 'fr' ? 'En attente' : 'Pending'}</option>
                <option value="Payee">{language === 'fr' ? 'Payée' : 'Paid'}</option>
              </select>
            </div>
          </div>

          <AmountSummary
            rows={[
              { label: language === 'fr' ? 'Montant HTVA' : 'Amount excl. VAT', value: facture.montantHTVA },
              { label: language === 'fr' ? 'TVA' : 'VAT', value: facture.montantTVA },
              { label: language === 'fr' ? 'Droits de timbre' : 'Stamp duty', value: facture.droitsTimbre },
            ]}
            totalLabel="Total TTC"
            totalValue={facture.montantTTC}
            language={language}
          />

          <div>
            <p className={`${lbl} mb-2`}>
              {language === 'fr' ? 'Bons de livraison liés' : 'Linked delivery notes'} ({bdlList.length})
            </p>
            <div className="space-y-1.5">
              {bdlList.map(b => (
                <div key={b.id} className="flex justify-between items-center px-3 py-2 bg-secondary/50 rounded-xl border border-border/50">
                  <span className="font-medium text-foreground text-xs">BL {b.numero}</span>
                  <span className="text-primary font-bold text-xs">{fmt(b.montantHt)} TND HT</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <RefreshCw size={13} className="animate-spin" />}
            {saving ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') : (language === 'fr' ? 'Enregistrer' : 'Save changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal (with camions prop) ─────────────────────────────────────────

function CreateModal({ clients, camions, language, onClose, onCreated }: {
  clients: ClientResponse[];
  camions: CamionResponse[];
  language: string;
  onClose: () => void;
  onCreated: (f: FactureResponse) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ date: new Date(), clientId: '', droitsTimbre: '1' });
  const [bdls, setBdls] = useState<BonDeLivraisonResponse[]>([]);
  const [bdlsLoading, setBdlsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    noteNumber: '',
    dateStart: null as Date | null,
    dateEnd: null as Date | null,
    camionId: '',
  });

  const loadBdls = async (clientId: number) => {
    setBdlsLoading(true);
    try {
      const all = await bonDeLivraisonApi.getByClient(clientId);
      setBdls(all.filter(b => b.statut === 'NON_FACTURE'));
    } catch { setBdls([]); }
    finally { setBdlsLoading(false); }
  };

  const handleClientChange = (val: string) => {
    setForm(f => ({ ...f, clientId: val }));
    setSelectedIds([]);
    setFilters({ noteNumber: '', dateStart: null, dateEnd: null, camionId: '' });
    if (val) loadBdls(Number(val)); else setBdls([]);
  };

  const uniqueTrucks = useMemo(() => {
    const truckIdsFromBdls = new Set(bdls.map(b => b.camionId));
    return camions
      .filter(c => truckIdsFromBdls.has(c.id))
      .map(c => ({
        id: c.id,
        label: `${c.matricule} — ${c.nomChauffeur}`,
      }));
  }, [bdls, camions]);

  // Filtrage des BL avec date de fin inclusive
  const filteredBdls = useMemo(() => bdls.filter(b => {
    if (filters.camionId && String(b.camionId) !== filters.camionId) return false;
    if (filters.noteNumber && !b.numero.toLowerCase().includes(filters.noteNumber.toLowerCase())) return false;

    const d = new Date(b.date);
    d.setHours(0, 0, 0, 0);

    if (filters.dateStart) {
      const start = new Date(filters.dateStart);
      start.setHours(0, 0, 0, 0);
      if (d < start) return false;
    }
    if (filters.dateEnd) {
      const end = endOfDay(filters.dateEnd);
      if (d > end) return false;
    }
    return true;
  }), [bdls, filters]);

  const allSelected = filteredBdls.length > 0 && filteredBdls.every(b => selectedIds.includes(b.id));
  const toggleSelectAll = () => allSelected ? setSelectedIds([]) : setSelectedIds(filteredBdls.map(b => b.id));
  const toggleBdl = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectedBdls = bdls.filter(b => selectedIds.includes(b.id));
  const montantHTVA = selectedBdls.reduce((s, b) => s + Number(b.montantHt), 0);
  const montantTVA = selectedBdls.reduce((s, b) => s + (Number(b.montantTtc) - Number(b.montantHt)), 0);
  const droits = Number(form.droitsTimbre);
  const montantTTC = montantHTVA + montantTVA + droits;

  const hasFilters = filters.noteNumber !== '' || filters.dateStart !== null || filters.dateEnd !== null || filters.camionId !== '';

  const handleSubmit = async () => {
    if (!form.date || !form.clientId || selectedIds.length === 0) {
      setError(language === 'fr' ? 'Veuillez remplir tous les champs et sélectionner au moins un BL.' : 'Please fill all fields and select at least one delivery note.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload: FactureRequest = {
        date: form.date.toISOString().split('T')[0],
        clientId: Number(form.clientId),
        droitsTimbre: droits,
        bonDeLivraisonIds: selectedIds,
      };
      onCreated(await factureApi.create(payload));
    } catch (e: any) { setError(e.message || 'Erreur lors de la création.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {language === 'fr' ? 'Nouvelle Facture' : 'New Invoice'}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${step >= s ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>{s}</div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${step === s ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s === 1 ? (language === 'fr' ? 'Paramètres' : 'Settings') : (language === 'fr' ? 'Bons de livraison' : 'Delivery notes')}
                  </span>
                  {s < 2 && <div className={`w-8 h-px ${step > s ? 'bg-primary' : 'bg-border'}`} />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-7 py-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Calendar size={10} />{language === 'fr' ? 'Date *' : 'Date *'}</span></label>
                <DatePicker
                  selected={form.date}
                  onChange={(date: Date | null) => setForm(f => ({ ...f, date: date || new Date() }))}
                  className={inp}
                  dateFormat="yyyy-MM-dd"
                  placeholderText={language === 'fr' ? 'Sélectionner une date' : 'Select a date'}
                  isClearable
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}><span className="flex items-center gap-1"><Building size={10} />{language === 'fr' ? 'Client *' : 'Client *'}</span></label>
                  <select className={sel} value={form.clientId} onChange={(e) => handleClientChange(e.target.value)}>
                    <option value="">{language === 'fr' ? 'Sélectionner un client' : 'Select a client'}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>{language === 'fr' ? 'Droits de timbre (TND)' : 'Stamp duty (TND)'}</label>
                  <input
                    type="number"
                    step="0.001"
                    className={numberInputClass}
                    value={form.droitsTimbre}
                    onChange={(e) => setForm(f => ({ ...f, droitsTimbre: e.target.value }))}
                    onWheel={(e) => e.preventDefault()}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg"><Filter size={12} className="text-primary" /></div>
                      <p className={lbl + ' mb-0'}>{language === 'fr' ? 'Filtrer les bons' : 'Filter notes'}</p>
                    </div>
                    {hasFilters && (
                      <button
                        onClick={() => setFilters({ noteNumber: '', dateStart: null, dateEnd: null, camionId: '' })}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer">
                        <X size={10} />{language === 'fr' ? 'Effacer les filtres' : 'Clear filters'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>{language === 'fr' ? 'N° de bon' : 'Note number'}</label>
                      <input type="text" value={filters.noteNumber}
                        onChange={(e) => setFilters({ ...filters, noteNumber: e.target.value })}
                        placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>
                        <span className="flex items-center gap-1"><Truck size={10} />{language === 'fr' ? 'Camion' : 'Truck'}</span>
                      </label>
                      <select className={sel} value={filters.camionId}
                        onChange={(e) => setFilters({ ...filters, camionId: e.target.value })}>
                        <option value="">{language === 'fr' ? 'Tous les camions' : 'All trucks'}</option>
                        {uniqueTrucks.map(t => (
                          <option key={t.id} value={String(t.id)}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>{language === 'fr' ? 'Date début' : 'Start date'}</label>
                      <DatePicker
                        selected={filters.dateStart}
                        onChange={(date: Date | null) => setFilters({ ...filters, dateStart: date })}
                        placeholderText={language === 'fr' ? 'Début' : 'Start'}
                        className={inp}
                        dateFormat="yyyy-MM-dd"
                        isClearable
                      />
                    </div>
                    <div>
                      <label className={lbl}>
                        {language === 'fr' ? 'Date fin (incluse)' : 'End date (inclusive)'}
                      </label>
                      <DatePicker
                        selected={filters.dateEnd}
                        onChange={(date: Date | null) => setFilters({ ...filters, dateEnd: date })}
                        placeholderText={language === 'fr' ? 'Fin (incluse)' : 'End (inclusive)'}
                        className={inp}
                        dateFormat="yyyy-MM-dd"
                        isClearable
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className={lbl + ' mb-0'}>
                    {language === 'fr' ? 'Bons non facturés' : 'Uninvoiced notes'}
                    <span className="text-muted-foreground normal-case font-normal ml-1">
                      — {clients.find(c => c.id === Number(form.clientId))?.nom}
                    </span>
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {filteredBdls.length} {language === 'fr' ? 'bons' : 'notes'}
                  </span>
                </div>

                {filteredBdls.length > 0 && (
                  <label className="flex items-center gap-2.5 px-4 py-2.5 mb-2 rounded-xl bg-secondary/40 border border-border/50 cursor-pointer">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      {language === 'fr' ? 'Sélectionner tout' : 'Select all'}
                    </span>
                    {selectedIds.length > 0 && (
                      <span className="ml-auto text-[10px] text-primary font-semibold">
                        {selectedIds.length} {language === 'fr' ? 'sélectionné(s)' : 'selected'}
                      </span>
                    )}
                  </label>
                )}

                {bdlsLoading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    {language === 'fr' ? 'Chargement...' : 'Loading...'}
                  </div>
                ) : filteredBdls.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground bg-secondary/30 rounded-xl">
                    {language === 'fr' ? 'Aucun bon de livraison non facturé.' : 'No uninvoiced delivery notes.'}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {filteredBdls.map(b => {
                      const truck = camions.find(c => c.id === b.camionId);
                      const truckLabel = truck ? `${truck.matricule} — ${truck.nomChauffeur}` : (b.camionModele || `#${b.camionId}`);
                      return (
                        <label key={b.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${selectedIds.includes(b.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/40'}`}>
                          <input type="checkbox" checked={selectedIds.includes(b.id)} onChange={() => toggleBdl(b.id)} className="accent-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground">BL {b.numero}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {b.date}
                              {truckLabel && <> · <span className="inline-flex items-center gap-0.5"><Truck size={9} className="inline" /> {truckLabel}</span></>}
                              {b.fournisseurNom && <> · {b.fournisseurNom}</>}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-primary shrink-0">{fmt(b.montantHt)} TND HT</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedIds.length > 0 && (
                <AmountSummary
                  rows={[
                    { label: language === 'fr' ? 'Montant HTVA' : 'Amount excl. VAT', value: montantHTVA },
                    { label: language === 'fr' ? 'TVA' : 'VAT', value: montantTVA },
                    { label: language === 'fr' ? 'Droits de timbre' : 'Stamp duty', value: droits },
                  ]}
                  totalLabel="Total TTC"
                  totalValue={montantTTC}
                  language={language}
                />
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
          {step === 2 ? (
            <>
              <button onClick={() => setStep(1)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                {language === 'fr' ? '← Retour' : '← Back'}
              </button>
              <button onClick={handleSubmit} disabled={saving || selectedIds.length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <RefreshCw size={13} className="animate-spin" />}
                {saving ? (language === 'fr' ? 'Création...' : 'Creating...') : (language === 'fr' ? 'Créer la Facture' : 'Create Invoice')}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button onClick={() => {
                if (!form.date || !form.clientId) { setError(language === 'fr' ? 'Veuillez remplir tous les champs obligatoires.' : 'Please fill all required fields.'); return; }
                setError(''); setStep(2);
              }} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm">
                {language === 'fr' ? 'Suivant →' : 'Next →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ facture, language, onClose, onConfirm }: {
  facture: FactureResponse; language: string; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-xl"><Trash2 size={18} className="text-destructive" /></div>
            <h2 className="text-lg font-bold text-foreground">
              {language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <div className="px-7 py-6">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer cette facture ? Les bons de livraison associés seront détachés.' : 'Are you sure you want to delete this invoice? Linked delivery notes will be detached.'}
          </p>
          <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
            <p className="text-sm font-bold text-foreground">
              {language === 'fr' ? 'Facture' : 'Invoice'} <span className="text-primary">{facture.numero}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{facture.clientNom} · {fmt(facture.montantTTC)} TND TTC</p>
          </div>
        </div>
        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all cursor-pointer text-sm">
            {language === 'fr' ? 'Supprimer' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Side Panel ────────────────────────────────────────────────────────

function DetailPanel({ facture, language, onClose, onStatusChange, onEditClick, onDeleteClick }: {
  facture: FactureResponse; language: string;
  onClose: () => void;
  onStatusChange: (id: number, s: InvoiceStatus) => void;
  onEditClick: (f: FactureResponse) => void;
  onDeleteClick: (f: FactureResponse) => void;
}) {
  const bdlList = facture.bonsDeLivraison as { id: number; numero: string; montantHt: number }[];

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-xl"><FileText size={16} className="text-primary" /></div>
          <div>
            <p className="text-xs text-muted-foreground">{language === 'fr' ? 'Facture' : 'Invoice'}</p>
            <p className="text-sm font-bold text-primary">{facture.numero}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors cursor-pointer">
          <X size={15} className="text-muted-foreground" />
        </button>
      </div>

      <div className="p-5 space-y-4 text-sm">
        {[
          { label: language === 'fr' ? 'Client' : 'Client', value: facture.clientNom },
          { label: language === 'fr' ? 'Date' : 'Date', value: String(facture.date) },
          { label: language === 'fr' ? 'Droits timbre' : 'Stamp duty', value: `${fmt(facture.droitsTimbre)} TND` },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
            <span className="text-xs font-semibold text-foreground">{value}</span>
          </div>
        ))}

        <AmountSummary
          rows={[
            { label: 'HTVA', value: facture.montantHTVA },
            { label: language === 'fr' ? 'TVA' : 'VAT', value: facture.montantTVA },
          ]}
          totalLabel="TTC"
          totalValue={facture.montantTTC}
          language={language}
        />

        <div>
          <p className={`${lbl} mb-2`}>
            {language === 'fr' ? 'Bons de livraison' : 'Delivery notes'} ({bdlList.length})
          </p>
          <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
            {bdlList.map(b => (
              <div key={b.id} className="flex justify-between items-center px-3 py-2 bg-secondary/50 rounded-xl border border-border/50">
                <span className="text-xs font-medium text-foreground">BL {b.numero}</span>
                <span className="text-xs font-bold text-primary">{fmt(b.montantHt)} TND HT</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className={`${lbl} mb-2`}>{language === 'fr' ? 'Statut' : 'Status'}</p>
          <StatusDropdown current={facture.statut} language={language} onChange={(s) => onStatusChange(facture.id, s)} />
        </div>

        <div className="space-y-1.5">
          <p className={`${lbl} mb-2`}>{language === 'fr' ? 'Télécharger PDF' : 'Download PDF'}</p>
          <button onClick={() => factureApi.downloadDetaillee(facture.id).catch(e => alert(e.message))}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors cursor-pointer">
            <Download size={13} />{language === 'fr' ? 'Facture Détaillée (par BL)' : 'Detailed Invoice (per BL)'}
          </button>
          <button onClick={() => factureApi.downloadComprimee(facture.id).catch(e => alert(e.message))}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors border border-primary/20 cursor-pointer">
            <Download size={13} />{language === 'fr' ? 'Facture Comprimée (par produit)' : 'Compressed Invoice (per product)'}
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => onEditClick(facture)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors border border-blue-200/50 cursor-pointer">
            <Pencil size={13} />{language === 'fr' ? 'Modifier' : 'Edit'}
          </button>
          <button onClick={() => onDeleteClick(facture)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors border border-destructive/20 cursor-pointer">
            <Trash2 size={13} />{language === 'fr' ? 'Supprimer' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { language, darkMode } = useApp();
  const [invoices, setInvoices] = useState<FactureResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FactureResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<FactureResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FactureResponse | null>(null);

  const [filters, setFilters] = useState({
    invoiceId: '', clientId: 'all', minMontant: '', maxMontant: '', statut: 'tous',
  });

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [inv, cls, trucks] = await Promise.all([
        factureApi.getAll(),
        clientApi.getAll(),
        camionApi.getAll(),
      ]);
      setInvoices(inv); setClients(cls); setCamions(trucks);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => invoices.filter(inv => {
    if (filters.invoiceId && !inv.numero.includes(filters.invoiceId.trim())) return false;
    if (filters.clientId !== 'all' && inv.clientId !== Number(filters.clientId)) return false;
    if (filters.minMontant && inv.montantTTC < Number(filters.minMontant)) return false;
    if (filters.maxMontant && inv.montantTTC > Number(filters.maxMontant)) return false;
    if (filters.statut !== 'tous' && inv.statut !== filters.statut) return false;
    return true;
  }).sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    return diff !== 0 ? diff : b.numero.localeCompare(a.numero, undefined, { numeric: true });
  }), [invoices, filters]);

  const pendingCount = invoices.filter(i => i.statut === 'Enattente').length;
  const paidCount = invoices.filter(i => i.statut === 'Payee').length;
  const totalTTC = invoices.reduce((s, i) => s + Number(i.montantTTC), 0);
  const hasFilters = filters.invoiceId !== '' || filters.clientId !== 'all' || filters.minMontant !== '' || filters.maxMontant !== '' || filters.statut !== 'tous';
  const clearFilters = () => setFilters({ invoiceId: '', clientId: 'all', minMontant: '', maxMontant: '', statut: 'tous' });

  const handleStatusChange = async (id: number, statut: InvoiceStatus) => {
    try {
      const updated = await factureApi.updateStatut(id, statut);
      setInvoices(prev => prev.map(i => i.id === id ? updated : i));
      if (selected?.id === id) setSelected(updated);
    } catch (e: any) { alert(e.message); }
  };

  // Bascule directe du statut via le badge
  const handleStatusToggle = async (id: number, current: InvoiceStatus) => {
    const newStatus = current === 'Enattente' ? 'Payee' : 'Enattente';
    await handleStatusChange(id, newStatus);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await factureApi.delete(deleteTarget.id);
      setInvoices(prev => prev.filter(i => i.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdated = (updated: FactureResponse) => {
    setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
    if (selected?.id === updated.id) setSelected(updated);
    setEditTarget(null);
  };

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

        {/* ===== HEADER MODIFIÉ : bouton refresh supprimé ===== */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {language === 'fr' ? 'Gestion des Factures' : 'Invoice Management'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoices.length} {language === 'fr' ? 'facture(s) enregistrée(s)' : 'invoice(s) on record'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Le bouton de rafraîchissement a été supprimé */}
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm">
              <Plus size={16} />
              {language === 'fr' ? 'Nouvelle Facture' : 'New Invoice'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Clock size={16} className={darkMode ? "text-amber-600" : "text-primary"} />, label: language === 'fr' ? 'En attente' : 'Pending', value: pendingCount, accentLine: darkMode ? 'bg-amber-500' : 'bg-primary', iconBg: darkMode ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/10', valueColor: darkMode ? 'text-amber-600' : 'text-primary' },
            { icon: <CheckCircle2 size={16} className="text-emerald-600" />, label: language === 'fr' ? 'Payées' : 'Paid', value: paidCount, accentLine: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', valueColor: 'text-emerald-600' },
            { icon: <BadgeDollarSign size={16} className="text-blue-600" />, label: language === 'fr' ? 'Total TTC' : 'Total incl. VAT', value: `${fmt(totalTTC)} TND`, accentLine: 'bg-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-900/20', valueColor: 'text-blue-600' },
          ].map(({ icon, label, value, accentLine, iconBg, valueColor }) => (
            <div key={label} className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className={`absolute inset-x-0 top-0 h-[2px] ${accentLine}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <p className={lbl}>{label}</p>
                  <div className={`p-2 rounded-xl ${iconBg}`}>{icon}</div>
                </div>
                <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl"><Filter size={14} className="text-primary" /></div>
                <div>
                  <p className="text-sm font-bold text-foreground">{language === 'fr' ? 'Filtres avancés' : 'Advanced Filters'}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{language === 'fr' ? 'Affinez les résultats' : 'Refine results'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {filtered.length} {language === 'fr' ? 'résultats' : 'results'}
                </span>
                {hasFilters && (
                  <button onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
                    <X size={10} />{language === 'fr' ? 'Réinitialiser' : 'Reset'}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Hash size={10} />{language === 'fr' ? 'N° Facture' : 'Invoice No'}</span></label>
                <input type="text" className={inp} placeholder="Ex: 5/2026" value={filters.invoiceId}
                  onChange={(e) => setFilters(f => ({ ...f, invoiceId: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><Building size={10} />{language === 'fr' ? 'Client' : 'Client'}</span></label>
                <select className={sel} value={filters.clientId} onChange={(e) => setFilters(f => ({ ...f, clientId: e.target.value }))}>
                  <option value="all">{language === 'fr' ? 'Tous les clients' : 'All clients'}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><BadgeDollarSign size={10} />{language === 'fr' ? 'Montant min' : 'Min amount'}</span></label>
                <input
                  type="number"
                  className={numberInputClass}
                  placeholder="0"
                  value={filters.minMontant}
                  onChange={(e) => setFilters(f => ({ ...f, minMontant: e.target.value }))}
                  onWheel={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><BadgeDollarSign size={10} />{language === 'fr' ? 'Montant max' : 'Max amount'}</span></label>
                <input
                  type="number"
                  className={numberInputClass}
                  placeholder="∞"
                  value={filters.maxMontant}
                  onChange={(e) => setFilters(f => ({ ...f, maxMontant: e.target.value }))}
                  onWheel={(e) => e.preventDefault()}
                />
              </div>
              <div>
                <label className={lbl}><span className="flex items-center gap-1"><CheckCircle2 size={10} />{language === 'fr' ? 'Statut' : 'Status'}</span></label>
                <select className={sel} value={filters.statut} onChange={(e) => setFilters(f => ({ ...f, statut: e.target.value }))}>
                  <option value="tous">{language === 'fr' ? 'Tous' : 'All'}</option>
                  <option value="Enattente">{language === 'fr' ? 'En attente' : 'Pending'}</option>
                  <option value="Payee">{language === 'fr' ? 'Payée' : 'Paid'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid gap-5 ${selected ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={`${selected ? 'lg:col-span-2' : ''} bg-card rounded-2xl border border-border overflow-hidden`}>
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
            <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="bg-secondary border-b border-border">
                    {[
                      language === 'fr' ? 'N° Facture' : 'Invoice No',
                      language === 'fr' ? 'Date' : 'Date',
                      language === 'fr' ? 'Client' : 'Client',
                      'HTVA', language === 'fr' ? 'TVA' : 'VAT', 'TTC',
                      language === 'fr' ? 'Statut' : 'Status',
                      'N° BL',
                      language === 'fr' ? 'Actions' : 'Actions',
                    ].map(h => (
                      <th key={h} className="px-4 py-3.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <div className="p-4 bg-secondary rounded-2xl"><FileText size={28} className="opacity-40" /></div>
                          <p className="text-sm font-medium">{language === 'fr' ? 'Aucune facture trouvée' : 'No invoices found'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.map(inv => {
                    const cfg = STATUS_CONFIG[inv.statut];
                    const isSelected = selected?.id === inv.id;
                    return (
                      <tr key={inv.id} className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{inv.numero}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-foreground whitespace-nowrap">{String(inv.date)}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-foreground">{inv.clientNom}</td>
                        <td className="px-4 py-3.5 text-xs text-foreground">{fmt(inv.montantHTVA)}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-violet-600 dark:text-violet-400">{fmt(inv.montantTVA)}</td>
                        <td className="px-4 py-3.5 text-xs font-bold text-primary">{fmt(inv.montantTTC)}</td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => handleStatusToggle(inv.id, inv.statut)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cfg?.badge || ''} cursor-pointer hover:opacity-80 transition-opacity`}
                            title={language === 'fr' ? 'Cliquer pour basculer le statut' : 'Click to toggle status'}
                          >
                            {cfg?.icon}{language === 'fr' ? cfg?.labelFr : cfg?.labelEn}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] font-semibold text-muted-foreground">{inv.bonsDeLivraison.length} BL</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => setSelected(isSelected ? null : inv)} title={language === 'fr' ? 'Détail' : 'Details'}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'}`}>
                              <Eye size={14} />
                            </button>
                            <button onClick={() => setEditTarget(inv)} title={language === 'fr' ? 'Modifier' : 'Edit'}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteTarget(inv)} title={language === 'fr' ? 'Supprimer' : 'Delete'}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer">
                              <Trash2 size={14} />
                            </button>
                            <button onClick={() => factureApi.downloadDetaillee(inv.id).catch(e => alert(e.message))} title={language === 'fr' ? 'PDF Détaillé' : 'Detailed PDF'}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                              <FileText size={14} />
                            </button>
                            <button onClick={() => factureApi.downloadComprimee(inv.id).catch(e => alert(e.message))} title={language === 'fr' ? 'PDF Comprimé' : 'Compressed PDF'}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                              <FileStack size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selected && (
            <div className="lg:col-span-1">
              <DetailPanel facture={selected} language={language}
                onClose={() => setSelected(null)}
                onStatusChange={handleStatusChange}
                onEditClick={setEditTarget}
                onDeleteClick={setDeleteTarget}
              />
            </div>
          )}
        </div>
      </div>
      {showCreate && (
        <CreateModal
          clients={clients}
          camions={camions}
          language={language}
          onClose={() => setShowCreate(false)}
          onCreated={f => { setInvoices(prev => [f, ...prev]); setShowCreate(false); }}
        />
      )}
      {editTarget && <EditModal facture={editTarget} language={language} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} />}
      {deleteTarget && <DeleteModal facture={deleteTarget} language={language} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
    </ProtectedRoute>
  );
}
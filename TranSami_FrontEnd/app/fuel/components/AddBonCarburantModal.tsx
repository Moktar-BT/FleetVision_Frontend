'use client';

import { useState, useEffect } from 'react';
import {
  X, Loader2, Hash, Truck, MapPin, Calendar,
  Fuel, BadgeDollarSign, Gauge, AlertCircle, Settings2, Droplets,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  bonCarburantApi,
  stationApi,
  camionApi,
  prixCarburantApi,
} from '@/lib/api-client';
import type {
  BonCarburantRequest,
  BonCarburantResponse,
  StationResponse,
  CamionResponse,
  PrixCarburantResponse,
} from '@/lib/api-client';
import type { FuelType } from '@/lib/fuel.types';
import type { Language } from '@/lib/i18n';
import { t } from '@/lib/i18n';

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp =
  'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ' +
  'placeholder:text-muted-foreground/50 shadow-sm';
const lbl =
  'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const sel = `${inp} cursor-pointer`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddBonCarburantModalProps {
  isOpen: boolean;
  onClose: () => void;
  camionId?: number;
  language: Language;
  onSuccess: () => void;
  editBon?: BonCarburantResponse | null;
}

// ─── Fuel type label helper ───────────────────────────────────────────────────

function fuelTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  if (type === 'DIESEL_50') return 'Diesel 50';
  return type.charAt(0) + type.slice(1).toLowerCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddBonCarburantModal({
  isOpen,
  onClose,
  camionId,
  language,
  onSuccess,
  editBon,
}: AddBonCarburantModalProps) {
  const [stations, setStations] = useState<StationResponse[]>([]);
  const [camions, setCamions] = useState<CamionResponse[]>([]);
  const [prices, setPrices] = useState<PrixCarburantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [totalPriceVal, setTotalPriceVal] = useState<number | string>('');
  const [numeroBon, setNumeroBon] = useState('');

  // ── Fuel type is derived from the selected camion, not user input ──────────
  const [camionFuelType, setCamionFuelType] = useState<FuelType | null>(null);

  // ── Inline "configure prices" sub-modal ─────────────────────────────────
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({ prixEssence: '', prixDiesel: '', prixDiesel50: '' });
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BonCarburantRequest>({
    date: new Date().toISOString().split('T')[0],
    camionId: camionId || 0,
    stationId: 0,
    kilometrageActuel: 0,
    quantiteLitres: 0,
    typCarburant: 'DIESEL',
    prixLitre: 0,
  });

  // ── Load reference data whenever modal opens ──────────────────────────────

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, editBon]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── When camion changes, update the fuel type and price automatically ─────

  useEffect(() => {
    if (!formData.camionId || camions.length === 0) return;

    const selectedCamion = camions.find(c => c.id === formData.camionId);
    const fuelType = (selectedCamion?.fuelType ?? 'DIESEL') as FuelType;
    setCamionFuelType(fuelType);

    // Update price based on camion's fuel type
    let defaultPrice = 0;
    if (prices) {
      if (fuelType === 'DIESEL') defaultPrice = prices.prixDiesel;
      else if (fuelType === 'DIESEL_50') defaultPrice = prices.prixDiesel50;
      else if (fuelType === 'ESSENCE') defaultPrice = prices.prixEssence;
    }

    setFormData(prev => {
      const newTotal = prev.quantiteLitres * defaultPrice;
      if (newTotal > 0) setTotalPriceVal(Number(newTotal.toFixed(3)));
      return { ...prev, typCarburant: fuelType, prixLitre: defaultPrice };
    });
  }, [formData.camionId, camions, prices]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stationsData, camionsData, pricesData] = await Promise.all([
        stationApi.getAll(),
        camionApi.getAll(),
        prixCarburantApi.get().catch(() => null),
      ]);
      setStations(stationsData);
      setCamions(camionsData);
      setPrices(pricesData);

      if (editBon) {
        // ── Edit mode ──
        const date = new Date(editBon.date);
        setSelectedDate(date);
        setNumeroBon(editBon.numero ? String(editBon.numero) : '');

        const fuelType = editBon.typCarburant as FuelType;
        setCamionFuelType(fuelType);

        setFormData({
          date: editBon.date,
          camionId: editBon.camionId,
          stationId: editBon.stationId,
          kilometrageActuel: editBon.kilometrageActuel,
          quantiteLitres: editBon.quantiteLitres,
          typCarburant: fuelType,
          prixLitre: editBon.prixLitre,
        });
        setTotalPriceVal(
          Number((editBon.quantiteLitres * Number(editBon.prixLitre)).toFixed(3)),
        );
      } else {
        // ── Create mode ──
        const now = new Date();
        setSelectedDate(now);
        setNumeroBon('');

        const defaultCamionId =
          camionId || (camionsData.length > 0 ? camionsData[0].id : 0);
        const defaultStationId =
          stationsData.length > 0 ? stationsData[0].id : 0;

        // Resolve fuel type from the default camion
        const defaultCamion = camionsData.find(c => c.id === defaultCamionId);
        const fuelType = (defaultCamion?.fuelType ?? 'DIESEL') as FuelType;
        setCamionFuelType(fuelType);

        // Resolve price from fuel type
        let defaultPrice = 0;
        if (pricesData) {
          if (fuelType === 'DIESEL') defaultPrice = pricesData.prixDiesel;
          else if (fuelType === 'DIESEL_50') defaultPrice = pricesData.prixDiesel50;
          else if (fuelType === 'ESSENCE') defaultPrice = pricesData.prixEssence;
        }

        setFormData({
          date: now.toISOString().split('T')[0],
          camionId: defaultCamionId,
          stationId: defaultStationId,
          kilometrageActuel: 0,
          quantiteLitres: 0,
          typCarburant: fuelType,
          prixLitre: defaultPrice,
        });
        setTotalPriceVal('');
      }
    } catch (err: any) {
      let msg = err.message || 'Erreur lors du chargement';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.erreur) msg = parsed.erreur;
      } catch { /* ignore */ }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDateChange = (date: Date | null) => {
    const d = date || new Date();
    setSelectedDate(d);
    setFormData(prev => ({ ...prev, date: d.toISOString().split('T')[0] }));
  };

  const handleCamionChange = (camionIdVal: number) => {
    setFormData(prev => ({ ...prev, camionId: camionIdVal }));
  };

  const handleQuantityChange = (valStr: string) => {
    if (valStr === '') {
      setFormData(prev => ({ ...prev, quantiteLitres: 0 }));
      setTotalPriceVal('');
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) return;
    const total = val * formData.prixLitre;
    setFormData(prev => ({ ...prev, quantiteLitres: val }));
    setTotalPriceVal(total ? Number(total.toFixed(3)) : '');
  };

  const handleTotalPriceChange = (valStr: string) => {
    if (valStr === '') {
      setTotalPriceVal('');
      setFormData(prev => ({ ...prev, quantiteLitres: 0 }));
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) return;
    setTotalPriceVal(valStr);
    if (formData.prixLitre > 0) {
      // Calcul précis avec 8 décimales
      const qty = val / formData.prixLitre;
      setFormData(prev => ({
        ...prev,
        quantiteLitres: Number(qty.toFixed(8)),
      }));
    }
  };

  const handleOpenPriceModal = () => {
    setPriceForm({
      prixEssence: prices?.prixEssence != null ? String(prices.prixEssence) : '',
      prixDiesel: prices?.prixDiesel != null ? String(prices.prixDiesel) : '',
      prixDiesel50: prices?.prixDiesel50 != null ? String(prices.prixDiesel50) : '',
    });
    setPriceError(null);
    setShowPriceModal(true);
  };

  const handleSavePrices = async () => {
    if (!priceForm.prixEssence || !priceForm.prixDiesel || !priceForm.prixDiesel50) {
      setPriceError(language === 'fr' ? 'Tous les prix sont obligatoires' : 'All prices are required');
      return;
    }
    setPriceSaving(true);
    setPriceError(null);
    try {
      const updated = await prixCarburantApi.createOrUpdate({
        prixEssence: parseFloat(priceForm.prixEssence),
        prixDiesel: parseFloat(priceForm.prixDiesel),
        prixDiesel50: parseFloat(priceForm.prixDiesel50),
      });
      setPrices(updated);
      setShowPriceModal(false);

      // Re-derive the price/type for the currently selected camion now that
      // prices exist, so the form is pre-filled correctly.
      const selectedCamion = camions.find(c => c.id === formData.camionId);
      const fuelType = (selectedCamion?.fuelType ?? camionFuelType ?? 'DIESEL') as FuelType;
      let defaultPrice = 0;
      if (fuelType === 'DIESEL') defaultPrice = updated.prixDiesel;
      else if (fuelType === 'DIESEL_50') defaultPrice = updated.prixDiesel50;
      else if (fuelType === 'ESSENCE') defaultPrice = updated.prixEssence;
      setFormData(prev => ({ ...prev, prixLitre: defaultPrice }));
    } catch (err: any) {
      setPriceError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setPriceSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: BonCarburantRequest = {
        ...formData,
        numero: numeroBon || undefined,
      };
      if (editBon) {
        await bonCarburantApi.update(editBon.id, payload);
      } else {
        await bonCarburantApi.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      let userMessage = err.message || "Erreur lors de l'enregistrement";
      try {
        const parsed = JSON.parse(userMessage);
        if (parsed.erreur) userMessage = parsed.erreur;
      } catch { /* ignore */ }
      setError(userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = !!editBon;
  const pricesMissing = !loading && !prices;

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border/50">

        {/* Header */}
        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {isEdit
                ? language === 'fr' ? 'Modifier le Bon de Carburant' : 'Edit Fuel Receipt'
                : language === 'fr' ? 'Nouveau Bon de Carburant' : 'New Fuel Receipt'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? language === 'fr' ? 'Mettre à jour les informations du bon' : 'Update the receipt details'
                : language === 'fr' ? 'Remplissez les informations du bon' : 'Fill in the receipt details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : pricesMissing ? (
            // ── Blocage : prix des carburants non configurés ──────────────────
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/40">
                <AlertCircle size={28} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {language === 'fr' ? 'Prix des carburants non configurés' : 'Fuel prices not configured'}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                  {language === 'fr'
                    ? "Vous devez d'abord configurer les prix du Diesel, Diesel 50 et Essence avant de pouvoir créer un bon de carburant."
                    : 'You must configure the Diesel, Diesel 50 and Gasoline prices before you can create a fuel receipt.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenPriceModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-sm"
              >
                <Settings2 size={14} />
                {language === 'fr' ? 'Configurer les prix' : 'Configure prices'}
              </button>
            </div>
          ) : (
            <form id="bon-form" onSubmit={handleSubmit}>

              {error && (
                <div className="mb-5 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* N° de bon */}
                <div>
                  <label className={lbl}>
                    <span className="flex items-center gap-1">
                      <Hash size={10} />
                      {language === 'fr' ? 'N° de bon' : 'Receipt No.'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={numeroBon}
                    onChange={(e) => setNumeroBon(e.target.value)}
                    placeholder="Ex: BC-2024-001"
                    className={inp}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className={lbl}>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {t(language, 'date')}
                    </span>
                  </label>
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    className={inp}
                    wrapperClassName="w-full"
                    dateFormat="yyyy-MM-dd"
                    placeholderText={language === 'fr' ? 'Sélectionner une date' : 'Select a date'}
                    popperClassName="z-[9999]"
                  />
                </div>

                {/* Camion */}
                <div>
                  <label className={lbl}>
                    <span className="flex items-center gap-1">
                      <Truck size={10} />
                      {t(language, 'truck')}
                    </span>
                  </label>
                  <select
                    value={formData.camionId}
                    onChange={(e) => handleCamionChange(Number(e.target.value))}
                    className={sel}
                    disabled={!!camionId}
                  >
                    <option value={0}>
                      {language === 'fr' ? 'Sélectionner un camion' : 'Select a truck'}
                    </option>
                    {camions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.matricule} — {c.nomChauffeur}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Station */}
                <div>
                  <label className={lbl}>
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {t(language, 'station')}
                    </span>
                  </label>
                  <select
                    value={formData.stationId}
                    onChange={(e) =>
                      setFormData({ ...formData, stationId: Number(e.target.value) })
                    }
                    className={sel}
                  >
                    <option value={0}>
                      {language === 'fr' ? 'Sélectionner une station' : 'Select a station'}
                    </option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type de carburant — lecture seule, déduit du camion ─────── */}
                <div>
                  <label className={lbl}>
                    <span className="flex items-center gap-1">
                      <Fuel size={10} />
                      {t(language, 'fuelType')}
                    </span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border">
                    <Fuel size={14} className="text-primary shrink-0" />
                    <span className="text-sm font-semibold text-foreground">
                      {fuelTypeLabel(camionFuelType)}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground italic">
                      {language === 'fr' ? 'Déduit du camion' : 'From truck'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {language === 'fr' ? 'Prix/litre :' : 'Price/liter:'}{' '}
                    <span className="font-semibold text-primary">
                      {Number(formData.prixLitre).toFixed(3)} TND
                    </span>
                  </p>
                </div>

                {/* Kilométrage */}
                <div>
                  <label className={lbl}>
                    <span className="flex items-center gap-1">
                      <Gauge size={10} />
                      {t(language, 'mileage')} (km)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={formData.kilometrageActuel || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kilometrageActuel: Number(e.target.value),
                      })
                    }
                    className={`${inp} no-spinner`}
                    placeholder="120000"
                    min="0"
                    onWheel={(e) => e.preventDefault()}
                  />
                </div>

                {/* Quantité */}
                <div>
                  <label className={lbl}>{t(language, 'quantity')} (L)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.quantiteLitres || ''}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className={`${inp} no-spinner`}
                    placeholder="85.50000000"
                    min="0"
                    onWheel={(e) => e.preventDefault()}
                  />
                </div>

                {/* Prix total */}
                <div>
                  <label className={lbl}>
                    <span className="flex items-center gap-1">
                      <BadgeDollarSign size={10} />
                      {language === 'fr' ? 'Prix total (TND)' : 'Total price (TND)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={totalPriceVal}
                    onChange={(e) => handleTotalPriceChange(e.target.value)}
                    className={`${inp} no-spinner`}
                    placeholder="0.000"
                    min="0"
                    onWheel={(e) => e.preventDefault()}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {language === 'fr'
                      ? "Saisir la quantité ou le total — l'autre se calcule automatiquement"
                      : 'Enter quantity or total — the other is calculated automatically'}
                  </p>
                </div>

              </div>

              {/* Summary */}
              {formData.quantiteLitres > 0 && formData.prixLitre > 0 && (
                <div className="mt-5 bg-primary/5 rounded-2xl p-5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className={lbl}>
                        {language === 'fr' ? 'Récapitulatif' : 'Summary'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formData.quantiteLitres.toFixed(8)} L ×{' '}
                        {Number(formData.prixLitre).toFixed(3)} TND/L
                        {camionFuelType && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                            <Fuel size={9} />
                            {fuelTypeLabel(camionFuelType)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                        Total
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {(formData.quantiteLitres * Number(formData.prixLitre)).toFixed(3)}{' '}
                        <span className="text-sm font-normal text-muted-foreground">TND</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </form>
          )}
        </div>

        {/* Footer */}
        {!loading && !pricesMissing && (
          <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
            >
              {t(language, 'cancel')}
            </button>
            <button
              type="submit"
              form="bon-form"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {submitting
                ? language === 'fr' ? 'Enregistrement...' : 'Saving...'
                : isEdit
                  ? language === 'fr' ? 'Enregistrer les modifications' : 'Save changes'
                  : language === 'fr' ? 'Créer le bon' : 'Create receipt'}
            </button>
          </div>
        )}

      </div>

      {/* ── Sub-modal: configure fuel prices ─────────────────────────────── */}
      {showPriceModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Droplets size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {language === 'fr' ? 'Configurer les prix' : 'Configure prices'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'fr' ? 'Prix en dinars tunisiens par litre' : 'Prices in Tunisian dinars per litre'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPriceModal(false)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-4">
              {priceError && (
                <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {priceError}
                </div>
              )}

              <div>
                <label className={lbl}>
                  {t(language, 'priceDiesel')} <span className="text-muted-foreground normal-case tracking-normal font-normal">(TND/L)</span> *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={priceForm.prixDiesel}
                  onChange={(e) => setPriceForm({ ...priceForm, prixDiesel: e.target.value })}
                  className={`${inp} no-spinner`}
                  placeholder="1.950"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>

              <div>
                <label className={lbl}>
                  {t(language, 'priceDiesel50')} <span className="text-muted-foreground normal-case tracking-normal font-normal">(TND/L)</span> *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={priceForm.prixDiesel50}
                  onChange={(e) => setPriceForm({ ...priceForm, prixDiesel50: e.target.value })}
                  className={`${inp} no-spinner`}
                  placeholder="2.050"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>

              <div>
                <label className={lbl}>
                  {t(language, 'priceEssence')} <span className="text-muted-foreground normal-case tracking-normal font-normal">(TND/L)</span> *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={priceForm.prixEssence}
                  onChange={(e) => setPriceForm({ ...priceForm, prixEssence: e.target.value })}
                  className={`${inp} no-spinner`}
                  placeholder="2.150"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>
            </div>

            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button
                onClick={() => setShowPriceModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
              >
                {t(language, 'cancel')}
              </button>
              <button
                onClick={handleSavePrices}
                disabled={priceSaving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {priceSaving && <Loader2 size={14} className="animate-spin" />}
                {t(language, 'save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
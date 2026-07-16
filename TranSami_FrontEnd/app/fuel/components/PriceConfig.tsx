'use client';

import { useState } from 'react';
import { X, Loader2, Droplets, Settings2 } from 'lucide-react';
import { prixCarburantApi } from '@/lib/api-client';
import type { PrixCarburantResponse } from '@/lib/fuel.types';
import type { Language } from '@/lib/i18n';
import { t } from '@/lib/i18n';

interface PriceConfigProps {
  prices: PrixCarburantResponse | null;
  language: Language;
  onUpdate: () => void;
}

// ─── Fuel price pill ──────────────────────────────────────────────────────────

interface FuelPillProps {
  label: string;
  price: number;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  dotColor: string;
}

function FuelPill({ label, price, accentBg, accentText, accentBorder, dotColor }: FuelPillProps) {
  return (
    <div className={`rounded-2xl border p-4 ${accentBg} ${accentBorder}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <p className={`text-xs font-semibold uppercase tracking-widest ${accentText}`}>{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">
        {price.toFixed(3)}
        <span className="text-sm font-medium text-muted-foreground ml-1.5">TND/L</span>
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PriceConfig({ prices, language, onUpdate }: PriceConfigProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    prixEssence: prices?.prixEssence.toString() || '',
    prixDiesel: prices?.prixDiesel.toString() || '',
    prixDiesel50: prices?.prixDiesel50.toString() || '',
  });

  const handleOpen = () => {
    setFormData({
      prixEssence: prices?.prixEssence.toString() || '',
      prixDiesel: prices?.prixDiesel.toString() || '',
      prixDiesel50: prices?.prixDiesel50.toString() || '',
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.prixEssence || !formData.prixDiesel || !formData.prixDiesel50) {
      setError(language === 'fr' ? 'Tous les prix sont obligatoires' : 'All prices are required');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await prixCarburantApi.createOrUpdate({
        prixEssence: parseFloat(formData.prixEssence),
        prixDiesel: parseFloat(formData.prixDiesel),
        prixDiesel50: parseFloat(formData.prixDiesel50),
      });
      onUpdate();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
  const labelClass =
    'block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide';

  // Classe additionnelle pour supprimer les flèches
  const numberInputClass = `${inputClass} no-spinner`;

  return (
    <>
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Droplets size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{t(language, 'prices')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'fr' ? 'Prix officiels en vigueur' : 'Current official prices'}
                </p>
              </div>
            </div>
            <button
              onClick={handleOpen}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-colors cursor-pointer text-xs border border-border"
            >
              <Settings2 size={14} />
              {prices ? t(language, 'edit') : t(language, 'configurePrices')}
            </button>
          </div>

          {/* Price pills or empty state */}
          {prices ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FuelPill
                label={t(language, 'priceDiesel')}
                price={prices.prixDiesel}
                accentBg="bg-blue-50 dark:bg-blue-900/10"
                accentText="text-blue-600 dark:text-blue-400"
                accentBorder="border-blue-200/50 dark:border-blue-800/30"
                dotColor="bg-blue-500"
              />
              <FuelPill
                label={t(language, 'priceDiesel50')}
                price={prices.prixDiesel50}
                accentBg="bg-cyan-50 dark:bg-cyan-900/10"
                accentText="text-cyan-600 dark:text-cyan-400"
                accentBorder="border-cyan-200/50 dark:border-cyan-800/30"
                dotColor="bg-cyan-500"
              />
              <FuelPill
                label={t(language, 'priceEssence')}
                price={prices.prixEssence}
                accentBg="bg-green-50 dark:bg-green-900/10"
                accentText="text-green-600 dark:text-green-400"
                accentBorder="border-green-200/50 dark:border-green-800/30"
                dotColor="bg-green-500"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="p-3 bg-secondary rounded-2xl">
                <Droplets size={24} className="text-muted-foreground opacity-40" />
              </div>
              <p className="text-sm text-muted-foreground">{t(language, 'noPricesConfigured')}</p>
              <button
                onClick={handleOpen}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-colors cursor-pointer text-xs"
              >
                <Settings2 size={13} />
                {t(language, 'configurePrices')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">{t(language, 'configurePrices')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'fr' ? 'Prix en dinars tunisiens par litre' : 'Prices in Tunisian dinars per litre'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-7 py-6 space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>
                  {t(language, 'priceDiesel')} <span className="text-muted-foreground normal-case tracking-normal font-normal">(TND/L)</span> *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.prixDiesel}
                  onChange={(e) => setFormData({ ...formData, prixDiesel: e.target.value })}
                  className={numberInputClass}
                  placeholder="1.950"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t(language, 'priceDiesel50')} <span className="text-muted-foreground normal-case tracking-normal font-normal">(TND/L)</span> *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.prixDiesel50}
                  onChange={(e) => setFormData({ ...formData, prixDiesel50: e.target.value })}
                  className={numberInputClass}
                  placeholder="2.050"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>

              <div>
                <label className={labelClass}>
                  {t(language, 'priceEssence')} <span className="text-muted-foreground normal-case tracking-normal font-normal">(TND/L)</span> *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.prixEssence}
                  onChange={(e) => setFormData({ ...formData, prixEssence: e.target.value })}
                  className={numberInputClass}
                  placeholder="2.150"
                  onWheel={(e) => e.preventDefault()}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm"
              >
                {t(language, 'cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {t(language, 'save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
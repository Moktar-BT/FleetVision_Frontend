'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { t } from '@/lib/i18n';
import { Plus, Edit2, Trash2, X, Package, AlertTriangle, Search, ArrowUpRight } from 'lucide-react';
import {
  codeProduitApi, CodeProduitResponse, CodeProduitRequest,
} from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/Loading';

const COMMON_UNITS = ['T', 'V', 'H', 'J', 'M', 'KM'];

// Styles partagés
const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const labelClass = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
const selectClass = `${inputClass} cursor-pointer`;

// Classe pour les inputs number sans flèches
const numberInputClass = `${inputClass} no-spinner`;

export default function ProductsPage() {
  const { language } = useApp();
  const [products, setProducts] = useState<CodeProduitResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CodeProduitResponse | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const emptyForm: Partial<CodeProduitRequest> = { code: '', description: '', unitPrice: undefined, unit: 'T', vat: 7 };
  const [formData, setFormData] = useState<Partial<CodeProduitRequest>>(emptyForm);
  const [customUnit, setCustomUnit] = useState(false);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true); setError(null);
    try {
      setProducts(await codeProduitApi.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  const validate = () => {
    if (!formData.code) {
      setModalError(language === 'fr' ? 'Le code est obligatoire' : 'Code is required');
      return false;
    }
    if (!formData.unitPrice || formData.unitPrice <= 0) {
      setModalError(language === 'fr' ? 'Le prix unitaire doit être positif' : 'Unit price must be positive');
      return false;
    }
    if (!formData.unit?.trim()) {
      setModalError(language === 'fr' ? "L'unité est obligatoire" : 'Unit is required');
      return false;
    }
    setModalError(null);
    return true;
  };

  const buildPayload = (): CodeProduitRequest => ({
    code: formData.code!,
    description: formData.description || undefined,
    unitPrice: Number(formData.unitPrice),
    unit: formData.unit!.trim(),
    vat: Number(formData.vat ?? 7),
  });

  const handleAddProduct = async () => {
    if (!validate()) return;
    try {
      await codeProduitApi.create(buildPayload());
      await loadAllData();
      setShowAddModal(false);
      resetForm();
    } catch {
      setModalError(language === 'fr' ? 'Une erreur est survenue, veuillez réessayer.' : 'An error occurred, please try again.');
    }
  };

  const handleEditClick = (product: CodeProduitResponse) => {
    setEditingProduct(product);
    setFormData({ code: product.code, description: product.description || '', unitPrice: product.unitPrice, unit: product.unit, vat: product.vat });
    setCustomUnit(!COMMON_UNITS.includes(product.unit));
    setModalError(null);
    setShowEditModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !validate()) return;
    try {
      await codeProduitApi.update(editingProduct.id, buildPayload());
      await loadAllData();
      setShowEditModal(false);
      resetForm();
    } catch {
      setModalError(language === 'fr' ? 'Une erreur est survenue, veuillez réessayer.' : 'An error occurred, please try again.');
    }
  };

  const handleDeleteClick = (id: number) => { setDeleteProductId(id); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (deleteProductId === null) return;
    try {
      await codeProduitApi.delete(deleteProductId);
      await loadAllData();
      setShowDeleteModal(false);
      setDeleteProductId(null);
    } catch (err: any) {
      setShowDeleteModal(false);
      setShowDeleteErrorModal(true);
    }
  };

  const resetForm = () => { setFormData(emptyForm); setEditingProduct(null); setCustomUnit(false); setModalError(null); };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.code.toLowerCase().includes(q) || (p.description?.toLowerCase() || '').includes(q);
  });

  const avgPrice = products.length > 0 ? products.reduce((s, p) => s + Number(p.unitPrice), 0) / products.length : 0;

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

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {language === 'fr' ? 'Codes Produits' : 'Product Codes'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {products.length} {language === 'fr' ? 'produit(s) enregistré(s)' : 'product(s) on record'}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm shadow-sm"
          >
            <Plus size={16} />
            {t(language, 'addProduct')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-primary" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={labelClass}>{language === 'fr' ? 'Total produits' : 'Total products'}</p>
                <div className="p-2 rounded-xl bg-primary/10"><Package size={16} className="text-primary" /></div>
              </div>
              <p className="text-2xl font-bold text-foreground leading-none">{products.length}</p>
            </div>
          </div>

          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={labelClass}>{language === 'fr' ? 'Prix moyen' : 'Avg. price'}</p>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20"><ArrowUpRight size={16} className="text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold text-blue-600 leading-none">
                {avgPrice.toLocaleString('fr-TN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-medium text-muted-foreground ml-1.5">TND</span>
              </p>
            </div>
          </div>

          <div className="relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-500" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className={labelClass}>{language === 'fr' ? 'Unités distinctes' : 'Distinct units'}</p>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><Package size={16} className="text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold text-emerald-600 leading-none">
                {new Set(products.map(p => p.unit)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={language === 'fr' ? 'Rechercher par code ou description...' : 'Search by code or description...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {filteredProducts.length} {language === 'fr' ? 'résultat(s)' : 'result(s)'}
            </span>
            {searchQuery && (
              <span className="text-xs text-muted-foreground">
                {language === 'fr' ? `sur ${products.length} au total` : `of ${products.length} total`}
              </span>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-primary/60 to-primary/20" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card">
                <tr className="bg-secondary border-b border-border">
                  {[
                    language === 'fr' ? 'Code produit' : 'Product Code',
                    language === 'fr' ? 'Description' : 'Description',
                    language === 'fr' ? 'Prix unitaire' : 'Unit Price',
                    language === 'fr' ? 'Unité' : 'Unit',
                    'TVA',
                    language === 'fr' ? 'Actions' : 'Actions',
                  ].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="p-4 bg-secondary rounded-2xl">
                          <Package size={28} className="opacity-40" />
                        </div>
                        <p className="text-sm font-medium">
                          {language === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        {product.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-foreground max-w-[180px] truncate" title={product.description || ''}>
                      {product.description || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-foreground">
                      {Number(product.unitPrice).toLocaleString()} <span className="font-normal text-muted-foreground">TND</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-blue-600 border border-blue-200/50 dark:border-blue-800/30 text-xs font-semibold">
                        <Package size={11} />
                        {product.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary border border-border text-foreground text-xs font-semibold">
                        {Number(product.vat)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditClick(product)}
                          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600/60 hover:text-blue-600 transition-all cursor-pointer">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteClick(product.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Add Modal ── */}
      {showAddModal && (
        <ProductModal
          language={language} formData={formData} setFormData={setFormData}
          customUnit={customUnit} setCustomUnit={setCustomUnit}
          onSave={handleAddProduct} onCancel={() => { setShowAddModal(false); resetForm(); }}
          title={t(language, 'addProduct')}
          modalError={modalError}
        />
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && editingProduct && (
        <ProductModal
          language={language} formData={formData} setFormData={setFormData}
          customUnit={customUnit} setCustomUnit={setCustomUnit}
          onSave={handleUpdateProduct} onCancel={() => { setShowEditModal(false); resetForm(); }}
          title={t(language, 'editProduct')} isEdit
          modalError={modalError}
        />
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-xl">
                  <AlertTriangle size={18} className="text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === 'fr' ? 'Action irréversible' : 'This cannot be undone'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-7 py-6">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {language === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce code produit ?' : 'Are you sure you want to delete this product code?'}
              </p>
              {deleteProductId != null && (() => {
                const p = products.find(p => p.id === deleteProductId);
                return p ? (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-sm font-bold text-foreground">{p.code}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description || '—'} · {p.unit}</p>
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

      {/* ── Delete Constraint Error Modal ── */}
      {showDeleteErrorModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/40 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-red-200 dark:border-red-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-border bg-red-50/50 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {language === 'fr' ? 'Suppression impossible' : 'Cannot delete product'}
                  </h2>
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-0.5">
                    {language === 'fr' ? 'Bons de livraison liés' : 'Linked delivery notes'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowDeleteErrorModal(false); setDeleteProductId(null); }} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="px-7 py-6 space-y-4">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-800/40 text-xs leading-relaxed text-red-700 dark:text-red-300">
                {language === 'fr' ? (
                  <>
                    <p className="font-semibold text-sm mb-1">Attention !</p>
                    <p>Ce code produit ne peut pas être supprimé car il est déjà utilisé dans un ou plusieurs <strong>bons de livraison</strong>.</p>
                    <p className="mt-2 text-red-600/80 dark:text-red-400/80">Pour pouvoir le supprimer, vous devez d'abord supprimer ou modifier les bons de livraison associés.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm mb-1">Warning!</p>
                    <p>This product code cannot be deleted because it is currently linked to one or more <strong>delivery notes</strong>.</p>
                    <p className="mt-2 text-red-600/80 dark:text-red-400/80">To delete this product, you must first remove or update the associated delivery notes.</p>
                  </>
                )}
              </div>

              {deleteProductId != null && (() => {
                const p = products.find(p => p.id === deleteProductId);
                return p ? (
                  <div className="px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{language === 'fr' ? 'Produit concerné' : 'Affected product'}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{p.code} — <span className="font-normal text-muted-foreground">{p.description || '—'}</span></p>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="flex px-7 py-4 border-t border-border bg-secondary/20">
              <button
                onClick={() => { setShowDeleteErrorModal(false); setDeleteProductId(null); }}
                className="w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-bold transition-all cursor-pointer text-sm shadow-sm"
              >
                {language === 'fr' ? 'Compris' : 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────

function ProductModal({
  language, formData, setFormData,
  customUnit, setCustomUnit,
  onSave, onCancel, title, isEdit = false,
  modalError,
}: {
  language: string;
  formData: Partial<CodeProduitRequest>;
  setFormData: (d: Partial<CodeProduitRequest>) => void;
  customUnit: boolean;
  setCustomUnit: (v: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  isEdit?: boolean;
  modalError: string | null;
}) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full border border-border/50 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === 'fr' ? 'Remplissez les informations du produit' : 'Fill in the product information'}
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* ── Inline error banner ── */}
          {modalError && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              <AlertTriangle size={14} className="shrink-0" />
              {modalError}
            </div>
          )}

          {/* ── Row 1 : Code + TVA ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{language === 'fr' ? 'Code produit *' : 'Product Code *'}</label>
              <input type="text" value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="PROD-001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{language === 'fr' ? 'TVA (%)' : 'VAT (%)'}</label>
              <select value={formData.vat ?? 7}
                onChange={(e) => setFormData({ ...formData, vat: parseFloat(e.target.value) })}
                className={selectClass}>
                <option value="0">0%</option>
                <option value="7">7%</option>
                <option value="13">13%</option>
                <option value="19">19%</option>
              </select>
            </div>
          </div>

          {/* ── Row 2 : Prix + Unité ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{language === 'fr' ? 'Prix unitaire (TND) *' : 'Unit Price (TND) *'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice ?? ''}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="45.00"
                className={numberInputClass}
                onWheel={(e) => e.preventDefault()}
              />
            </div>
            <div>
              <label className={labelClass}>{language === 'fr' ? 'Unité *' : 'Unit *'}</label>
              {customUnit ? (
                <div className="flex gap-2">
                  <input type="text" value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder={language === 'fr' ? 'ex: palette...' : 'e.g. pallet...'}
                    className={inputClass} />
                  <button onClick={() => { setCustomUnit(false); setFormData({ ...formData, unit: 'T' }); }}
                    className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs font-semibold whitespace-nowrap cursor-pointer border border-border">
                    {language === 'fr' ? 'Liste' : 'List'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select value={formData.unit || 'T'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={selectClass}>
                    {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => { setCustomUnit(true); setFormData({ ...formData, unit: '' }); }}
                    className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs font-semibold whitespace-nowrap cursor-pointer border border-border">
                    {language === 'fr' ? 'Autre' : 'Other'}
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {language === 'fr' ? 'Unité de mesure pour cette prestation' : 'Measurement unit for this service'}
              </p>
            </div>
          </div>

          {/* ── Rate preview ── */}
          {formData.unitPrice && formData.unit && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
              <p className={`${labelClass} mb-2`}>{language === 'fr' ? 'Aperçu tarif' : 'Rate preview'}</p>
              <p className="text-sm font-bold text-primary">
                {Number(formData.unitPrice).toLocaleString()} TND / {formData.unit}
                {formData.vat ? <span className="text-muted-foreground font-normal"> · TVA {formData.vat}%</span> : ''}
              </p>
            </div>
          )}

          {/* ── Description textarea ── */}
          <div>
            <label className={labelClass}>{language === 'fr' ? 'Description' : 'Description'}</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={language === 'fr' ? 'Décrivez le produit ou la prestation...' : 'Describe the product or service...'}
              rows={4}
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-7 py-5 border-t border-border bg-secondary/20">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-all cursor-pointer text-sm">
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          <button onClick={onSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-orange-600 text-white font-semibold transition-all cursor-pointer text-sm">
            {isEdit ? (language === 'fr' ? 'Mettre à jour' : 'Update') : (language === 'fr' ? 'Enregistrer' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
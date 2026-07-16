import { CategorieCharge, ChargeTemplateResponse, ChargeResponse, RappelChargeResponse } from '@/lib/api-client';

export const inp = 'w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50';
export const lbl = 'block text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-widest';
export const sel = `${inp} cursor-pointer`;

export function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const fmtTND = (n: number) =>
    new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

export function getCategoryLabel(cat: CategorieCharge, lang: string): string {
    const labels: Record<CategorieCharge, { fr: string; en: string }> = {
        SALAIRE: { fr: 'Salaire chauffeur', en: 'Driver salary' },
        CNSS: { fr: 'CNSS', en: 'CNSS' },
        ASSURANCE: { fr: 'Assurance', en: 'Insurance' },
        VIGNETTE: { fr: 'Vignette', en: 'Road Tax' },
        VISITE_TECHNIQUE: { fr: 'Visite technique', en: 'Technical inspection' },
        VIDANGE: { fr: 'Vidange', en: 'Oil change' },
        LAVAGE: { fr: 'Lavage', en: 'Washing' },
        REPARATION: { fr: 'Réparation', en: 'Repair' },
        ASSURANCE_REMORQUE: { fr: 'Assurance remorque', en: 'Trailer insurance' },
        VIGNETTE_REMORQUE: { fr: 'Vignette remorque', en: 'Trailer road tax' },
        AUTRE: { fr: 'Autre', en: 'Other' },
    };
    return labels[cat] ? (lang === 'fr' ? labels[cat].fr : labels[cat].en) : cat;
}

/**
 * Construit dynamiquement le libellé affiché d'un template (ou d'une charge/rappel qui en dérive),
 * traduit selon la langue active. 
 * 
 * Pour les templates auto-générés "Salaire chauffeur" (catégorie SALAIRE + chauffeur lié),
 * on reconstruit le libellé à partir du nom du chauffeur plutôt que d'utiliser le texte stocké
 * en base (qui est figé en français à la création).
 * 
 * Pour tous les autres templates (créés manuellement par l'utilisateur), on garde le libellé
 * tel quel, car il n'y a pas de règle de traduction possible sur du texte libre.
 */
export function getTemplateDisplayLabel(
    params: {
        categorie: CategorieCharge;
        libelle: string;
        chauffeurNom?: string | null;
    },
    lang: string
): string {
    const { categorie, libelle, chauffeurNom } = params;

    if (categorie === 'SALAIRE' && chauffeurNom) {
        return lang === 'fr'
            ? `Salaire de ${chauffeurNom}`
            : `Salary of ${chauffeurNom}`;
    }

    return libelle;
}

/** Variante pratique pour un ChargeTemplateResponse */
export function getTemplateLabel(t: ChargeTemplateResponse, lang: string): string {
    return getTemplateDisplayLabel(
        { categorie: t.categorie, libelle: t.libelle, chauffeurNom: t.chauffeurNom },
        lang
    );
}

/** Variante pratique pour un ChargeResponse (dépense — utilise le snapshot templateCategorie/templateLibelle/chauffeurNom) */
export function getChargeLabel(c: ChargeResponse, lang: string): string {
    return getTemplateDisplayLabel(
        { categorie: c.templateCategorie, libelle: c.templateLibelle, chauffeurNom: c.chauffeurNom },
        lang
    );
}

/** Variante pratique pour un RappelChargeResponse */
export function getRappelLabel(r: RappelChargeResponse, lang: string): string {
    return getTemplateDisplayLabel(
        { categorie: r.templateCategorie, libelle: r.templateLibelle, chauffeurNom: r.chauffeurNom },
        lang
    );
}
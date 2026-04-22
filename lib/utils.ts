export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Nombre de jours écoulés depuis une date ISO, par rapport à maintenant.
 * Retourne Infinity si la date est invalide.
 */
export function daysSince(iso: string): number {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return Infinity;
  const diffMs = Date.now() - ts;
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Formatte une durée relative en français à partir d'un nombre de jours
 * (ex: "aujourd'hui", "hier", "il y a 3 jours", "il y a 2 semaines").
 */
export function formatRelativeDays(days: number): string {
  if (days < 1) return "aujourd'hui";
  if (days < 2) return "hier";
  if (days < 7) return `il y a ${Math.floor(days)} jours`;
  if (days < 14) return "il y a 1 semaine";
  if (days < 30) return `il y a ${Math.floor(days / 7)} semaines`;
  if (days < 60) return "il y a 1 mois";
  return `il y a ${Math.floor(days / 30)} mois`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

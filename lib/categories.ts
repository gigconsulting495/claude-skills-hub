/**
 * Catégorisation des skills.
 *
 * Deux mécanismes :
 * 1. Mapping explicite par nom de skill (prioritaire)
 * 2. Détection automatique par mots-clés dans la description
 *
 * Ajoute tes propres skills perso dans `CATEGORY_OVERRIDES`
 * pour leur donner la bonne catégorie.
 */

export interface CategoryDef {
  id: string;
  label: string;
  /** Couleur d'accent utilisée pour le badge */
  color: string;
  /** Mots-clés pour la détection automatique */
  keywords: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "documents",
    label: "Documents",
    color: "#CC785C", // terracotta signature
    keywords: [
      "docx",
      "pdf",
      "pptx",
      "xlsx",
      "word",
      "excel",
      "powerpoint",
      "presentation",
      "spreadsheet",
      "document",
      "slide",
      "deck",
      "report",
      "memo",
    ],
  },
  {
    id: "productivite",
    label: "Productivité",
    color: "#8B7AA8",
    keywords: [
      "schedule",
      "task",
      "reminder",
      "planning",
      "calendar",
      "inbox",
      "digest",
      "summary",
      "workflow",
    ],
  },
  {
    id: "meta",
    label: "Meta-skills",
    color: "#6B8CAE",
    keywords: [
      "skill",
      "plugin",
      "memory",
      "consolidate",
      "setup",
      "customize",
      "eval",
      "benchmark",
      "reflective",
    ],
  },
  {
    id: "developpement",
    label: "Développement",
    color: "#5A9E7A",
    keywords: [
      "code",
      "review",
      "refactor",
      "debug",
      "test",
      "pull request",
      "commit",
      "repository",
      "api",
      "library",
      "framework",
      "init",
      "security",
    ],
  },
  {
    id: "data",
    label: "Data & Analyse",
    color: "#C7A45C",
    keywords: [
      "data",
      "analysis",
      "analyze",
      "csv",
      "database",
      "query",
      "chart",
      "metric",
      "dashboard",
      "statistics",
    ],
  },
  {
    id: "communication",
    label: "Communication",
    color: "#D98A9F",
    keywords: [
      "email",
      "slack",
      "message",
      "chat",
      "notification",
      "newsletter",
      "meeting",
      "standup",
    ],
  },
  {
    id: "creation",
    label: "Création",
    color: "#B9786B",
    keywords: [
      "image",
      "imagegen",
      "video",
      "audio",
      "creative",
      "generate",
      "illustration",
    ],
  },
  {
    id: "design-ui",
    label: "Design & UI",
    color: "#C88A5C",
    keywords: [
      "design",
      "ui",
      "ux",
      "interface",
      "tailwind",
      "shadcn",
      "brand",
      "identity",
      "banner",
      "slide",
      "presentation",
      "typography",
      "color palette",
      "design system",
      "token",
      "figma",
      "mockup",
      "logo",
    ],
  },
  {
    id: "power-platform",
    label: "Power Platform",
    color: "#5A7EB8",
    keywords: [
      "power apps",
      "power app",
      "dataverse",
      "power platform",
      "power automate",
      "copilot studio",
      "pac code",
      "canvas app",
      "model-driven",
      "connector",
      "odata",
    ],
  },
  {
    id: "documentation",
    label: "Documentation",
    color: "#7BA070",
    keywords: [
      "documentation",
      "changelog",
      "release notes",
      "readme",
      "docstring",
      "jsdoc",
      "tsdoc",
      "api doc",
      "humanize",
      "writing",
      "technical writing",
      "tutorial",
    ],
  },
  {
    id: "mcp",
    label: "Intégrations MCP",
    color: "#A87BBE",
    keywords: [
      "mcp",
      "model context protocol",
      "mcp server",
      "context7",
      "microsoft-docs",
      "github mcp",
      "integration",
      "external api",
    ],
  },
  {
    id: "autre",
    label: "Autre",
    color: "#8E8578",
    keywords: [],
  },
];

/**
 * Mapping explicite : nom du skill → id catégorie.
 * Ajoute tes skills perso ici pour les forcer dans une catégorie.
 */
export const CATEGORY_OVERRIDES: Record<string, string> = {
  // --- Documents Office ---
  docx: "documents",
  pdf: "documents",
  pptx: "documents",
  xlsx: "documents",

  // --- Productivité ---
  schedule: "productivite",

  // --- Meta-skills Claude ---
  "consolidate-memory": "meta",
  "setup-cowork": "meta",
  "skill-creator": "meta",
  "cowork-plugin-customizer": "meta",
  "create-cowork-plugin": "meta",

  // --- Développement ---
  init: "developpement",
  review: "developpement",
  "security-review": "developpement",

  // --- Design & UI (skills perso) ---
  "banner-design": "design-ui",
  brand: "design-ui",
  design: "design-ui",
  "design-system": "design-ui",
  slides: "design-ui",
  "ui-styling": "design-ui",
  "ui-ux-pro-max": "design-ui",
  "frontend-design": "design-ui",

  // --- Power Platform (skills perso) ---
  "power-apps-code-app": "power-platform",
  "dataverse-crud-react": "power-platform",
  "dataverse-lookups": "power-platform",

  // --- Documentation (skills perso) ---
  "changelog-automation": "documentation",
  "documentation-generation-doc-generate": "documentation",
  humanizer: "documentation",

  // --- Intégrations MCP (skills perso) ---
  "context7-mcp": "mcp",
};

/** Tags additionnels par skill (s'affichent comme petites étiquettes). */
export const TAG_OVERRIDES: Record<string, string[]> = {
  docx: ["Microsoft", "Office"],
  pdf: ["Office", "OCR"],
  pptx: ["Microsoft", "Office"],
  xlsx: ["Microsoft", "Office", "Data"],
  schedule: ["Automation", "Cron"],
  "consolidate-memory": ["Claude Code"],
  "setup-cowork": ["Onboarding"],
  "skill-creator": ["Claude Code", "Meta"],
  "cowork-plugin-customizer": ["Cowork"],
  "create-cowork-plugin": ["Cowork"],
  init: ["Claude Code"],
  review: ["Git", "PR"],
  "security-review": ["Git", "Security"],

  // --- Skills perso : Design & UI ---
  "banner-design": ["Design", "Visuel"],
  brand: ["Identité", "Marque"],
  design: ["Design", "Logo", "CIP"],
  "design-system": ["Tokens", "Design System"],
  slides: ["Présentation", "HTML", "Chart.js"],
  "ui-styling": ["Tailwind", "shadcn/ui"],
  "ui-ux-pro-max": ["UI", "UX", "Composants"],
  "frontend-design": ["React", "Frontend"],

  // --- Skills perso : Power Platform ---
  "power-apps-code-app": ["Power Apps", "Dataverse", "PAC"],
  "dataverse-crud-react": ["Dataverse", "React", "CRUD"],
  "dataverse-lookups": ["Dataverse", "Lookups", "OData"],

  // --- Skills perso : Documentation ---
  "changelog-automation": ["Changelog", "Release"],
  "documentation-generation-doc-generate": ["Docs", "API"],
  humanizer: ["Rédaction", "IA"],

  // --- Skills perso : MCP ---
  "context7-mcp": ["MCP", "Docs"],
};

/** Détecte la catégorie d'un skill (override > keywords > autre). */
export function detectCategory(name: string, description: string): string {
  if (CATEGORY_OVERRIDES[name]) return CATEGORY_OVERRIDES[name];

  const haystack = `${name} ${description}`.toLowerCase();
  let best = { id: "autre", score: 0 };

  for (const cat of CATEGORIES) {
    if (cat.id === "autre") continue;
    const score = cat.keywords.reduce(
      (acc, kw) => acc + (haystack.includes(kw) ? 1 : 0),
      0,
    );
    if (score > best.score) best = { id: cat.id, score };
  }

  return best.id;
}

/** Retourne les tags d'un skill (override + quelques heuristiques). */
export function detectTags(name: string): string[] {
  return TAG_OVERRIDES[name] ?? [];
}

export function getCategory(id: string): CategoryDef {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

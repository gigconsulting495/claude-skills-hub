/**
 * Types partagés pour le catalogue de skills.
 *
 * Sécurité : ce type correspond exactement à ce qui est sérialisé dans
 * `data/skills.json` (repo public + site statique). On exclut donc :
 * - le chemin absolu du skill sur disque (fuite du home directory),
 * - le frontmatter brut (pour éviter qu'un champ ajouté par mégarde soit
 *   publié). Seuls les champs utiles au site sont conservés.
 */

export type SkillSource = "system" | "plugin" | "perso";

/**
 * Indique si le skill se met à jour automatiquement (via Claude Code ou
 * l'auto-update d'un marketplace), ou s'il faut faire quelque chose à la main.
 * - `auto`   : Claude Code ou le marketplace le tient à jour tout seul.
 * - `manual` : il existe une source amont mais c'est à l'utilisateur de puller.
 * - `local`  : aucune source amont connue, c'est un skill purement local.
 */
export type UpdateMode = "auto" | "manual" | "local";

export interface SkillPlugin {
  name: string;
  version?: string;
  description?: string;
  author?: string;
}

export interface SkillMarketplace {
  /** Nom du marketplace (ex: "claude-plugins-official") */
  name: string;
  /** Auto-update activé au niveau du marketplace */
  autoUpdate: boolean;
}

export interface Skill {
  /** Slug unique (source + name, safe for URL) */
  slug: string;
  /** Nom défini dans le frontmatter */
  name: string;
  /** Description (frontmatter) */
  description: string;
  /** Catégorie principale (auto-détectée ou configurée) */
  category: string;
  /** Tags additionnels */
  tags: string[];
  /** Source : skill système, plugin, ou skill perso */
  source: SkillSource;
  /** Si source = plugin, infos du plugin parent */
  plugin?: SkillPlugin;
  /** Si source = plugin, infos du marketplace d'origine */
  marketplace?: SkillMarketplace;
  /** Mode de mise à jour calculé à partir de la source + du marketplace */
  updateMode: UpdateMode;
  /** Chemin relatif lisible (ex: ~/.claude/skills/docx) */
  displayPath: string;
  /** Contenu Markdown complet du SKILL.md (sans frontmatter) */
  content: string;
  /** Date de dernière modification */
  lastModified: string;
  /** URL externe (repo GitHub, doc, etc.) - marketplace ou frontmatter url/repo */
  externalUrl?: string;
}

export interface SkillsData {
  generatedAt: string;
  scannedPaths: string[];
  skills: Skill[];
  categories: { id: string; label: string; count: number; color: string }[];
  sources: { id: SkillSource; label: string; count: number }[];
  plugins: { name: string; count: number }[];
}

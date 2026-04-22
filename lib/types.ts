/**
 * Types partagés pour le catalogue de skills.
 */

export type SkillSource = "system" | "plugin" | "perso";

export interface SkillPlugin {
  name: string;
  version?: string;
  description?: string;
  author?: string;
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
  /** Chemin absolu sur le disque */
  path: string;
  /** Chemin relatif lisible (ex: ~/.claude/skills/docx) */
  displayPath: string;
  /** Contenu Markdown complet du SKILL.md (sans frontmatter) */
  content: string;
  /** Front-matter brut (objet) */
  frontmatter: Record<string, unknown>;
  /** Date de dernière modification */
  lastModified: string;
  /** URL externe optionnelle (repo GitHub, doc, etc.) */
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

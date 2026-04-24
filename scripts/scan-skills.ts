#!/usr/bin/env tsx
/**
 * Scanne les dossiers de skills sur ton disque et produit un skills.json
 * consommé au build par le site.
 *
 * Usage :
 *   npm run scan -- --input ~/.claude/skills \
 *                   --input ~/.claude/plugins \
 *                   --input ./my-skills \
 *                   --output data/skills.json
 *
 * Ou configure tes chemins par défaut dans `DEFAULT_INPUTS` plus bas.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import matter from "gray-matter";
import {
  CATEGORIES,
  detectCategory,
  detectTags,
} from "../lib/categories.js";
import type {
  Skill,
  SkillsData,
  SkillSource,
  SkillPlugin,
  SkillMarketplace,
  UpdateMode,
} from "../lib/types.js";
import { slugify } from "../lib/utils.js";

// ------------------------------------------------------------------
// Configuration par défaut - adapte ces chemins à ta machine si besoin.
// ------------------------------------------------------------------

const HOME = os.homedir();

const DEFAULT_INPUTS = [
  // Skills Claude Code natifs (cli)
  path.join(HOME, ".claude", "skills"),
  // Plugins installés via Claude Code / Cowork
  path.join(HOME, ".claude", "plugins"),
  // Tes skills perso - adapte à ton organisation
  path.join(process.cwd(), "my-skills"),
];

const DEFAULT_OUTPUT = path.join(process.cwd(), "data", "skills.json");

// Note sécurité — le frontmatter brut n'est PAS sérialisé dans le JSON public.
// Seuls les champs lus explicitement ci-dessous (name, description, tags, url,
// repo) traversent la frontière scanner → JSON. Pour ajouter un champ à la
// sortie publique, il faut (1) l'ajouter au type Skill dans lib/types.ts et
// (2) le lire explicitement dans buildSkill(). Cette discipline remplace une
// allowlist runtime par une garantie portée par le système de types.

// Marqueurs qui identifient l'emplacement d'un skill perso.
// Si le chemin contient un de ces segments, le skill est marqué "perso".
// Note : `.claude/skills` est inclus car les skills installés directement
// dans ce dossier sont considérés comme des skills perso de l'utilisateur
// (à distinguer des skills qui viennent d'un plugin dans `.claude/plugins`).
const PERSO_MARKERS = [
  "my-skills",
  "Skill_management",
  "perso-skills",
  ".claude/skills",
];

// ------------------------------------------------------------------
// CLI args parsing
// ------------------------------------------------------------------

interface CliArgs {
  inputs: string[];
  output: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const inputs: string[] = [];
  let output = DEFAULT_OUTPUT;
  let verbose = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input" || arg === "-i") {
      const value = argv[++i];
      if (value) inputs.push(expandHome(value));
    } else if (arg === "--output" || arg === "-o") {
      const value = argv[++i];
      if (value) output = expandHome(value);
    } else if (arg === "--verbose" || arg === "-v") {
      verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return {
    inputs: inputs.length > 0 ? inputs : DEFAULT_INPUTS,
    output,
    verbose,
  };
}

function expandHome(p: string): string {
  if (p.startsWith("~/") || p === "~") {
    return path.join(HOME, p.slice(1));
  }
  return path.resolve(p);
}

function printHelp() {
  console.log(`
Scan Claude skills → JSON

Options
  -i, --input <path>    Dossier à scanner (répétable, par défaut: ${DEFAULT_INPUTS.join(", ")})
  -o, --output <file>   Fichier de sortie (par défaut: ${DEFAULT_OUTPUT})
  -v, --verbose         Log détaillé
  -h, --help            Aide

Exemple
  npm run scan -- -i ~/.claude/skills -i ~/projects/my-skills -o data/skills.json
`);
}

// ------------------------------------------------------------------
// Scan logic
// ------------------------------------------------------------------

function prettyPath(abs: string): string {
  if (abs.startsWith(HOME)) return `~${abs.slice(HOME.length)}`;
  return abs;
}

function detectSource(skillPath: string): {
  source: SkillSource;
  plugin?: SkillPlugin;
  marketplaceName?: string;
} {
  const norm = skillPath.replace(/\\/g, "/");

  // 1. Plugin : présence d'un plugin.json dans un ancêtre (prioritaire
  //    pour éviter qu'un plugin imbriquant `.claude/skills` soit mal classé).
  const pluginInfo = findPluginManifest(skillPath);
  if (pluginInfo) {
    return {
      source: "plugin",
      plugin: pluginInfo,
      marketplaceName: findMarketplaceName(norm),
    };
  }

  // 2. Plugin sans manifest : chemin contient `.claude/plugins/…/<plugin>/…`.
  //    Certains plugins officiels n'ont pas de `plugin.json` mais restent
  //    clairement des plugins — on les détecte via leur emplacement.
  const pluginFromPath = findPluginFromPath(norm);
  if (pluginFromPath) {
    return {
      source: "plugin",
      plugin: pluginFromPath,
      marketplaceName: findMarketplaceName(norm),
    };
  }

  // 3. Skill perso : chemin contient un marker perso
  for (const marker of PERSO_MARKERS) {
    if (norm.includes(`/${marker}/`) || norm.includes(`/${marker}`)) {
      return { source: "perso" };
    }
  }

  // 4. Sinon = skill système (Claude Code intégré, rarement scanné)
  return { source: "system" };
}

function findPluginFromPath(normalizedPath: string): SkillPlugin | undefined {
  // Cible les chemins du type `.../plugins/<pluginName>/skills/<skillName>/SKILL.md`
  // ou `.../plugins/<marketplace>/<...>/<pluginName>/skills/<skillName>/SKILL.md`.
  const match = normalizedPath.match(/\/plugins\/([^/]+(?:\/[^/]+)*?)\/skills\//);
  if (!match) return undefined;
  const pluginSegment = match[1].split("/").pop();
  if (!pluginSegment) return undefined;
  return { name: pluginSegment };
}

/**
 * Extrait le nom du marketplace depuis un chemin de skill installé via plugin.
 * Structure observée :
 *   ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/skills/<skill>/SKILL.md
 *   ~/.claude/plugins/marketplaces/<marketplace>/plugins/<plugin>/skills/<skill>/SKILL.md
 */
function findMarketplaceName(normalizedPath: string): string | undefined {
  const cacheMatch = normalizedPath.match(/\/plugins\/cache\/([^/]+)\//);
  if (cacheMatch) return cacheMatch[1];
  const mktMatch = normalizedPath.match(/\/plugins\/marketplaces\/([^/]+)\//);
  if (mktMatch) return mktMatch[1];
  return undefined;
}

function findPluginManifest(startPath: string): SkillPlugin | undefined {
  let dir = path.dirname(startPath);
  const stopAt = path.parse(dir).root;

  while (dir && dir !== stopAt) {
    // Le manifest peut être au root du plugin ou dans .claude-plugin/plugin.json
    const candidates = [
      path.join(dir, ".claude-plugin", "plugin.json"),
      path.join(dir, "plugin.json"),
    ];

    for (const manifest of candidates) {
      if (fs.existsSync(manifest)) {
        try {
          const data = JSON.parse(fs.readFileSync(manifest, "utf-8"));
          return {
            name: data.name ?? path.basename(dir),
            version: data.version,
            description: data.description,
            author: data.author?.name ?? data.author,
          };
        } catch {
          /* ignore */
        }
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}

/**
 * Index des marketplaces connus : nom → (repoUrl ?, autoUpdate).
 * Construit depuis `~/.claude/plugins/known_marketplaces.json`.
 */
interface MarketplaceIndex {
  get(name: string): { repoUrl?: string; autoUpdate: boolean } | undefined;
}

function loadMarketplaceIndex(): MarketplaceIndex {
  const file = path.join(HOME, ".claude", "plugins", "known_marketplaces.json");
  const fallback: MarketplaceIndex = { get: () => undefined };
  if (!fs.existsSync(file)) return fallback;

  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<
      string,
      {
        source?: { source?: string; repo?: string };
        autoUpdate?: boolean;
      }
    >;
    const map = new Map<string, { repoUrl?: string; autoUpdate: boolean }>();
    for (const [name, entry] of Object.entries(raw)) {
      const isGithub = entry.source?.source === "github" && entry.source?.repo;
      map.set(name, {
        repoUrl: isGithub ? `https://github.com/${entry.source!.repo}` : undefined,
        autoUpdate: entry.autoUpdate !== false,
      });
    }
    return { get: (name) => map.get(name) };
  } catch {
    return fallback;
  }
}

interface RawSkill {
  filePath: string;
  raw: string;
}

/** Version interne de Skill qui conserve le chemin absolu pour la dédup. */
interface ScannedSkill extends Skill {
  _absolutePath: string;
}

// Dossiers à ignorer lors du scan récursif.
// `cache` est présent dans ~/.claude/plugins/cache/ qui contient des copies
// versionnées des plugins déjà référencées via ~/.claude/plugins/marketplaces/.
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "cache",
  "install-counts-cache.json",
]);

function findSkillFiles(rootDir: string, acc: RawSkill[] = []): RawSkill[] {
  if (!fs.existsSync(rootDir)) return acc;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".git")) continue;
      findSkillFiles(fullPath, acc);
    } else if (entry.isFile() && entry.name === "SKILL.md") {
      try {
        acc.push({
          filePath: fullPath,
          raw: fs.readFileSync(fullPath, "utf-8"),
        });
      } catch {
        /* ignore lecture impossible */
      }
    }
  }

  return acc;
}

function buildSkill(
  raw: RawSkill,
  marketplaces: MarketplaceIndex,
): ScannedSkill | undefined {
  const parsed = matter(raw.raw);
  const fm = parsed.data as Record<string, unknown>;
  const rawName = (fm.name as string) ?? path.basename(path.dirname(raw.filePath));
  // Certains skills ont un préfixe de namespace (ex: "ckm:banner-design") : on le retire
  // pour avoir un nom propre utilisé dans le slug, l'affichage et la détection de catégorie.
  const name = rawName.includes(":")
    ? rawName.split(":").pop()!.trim()
    : rawName;
  // Les descriptions YAML peuvent être sur plusieurs lignes (`>` etc.) → on normalise
  const description = String(fm.description ?? "").trim().replace(/\s+/g, " ");
  if (!name || !description) return undefined;

  const skillDir = path.dirname(raw.filePath);
  const { source, plugin, marketplaceName } = detectSource(skillDir);

  const category = detectCategory(name, description);
  const frontmatterTags = Array.isArray(fm.tags) ? (fm.tags as string[]) : [];
  const tags = Array.from(
    new Set<string>([...detectTags(name), ...frontmatterTags]),
  );

  const stat = fs.statSync(raw.filePath);

  const slugParts = [source, plugin?.name, name].filter(Boolean) as string[];
  const slug = slugify(slugParts.join("-"));

  // Marketplace et URL externe
  const mktInfo = marketplaceName ? marketplaces.get(marketplaceName) : undefined;
  const marketplace: SkillMarketplace | undefined = marketplaceName
    ? { name: marketplaceName, autoUpdate: mktInfo?.autoUpdate ?? false }
    : undefined;

  const frontmatterUrl = (fm.url as string) ?? (fm.repo as string) ?? undefined;
  // Pour un plugin on privilégie le repo du marketplace (source fiable) ;
  // pour un skill perso, on prend ce qui est déclaré dans le frontmatter.
  const externalUrl =
    source === "plugin"
      ? mktInfo?.repoUrl ?? frontmatterUrl
      : frontmatterUrl;

  const updateMode = computeUpdateMode(source, marketplace, frontmatterUrl);

  return {
    slug,
    name,
    description,
    category,
    tags,
    source,
    plugin,
    marketplace,
    updateMode,
    displayPath: prettyPath(skillDir),
    content: parsed.content.trim(),
    lastModified: stat.mtime.toISOString(),
    externalUrl,
    _absolutePath: skillDir,
  };
}

function computeUpdateMode(
  source: SkillSource,
  marketplace: SkillMarketplace | undefined,
  frontmatterUrl: string | undefined,
): UpdateMode {
  if (source === "system") return "auto";
  if (source === "plugin") {
    return marketplace?.autoUpdate ? "auto" : "manual";
  }
  // Perso : manuel si une source amont est déclarée, sinon purement local.
  return frontmatterUrl ? "manual" : "local";
}

function aggregate(skills: Skill[]): Omit<SkillsData, "generatedAt" | "scannedPaths" | "skills"> {
  const categoryCount = new Map<string, number>();
  const sourceCount = new Map<SkillSource, number>();
  const pluginCount = new Map<string, number>();

  for (const s of skills) {
    categoryCount.set(s.category, (categoryCount.get(s.category) ?? 0) + 1);
    sourceCount.set(s.source, (sourceCount.get(s.source) ?? 0) + 1);
    if (s.plugin?.name) {
      pluginCount.set(s.plugin.name, (pluginCount.get(s.plugin.name) ?? 0) + 1);
    }
  }

  const categories = CATEGORIES.filter((c) => categoryCount.has(c.id)).map(
    (c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
      count: categoryCount.get(c.id) ?? 0,
    }),
  );

  const sources: SkillsData["sources"] = (
    [
      { id: "system", label: "Système" },
      { id: "plugin", label: "Plugins" },
      { id: "perso", label: "Perso" },
    ] as const
  )
    .filter(({ id }) => sourceCount.has(id))
    .map(({ id, label }) => ({ id, label, count: sourceCount.get(id) ?? 0 }));

  const plugins = Array.from(pluginCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { categories, sources, plugins };
}

// ------------------------------------------------------------------
// Déduplication helper
// ------------------------------------------------------------------

/**
 * Score un chemin de skill pour la résolution des doublons :
 * - Les chemins dans `.claude/plugins/cache/` sont disqualifiés
 *   (score très bas) car ce sont des copies versionnées.
 * - Les skills perso (`.claude/skills/`) sont privilégiés.
 * - En dernier ressort, on préfère les chemins courts (plus stables).
 */
function scoreSkillPath(absPath: string): number {
  const norm = absPath.replace(/\\/g, "/");
  if (norm.includes("/.claude/plugins/cache/")) return -100;
  if (norm.includes("/.claude/skills/")) return 10;
  if (norm.includes("/marketplaces/")) return 5;
  return -Math.floor(norm.length / 50);
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("Scan Claude skills");
  console.log("  Inputs :", args.inputs.map((p) => prettyPath(p)).join(", "));
  console.log("  Output :", prettyPath(args.output));
  console.log();

  const rawSkills: RawSkill[] = [];
  for (const input of args.inputs) {
    if (!fs.existsSync(input)) {
      console.log(`  [skip] ${prettyPath(input)} (introuvable)`);
      continue;
    }
    const before = rawSkills.length;
    findSkillFiles(input, rawSkills);
    console.log(
      `  [ok]   ${prettyPath(input)} → ${rawSkills.length - before} SKILL.md`,
    );
  }

  const marketplaces = loadMarketplaceIndex();

  const built = rawSkills
    .map((r) => {
      try {
        return buildSkill(r, marketplaces);
      } catch (err) {
        if (args.verbose) {
          console.error(`  [warn] ${r.filePath} :`, err);
        }
        return undefined;
      }
    })
    .filter((s): s is ScannedSkill => Boolean(s));

  // Déduplication par slug : si deux skills produisent le même slug (ex. un
  // plugin présent à la fois dans plusieurs marketplaces), on garde celui
  // dont le chemin est le plus "stable" (hors cache/, le plus récent sinon).
  const bySlug = new Map<string, ScannedSkill>();
  for (const skill of built) {
    const existing = bySlug.get(skill.slug);
    if (!existing) {
      bySlug.set(skill.slug, skill);
      continue;
    }
    const existingScore = scoreSkillPath(existing._absolutePath);
    const newScore = scoreSkillPath(skill._absolutePath);
    if (newScore > existingScore) {
      bySlug.set(skill.slug, skill);
    }
  }

  // On strippe `_absolutePath` (chemin absolu avec le home directory) avant
  // sérialisation : il ne doit pas apparaître dans le JSON public.
  const skills: Skill[] = Array.from(bySlug.values())
    .map(({ _absolutePath, ...skill }) => skill)
    .sort((a, b) => {
      // Perso d'abord, puis par nom
      if (a.source === "perso" && b.source !== "perso") return -1;
      if (b.source === "perso" && a.source !== "perso") return 1;
      return a.name.localeCompare(b.name);
    });

  const agg = aggregate(skills);

  const data: SkillsData = {
    generatedAt: new Date().toISOString(),
    scannedPaths: args.inputs.map((p) => prettyPath(p)),
    skills,
    ...agg,
  };

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, JSON.stringify(data, null, 2), "utf-8");

  console.log();
  console.log(`Done. ${skills.length} skills scannés.`);
  console.log(`  → ${prettyPath(args.output)}`);
}

main();

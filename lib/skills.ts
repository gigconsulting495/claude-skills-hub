import fs from "node:fs";
import path from "node:path";
import type { Skill, SkillsData } from "./types";

/** Chargement du fichier JSON généré par scripts/scan-skills.ts. */
export function loadSkillsData(): SkillsData {
  const file = path.join(process.cwd(), "data", "skills.json");
  if (!fs.existsSync(file)) {
    return emptyData();
  }
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as SkillsData;
  } catch {
    return emptyData();
  }
}

export function findSkill(slug: string): Skill | undefined {
  const { skills } = loadSkillsData();
  return skills.find((s) => s.slug === slug);
}

function emptyData(): SkillsData {
  return {
    generatedAt: new Date().toISOString(),
    scannedPaths: [],
    skills: [],
    categories: [],
    sources: [],
    plugins: [],
  };
}

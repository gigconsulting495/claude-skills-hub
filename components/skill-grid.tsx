"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Package, Sparkles, Telescope, User } from "lucide-react";
import type { Skill, SkillSource, SkillsData } from "@/lib/types";
import { SkillCard } from "./skill-card";
import { Filters } from "./filters";

interface Props {
  data: SkillsData;
}

// Ordre d'affichage des sections : Perso en premier (ce sont tes skills),
// puis Système (intégré Claude Code, rare), puis Plugins.
const SOURCE_ORDER: SkillSource[] = ["perso", "system", "plugin"];

const SOURCE_META: Record<
  SkillSource,
  { label: string; description: string; Icon: typeof User }
> = {
  perso: {
    label: "Mes skills",
    description: "Skills installés dans ~/.claude/skills et tes skills perso",
    Icon: User,
  },
  system: {
    label: "Skills système",
    description: "Skills intégrés de Claude Code",
    Icon: Sparkles,
  },
  plugin: {
    label: "Skills de plugins",
    description: "Skills fournis par les plugins Claude installés",
    Icon: Package,
  },
};

export function SkillGrid({ data }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const fuse = useMemo(
    () =>
      new Fuse(data.skills, {
        keys: [
          { name: "name", weight: 0.4 },
          { name: "description", weight: 0.25 },
          { name: "tags", weight: 0.15 },
          { name: "category", weight: 0.1 },
          { name: "plugin.name", weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [data.skills],
  );

  const filtered = useMemo(() => {
    const base =
      query.trim().length > 0
        ? fuse.search(query).map((r) => r.item)
        : data.skills;

    return base.filter((s) => {
      if (category && s.category !== category) return false;
      if (source && s.source !== source) return false;
      return true;
    });
  }, [data.skills, query, category, source, fuse]);

  const grouped = useMemo(() => {
    const map = new Map<SkillSource, Skill[]>();
    for (const s of filtered) {
      if (!map.has(s.source)) map.set(s.source, []);
      map.get(s.source)!.push(s);
    }
    return SOURCE_ORDER.filter((src) => map.has(src)).map((src) => ({
      source: src,
      skills: map.get(src)!,
    }));
  }, [filtered]);

  return (
    <>
      <Filters
        data={data}
        activeCategory={category}
        activeSource={source}
        query={query}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onSourceChange={setSource}
        resultCount={filtered.length}
        onReset={() => {
          setQuery("");
          setCategory(null);
          setSource(null);
        }}
      />

      <section className="mx-auto max-w-7xl px-6 pb-24 space-y-12">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          grouped.map(({ source: src, skills }) => (
            <SourceSection
              key={src}
              source={src}
              skills={skills}
              totalForSource={
                data.sources.find((s) => s.id === src)?.count ?? skills.length
              }
            />
          ))
        )}
      </section>
    </>
  );
}

function SourceSection({
  source,
  skills,
  totalForSource,
}: {
  source: SkillSource;
  skills: Skill[];
  totalForSource: number;
}) {
  const meta = SOURCE_META[source];
  const { Icon } = meta;
  const showingAll = skills.length === totalForSource;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
        <div className="flex items-center gap-3">
          <span
            className={
              source === "perso"
                ? "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-terracotta-500 text-white shadow-sm"
                : "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--border))]/60 text-[rgb(var(--fg))]"
            }
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-medium leading-tight">
              {meta.label}
            </h2>
            <p className="text-xs muted-text mt-0.5">{meta.description}</p>
          </div>
        </div>
        <span className="text-xs muted-text">
          <span className="font-semibold text-[rgb(var(--fg))]">
            {skills.length}
          </span>
          {showingAll
            ? ` skill${skills.length > 1 ? "s" : ""}`
            : ` / ${totalForSource}`}
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {skills.map((skill, i) => (
          <SkillCard key={skill.slug} skill={skill} index={i} />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 surface rounded-3xl">
      <Telescope className="mx-auto h-10 w-10 mb-4 muted-text" />
      <h3 className="font-serif text-2xl font-medium mb-2">
        Aucun skill ne correspond
      </h3>
      <p className="muted-text text-sm">
        Essaie d&apos;élargir ta recherche ou de réinitialiser les filtres.
      </p>
    </div>
  );
}

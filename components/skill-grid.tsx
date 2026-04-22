"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { AnimatePresence, motion } from "framer-motion";
import type { SkillsData } from "@/lib/types";
import { SkillCard } from "./skill-card";
import { Filters } from "./filters";
import { Telescope } from "lucide-react";

interface Props {
  data: SkillsData;
}

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

      <section className="mx-auto max-w-7xl px-6 pb-24">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((skill, i) => (
                <motion.div
                  key={skill.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22 }}
                >
                  <SkillCard skill={skill} index={i} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </>
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

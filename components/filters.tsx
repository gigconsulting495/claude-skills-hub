"use client";

import { Search, X } from "lucide-react";
import type { SkillsData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  data: SkillsData;
  activeCategory: string | null;
  activeSource: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onCategoryChange: (id: string | null) => void;
  onSourceChange: (id: string | null) => void;
  resultCount: number;
  onReset: () => void;
}

function Pill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-transparent text-white shadow-sm"
          : "border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] muted-text hover:border-terracotta-300 hover:text-[rgb(var(--fg))]",
      )}
      style={
        active
          ? { backgroundColor: color ?? "rgb(var(--accent))" }
          : color
          ? { borderColor: `${color}55` }
          : undefined
      }
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-[10px] px-1.5 min-w-[20px]",
          active
            ? "bg-white/25 text-white"
            : "bg-[rgb(var(--border))]/60 text-[rgb(var(--fg-muted))]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function Filters({
  data,
  activeCategory,
  activeSource,
  query,
  onQueryChange,
  onCategoryChange,
  onSourceChange,
  resultCount,
  onReset,
}: Props) {
  const hasActiveFilter =
    activeCategory !== null || activeSource !== null || query.trim().length > 0;

  return (
    <section className="mx-auto max-w-7xl px-6 py-6 space-y-5">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 muted-text pointer-events-none" />
        <input
          type="search"
          placeholder="Rechercher un skill, un mot-clé, une techno…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full rounded-2xl surface pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-terracotta-500/40 focus:border-terracotta-400 transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 muted-text hover:text-[rgb(var(--fg))]"
            aria-label="Effacer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sources */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider muted-text mr-1">
          Source
        </span>
        <Pill
          label="Tous"
          count={data.skills.length}
          active={activeSource === null}
          onClick={() => onSourceChange(null)}
        />
        {data.sources.map((s) => (
          <Pill
            key={s.id}
            label={s.label}
            count={s.count}
            active={activeSource === s.id}
            color={s.id === "perso" ? "#CC785C" : undefined}
            onClick={() => onSourceChange(activeSource === s.id ? null : s.id)}
          />
        ))}
      </div>

      {/* Categories */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider muted-text mr-1">
          Thématique
        </span>
        <Pill
          label="Toutes"
          count={data.skills.length}
          active={activeCategory === null}
          onClick={() => onCategoryChange(null)}
        />
        {data.categories.map((c) => (
          <Pill
            key={c.id}
            label={c.label}
            count={c.count}
            active={activeCategory === c.id}
            color={c.color}
            onClick={() =>
              onCategoryChange(activeCategory === c.id ? null : c.id)
            }
          />
        ))}
      </div>

      {/* Result count + reset */}
      <div className="flex items-center justify-between text-xs muted-text pt-1">
        <span>
          <span className="font-semibold text-[rgb(var(--fg))]">
            {resultCount}
          </span>{" "}
          skill{resultCount > 1 ? "s" : ""} affiché{resultCount > 1 ? "s" : ""}
        </span>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] px-2.5 py-1 hover:text-terracotta-500 hover:border-terracotta-300 transition"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        )}
      </div>
    </section>
  );
}

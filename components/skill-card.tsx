"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Clipboard,
  FileText,
  Lock,
  Package,
  RefreshCw,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { Skill, UpdateMode } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { daysSince, formatRelativeDays } from "@/lib/utils";

interface Props {
  skill: Skill;
  index?: number;
}

// Un skill est considéré "récent" s'il a été modifié il y a moins de 7 jours.
const RECENT_THRESHOLD_DAYS = 7;

function RecentBadge({ days }: { days: number }) {
  const label = formatRelativeDays(days);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium"
      title={`Modifié ${label}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      Récent
    </span>
  );
}

function UpdateModeBadge({ mode, title }: { mode: UpdateMode; title: string }) {
  if (mode === "auto") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium"
        title={title}
      >
        <Zap className="h-3 w-3" />
        Auto
      </span>
    );
  }
  if (mode === "manual") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-medium"
        title={title}
      >
        <RefreshCw className="h-3 w-3" />
        Manuel
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border))]/60 muted-text px-2 py-0.5 text-[11px] font-medium"
      title={title}
    >
      <Lock className="h-3 w-3" />
      Local
    </span>
  );
}

function updateModeTooltip(skill: Skill): string {
  switch (skill.updateMode) {
    case "auto":
      if (skill.source === "system") {
        return "Auto — mis à jour avec Claude Code";
      }
      return `Auto — le marketplace ${skill.marketplace?.name ?? ""} est en auto-update`;
    case "manual":
      if (skill.source === "plugin") {
        return `Manuel — lance /plugin marketplace update ${skill.marketplace?.name ?? ""}`;
      }
      return "Manuel — skill perso avec une source amont, à puller à la main";
    case "local":
      return "Local — aucune source amont, modifications uniquement locales";
  }
}

function SourceBadge({ source }: { source: Skill["source"] }) {
  if (source === "perso") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-terracotta-500 text-white px-2 py-0.5 text-[11px] font-medium shadow-sm">
        <User className="h-3 w-3" />
        Perso
      </span>
    );
  }
  if (source === "plugin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border))] text-[rgb(var(--fg))] px-2 py-0.5 text-[11px] font-medium">
        <Package className="h-3 w-3" />
        Plugin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border))]/60 text-[rgb(var(--fg-muted))] px-2 py-0.5 text-[11px] font-medium">
      <Sparkles className="h-3 w-3" />
      Système
    </span>
  );
}

export function SkillCard({ skill }: Props) {
  const category = getCategory(skill.category);
  const [copied, setCopied] = useState(false);
  const ageDays = daysSince(skill.lastModified);
  // On n'affiche la pastille "Récent" que pour les skills perso : pour les
  // plugins, la date de modification reflète la date de sync Claude Code et
  // non la vraie date de mise à jour du skill → trop de faux positifs.
  const isRecent =
    skill.source === "perso" && ageDays <= RECENT_THRESHOLD_DAYS;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(skill.displayPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <article
      className="group relative flex flex-col h-full surface rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-terracotta-300"
    >
      {/* Liseré coloré en haut */}
      <div
        className="absolute top-0 left-5 right-5 h-[2px] rounded-b-full opacity-70"
        style={{ backgroundColor: category.color }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: `${category.color}22`,
              color: category.color,
            }}
          >
            {category.label}
          </span>
          <SourceBadge source={skill.source} />
          <UpdateModeBadge
            mode={skill.updateMode}
            title={updateModeTooltip(skill)}
          />
          {isRecent && <RecentBadge days={ageDays} />}
        </div>
      </div>

      <Link href={`/skills/${skill.slug}`} className="flex-1 block">
        <h3 className="font-serif text-xl font-medium tracking-tight mb-2 group-hover:text-terracotta-500 transition-colors">
          {skill.name}
        </h3>
        <p className="text-sm muted-text line-clamp-4 leading-relaxed">
          {skill.description}
        </p>
      </Link>

      {skill.plugin?.name && (
        <div className="mt-3 text-[11px] muted-text flex items-center gap-1.5">
          <Package className="h-3 w-3" />
          <span className="truncate">{skill.plugin.name}</span>
        </div>
      )}

      {skill.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skill.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wide muted-text border border-[rgb(var(--border))] rounded px-1.5 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[rgb(var(--border))] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[rgb(var(--bg))] border border-[rgb(var(--border))] px-2.5 py-1.5 text-xs muted-text hover:text-[rgb(var(--fg))] hover:border-terracotta-300 transition"
          title={skill.displayPath}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-600" /> Copié
            </>
          ) : (
            <>
              <Clipboard className="h-3 w-3" /> Chemin
            </>
          )}
        </button>
        <Link
          href={`/skills/${skill.slug}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-terracotta-500/10 border border-terracotta-500/30 px-2.5 py-1.5 text-xs font-medium text-terracotta-700 dark:text-terracotta-300 hover:bg-terracotta-500 hover:text-white hover:border-terracotta-500 transition"
        >
          <FileText className="h-3 w-3" /> SKILL.md
        </Link>
        {skill.externalUrl && (
          <a
            href={skill.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-[rgb(var(--border))] p-1.5 muted-text hover:text-terracotta-500 hover:border-terracotta-300 transition"
            aria-label="Ouvrir la source"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}

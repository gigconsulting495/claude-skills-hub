import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FolderOpen,
  Lock,
  Package,
  RefreshCw,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { Header } from "@/components/header";
import { CopyPathButton } from "@/components/copy-path-button";
import { loadSkillsData, findSkill } from "@/lib/skills";
import { getCategory } from "@/lib/categories";
import type { Skill } from "@/lib/types";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  const { skills } = loadSkillsData();
  return skills.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const skill = findSkill(slug);
  if (!skill) return { title: "Skill introuvable" };
  return {
    title: `${skill.name} • Claude Skills Hub`,
    description: skill.description,
  };
}

export default async function SkillDetailPage({ params }: Params) {
  const { slug } = await params;
  const skill = findSkill(slug);
  if (!skill) notFound();

  const category = getCategory(skill.category);

  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      <article className="mx-auto max-w-4xl px-6 py-10 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm muted-text hover:text-terracotta-500 transition mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au catalogue
        </Link>

        <header className="space-y-5 mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${category.color}22`,
                color: category.color,
              }}
            >
              {category.label}
            </span>
            <SourceBadge skill={skill} />
            {skill.plugin?.name && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] muted-text px-2.5 py-1 text-xs">
                <Package className="h-3 w-3" />
                {skill.plugin.name}
                {skill.plugin.version && ` v${skill.plugin.version}`}
              </span>
            )}
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-tight">
            {skill.name}
          </h1>

          <p className="text-lg muted-text leading-relaxed">
            {skill.description}
          </p>

          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {skill.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs uppercase tracking-wide muted-text border border-[rgb(var(--border))] rounded px-2 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="surface rounded-2xl p-5 space-y-3 mt-6">
            <InfoRow icon={<FolderOpen className="h-4 w-4" />} label="Chemin">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono muted-text break-all">
                  {skill.displayPath}
                </code>
                <CopyPathButton path={skill.displayPath} />
              </div>
            </InfoRow>
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Modifié">
              <span className="text-sm muted-text">
                {new Date(skill.lastModified).toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </span>
            </InfoRow>
          </div>

          <UpdateInfo skill={skill} />
        </header>

        <div className="prose-skill">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
          >
            {skill.content}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}

function SourceBadge({ skill }: { skill: Skill }) {
  if (skill.source === "perso") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-terracotta-500 text-white px-2.5 py-1 text-xs font-medium">
        <User className="h-3 w-3" />
        Perso
      </span>
    );
  }
  if (skill.source === "plugin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border))] text-[rgb(var(--fg))] px-2.5 py-1 text-xs font-medium">
        <Package className="h-3 w-3" />
        Plugin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--border))]/60 text-[rgb(var(--fg-muted))] px-2.5 py-1 text-xs font-medium">
      <Sparkles className="h-3 w-3" />
      Système
    </span>
  );
}

function UpdateInfo({ skill }: { skill: Skill }) {
  const headerIcon =
    skill.updateMode === "auto" ? (
      <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
    ) : skill.updateMode === "manual" ? (
      <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    ) : (
      <Lock className="h-4 w-4 muted-text" />
    );

  const headerLabel =
    skill.updateMode === "auto"
      ? "Mise à jour automatique"
      : skill.updateMode === "manual"
        ? "Mise à jour manuelle"
        : "Skill local";

  return (
    <div className="surface rounded-2xl p-5 mt-4 space-y-4">
      <div className="flex items-center gap-2">
        {headerIcon}
        <h2 className="font-serif text-lg font-medium">{headerLabel}</h2>
      </div>

      <UpdateBody skill={skill} />
    </div>
  );
}

function UpdateBody({ skill }: { skill: Skill }) {
  if (skill.updateMode === "auto") {
    if (skill.source === "system") {
      return (
        <p className="text-sm muted-text leading-relaxed">
          Ce skill est intégré à Claude Code et est mis à jour automatiquement
          avec la CLI. Aucune action nécessaire.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm muted-text leading-relaxed">
          Le marketplace{" "}
          <span className="font-medium text-[rgb(var(--fg))]">
            {skill.marketplace?.name}
          </span>{" "}
          est configuré en auto-update — Claude Code tire les dernières
          versions automatiquement.
        </p>
        {skill.externalUrl && <RepoLink url={skill.externalUrl} />}
      </div>
    );
  }

  if (skill.updateMode === "manual") {
    if (skill.source === "plugin") {
      const cmd = `/plugin marketplace update ${skill.marketplace?.name ?? ""}`.trim();
      return (
        <div className="space-y-3">
          <p className="text-sm muted-text leading-relaxed">
            Le marketplace{" "}
            <span className="font-medium text-[rgb(var(--fg))]">
              {skill.marketplace?.name}
            </span>{" "}
            n&apos;est pas en auto-update. Lance cette commande dans Claude
            Code pour puller la dernière version :
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-[rgb(var(--bg))] border border-[rgb(var(--border))] px-3 py-2">
            <code className="flex-1 text-xs font-mono break-all">{cmd}</code>
            <CopyPathButton path={cmd} />
          </div>
          {skill.externalUrl && <RepoLink url={skill.externalUrl} />}
        </div>
      );
    }
    // Perso avec source amont (frontmatter url/repo)
    return (
      <div className="space-y-3">
        <p className="text-sm muted-text leading-relaxed">
          Skill perso avec une source amont déclarée. À toi de rapatrier la
          dernière version depuis le repo d&apos;origine.
        </p>
        {skill.externalUrl && <RepoLink url={skill.externalUrl} />}
      </div>
    );
  }

  // local
  return (
    <p className="text-sm muted-text leading-relaxed">
      Skill purement local : aucune source amont n&apos;est déclarée dans le
      frontmatter. Les modifications vivent uniquement sur ton disque.
    </p>
  );
}

function RepoLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-terracotta-500 hover:text-terracotta-600 underline underline-offset-2"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {url.replace(/^https?:\/\//, "")}
    </a>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 muted-text min-w-[110px] text-sm pt-0.5">
        {icon}
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

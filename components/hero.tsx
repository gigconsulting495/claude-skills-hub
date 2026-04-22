import type { SkillsData } from "@/lib/types";

interface Props {
  data: SkillsData;
}

export function Hero({ data }: Props) {
  const total = data.skills.length;
  const perso = data.sources.find((s) => s.id === "perso")?.count ?? 0;
  const plugin = data.sources.find((s) => s.id === "plugin")?.count ?? 0;
  const system = data.sources.find((s) => s.id === "system")?.count ?? 0;

  return (
    <section className="mx-auto max-w-7xl px-6 pt-10 pb-2">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] muted-text mb-4">
          <span className="h-px w-6 bg-terracotta-500" />
          Mon catalogue
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight leading-[1.1]">
          Tes{" "}
          <span className="text-terracotta-500">skills Claude</span>,
          <br />
          classés et à portée de clic.
        </h1>
        <p className="mt-5 text-base sm:text-lg muted-text leading-relaxed max-w-2xl">
          Toutes tes capacités Claude réunies sur une page — skills système,
          skills de plugins et tes créations perso. Filtre par thématique,
          recherche une compétence, ouvre directement le SKILL.md.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
        <Stat label="Total" value={total} accent />
        <Stat label="Perso" value={perso} />
        <Stat label="Plugins" value={plugin} />
        <Stat label="Système" value={system} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`surface rounded-2xl px-4 py-3 ${
        accent ? "border-terracotta-300" : ""
      }`}
    >
      <div
        className={`font-serif text-2xl font-medium ${
          accent ? "text-terracotta-500" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider muted-text">{label}</div>
    </div>
  );
}

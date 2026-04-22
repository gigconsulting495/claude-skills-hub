import type { SkillsData } from "@/lib/types";

interface Props {
  data: SkillsData;
}

export function Footer({ data }: Props) {
  const generated = new Date(data.generatedAt).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <footer className="border-t border-[rgb(var(--border))] mt-12">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs muted-text">
        <p>
          Données générées le {generated} • Dossiers scannés :{" "}
          <span className="font-mono">{data.scannedPaths.join(", ")}</span>
        </p>
        <p>
          Régénère avec <code className="font-mono bg-[rgb(var(--border))]/40 px-1.5 py-0.5 rounded">npm run scan</code>
        </p>
      </div>
    </footer>
  );
}

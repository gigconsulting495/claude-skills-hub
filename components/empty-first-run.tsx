import { Terminal, Sparkles } from "lucide-react";

export function EmptyStateFirstRun() {
  return (
    <section className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="max-w-2xl w-full surface rounded-3xl p-10 text-center space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-terracotta-400 to-terracotta-600 text-white shadow-lg">
          <Sparkles className="h-6 w-6" />
        </div>

        <h2 className="font-serif text-3xl font-medium tracking-tight">
          Prêt à scanner tes skills
        </h2>

        <p className="muted-text leading-relaxed">
          Le fichier <code className="font-mono text-sm bg-[rgb(var(--border))]/50 px-1.5 py-0.5 rounded">data/skills.json</code>{" "}
          est vide. Lance un premier scan pour peupler ton catalogue.
        </p>

        <div className="text-left surface rounded-xl p-5 font-mono text-sm bg-[rgb(var(--bg))]">
          <div className="flex items-center gap-2 muted-text text-xs mb-3">
            <Terminal className="h-3.5 w-3.5" />
            Terminal
          </div>
          <code className="block">
            <span className="text-terracotta-500">$</span> npm install
            <br />
            <span className="text-terracotta-500">$</span> npm run scan
            <br />
            <span className="text-terracotta-500">$</span> npm run dev
          </code>
        </div>

        <p className="text-xs muted-text">
          Par défaut le scan regarde <code>~/.claude/skills</code>,{" "}
          <code>~/.claude/plugins</code> et <code>./my-skills</code>. Adapte les
          chemins via{" "}
          <code className="font-mono">--input ~/ton-dossier</code>.
        </p>
      </div>
    </section>
  );
}

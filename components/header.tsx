import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[rgb(var(--bg))]/80 border-b border-[rgb(var(--border))]">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.png"
            alt="Claude Skills Hub"
            width={128}
            height={128}
            priority
            className="h-8 w-8 rounded-lg shadow-sm transition-transform group-hover:scale-105"
          />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-lg font-medium tracking-tight">
              Claude Skills Hub
            </span>
            <span className="text-xs muted-text mt-0.5">
              catalogue personnel
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <a
            href="https://docs.claude.com/en/docs/claude-code/skills"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex text-sm muted-text hover:text-[rgb(var(--fg))] transition"
          >
            Docs Claude Skills
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

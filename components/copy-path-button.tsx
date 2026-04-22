"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";

export function CopyPathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(path);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex items-center gap-1 rounded border border-[rgb(var(--border))] px-1.5 py-0.5 text-[10px] muted-text hover:text-terracotta-500 hover:border-terracotta-300 transition"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-600" /> Copié
        </>
      ) : (
        <>
          <Clipboard className="h-3 w-3" /> Copier
        </>
      )}
    </button>
  );
}

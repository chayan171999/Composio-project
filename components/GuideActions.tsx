"use client";

import Link from "next/link";
import { useState } from "react";
import { guideToMarkdown } from "@/lib/markdown";
import type { Guide } from "@/lib/schema";

const BTN =
  "rounded-md border border-edge bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition-[color,border-color,background-color,transform] duration-100 hover:border-edge-strong hover:bg-sunken hover:text-ink active:translate-y-px";

export default function GuideActions({ guide }: { guide: Guide }) {
  const [copied, setCopied] = useState<"url" | "markdown" | null>(null);

  const copy = async (what: "url" | "markdown") => {
    const text = what === "url" ? window.location.href : guideToMarkdown(guide);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => copy("url")} className={BTN}>
        {copied === "url" ? "Link copied" : "Share"}
      </button>
      <button type="button" onClick={() => copy("markdown")} className={BTN}>
        {copied === "markdown" ? "Copied" : "Copy as Markdown"}
      </button>
      {guide.generatedBy === "agent" && (
        <Link href={`/generate?q=${encodeURIComponent(guide.appName)}`} className={BTN}>
          Regenerate
        </Link>
      )}
    </div>
  );
}

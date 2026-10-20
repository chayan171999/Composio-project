"use client";

import Link from "next/link";
import { useState } from "react";
import { guideToMarkdown } from "@/lib/markdown";
import type { Guide } from "@/lib/schema";

export default function GuideActions({ guide }: { guide: Guide }) {
  const [copied, setCopied] = useState<"url" | "markdown" | null>(null);

  const copy = async (what: "url" | "markdown") => {
    const text =
      what === "url" ? window.location.href : guideToMarkdown(guide);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const button =
    "rounded-md border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => copy("url")} className={button}>
        {copied === "url" ? "Copied" : "Share"}
      </button>
      <button type="button" onClick={() => copy("markdown")} className={button}>
        {copied === "markdown" ? "Copied" : "Copy as Markdown"}
      </button>
      {guide.generatedBy === "agent" && (
        <Link
          href={`/generate?q=${encodeURIComponent(guide.appName)}`}
          className={button}
        >
          Regenerate
        </Link>
      )}
    </div>
  );
}

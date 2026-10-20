"use client";

export default function SearchBox({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/" method="get" className="group relative">
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Gmail, github.com, Slack, or paste a URL…"
        autoComplete="off"
        aria-label="Search for an app"
        className="w-full rounded-lg border border-edge bg-surface py-3 pl-10 pr-24 text-sm text-ink shadow-[var(--shadow-sm)] outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-bg transition-opacity hover:opacity-85"
      >
        Look up
      </button>
    </form>
  );
}

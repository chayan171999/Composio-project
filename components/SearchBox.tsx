"use client";

export default function SearchBox({ defaultValue }: { defaultValue: string }) {
  return (
    <form
      action="/"
      method="get"
      className="relative rounded-lg border border-edge bg-surface shadow-[var(--shadow-sm)] transition-colors focus-within:border-accent"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="m13.5 13.5 3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Gmail, github.com, Slack, or paste a URL…"
        autoComplete="off"
        aria-label="Search for an app"
        className="w-full rounded-lg bg-transparent py-3.5 pl-10 pr-32 text-sm text-ink outline-none placeholder:text-ink-3"
      />
      {/* Pointer, a real pressed state and a 36px target: the old 28px button
          faded on hover, which reads as disabled rather than pressable. */}
      <button
        type="submit"
        className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-bg transition-[transform,filter] duration-100 hover:brightness-110 active:translate-y-[calc(-50%+1px)] active:brightness-95"
      >
        Look up
        <kbd className="hidden rounded border border-bg/20 px-1 text-[10px] font-normal leading-4 text-bg/60 sm:inline">
          ↵
        </kbd>
      </button>
    </form>
  );
}

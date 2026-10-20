"use client";

export default function SearchBox({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/" method="get" className="flex gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Gmail, github.com, Slack…"
        autoComplete="off"
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Look up
      </button>
    </form>
  );
}

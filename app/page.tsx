import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Composio OAuth guides</h1>
      <p className="mt-2 text-gray-600">
        Look up an app and find out whether you need your own OAuth app, how
        long until you&apos;re production-ready, and what to start today.
      </p>
      <p className="mt-6 text-sm text-gray-500">Seed guides (step 1 scaffold):</p>
      <ul className="mt-2">
        <li>
          <Link href="/guides/github" className="text-sky-600 underline">
            GitHub
          </Link>
        </li>
      </ul>
    </main>
  );
}

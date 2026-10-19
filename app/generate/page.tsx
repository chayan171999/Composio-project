import Link from "next/link";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  if (!query) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm">
          Nothing to generate.{" "}
          <Link href="/" className="text-sky-600 underline">
            Go back
          </Link>
          .
        </p>
      </main>
    );
  }

  return <GenerateClient query={query} />;
}

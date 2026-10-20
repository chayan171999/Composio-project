import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuideActions from "@/components/GuideActions";
import GuideView from "@/components/GuideView";
import { getGuide } from "@/lib/guides";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return { title: "Guide not found" };

  return {
    title: guide.appName,
    description: guide.verdict.oneLiner,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm text-ink-3 transition-colors hover:text-ink"
        >
          ← All guides
        </Link>
        <GuideActions guide={guide} />
      </div>
      <GuideView guide={guide} />
    </main>
  );
}

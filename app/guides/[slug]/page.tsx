import { notFound } from "next/navigation";
import GuideView from "@/components/GuideView";
import { getSeedGuide } from "@/lib/guides";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getSeedGuide(slug);
  if (!guide) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <GuideView guide={guide} />
    </main>
  );
}

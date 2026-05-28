import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { channels, notes } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; id: string }> };

export default async function NotePage({ params }: Props) {
    const { lang, id } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const db = getDb();
    const [result] = await db
        .select()
        .from(notes)
        .innerJoin(channels, eq(notes.channelId, channels.id))
        .where(
            and(
                eq(notes.id, id),
                eq(notes.isPublished, true),
                eq(channels.isPublic, true),
            ),
        )
        .limit(1);

    if (!result) notFound();

    const { notes: note, channels: channel } = result;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-4 text-sm text-gray-500">
                    <Link href={`/${l}/channels/${channel.id}`} className="hover:underline text-blue-600">
                        {channel.name}
                    </Link>
                    <span className="mx-2">·</span>
                    <time>{new Date(note.updatedAt).toLocaleDateString()}</time>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{note.title}</h1>
                <article className="prose max-w-none whitespace-pre-wrap text-gray-700">
                    {note.body}
                </article>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { notes, channels } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function HomePage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const db = getDb();
    const recentNotes = await db
        .select()
        .from(notes)
        .innerJoin(channels, eq(notes.channelId, channels.id))
        .where(and(eq(notes.isPublished, true), eq(channels.isPublic, true)))
        .orderBy(desc(notes.updatedAt))
        .limit(20);

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{t(l, "siteName")}</h1>
                {recentNotes.length === 0 ? (
                    <p className="text-gray-500">No published notes yet.</p>
                ) : (
                    <ul className="space-y-6">
                        {recentNotes.map(({ notes: note, channels: channel }) => (
                            <li key={note.id} className="border-b border-gray-100 pb-6">
                                <Link
                                    href={`/${l}/notes/${note.id}`}
                                    className="text-xl font-semibold text-blue-700 hover:underline"
                                >
                                    {note.title}
                                </Link>
                                <div className="mt-1 text-sm text-gray-500">
                                    <Link href={`/${l}/channels/${channel.id}`} className="hover:underline">
                                        {channel.name}
                                    </Link>
                                    <span className="mx-2">·</span>
                                    <time>{new Date(note.updatedAt).toLocaleDateString()}</time>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

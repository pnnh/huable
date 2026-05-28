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

const PAGE_SIZE = 12;

/** Strip markdown syntax and return the first `maxLen` characters. */
function extractSummary(body: string, maxLen = 150): string {
    const plain = body
        .replace(/!\[.*?\]\(.*?\)/g, "")   // images
        .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // links → text
        .replace(/```[\s\S]*?```/g, "")    // code blocks
        .replace(/`[^`]+`/g, "")           // inline code
        .replace(/^#{1,6}\s+/gm, "")       // headings
        .replace(/[*_~>|#]/g, "")          // emphasis / other symbols
        .replace(/\s+/g, " ")
        .trim();
    return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ page?: string }>;
};

export default async function HomePage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const sp = await searchParams;
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const db = getDb();
    const condition = and(eq(notes.isPublished, true), eq(channels.isPublic, true));

    // Count all matching notes
    const allIds = await db
        .select()
        .from(notes)
        .innerJoin(channels, eq(notes.channelId, channels.id))
        .where(condition);
    const total = allIds.length;

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const pageNotes = await db
        .select()
        .from(notes)
        .innerJoin(channels, eq(notes.channelId, channels.id))
        .where(condition)
        .orderBy(desc(notes.updatedAt))
        .limit(PAGE_SIZE)
        .offset(offset);

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{t(l, "siteName")}</h1>
                {pageNotes.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noPublishedNotes")}</p>
                ) : (
                    <ul className="space-y-6">
                        {pageNotes.map(({ notes: note, channels: channel }) => (
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
                                {note.body && (
                                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                                        {extractSummary(note.body)}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-between text-sm text-gray-500">
                        {currentPage > 1 ? (
                            <Link
                                href={`/${l}?page=${currentPage - 1}`}
                                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                                ← Prev
                            </Link>
                        ) : <span />}
                        <span>{currentPage} / {totalPages}</span>
                        {currentPage < totalPages ? (
                            <Link
                                href={`/${l}?page=${currentPage + 1}`}
                                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                                Next →
                            </Link>
                        ) : <span />}
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

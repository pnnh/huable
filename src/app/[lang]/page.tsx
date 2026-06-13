import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { notes, channels } from "@/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChannelSearch from "@/components/ChannelSearch";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { Suspense } from "react";

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
    searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function HomePage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const sp = await searchParams;
    const query = sp.q?.trim() ?? "";
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const db = getDb();
    const isDev = process.env.NODE_ENV === "development";
    const baseConds = [eq(notes.isPublished, true), eq(channels.isPublic, true)];
    if (!isDev) baseConds.push(eq(notes.approvalStatus, "approved"));
    const baseCondition = and(...baseConds);
    const condition = query
        ? and(
            baseCondition,
            or(
                like(notes.title, `%${query}%`),
                like(notes.body, `%${query}%`),
            ),
        )
        : baseCondition;

    let allIds: { notes: typeof notes.$inferSelect; channels: typeof channels.$inferSelect }[] = [];
    let pageNotes: typeof allIds = [];
    try {
        // Count all matching notes
        allIds = await db
            .select()
            .from(notes)
            .innerJoin(channels, eq(notes.channelId, channels.id))
            .where(condition);
    } catch (err) {
        const cause = (err as { cause?: unknown }).cause;
        console.error("[HomePage] DB count query failed", {
            message: (err as Error).message,
            cause: cause instanceof Error
                ? { message: cause.message, stack: cause.stack, name: cause.name }
                : cause,
            stack: (err as Error).stack,
        });
        throw err;
    }
    const total = allIds.length;

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    try {
        pageNotes = await db
            .select()
            .from(notes)
            .innerJoin(channels, eq(notes.channelId, channels.id))
            .where(condition)
            .orderBy(desc(notes.updatedAt))
            .limit(PAGE_SIZE)
            .offset(offset);
    } catch (err) {
        const cause = (err as { cause?: unknown }).cause;
        console.error("[HomePage] DB page query failed", {
            message: (err as Error).message,
            cause: cause instanceof Error
                ? { message: cause.message, stack: cause.stack, name: cause.name }
                : cause,
            stack: (err as Error).stack,
        });
        throw err;
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{t(l, "siteName")}</h1>
                    <Suspense>
                        <ChannelSearch
                            placeholder={t(l, "searchNotes")}
                            defaultValue={query}
                        />
                    </Suspense>
                </div>
                {pageNotes.length === 0 ? (
                    <p className="text-gray-500">{query ? t(l, "noNotesFound") : t(l, "noPublishedNotes")}</p>
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
                                href={`/${l}?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(currentPage - 1) }).toString()}`}
                                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                                ← Prev
                            </Link>
                        ) : <span />}
                        <span>{currentPage} / {totalPages}</span>
                        {currentPage < totalPages ? (
                            <Link
                                href={`/${l}?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(currentPage + 1) }).toString()}`}
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

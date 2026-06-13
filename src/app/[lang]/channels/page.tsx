import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { channels, notes } from "@/db/schema";
import { eq, like, or, and, desc, count, sql } from "drizzle-orm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChannelAvatar from "@/components/ChannelAvatar";
import ChannelSearch from "@/components/ChannelSearch";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function ChannelsPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const sp = await searchParams;
    const query = sp.q?.trim() ?? "";
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const db = getDb();
    const isDev = process.env.NODE_ENV === "development";

    // Build WHERE clause: isPublic=true (+ approvalStatus=approved in prod), optionally fuzzy match
    const baseConds = [eq(channels.isPublic, true)];
    if (!isDev) baseConds.push(eq(channels.approvalStatus, "approved"));
    const baseCondition = and(...baseConds);
    const condition = query
        ? and(
              baseCondition,
              or(
                  like(channels.name, `%${query}%`),
                  like(channels.description, `%${query}%`),
              ),
          )
        : baseCondition;

    // Fetch channels with published note counts
    const [allRows, pageRows] = await Promise.all([
        db.select({ id: channels.id }).from(channels).where(condition),
        db
            .select({
                id: channels.id,
                name: channels.name,
                description: channels.description,
                createdAt: channels.createdAt,
            })
            .from(channels)
            .where(condition)
            .orderBy(desc(channels.createdAt))
            .limit(PAGE_SIZE)
            .offset(offset),
    ]);

    const total = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    // Fetch note counts for this page's channels
    const channelIds = pageRows.map((c) => c.id);
    const noteCounts: Record<string, number> = {};

    if (channelIds.length > 0) {
        const noteConds = [eq(notes.isPublished, true)];
        if (!isDev) noteConds.push(eq(notes.approvalStatus, "approved"));
        const counts = await db
            .select({ channelId: notes.channelId, cnt: count() })
            .from(notes)
            .where(
                and(
                    ...noteConds,
                    sql`${notes.channelId} IN (${sql.join(channelIds.map((id) => sql`${id}`), sql`, `)})`,
                ),
            )
            .groupBy(notes.channelId);
        for (const row of counts) {
            if (row.channelId) noteCounts[row.channelId] = row.cnt;
        }
    }

    const buildUrl = (p: number) => {
        const params2 = new URLSearchParams();
        if (query) params2.set("q", query);
        if (p > 1) params2.set("page", String(p));
        const qs = params2.toString();
        return `/${l}/channels${qs ? `?${qs}` : ""}`;
    };

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{t(l, "allChannels")}</h1>
                    <Suspense>
                        <ChannelSearch
                            placeholder={t(l, "searchChannels")}
                            defaultValue={query}
                        />
                    </Suspense>
                </div>

                {pageRows.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noChannelsFound")}</p>
                ) : (
                    <ul className="space-y-4">
                        {pageRows.map((channel) => {
                            const noteCount = noteCounts[channel.id] ?? 0;
                            const descSnippet = channel.description
                                ? channel.description.length > 120
                                    ? channel.description.slice(0, 120) + "…"
                                    : channel.description
                                : null;

                            return (
                                <li key={channel.id} className="flex items-start gap-4 border-b border-gray-100 pb-4">
                                    <ChannelAvatar
                                        channelId={channel.id}
                                        channelName={channel.name}
                                        size={56}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={`/${l}/channels/${channel.id}`}
                                            className="text-lg font-semibold text-blue-700 hover:underline"
                                        >
                                            {channel.name}
                                        </Link>
                                        {descSnippet && (
                                            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                                                {descSnippet}
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-400">
                                            {noteCount} {t(l, "notes")}
                                            <span className="mx-2">·</span>
                                            <time>{new Date(channel.createdAt).toLocaleDateString()}</time>
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-between text-sm text-gray-500">
                        {currentPage > 1 ? (
                            <Link
                                href={buildUrl(currentPage - 1)}
                                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                                ← Prev
                            </Link>
                        ) : (
                            <span />
                        )}
                        <span>{currentPage} / {totalPages}</span>
                        {currentPage < totalPages ? (
                            <Link
                                href={buildUrl(currentPage + 1)}
                                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                            >
                                Next →
                            </Link>
                        ) : (
                            <span />
                        )}
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

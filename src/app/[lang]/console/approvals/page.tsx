import { notFound, redirect } from "next/navigation";
import { desc, eq, ne, and, or, isNotNull } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { approvalEvents, notes, channels } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type FilterStatus = "all" | "pending" | "handled";

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ page?: string; status?: string }>;
};

export default async function ApprovalsListPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    if (user.sysrole !== "admin") {
        redirect(`/${l}/console`);
    }

    const sp = await searchParams;
    const rawStatus = sp.status ?? "all";
    const filterStatus: FilterStatus = rawStatus === "pending" || rawStatus === "handled" ? rawStatus : "all";
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

    const db = getDb();

    // Exclude events triggered by the current admin:
    // - note events: note author != current user
    // - channel events: channel owner != current user
    const selfFilterNote = or(isNotNull(approvalEvents.channelId), ne(notes.userId, user.id));
    const selfFilterChannel = or(isNotNull(approvalEvents.noteId), ne(channels.userId, user.id));
    const selfFilter = and(selfFilterNote, selfFilterChannel);

    const statusFilter =
        filterStatus === "pending"
            ? eq(approvalEvents.isHandled, false)
            : filterStatus === "handled"
                ? eq(approvalEvents.isHandled, true)
                : undefined;

    const condition = statusFilter ? and(selfFilter, statusFilter) : selfFilter;

    const allRows = await db
        .select({ id: approvalEvents.id })
        .from(approvalEvents)
        .leftJoin(notes, eq(approvalEvents.noteId, notes.id))
        .leftJoin(channels, eq(approvalEvents.channelId, channels.id))
        .where(condition);

    const total = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * PAGE_SIZE;

    const rows = await db
        .select({
            event: approvalEvents,
            note: { id: notes.id, title: notes.title },
            channel: { id: channels.id, name: channels.name },
        })
        .from(approvalEvents)
        .leftJoin(notes, eq(approvalEvents.noteId, notes.id))
        .leftJoin(channels, eq(approvalEvents.channelId, channels.id))
        .where(condition)
        .orderBy(desc(approvalEvents.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset);

    const buildUrl = (p: number, s: FilterStatus) => {
        const params2 = new URLSearchParams();
        if (s !== "all") params2.set("status", s);
        if (p > 1) params2.set("page", String(p));
        const qs = params2.toString();
        return `/${l}/console/approvals${qs ? `?${qs}` : ""}`;
    };

    const filterBtn = (s: FilterStatus, label: string) => {
        const active = filterStatus === s;
        return (
            <Link
                href={buildUrl(1, s)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                    active
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
            >
                {label}
            </Link>
        );
    };

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "approvalManagement")}</h1>
                    <Link href={`/${l}/console`} className="text-sm text-blue-600 hover:underline">
                        ← {t(l, "console")}
                    </Link>
                </div>

                {/* Filter buttons */}
                <div className="flex gap-2 mb-6">
                    {filterBtn("all", t(l, "approvalFilterAll"))}
                    {filterBtn("pending", t(l, "approvalFilterPending"))}
                    {filterBtn("handled", t(l, "approvalFilterHandled"))}
                </div>

                {rows.length === 0 ? (
                    <p className="text-gray-500">{t(l, "approvalNoEvents")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="py-3 pr-4">{t(l, "approvalEventName")}</th>
                                    <th className="py-3 pr-4">{t(l, "approvalStatus")}</th>
                                    <th className="py-3 pr-4">{t(l, "approvalResult")}</th>
                                    <th className="py-3 pr-4">{t(l, "created")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map(({ event, note, channel }) => {
                                    const actionLabel = event.action === "created"
                                        ? t(l, "approvalActionCreated")
                                        : t(l, "approvalActionUpdated");
                                    const subjectName = event.type === "channel"
                                        ? (channel?.name ?? event.channelId ?? "—")
                                        : (note?.title ?? event.noteId ?? "—");
                                    const typeLabel = event.type === "channel"
                                        ? t(l, "approvalTypeChannel")
                                        : t(l, "approvalTypeNote");
                                    const eventName = `[${typeLabel}] ${subjectName} · ${actionLabel}`;
                                    return (
                                        <tr key={event.id}>
                                            <td className="py-3 pr-4">
                                                <Link
                                                    href={`/${l}/console/approvals/${event.id}`}
                                                    className="text-blue-600 hover:underline font-medium"
                                                >
                                                    {eventName}
                                                </Link>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span
                                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                        event.isHandled
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                    }`}
                                                >
                                                    {event.isHandled
                                                        ? t(l, "approvalFilterHandled")
                                                        : t(l, "approvalFilterPending")}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {event.result ? (
                                                    <span
                                                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                            event.result === "approved"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-red-100 text-red-700"
                                                        }`}
                                                    >
                                                        {event.result === "approved"
                                                            ? t(l, "approvalApprove")
                                                            : t(l, "approvalReject")}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500">
                                                {new Date(event.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex gap-2 mt-6 items-center">
                        {currentPage > 1 && (
                            <Link
                                href={buildUrl(currentPage - 1, filterStatus)}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                ← {t(l, "prev") || "Prev"}
                            </Link>
                        )}
                        <span className="text-sm text-gray-500">
                            {currentPage} / {totalPages}
                        </span>
                        {currentPage < totalPages && (
                            <Link
                                href={buildUrl(currentPage + 1, filterStatus)}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {t(l, "next") || "Next"} →
                            </Link>
                        )}
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

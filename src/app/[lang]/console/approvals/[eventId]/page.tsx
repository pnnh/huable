import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { approvalEvents, notes, users, channels } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { t } from "@/lib/i18n";
import ApprovalActions from "@/components/ApprovalActions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; eventId: string }> };

export default async function ApprovalDetailPage({ params }: Props) {
    const { lang, eventId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    if (user.sysrole !== "admin") {
        redirect(`/${l}/console`);
    }

    const db = getDb();

    // Fetch the event with optional note and channel via left joins
    const rows = await db
        .select({
            event: approvalEvents,
            note: { id: notes.id, title: notes.title, body: notes.body, approvalStatus: notes.approvalStatus },
            channel: { id: channels.id, name: channels.name, approvalStatus: channels.approvalStatus },
        })
        .from(approvalEvents)
        .leftJoin(notes, eq(approvalEvents.noteId, notes.id))
        .leftJoin(channels, eq(approvalEvents.channelId, channels.id))
        .where(eq(approvalEvents.id, eventId))
        .limit(1);

    if (rows.length === 0) notFound();

    const { event, note, channel } = rows[0];
    const isChannelEvent = event.type === "channel";
    const subjectName = isChannelEvent ? (channel?.name ?? "—") : (note?.title ?? "—");
    const subjectApprovalStatus = isChannelEvent ? channel?.approvalStatus : note?.approvalStatus;

    // Resolve handler name if handled
    let handlerName: string | null = null;
    if (event.handledBy) {
        const [handlerRow] = await db
            .select({ name: users.name, nickname: users.nickname })
            .from(users)
            .where(eq(users.id, event.handledBy))
            .limit(1);
        if (handlerRow) {
            handlerName = handlerRow.nickname || handlerRow.name;
        }
    }

    const actionLabel = event.action === "created"
        ? t(l, "approvalActionCreated")
        : t(l, "approvalActionUpdated");
    const typeLabel = isChannelEvent ? t(l, "approvalTypeChannel") : t(l, "approvalTypeNote");

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "approvalEventDetail")}</h1>
                    <Link href={`/${l}/console/approvals`} className="text-sm text-blue-600 hover:underline">
                        ← {t(l, "approvalManagement")}
                    </Link>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4 mb-8">
                    <div className="flex items-center gap-2">
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                event.isHandled
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                            }`}
                        >
                            {event.isHandled ? t(l, "approvalFilterHandled") : t(l, "approvalFilterPending")}
                        </span>
                        {event.result && (
                            <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    event.result === "approved"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                            >
                                {event.result === "approved" ? t(l, "approvalApprove") : t(l, "approvalReject")}
                            </span>
                        )}
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t(l, "approvalEventName")}</p>
                        <p className="text-gray-900 font-medium">[{typeLabel}] {subjectName} · {actionLabel}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t(l, "approvalDescription")}</p>
                        <p className="text-gray-700 text-sm">
                            {isChannelEvent
                                ? event.action === "created"
                                    ? t(l, "approvalDescChannelCreated").replace("{name}", subjectName)
                                    : t(l, "approvalDescChannelUpdated").replace("{name}", subjectName)
                                : event.action === "created"
                                    ? t(l, "approvalDescCreated").replace("{title}", subjectName)
                                    : t(l, "approvalDescUpdated").replace("{title}", subjectName)}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t(l, "created")}</p>
                            <p className="text-gray-700">{new Date(event.createdAt).toLocaleString()}</p>
                        </div>
                        {event.isHandled && event.handledAt && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t(l, "approvalHandledAt")}</p>
                                <p className="text-gray-700">{new Date(event.handledAt).toLocaleString()}</p>
                            </div>
                        )}
                        {handlerName && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t(l, "approvalHandledBy")}</p>
                                <p className="text-gray-700">{handlerName}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t(l, "approvalNoteStatus")}</p>
                            <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    subjectApprovalStatus === "approved"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                {subjectApprovalStatus === "approved"
                                    ? t(l, "approvalApproved")
                                    : t(l, "approvalPending")}
                            </span>
                        </div>
                    </div>
                </div>

                {!event.isHandled && (
                    <div>
                        <p className="text-sm text-gray-600 mb-4">{t(l, "approvalActionHint")}</p>
                        <ApprovalActions
                            eventId={event.id}
                            lang={l}
                            labels={{
                                approve: t(l, "approvalApprove"),
                                reject: t(l, "approvalReject"),
                                approving: t(l, "approvalApproving"),
                                rejecting: t(l, "approvalRejecting"),
                                backToApprovals: t(l, "approvalManagement"),
                            }}
                        />
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

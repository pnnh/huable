import { notFound, redirect } from "next/navigation";
import { eq, and, count, ne } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, notes, createId, approvalEvents } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChannelAvatarUpload from "@/components/ChannelAvatarUpload";
import ChannelDeleteSection from "@/components/ChannelDeleteSection";
import ChannelPublishButton from "@/components/ChannelPublishButton";
import ApprovalStatusBadge from "@/components/ApprovalStatusBadge";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; channelId: string }> };

export default async function ChannelEditorPage({ params }: Props) {
    const { lang, channelId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();
    const isNew = channelId === "new";

    const existingChannel = isNew ? null : await db
        .select()
        .from(channels)
        .where(eq(channels.id, channelId))
        .then((rows) => rows[0] ?? null);

    if (!isNew && (!existingChannel || existingChannel.userId !== user.id)) notFound();

    const publishedNoteCount = isNew ? 0 : await db
        .select({ cnt: count() })
        .from(notes)
        .where(and(eq(notes.channelId, channelId), ne(notes.approvalStatus, "draft")))
        .then(([row]) => row?.cnt ?? 0);

    async function handleSave(formData: FormData) {
        "use server";
        const db2 = getDb();
        const user2 = await getCurrentUser();
        const name = (formData.get("name") as string | null) ?? "";
        const description = (formData.get("description") as string | null) || null;
        const now = Date.now();

        // Saving (as opposed to publishing) never triggers approval: every save always
        // resets the channel to "draft" (see spec.md FR-002/FR-003).
        if (isNew) {
            const id = createId();
            await db2.insert(channels).values({
                id,
                userId: user2.id,
                name,
                description,
                approvalStatus: "draft",
                createdAt: now,
            });
        } else {
            await db2
                .update(channels)
                .set({ name, description, approvalStatus: "draft" })
                .where(eq(channels.id, channelId));

            // Editing a channel that already had a pending review voids that review (see FR-017).
            if (existingChannel?.approvalStatus === "pending") {
                await db2
                    .update(approvalEvents)
                    .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
                    .where(and(eq(approvalEvents.channelId, channelId), eq(approvalEvents.isHandled, false)));
            }
        }
        redirect(`/${lang}/console/channels`);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className={`flex items-center gap-3 ${existingChannel?.approvalStatus === "rejected" ? "mb-2" : "mb-8"}`}>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isNew ? t(l, "newChannel") : t(l, "editChannel")}
                    </h1>
                    {!isNew && existingChannel && (
                        <ApprovalStatusBadge
                            status={existingChannel.approvalStatus}
                            labels={{
                                statusDraft: t(l, "statusDraft"),
                                statusPending: t(l, "statusPending"),
                                statusApproved: t(l, "statusApproved"),
                                statusRejected: t(l, "statusRejected"),
                            }}
                        />
                    )}
                </div>
                {existingChannel?.approvalStatus === "rejected" && (
                    <p className="mb-8 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {t(l, "rejectedNotice")}
                    </p>
                )}
                {!isNew && existingChannel && (
                    <ChannelAvatarUpload
                        channelId={channelId}
                        channelName={existingChannel.name}
                        labels={{
                            avatar: t(l, "avatar"),
                            uploadAvatar: t(l, "uploadAvatar"),
                            avatarHint: t(l, "avatarHint"),
                        }}
                    />
                )}
                <form action={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "channelName")}</label>
                        <input
                            name="name"
                            type="text"
                            defaultValue={existingChannel?.name ?? ""}
                            required
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "channelDescription")}</label>
                        <textarea
                            name="description"
                            rows={6}
                            defaultValue={existingChannel?.description ?? ""}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                            {t(l, "save")}
                        </button>
                        <a href={`/${lang}/console/channels`} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                            {t(l, "cancel")}
                        </a>
                        {!isNew && (
                            <ChannelPublishButton
                                channelId={channelId}
                                labels={{
                                    publish: t(l, "publish"),
                                    publishChannel: t(l, "publishChannel"),
                                    publishChannelConfirm: t(l, "publishChannelConfirm"),
                                    publishFailed: t(l, "publishFailed"),
                                    confirm: t(l, "confirm"),
                                    cancel: t(l, "cancel"),
                                }}
                            />
                        )}
                    </div>
                </form>
                {!isNew && (
                    <ChannelDeleteSection
                        channelId={channelId}
                        redirectTo={`/${lang}/console/channels`}
                        publishedNoteCount={publishedNoteCount}
                        labels={{
                            deleteChannel: t(l, "deleteChannel"),
                            deleteChannelConfirm: t(l, "deleteChannelConfirm"),
                            deleteChannelHasNotes: t(l, "deleteChannelHasNotes"),
                        }}
                    />
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

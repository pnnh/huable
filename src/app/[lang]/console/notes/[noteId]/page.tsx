import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, createId, notes, approvalEvents } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import AttachmentPanel from "@/components/AttachmentPanel";
import NoteDeleteSection from "@/components/NoteDeleteSection";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; noteId: string }> };

export default async function NoteEditorPage({ params }: Props) {
    const { lang, noteId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();
    const isNew = noteId === "new";

    const existingNote = isNew
        ? null
        : await db
            .select()
            .from(notes)
            .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
            .limit(1)
            .then((rows) => rows[0] ?? null);

    if (!isNew && !existingNote) notFound();

    const userChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id));

    async function handleSave(formData: FormData) {
        "use server";

        const db2 = getDb();
        const user2 = await getCurrentUser();
        const title = ((formData.get("title") as string | null) ?? "").trim();
        const body = (formData.get("body") as string | null) ?? "";
        const rawChannelId = (formData.get("channelId") as string | null) ?? "";
        const isPublished = formData.get("isPublished") === "true";
        const now = Date.now();

        if (!title) {
            throw new Error("Title is required");
        }

        const channelId = rawChannelId || null;
        if (channelId) {
            const ownedChannel = await db2
                .select()
                .from(channels)
                .where(and(eq(channels.id, channelId), eq(channels.userId, user2.id)))
                .limit(1)
                .then((rows) => rows[0] ?? null);

            if (!ownedChannel) {
                throw new Error("Channel not found");
            }
        }

        // Approval is only required when the note is published and linked to a channel
        const needsApproval = !!(channelId && isPublished);

        if (isNew) {
            const id = createId();
            await db2.insert(notes).values({
                id,
                userId: user2.id,
                channelId,
                title,
                body,
                isPublished,
                approvalStatus: needsApproval ? "pending" : "approved",
                createdAt: now,
                updatedAt: now,
            });
            if (needsApproval) {
                await db2.insert(approvalEvents).values({
                    noteId: id,
                    action: "created",
                    createdAt: now,
                });
            }
            redirect(`/${lang}/console/notes`);
        }

        const ownedNote = await db2
            .select()
            .from(notes)
            .where(and(eq(notes.id, noteId), eq(notes.userId, user2.id)))
            .limit(1)
            .then((rows) => rows[0] ?? null);

        if (!ownedNote) {
            notFound();
        }

        await db2
            .update(notes)
            .set({ title, body, channelId, isPublished, approvalStatus: needsApproval ? "pending" : "approved", updatedAt: now })
            .where(and(eq(notes.id, noteId), eq(notes.userId, user2.id)));

        if (needsApproval) {
            await db2.insert(approvalEvents).values({
                noteId,
                action: "updated",
                createdAt: now,
            });
        }

        redirect(`/${lang}/console/notes`);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">
                    {isNew ? t(l, "newNote") : t(l, "editNote")}
                </h1>
                <form action={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "noteTitle")}</label>
                        <input
                            name="title"
                            type="text"
                            defaultValue={existingNote?.title ?? ""}
                            required
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "noteBody")}</label>
                        <textarea
                            name="body"
                            rows={16}
                            defaultValue={existingNote?.body ?? ""}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "noteChannel")}</label>
                        <select
                            name="channelId"
                            defaultValue={existingNote?.channelId ?? ""}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t(l, "noChannel")}</option>
                            {userChannels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                    {ch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isPublished"
                            name="isPublished"
                            value="true"
                            defaultChecked={existingNote?.isPublished ?? false}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
                            {t(l, "publishToChannel")}
                        </label>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                        >
                            {t(l, "save")}
                        </button>
                        <Link
                            href={`/${lang}/console/notes`}
                            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                        >
                            {t(l, "cancel")}
                        </Link>
                    </div>
                </form>
                {!isNew && (
                    <div className="mt-8">
                        <AttachmentPanel
                            noteId={noteId}
                            labels={{ deleteAttachmentConfirm: t(l, "deleteAttachmentConfirm") }}
                        />
                    </div>
                )}
                {!isNew && (
                    <NoteDeleteSection
                        noteId={noteId}
                        redirectTo={`/${lang}/console/notes`}
                        labels={{
                            deleteNote: t(l, "deleteNote"),
                            deleteNoteConfirm: t(l, "deleteNoteConfirm"),
                            deleteNoteHasAttachments: t(l, "deleteNoteHasAttachments"),
                        }}
                    />
                )}
                {isNew && (
                    <p className="mt-4 text-xs text-gray-400">Save the note first to add attachments.</p>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

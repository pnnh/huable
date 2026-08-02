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
import NoteEditorForm, { type NoteFormState } from "@/components/NoteEditorForm";
import { assertUniqueNameInParent, NameConflictError } from "@/lib/notesTree";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ lang: string; noteId: string }>;
    searchParams: Promise<{ parentId?: string }>;
};

export default async function NoteEditorPage({ params, searchParams }: Props) {
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

    const { parentId: rawParentId } = await searchParams;
    const parentId = isNew ? rawParentId || null : (existingNote?.parentId ?? null);
    const backHref = parentId ? `/${lang}/console/notes?parentId=${parentId}` : `/${lang}/console/notes`;

    const userChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id));

    async function handleSave(_prevState: NoteFormState, formData: FormData): Promise<NoteFormState> {
        "use server";

        const db2 = getDb();
        const user2 = await getCurrentUser();
        const title = ((formData.get("title") as string | null) ?? "").trim();
        const body = (formData.get("body") as string | null) ?? "";
        const rawChannelId = (formData.get("channelId") as string | null) ?? "";
        const isPublished = formData.get("isPublished") === "true";
        const now = Date.now();

        if (!title) {
            return { error: t(l, "titleRequired") };
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
                return { error: t(l, "channelNotFound") };
            }
        }

        // Approval is only required when the note is published and linked to a channel
        const needsApproval = !!(channelId && isPublished);

        if (isNew) {
            try {
                await assertUniqueNameInParent(db2, user2.id, parentId, title);
            } catch (err) {
                if (err instanceof NameConflictError) {
                    return { error: t(l, "nameConflict") };
                }
                throw err;
            }

            const id = createId();
            await db2.insert(notes).values({
                id,
                userId: user2.id,
                channelId,
                parentId,
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
            redirect(backHref);
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

        try {
            await assertUniqueNameInParent(db2, user2.id, ownedNote.parentId, title, noteId);
        } catch (err) {
            if (err instanceof NameConflictError) {
                return { error: t(l, "nameConflict") };
            }
            throw err;
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

        redirect(backHref);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">
                    {isNew ? t(l, "newNote") : t(l, "editNote")}
                </h1>
                <NoteEditorForm
                    action={handleSave}
                    defaultTitle={existingNote?.title ?? ""}
                    defaultBody={existingNote?.body ?? ""}
                    defaultChannelId={existingNote?.channelId ?? ""}
                    defaultIsPublished={existingNote?.isPublished ?? false}
                    channels={userChannels}
                    backHref={backHref}
                    labels={{
                        noteTitle: t(l, "noteTitle"),
                        noteBody: t(l, "noteBody"),
                        noteChannel: t(l, "noteChannel"),
                        noChannel: t(l, "noChannel"),
                        publishToChannel: t(l, "publishToChannel"),
                        save: t(l, "save"),
                        cancel: t(l, "cancel"),
                    }}
                />
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
                        redirectTo={backHref}
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

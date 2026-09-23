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
import NotePublishDialog from "@/components/NotePublishDialog";
import ApprovalStatusBadge from "@/components/ApprovalStatusBadge";
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
        const now = Date.now();

        if (!title) {
            return { error: t(l, "titleRequired") };
        }

        // Saving (as opposed to publishing) never touches the channel or triggers approval:
        // every save always resets the note to "draft" (see spec.md FR-002/FR-003).
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
                channelId: null,
                parentId,
                title,
                body,
                approvalStatus: "draft",
                createdAt: now,
                updatedAt: now,
            });
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
            .set({ title, body, approvalStatus: "draft", updatedAt: now })
            .where(and(eq(notes.id, noteId), eq(notes.userId, user2.id)));

        // Editing a note that already had a pending review voids that review (see FR-017).
        if (ownedNote.approvalStatus === "pending") {
            await db2
                .update(approvalEvents)
                .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
                .where(and(eq(approvalEvents.noteId, noteId), eq(approvalEvents.isHandled, false)));
        }

        redirect(backHref);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className={`flex items-center gap-3 ${existingNote?.approvalStatus === "rejected" ? "mb-2" : "mb-8"}`}>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isNew ? t(l, "newNote") : t(l, "editNote")}
                    </h1>
                    {!isNew && existingNote && (
                        <ApprovalStatusBadge
                            status={existingNote.approvalStatus}
                            labels={{
                                statusDraft: t(l, "statusDraft"),
                                statusPending: t(l, "statusPending"),
                                statusApproved: t(l, "statusApproved"),
                                statusRejected: t(l, "statusRejected"),
                            }}
                        />
                    )}
                </div>
                {existingNote?.approvalStatus === "rejected" && (
                    <p className="mb-8 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {t(l, "rejectedNotice")}
                    </p>
                )}
                <NoteEditorForm
                    action={handleSave}
                    defaultTitle={existingNote?.title ?? ""}
                    defaultBody={existingNote?.body ?? ""}
                    backHref={backHref}
                    toolbarExtra={
                        !isNew && (
                            <NotePublishDialog
                                noteId={noteId}
                                channels={userChannels}
                                defaultChannelId={existingNote?.channelId ?? ""}
                                labels={{
                                    publish: t(l, "publish"),
                                    publishNote: t(l, "publishNote"),
                                    noteChannel: t(l, "noteChannel"),
                                    noChannel: t(l, "noChannel"),
                                    noChannelsAvailable: t(l, "noChannelsAvailable"),
                                    channelRequired: t(l, "channelRequired"),
                                    publishFailed: t(l, "publishFailed"),
                                    save: t(l, "save"),
                                    cancel: t(l, "cancel"),
                                }}
                            />
                        )
                    }
                    labels={{
                        noteTitle: t(l, "noteTitle"),
                        noteBody: t(l, "noteBody"),
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

import Link from "next/link";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, notes } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import CreateDirectoryDialog from "@/components/CreateDirectoryDialog";
import NotesConsole from "@/components/NotesConsole";
import type { NoteTreeItem } from "@/components/NotesTreeTable";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ parentId?: string }>;
};

export default async function NotesListPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;
    const { parentId: rawParentId } = await searchParams;
    const parentId = rawParentId || null;

    const user = await getCurrentUser();
    const db = getDb();

    const userNotes = await db
        .select()
        .from(notes)
        .leftJoin(channels, eq(notes.channelId, channels.id))
        .where(
            and(
                eq(notes.userId, user.id),
                parentId === null ? isNull(notes.parentId) : eq(notes.parentId, parentId),
            ),
        )
        .orderBy(desc(notes.updatedAt));

    const directoryIds = userNotes
        .filter(({ notes: note }) => note.mimeType === "directory")
        .map(({ notes: note }) => note.id);

    const childCounts = directoryIds.length
        ? await db
            .select({ parentId: notes.parentId, cnt: count() })
            .from(notes)
            .where(and(eq(notes.userId, user.id), inArray(notes.parentId, directoryIds)))
            .groupBy(notes.parentId)
        : [];

    const countByParentId = new Map(childCounts.map((row) => [row.parentId, row.cnt]));

    const userChannels = await db
        .select({ id: channels.id, name: channels.name })
        .from(channels)
        .where(eq(channels.userId, user.id));

    const treeItems: NoteTreeItem[] = userNotes.map(({ notes: note, channels: channel }) => ({
        id: note.id,
        title: note.title,
        mimeType: note.mimeType as NoteTreeItem["mimeType"],
        hasChildren: (countByParentId.get(note.id) ?? 0) > 0,
        updatedAt: note.updatedAt,
        channelName: channel?.name ?? null,
        approvalStatus: note.approvalStatus,
    }));

    const newNoteHref = parentId
        ? `/${l}/console/notes/new?parentId=${parentId}`
        : `/${l}/console/notes/new`;
    const uploadNotesHref = parentId
        ? `/${l}/console/notes/upload?parentId=${parentId}`
        : `/${l}/console/notes/upload`;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <NotesConsole
                    lang={l}
                    title={t(l, "notes")}
                    items={treeItems}
                    channels={userChannels}
                    noNotesYet={t(l, "noNotesYet")}
                    labels={{
                        noteTitle: t(l, "noteTitle"),
                        noteChannel: t(l, "noteChannel"),
                        noteStatus: t(l, "noteStatus"),
                        updated: t(l, "updated"),
                        statusDraft: t(l, "statusDraft"),
                        statusPending: t(l, "statusPending"),
                        statusApproved: t(l, "statusApproved"),
                        statusRejected: t(l, "statusRejected"),
                        noContentInDirectory: t(l, "noContentInDirectory"),
                        selectAllNotes: t(l, "selectAllNotes"),
                        selectNote: t(l, "selectNote"),
                        batchPublish: t(l, "batchPublish"),
                        noChannel: t(l, "noChannel"),
                        noChannelsAvailable: t(l, "noChannelsAvailable"),
                        channelRequired: t(l, "channelRequired"),
                        batchUpdateSuccess: t(l, "batchUpdateSuccess"),
                        batchUpdatePartial: t(l, "batchUpdatePartial"),
                        batchUpdateFailed: t(l, "batchUpdateFailed"),
                        save: t(l, "save"),
                        cancel: t(l, "cancel"),
                    }}
                >
                    <CreateDirectoryDialog
                        parentId={parentId}
                        labels={{
                            newDirectory: t(l, "newDirectory"),
                            directoryName: t(l, "directoryName"),
                            directoryDescription: t(l, "directoryDescription"),
                            directoryNameRequired: t(l, "directoryNameRequired"),
                            nameConflict: t(l, "nameConflict"),
                            save: t(l, "save"),
                            cancel: t(l, "cancel"),
                        }}
                    />
                    <Link
                        href={uploadNotesHref}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                    >
                        {t(l, "uploadNotes")}
                    </Link>
                    <Link
                        href={newNoteHref}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                        {t(l, "newNote")}
                    </Link>
                </NotesConsole>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

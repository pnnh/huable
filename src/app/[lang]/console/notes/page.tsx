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
import NotesTreeTable, { type NoteTreeItem } from "@/components/NotesTreeTable";

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

    const treeItems: NoteTreeItem[] = userNotes.map(({ notes: note, channels: channel }) => ({
        id: note.id,
        title: note.title,
        mimeType: note.mimeType as NoteTreeItem["mimeType"],
        hasChildren: (countByParentId.get(note.id) ?? 0) > 0,
        updatedAt: note.updatedAt,
        channelName: channel?.name ?? null,
        isPublished: note.isPublished,
    }));

    const newNoteHref = parentId
        ? `/${l}/console/notes/new?parentId=${parentId}`
        : `/${l}/console/notes/new`;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "notes")}</h1>
                    <div className="flex items-center gap-3">
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
                            href={newNoteHref}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                        >
                            {t(l, "newNote")}
                        </Link>
                    </div>
                </div>
                {treeItems.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noNotesYet")}</p>
                ) : (
                    <NotesTreeTable
                        lang={l}
                        items={treeItems}
                        labels={{
                            noteTitle: t(l, "noteTitle"),
                            noteChannel: t(l, "noteChannel"),
                            noteStatus: t(l, "noteStatus"),
                            updated: t(l, "updated"),
                            notePublished: t(l, "notePublished"),
                            noteDraft: t(l, "noteDraft"),
                            noContentInDirectory: t(l, "noContentInDirectory"),
                        }}
                    />
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

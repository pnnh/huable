import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, notes } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function NotesListPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();

    const userNotes = await db
        .select()
        .from(notes)
        .leftJoin(channels, eq(notes.channelId, channels.id))
        .where(eq(notes.userId, user.id))
        .orderBy(desc(notes.updatedAt));

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "notes")}</h1>
                    <Link
                        href={`/${l}/console/notes/new`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                        {t(l, "newNote")}
                    </Link>
                </div>
                {userNotes.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noNotesYet")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="py-3 pr-4">{t(l, "noteTitle")}</th>
                                    <th className="py-3 pr-4">{t(l, "noteChannel")}</th>
                                    <th className="py-3 pr-4">{t(l, "noteStatus")}</th>
                                    <th className="py-3">{t(l, "updated")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {userNotes.map(({ notes: note, channels: channel }) => (
                                    <tr key={note.id}>
                                        <td className="py-3 pr-4">
                                            <Link
                                                href={`/${l}/console/notes/${note.id}`}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                {note.title}
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500">{channel?.name ?? "—"}</td>
                                        <td className="py-3 pr-4">
                                            <span
                                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${note.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                                            >
                                                {note.isPublished ? t(l, "notePublished") : t(l, "noteDraft")}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-500">
                                            {new Date(note.updatedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

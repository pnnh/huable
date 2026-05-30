import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, notes } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RemoveFromChannelButton from "@/components/RemoveFromChannelButton";
import Link from "next/link";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; channelId: string }> };

export default async function ChannelNotesPage({ params }: Props) {
    const { lang, channelId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();

    const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)))
        .limit(1);

    if (!channel) notFound();

    const channelNotes = await db
        .select()
        .from(notes)
        .where(and(eq(notes.channelId, channelId), eq(notes.userId, user.id)))
        .orderBy(desc(notes.updatedAt));

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center gap-3 mb-2">
                    <Link
                        href={`/${lang}/console/channels`}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        ← {t(l, "manageChannels")}
                    </Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{channel.name}</h1>
                <p className="text-sm text-gray-500 mb-8">{t(l, "channelNotes")}</p>

                {channelNotes.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noNotesYet")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="py-3 pr-4">{t(l, "noteTitle")}</th>
                                    <th className="py-3 pr-4">{t(l, "noteStatus")}</th>
                                    <th className="py-3 pr-4">{t(l, "updated")}</th>
                                    <th className="py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {channelNotes.map((note) => (
                                    <tr key={note.id}>
                                        <td className="py-3 pr-4">
                                            <Link
                                                href={`/${lang}/console/notes/${note.id}`}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                {note.title}
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${note.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                                {note.isPublished ? t(l, "notePublished") : t(l, "noteDraft")}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500">
                                            {new Date(note.updatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3">
                                            <RemoveFromChannelButton
                                                noteId={note.id}
                                                label={t(l, "removeFromChannel")}
                                                confirmMessage={t(l, "removeFromChannelConfirm")}
                                            />
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

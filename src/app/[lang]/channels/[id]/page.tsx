import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { channels, notes } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import MarkdownContent from "@/components/MarkdownContent";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; id: string }> };

export default async function ChannelPage({ params }: Props) {
    const { lang, id } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const db = getDb();
    const isDev = process.env.NODE_ENV === "development";

    const noteConds: any[] = [eq(notes.channelId, id), eq(notes.isPublished, true)];
    if (!isDev) noteConds.push(eq(notes.approvalStatus, "approved"));

    const [channelRows, publishedNotes] = await Promise.all([
        db.select().from(channels).where(eq(channels.id, id)).limit(1),
        db.select().from(notes).where(and(...noteConds)).orderBy(desc(notes.updatedAt)),
    ]);
    const channel = channelRows[0];

    if (!channel || !channel.isPublic || (!isDev && channel.approvalStatus !== "approved")) notFound();

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{channel.name}</h1>
                {channel.description && (
                    <MarkdownContent content={channel.description} className="mb-8" />
                )}
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Notes</h2>
                {publishedNotes.length === 0 ? (
                    <p className="text-gray-500">No published notes yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {publishedNotes.map((note) => (
                            <li key={note.id}>
                                <Link
                                    href={`/${l}/notes/${note.id}`}
                                    className="text-blue-600 hover:underline font-medium"
                                >
                                    {note.title}
                                </Link>
                                <span className="text-gray-400 text-sm ml-3">
                                    {new Date(note.updatedAt).toLocaleDateString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

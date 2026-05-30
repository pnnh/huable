import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { notes, noteAttachments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

type Props = { params: Promise<{ noteId: string }> };

export async function DELETE(_req: NextRequest, { params }: Props) {
    const { noteId } = await params;

    if (!noteId || !/^[a-zA-Z0-9_-]+$/.test(noteId)) {
        return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const db = getDb();

    // Verify ownership
    const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
        .limit(1);

    if (!note) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete all attachment files from storage before deleting the DB record
    const attachments = await db
        .select()
        .from(noteAttachments)
        .where(eq(noteAttachments.noteId, noteId));

    const storage = getStorage();
    await Promise.all(
        attachments.map((a) => storage.delete(noteId, a.filename).catch(() => undefined)),
    );

    // Delete the note — cascades to noteAttachments in DB
    await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, user.id)));

    return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: Props) {
    const { noteId } = await params;

    if (!noteId || !/^[a-zA-Z0-9_-]+$/.test(noteId)) {
        return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const db = getDb();

    const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
        .limit(1);

    if (!note) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    // Only channelId updates are supported via this endpoint
    if ("channelId" in body) {
        const channelId = body.channelId === null ? null : String(body.channelId);
        await db
            .update(notes)
            .set({ channelId, updatedAt: Date.now() })
            .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)));
    }

    return NextResponse.json({ ok: true });
}

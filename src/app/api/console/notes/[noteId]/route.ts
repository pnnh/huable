import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { notes, noteAttachments, approvalEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStorage } from "@/lib/storage";
import { requireConsoleAuth } from "../../_auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ noteId: string }> };

export async function DELETE(_req: NextRequest, { params }: Props) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

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
    const authError = await requireConsoleAuth();
    if (authError) return authError;

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

    // Only clearing the channel (removing a note from it) is supported via this endpoint;
    // assigning a channel now happens exclusively through the publish flow (see FR-010).
    if ("channelId" in body) {
        if (body.channelId !== null) {
            return NextResponse.json({ error: "channel_id_must_be_null" }, { status: 400 });
        }
        const now = Date.now();
        await db
            .update(notes)
            .set({ channelId: null, approvalStatus: "draft", updatedAt: now })
            .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)));

        if (note.approvalStatus === "pending") {
            await db
                .update(approvalEvents)
                .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
                .where(and(eq(approvalEvents.noteId, noteId), eq(approvalEvents.isHandled, false)));
        }
    }

    return NextResponse.json({ ok: true });
}

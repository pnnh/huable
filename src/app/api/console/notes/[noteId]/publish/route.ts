import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { notes, channels, approvalEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireConsoleAuth } from "../../../_auth";

export const runtime = "nodejs";

type Props = { params: Promise<{ noteId: string }> };

export async function POST(req: NextRequest, { params }: Props) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const { noteId } = await params;
    if (!noteId || !/^[a-zA-Z0-9_-]+$/.test(noteId)) {
        return NextResponse.json({ error: "invalid_note_id" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const db = getDb();

    const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
        .limit(1);

    if (!note) {
        return NextResponse.json({ error: "note_not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const channelId = typeof body.channelId === "string" ? body.channelId : "";

    if (!channelId) {
        return NextResponse.json({ error: "channel_id_required" }, { status: 400 });
    }

    const [channel] = await db
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)))
        .limit(1);

    if (!channel) {
        return NextResponse.json({ error: "channel_not_found" }, { status: 400 });
    }

    const now = Date.now();
    const isAdmin = user.sysrole === "admin";
    const approvalStatus = isAdmin ? "approved" : "pending";

    await db
        .update(notes)
        .set({ channelId, approvalStatus, updatedAt: now })
        .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)));

    // Void any still-pending event this publish supersedes before recording the new one.
    await db
        .update(approvalEvents)
        .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
        .where(and(eq(approvalEvents.noteId, noteId), eq(approvalEvents.isHandled, false)));

    if (!isAdmin) {
        const [priorEvent] = await db
            .select({ id: approvalEvents.id })
            .from(approvalEvents)
            .where(eq(approvalEvents.noteId, noteId))
            .limit(1);

        await db.insert(approvalEvents).values({
            noteId,
            action: priorEvent ? "updated" : "created",
            createdAt: now,
        });
    }

    return NextResponse.json({ id: noteId, channelId, approvalStatus });
}

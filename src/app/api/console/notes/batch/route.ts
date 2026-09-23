import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { approvalEvents, channels, notes } from "@/db/schema";
import { requireConsoleAuth } from "../../_auth";

export const runtime = "nodejs";

const MAX_NOTE_IDS = 200;

type SkipReason = "not_found" | "not_owned" | "is_directory";

export async function POST(req: NextRequest) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const user = await getCurrentUser();
    const db = getDb();

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const noteIds = Array.isArray(body.noteIds) ? body.noteIds.filter((id): id is string => typeof id === "string") : null;
    if (!noteIds || noteIds.length === 0) {
        return NextResponse.json({ error: "note_ids_required" }, { status: 400 });
    }

    const uniqueNoteIds = Array.from(new Set(noteIds));
    if (uniqueNoteIds.length > MAX_NOTE_IDS) {
        return NextResponse.json({ error: "too_many_notes" }, { status: 400 });
    }

    const channelId = typeof body.channelId === "string" ? body.channelId : "";
    if (!channelId) {
        return NextResponse.json({ error: "channel_id_required" }, { status: 400 });
    }

    const [ownedChannel] = await db
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)))
        .limit(1);
    if (!ownedChannel) {
        return NextResponse.json({ error: "channel_not_found" }, { status: 400 });
    }

    const existingNotes = await db
        .select()
        .from(notes)
        .where(inArray(notes.id, uniqueNoteIds));
    const notesById = new Map(existingNotes.map((note) => [note.id, note]));

    const updated: string[] = [];
    const skipped: { id: string; reason: SkipReason }[] = [];
    const now = Date.now();
    const isAdmin = user.sysrole === "admin";
    const approvalStatus = isAdmin ? "approved" : "pending";

    for (const id of uniqueNoteIds) {
        const note = notesById.get(id);
        if (!note) {
            skipped.push({ id, reason: "not_found" });
            continue;
        }
        if (note.userId !== user.id) {
            skipped.push({ id, reason: "not_owned" });
            continue;
        }
        if (note.mimeType === "directory") {
            skipped.push({ id, reason: "is_directory" });
            continue;
        }

        await db
            .update(notes)
            .set({ channelId, approvalStatus, updatedAt: now })
            .where(and(eq(notes.id, id), eq(notes.userId, user.id)));

        // Void any still-pending event this publish supersedes before recording the new one.
        await db
            .update(approvalEvents)
            .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
            .where(and(eq(approvalEvents.noteId, id), eq(approvalEvents.isHandled, false)));

        if (!isAdmin) {
            const [priorEvent] = await db
                .select({ id: approvalEvents.id })
                .from(approvalEvents)
                .where(eq(approvalEvents.noteId, id))
                .limit(1);

            await db.insert(approvalEvents).values({
                noteId: id,
                action: priorEvent ? "updated" : "created",
                createdAt: now,
            });
        }

        updated.push(id);
    }

    return NextResponse.json({ updated, skipped });
}

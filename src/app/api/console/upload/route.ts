import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getDb } from "@/db/index";
import { noteAttachments, notes, approvalEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireConsoleAuth } from "../_auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const authError = await requireConsoleAuth();
    if (authError) return authError;

    const formData = await req.formData();
    const file = formData.get("file");
    const noteId = formData.get("noteId");

    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!noteId || typeof noteId !== "string") {
        return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }

    // Verify the note exists before accepting upload
    const db = getDb();
    const existingNotes = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (existingNotes.length === 0) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const mimeType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();

    await storage.save(noteId, filename, buffer);

    // Upsert attachment record (ignore duplicate filename for the same note)
    await db
        .insert(noteAttachments)
        .values({ noteId, filename, mimeType })
        .onConflictDoNothing();

    // Uploading an attachment counts as editing the note: revert any non-draft status back to
    // "draft" and void the pending approval event, if any (see spec.md FR-003/FR-017).
    const note = existingNotes[0];
    if (note.approvalStatus !== "draft") {
        const now = Date.now();
        await db.update(notes).set({ approvalStatus: "draft", updatedAt: now }).where(eq(notes.id, noteId));
        await db
            .update(approvalEvents)
            .set({ isHandled: true, handledBy: null, result: null, handledAt: now })
            .where(and(eq(approvalEvents.noteId, noteId), eq(approvalEvents.isHandled, false)));
    }

    const url = `/api/files/${noteId}/${encodeURIComponent(filename)}`;
    return NextResponse.json({ filename, noteId, url });
}
